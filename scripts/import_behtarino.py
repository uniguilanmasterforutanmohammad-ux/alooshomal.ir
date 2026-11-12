#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Import the scraped Behtarino data into the *local* database.

Two independent inputs (from the sibling `behtarino/` extraction project):

  * ``behtarino-categories.json``  — the complete job taxonomy. Only the *main*
    categories become ``business_categories`` rows: they are the only level the
    public site shows (listings, filters, search). The «زیردسته» and «زیرشاخه»
    names go into ``business_taxonomy_nodes`` and are offered exclusively by the
    *searchable* pickers in the biolink / business-card builders.
  * ``behtarino-mazandaran-businesses.json`` — the Mazandaran businesses. Each
    one becomes an APPROVED + published ``business_cards`` row owned by a
    placeholder account, flagged ``isUnclaimed`` so the public page can show the
    «شما صاحب این کسب‌وکار هستید؟» button and let the real owner take it over.
    Its «محله» is kept so the public card can show it as a tag, while the
    scraped «شهر/منطقه» column is *not* stored: it only decides which real city
    a business belongs to (the merged «تنکابن، شیرود» bucket is split by it).

Nothing here touches production: the script talks to the local Postgres
container (``alooshomal-db``) through ``psql``, exactly like
``scripts/seed_load_test.py``.

Usage:
  python3 scripts/import_behtarino.py categories
  python3 scripts/import_behtarino.py businesses
  python3 scripts/import_behtarino.py all
  python3 scripts/import_behtarino.py all --purge

Options:
  --source-dir DIR   folder holding the Behtarino files
                     (default: ../behtarino next to this repo)
  --limit N          import only the first N businesses (smoke-testing)
  --clear            delete previously imported (isUnclaimed) cards first
  --purge            local-only clean slate: drop EVERY pre-existing business
                     card and every category that is not one of the file's main
                     categories, so only this file's data remains. Existing
                     biolinks survive (their category link is cleared when the
                     old category row disappears).
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


def read_category_tree(
    source_dir: str,
) -> tuple[list[str], list[tuple[str, str]], list[tuple[str, str, str]]]:
    """The JSON taxonomy as `(mains, subcategories, tags)`.

    A subcategory is the pair ``(main, sub)`` and a tag the triple
    ``(main, sub, tag)``; duplicates are removed defensively.
    """
    path = os.path.join(source_dir, "behtarino-categories.json")
    with open(path, encoding="utf-8") as handle:
        payload = json.load(handle)
    categories = payload["categories"] if isinstance(payload, dict) else payload
    mains: list[str] = []
    subs: list[tuple[str, str]] = []
    tags: list[tuple[str, str, str]] = []
    seen_subs: set[tuple[str, str]] = set()
    seen_tags: set[tuple[str, str, str]] = set()
    for category in categories:
        main = (category.get("title") or "").strip()
        if not main:
            continue
        if main not in mains:
            mains.append(main)
        for sub in category.get("subcategories") or []:
            sub_name = (sub.get("title") or "").strip()
            if not sub_name:
                continue
            if (main, sub_name) not in seen_subs:
                seen_subs.add((main, sub_name))
                subs.append((main, sub_name))
            for tag in sub.get("tags") or []:
                tag_name = (tag.get("title") or "").strip()
                if not tag_name:
                    continue
                key = (main, sub_name, tag_name)
                if key not in seen_tags:
                    seen_tags.add(key)
                    tags.append(key)
    return mains, subs, tags


def category_id_map() -> dict[str, str]:
    rows = psql('SELECT name || \'|\' || id FROM "business_categories"')
    mapping: dict[str, str] = {}
    for line in rows.splitlines():
        if "|" in line:
            name, ident = line.split("|", 1)
            mapping[name.strip()] = ident.strip()
    return mapping


def insert_main_categories(mains: list[str], rng: random.Random) -> dict[str, str]:
    """Insert the file's main categories (idempotent by name)."""
    stamp = now_stamp()
    for name in mains:
        psql(
            'INSERT INTO "business_categories" '
            '(id, name, "isActive", "createdAt", "updatedAt") VALUES '
            f"({sql_quote(cuid(rng))}, {sql_quote(name)}, true, "
            f"{sql_quote(stamp)}, {sql_quote(stamp)}) ON CONFLICT (name) DO NOTHING;"
        )
    return category_id_map()


