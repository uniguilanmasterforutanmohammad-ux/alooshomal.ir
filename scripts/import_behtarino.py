#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Import the scraped Behtarino data into the *local* database.

Two independent inputs (from the sibling `behtarino/` extraction project):

  * ``behtarino-categories.csv``   — the complete job taxonomy (main category,
    subcategory and tag names). Every distinct name becomes a row in
    ``business_categories`` so the directory can offer the full list.
  * ``behtarino-mazandaran-businesses.json`` — the Mazandaran businesses. Each
    one becomes an APPROVED + published ``business_cards`` row owned by a
    placeholder account, flagged ``isUnclaimed`` so the public page can show the
    «شما صاحب این کسب‌وکار هستید؟» button and let the real owner take it over.

Nothing here touches production: the script talks to the local Postgres
container (``alooshomal-db``) through ``psql``, exactly like
``scripts/seed_load_test.py``.

Usage:
  python3 scripts/import_behtarino.py categories
  python3 scripts/import_behtarino.py businesses
  python3 scripts/import_behtarino.py all

Options:
  --source-dir DIR   folder holding the Behtarino files
                     (default: ../behtarino next to this repo)
  --limit N          import only the first N businesses (smoke-testing)
  --clear            delete previously imported (isUnclaimed) cards first
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import random
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone

DEFAULT_SOURCE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "behtarino")
)

DB_CONTAINER = os.environ.get("ALOOSHOMAL_DB_CONTAINER", "alooshomal-db")
DB_USER = os.environ.get("POSTGRES_USER", "bizcard")
DB_NAME = os.environ.get("POSTGRES_DB", "bizcard")

IMPORT_USER_EMAIL = "imported@alooshomal.local"
IMPORT_USER_NAME = "کسب‌وکارهای سیستمی"
# Eco/Plus plans hide no field; the free plan masks e-mail and social links, so
# imported rows must not sit on it.
IMPORT_USER_PLAN_SORT = 2

PSQL_CMD = shutil.which("psql")

WEEKDAYS = {
    "شنبه": "saturday",
    "یک‌شنبه": "sunday",
    "یکشنبه": "sunday",
    "دوشنبه": "monday",
    "سه‌شنبه": "tuesday",
    "سه‌شنبه": "tuesday",
    "چهارشنبه": "wednesday",
    "چهار‌شنبه": "wednesday",
    "پنجشنبه": "thursday",
    "پنج‌شنبه": "thursday",
    "جمعه": "friday",
}


def cuid(_rng: random.Random | None = None) -> str:
    """A cuid-shaped, collision-free id (uuid-based; Prisma only needs `text`)."""
    return "c" + uuid.uuid4().hex[:24]