def import_categories(source_dir: str, rng: random.Random) -> dict[str, str]:
    """Load the file's taxonomy: mains into `business_categories`, the deeper
    levels («زیردسته»/«زیرشاخه») into `business_taxonomy_nodes`."""
    mains, subs, tags = read_category_tree(source_dir)
    mapping = insert_main_categories(mains, rng)
    import_taxonomy(mains, subs, tags, mapping, rng)
    return mapping


def import_taxonomy(
    mains: list[str],
    subs: list[tuple[str, str]],
    tags: list[tuple[str, str, str]],
    category_ids: dict[str, str],
    rng: random.Random,
) -> None:
    """Rebuild the «زیردسته»/«زیرشاخه» tree (derived data, safe to recreate)."""
    psql('DELETE FROM "business_taxonomy_nodes";')
    stamp = now_stamp()
    sub_ids: dict[tuple[str, str], str] = {}
    rows: list[list[str]] = []
    for main, sub in subs:
        category_id = category_ids.get(main)
        if not category_id:
            continue
        node_id = cuid(rng)
        sub_ids[(main, sub)] = node_id
        rows.append([node_id, sub, "SUB", category_id, ""])
    for main, sub, tag in tags:
        category_id = category_ids.get(main)
        parent_id = sub_ids.get((main, sub))
        if not category_id or not parent_id:
            continue
        rows.append([cuid(rng), tag, "TAG", category_id, parent_id])

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    for row in rows:
        writer.writerow([*row, "true", stamp, stamp])
    copy_sql = (
        '\\copy business_taxonomy_nodes '
        '(id, name, level, "categoryId", "parentId", "isActive", "createdAt", "updatedAt") '
        "FROM STDIN WITH (FORMAT csv, NULL '')"
    )
    psql(copy_sql + "\n" + buffer.getvalue() + "\\.\n")
    print(f"taxonomy nodes: {len(subs)} زیردسته + {len(tags)} زیرشاخه")


def purge_legacy(source_dir: str, rng: random.Random) -> None:
    """Local-only clean slate: keep only this file's categories and cards."""
    mains, _, _ = read_category_tree(source_dir)
    # 1) Insert the mains *first* so a legacy category whose name matches one of
    #    them keeps its id — existing rows that reference it stay valid.
    insert_main_categories(mains, rng)
    # 2) Drop every category that is not part of the file (referencing rows'
    #    `businessId` is set to NULL by the FK, exactly as requested).
    kept = ", ".join(sql_quote(name) for name in mains) or "''"
    gone = psql(
        f'DELETE FROM "business_categories" WHERE name NOT IN ({kept}) RETURNING id'
    )
    print(f"removed {len(gone.splitlines())} legacy categories")
    # 3) Drop every pre-existing business card; the `businesses` step right
    #    after re-imports this file's cards.
    removed = psql('DELETE FROM "business_cards" RETURNING id')
    print(f"removed {len(removed.splitlines())} legacy business cards")


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


# The site keeps only these four cities; every other scraped «شهر/منطقه» is a
# region/neighbourhood *inside* one of them (کتالم، سخت‌سر، میر شمس‌الدین،
# گلیجان، خرم‌آبادِ تنکابن، …) and is folded into the matching city below.
CANONICAL_CITIES = ("تنکابن", "خرم\u200cآباد", "شیرود", "رامسر")


def canonical_city(name: str) -> str:
    """«خرم آباد» (plain space) → «خرم‌آباد» (ZWNJ); trim everything else."""
    return (name or "").strip().replace("خرم آباد", "خرم\u200cآباد")


def split_merged_city(name: str) -> list[str]:
    """«تنکابن، شیرود» → ['تنکابن', 'شیرود'] (Persian and latin commas)."""
    return [part.strip() for part in name.replace("،", ",").split(",") if part.strip()]


def resolve_city_name(business: dict) -> str:
    """The canonical city a business belongs to.

    The scraped «شهر (جست‌وجو)» column (``listed_city``) names one of the four
    cities — or the merged «تنکابن، شیرود» bucket Behtarino used for rows whose
    «شهر/منطقه» was empty. Merged rows are split by the «شهر/منطقه» column and
    then by the address, so the merged bucket disappears instead of staying as a
    city of its own. Any other spelling falls back to the record's region.
    """
    listed = canonical_city(business.get("listed_city"))
    parts = split_merged_city(listed)
    if len(parts) == 1:
        if parts[0] in CANONICAL_CITIES:
            return parts[0]
    else:
        region = canonical_city(business.get("city_name"))
        for part in split_merged_city(region):
            if part in ("تنکابن", "شیرود"):
                return part
        address = (business.get("address") or "").strip()
        for part in parts:
            if part in CANONICAL_CITIES and part in address:
                return part
        return parts[0]
    region = canonical_city(business.get("city_name"))
    return region if region in CANONICAL_CITIES else "تنکابن"


def region_as_neighborhood(business: dict) -> str:
    """A non-canonical «شهر/منطقه» worth keeping as a neighbourhood tag.

    Regions like «کتالم وسادات شهر» or «خرم» (the تنکابن district) are real
    places, so when a row has no «محله» of its own we keep the region name as
    the neighbourhood instead of losing it.
    """
    region = canonical_city(business.get("city_name"))
    if not region or region in CANONICAL_CITIES:
        return ""
    if any(part in CANONICAL_CITIES for part in split_merged_city(region)):
        return ""
    return region


def prune_noncanonical_cities() -> None:
    """Keep the city list to four: drop/deactivate every other city row.

    Rows that still reference a non-canonical city are moved to their canonical
    target first (defensive — the import itself never creates them), then any
    city with no remaining reference of its own is deleted; cities still used by
    biolinks (e.g. load-test data) are deactivated instead so those links stay
    intact but the city leaves the public list.
    """
    kept = ", ".join(sql_quote(name) for name in CANONICAL_CITIES)
    removed = psql(
        f'DELETE FROM "cities" WHERE name NOT IN ({kept}) '
        'AND NOT EXISTS (SELECT 1 FROM "biolinks" b WHERE b."cityId" = "cities".id) '
        'RETURNING id'
    )
    deactivated = psql(
        f'UPDATE "cities" SET "isActive" = false, "updatedAt" = {sql_quote(now_stamp())} '
        f'WHERE name NOT IN ({kept}) RETURNING id'
    )
    psql(
        f'UPDATE "cities" SET "isActive" = true WHERE name IN ({kept})'
    )
    print(
        f"pruned cities: removed {len(removed.splitlines())}, "
        f"deactivated {len(deactivated.splitlines())}"
    )


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
    taken_slugs: set[str] | None = None,
) -> list[list[str]]:
    stamp = now_stamp()
    # Slugs are the public URL, so keep the scraped one and only disambiguate
    # when it is already used (a locally created card, a previous import, …).
    used = set(taken_slugs or ())
    rows: list[list[str]] = []
    for business in businesses:
        city_name = resolve_city_name(business)
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
        slug = (business.get("slug") or cuid(rng)).strip()
        base, suffix = slug, 2
        while slug in used:
            slug = f"{base}-{suffix}"
            suffix += 1
        used.add(slug)
        neighborhood = (business.get("neighborhood") or "").strip() or (
            region_as_neighborhood(business)
        )
        rows.append([
            cuid(rng),
            user_id,
            slug,
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
            neighborhood,
        ])
    return rows


COPY_COLUMNS = [
    "id", "userId", "slug", "cityId", "businessId", "fullName", "jobTitle",
    "company", "bio", "phone", "mobile", "email", "website", "address",
    "instagram", "telegram", "whatsapp", "linkedin", "workingHours",
    "isPublished", "status", "approvedAt", "publishedAt", "pinnedAt",
    "isUnclaimed", "createdAt", "updatedAt", "neighborhood",
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
            resolve_city_name(b)
            for b in businesses
        },
        rng,
    )
    # Cards are only tagged with the file's *main* categories; a business whose
    # category is missing is skipped rather than inventing a new category.
    business_ids = category_id_map()

    existing_slugs = {
        line.strip()
        for line in psql('SELECT slug FROM "business_cards"').splitlines()
        if line.strip()
    }
    rows = build_card_rows(
        businesses, user_id, city_ids, business_ids, rng, existing_slugs
    )
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
    prune_noncanonical_cities()
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
    parser.add_argument(
        "--purge",
        action="store_true",
        help="local-only clean slate: drop every pre-existing card and every "
        "category that is not one of the file's main categories",
    )
    args = parser.parse_args()

    rng = random.Random(1405)
    if args.clear:
        clear_imported()
    if args.purge:
        purge_legacy(args.source_dir, rng)
    if args.mode in ("categories", "all"):
        mapping = import_categories(args.source_dir, rng)
        print(f"main categories in database: {len(mapping)}")
    if args.mode in ("businesses", "all"):
        import_businesses(args.source_dir, rng, args.limit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