def now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def psql(sql: str, stdin: str | None = None) -> str:
    """Run `sql` inside the local Postgres container and return stdout."""
    if PSQL_CMD:
        command = [PSQL_CMD, "-v", "ON_ERROR_STOP=1", "-tA", "-U", DB_USER, "-d", DB_NAME]
    else:
        command = [
            "docker", "exec", "-i", DB_CONTAINER,
            "psql", "-v", "ON_ERROR_STOP=1", "-tA", "-U", DB_USER, "-d", DB_NAME,
        ]
    result = subprocess.run(
        command,
        input=stdin if stdin is not None else sql,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or "psql failed")
    return result.stdout.strip()


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def read_categories(source_dir: str) -> list[str]:
    """Every distinct name in the taxonomy, most-specific level included."""
    path = os.path.join(source_dir, "behtarino-categories.csv")
    names: list[str] = []
    seen: set[str] = set()
    with open(path, encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            for column in ("دسته اصلی", "زیردسته", "زیرشاخه"):
                name = (row.get(column) or "").strip()
                if name and name not in seen:
                    seen.add(name)
                    names.append(name)
    return names


def import_categories(source_dir: str, rng: random.Random) -> dict[str, str]:
    """Insert every taxonomy name; returns name → id for the whole table."""
    names = read_categories(source_dir)
    stamp = now_stamp()
    batch = 800
    for start in range(0, len(names), batch):
        chunk = names[start:start + batch]
        values = ", ".join(
            "(" + ", ".join([
                sql_quote(cuid(rng)),
                sql_quote(name),
                "true",
                sql_quote(stamp),
                sql_quote(stamp),
            ]) + ")"
            for name in chunk
        )
        psql(
            'INSERT INTO "business_categories" '
            '(id, name, "isActive", "createdAt", "updatedAt") VALUES '
            f"{values} ON CONFLICT (name) DO NOTHING;"
        )
    rows = psql('SELECT name || \'|\' || id FROM "business_categories"')
    mapping: dict[str, str] = {}
    for line in rows.splitlines():
        if "|" in line:
            name, ident = line.split("|", 1)
            mapping[name.strip()] = ident.strip()
    return mapping


def ensure_import_user(rng: random.Random) -> str:
    """Create/find the placeholder owner for imported cards."""
    existing = psql(
        'SELECT id FROM "users" WHERE email = ' + sql_quote(IMPORT_USER_EMAIL)
    )
    plan = psql(
        'SELECT id FROM "subscription_plans" '
        f'ORDER BY "sortOrder" ASC OFFSET {IMPORT_USER_PLAN_SORT - 1} LIMIT 1'
    )
    plan_id = plan.splitlines()[0].strip() if plan else ""
    if existing:
        if plan_id:
            psql(
                'UPDATE "users" SET "planId" = ' + sql_quote(plan_id) +
                ' WHERE email = ' + sql_quote(IMPORT_USER_EMAIL) + ";"
            )
        return existing.splitlines()[0].strip()
    stamp = now_stamp()
    user_id = cuid(rng)
    psql(
        'INSERT INTO "users" '
        '(id, email, "fullName", role, "isActive", "planId", "createdAt", "updatedAt") VALUES '
        f"({sql_quote(user_id)}, {sql_quote(IMPORT_USER_EMAIL)}, "
        f"{sql_quote(IMPORT_USER_NAME)}, 'USER', true, "
        f"{sql_quote(plan_id) if plan_id else 'NULL'}, "
        f"{sql_quote(stamp)}, {sql_quote(stamp)});"
    )
    return user_id


def ensure_cities(names: set[str], rng: random.Random) -> dict[str, str]:
    existing = psql('SELECT name || \'|\' || id FROM "cities"')
    mapping: dict[str, str] = {}
    for line in existing.splitlines():
        if "|" in line:
            name, ident = line.split("|", 1)
            mapping[name.strip()] = ident.strip()
    missing = sorted(name for name in names if name and name not in mapping)
    for name in missing:
        ident = cuid(rng)
        stamp = now_stamp()
        psql(
            'INSERT INTO "cities" (id, name, "isActive", "createdAt", "updatedAt") VALUES '
            f"({sql_quote(ident)}, {sql_quote(name)}, true, {sql_quote(stamp)}, {sql_quote(stamp)}) "
            "ON CONFLICT (name) DO NOTHING;"
        )
        mapping[name] = ident
    return mapping


def parse_working_hours(raw: str) -> dict[str, dict[str, str]] | None:
    """`شنبه: 07:30:00-18:00:00 | …` → the site's per-weekday JSON shape."""
    text = (raw or "").strip()
    if not text:
        return None
    result: dict[str, dict[str, str]] = {}
    for part in text.split("|"):
        if ":" not in part:
            continue
        label, _, value = part.partition(":")
        day = WEEKDAYS.get(label.strip().replace("\u200c", ""))
        if not day:
            # Re-run the lookup with the original ZWNJ spelling.
            day = WEEKDAYS.get(label.strip())
        if not day:
            continue
        value = value.strip()
        if "تعطیل" in value or "-" not in value:
            result[day] = {"closed": True}
            continue
        open_raw, _, close_raw = value.partition("-")
        result[day] = {
            "open": open_raw.strip()[:5],
            "close": close_raw.strip()[:5],
        }
    return result or None


def social_url(network: str, value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    handle = value.lstrip("@/")
    bases = {
        "instagram": "https://instagram.com/",
        "telegram": "https://t.me/",
    }
    return bases.get(network, "") + handle


def whatsapp_url(value: str) -> str:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    return f"https://wa.me/{digits}" if digits else ""


def build_card_rows(
    businesses: list[dict],
    user_id: str,
    city_ids: dict[str, str],
    business_ids: dict[str, str],
    rng: random.Random,
) -> list[list[str]]:
    stamp = now_stamp()
    rows: list[list[str]] = []
    for business in businesses:
        city_name = (business.get("city_name") or business.get("listed_city") or "").strip()
        category = (business.get("category") or "").strip()
        city_id = city_ids.get(city_name, "")
        business_id = business_ids.get(category, "")
        if not city_id or not business_id:
            continue
        name = (business.get("name") or "").strip()
        if not name:
            continue
        phone_raw = (business.get("phone") or "").strip()
        mobile = phone_raw if phone_raw.startswith("09") and len(phone_raw) == 11 else ""
        phone = "" if mobile else phone_raw
        tags = business.get("tags") or []
        bio = (business.get("description") or "").strip() or "، ".join(tags)
        job_title = (
            (business.get("main_tag") or "").strip()
            or (business.get("subcategory") or "").strip()
            or (business.get("guild") or "").strip()
        )
        working_hours = parse_working_hours(business.get("working_hours") or "")
        rows.append([
            cuid(rng),
            user_id,
            (business.get("slug") or cuid(rng)).strip(),
            city_id,
            business_id,
            name,
            job_title,
            "",  # company
            bio,
            phone,
            mobile,
            "",
            (business.get("website") or "").strip(),
            (business.get("address") or "").strip(),
            social_url("instagram", business.get("instagram") or ""),
            social_url("telegram", business.get("telegram") or ""),
            whatsapp_url(business.get("whatsapp") or ""),
            (business.get("linkedin") or "").strip(),
            json.dumps(working_hours, ensure_ascii=False) if working_hours else "",
            "true",
            "APPROVED",
            stamp,
            stamp,
            stamp,
            "true",
            stamp,
            stamp,
        ])
    return rows


COPY_COLUMNS = [
    "id", "userId", "slug", "cityId", "businessId", "fullName", "jobTitle",
    "company", "bio", "phone", "mobile", "email", "website", "address",
    "instagram", "telegram", "whatsapp", "linkedin", "workingHours",
    "isPublished", "status", "approvedAt", "publishedAt", "pinnedAt",
    "isUnclaimed", "createdAt", "updatedAt",
]


def import_businesses(source_dir: str, rng: random.Random, limit: int | None) -> None:
    path = os.path.join(source_dir, "behtarino-mazandaran-businesses.json")
    with open(path, encoding="utf-8") as handle:
        businesses = json.load(handle)
    if limit:
        businesses = businesses[:limit]

    user_id = ensure_import_user(rng)
    city_ids = ensure_cities(
        {
            (b.get("city_name") or b.get("listed_city") or "").strip()
            for b in businesses
        },
        rng,
    )
    category_names = {(b.get("category") or "").strip() for b in businesses}
    existing = psql('SELECT name || \'|\' || id FROM "business_categories"')
    business_ids: dict[str, str] = {}
    for line in existing.splitlines():
        if "|" in line:
            cname, ident = line.split("|", 1)
            business_ids[cname.strip()] = ident.strip()
    stamp = now_stamp()
    for cname in sorted(category_names):
        if not cname or cname in business_ids:
            continue
        ident = cuid(rng)
        psql(
            'INSERT INTO "business_categories" (id, name, "isActive", "createdAt", "updatedAt") '
            f"VALUES ({sql_quote(ident)}, {sql_quote(cname)}, true, {sql_quote(stamp)}, {sql_quote(stamp)}) "
            "ON CONFLICT (name) DO NOTHING;"
        )
        business_ids[cname] = ident

    rows = build_card_rows(businesses, user_id, city_ids, business_ids, rng)
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    for row in rows:
        writer.writerow(row)
    copy_sql = (
        "\\copy business_cards (" + ", ".join(f'"{c}"' for c in COPY_COLUMNS) +
        ") FROM STDIN WITH (FORMAT csv)"
    )
    # `\copy … FROM STDIN` reads its data from psql's standard input, so the
    # command and the CSV payload travel together on the same stream.
    psql(copy_sql + "\n" + buffer.getvalue() + "\\.\n")
    print(f"imported {len(rows)} business cards "
          f"(skipped {len(businesses) - len(rows)})")


def clear_imported() -> None:
    removed = psql(
        'DELETE FROM "business_cards" WHERE "isUnclaimed" = true RETURNING id'
    )
    print(f"removed {len(removed.splitlines())} unclaimed cards")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["categories", "businesses", "all"])
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--clear", action="store_true")
    args = parser.parse_args()

    rng = random.Random(1405)
    if args.clear:
        clear_imported()
    if args.mode in ("categories", "all"):
        mapping = import_categories(args.source_dir, rng)
        print(f"categories in database: {len(mapping)}")
    if args.mode in ("businesses", "all"):
        import_businesses(args.source_dir, rng, args.limit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
