#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Export/import the enriched Behtarino Excel workbook.

The JSON extraction only had the original contact fields. The Excel workbook
adds the extra phone numbers, the five Iranian social networks, coordinates,
the source subscription type, tags and the exact ``main_tag``. This script:

  * ``export`` — writes the 27 requested columns to a UTF-8 (BOM) CSV that can
    be uploaded from the admin panel;
  * ``import`` — imports the same workbook straight into the local database in
    its own dated import batch. Rows whose slug already belongs to a *claimed*
    card are skipped, while previous unclaimed copies of the same slug are
    replaced, so re-running the import never duplicates businesses.

Usage:
  python3 scripts/import_behtarino_xlsx.py export
  python3 scripts/import_behtarino_xlsx.py import
  python3 scripts/import_behtarino_xlsx.py import --limit 20
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import random
import re
from datetime import datetime, timezone

import openpyxl

import import_behtarino as legacy

DEFAULT_XLSX = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "behtarino",
        "behtarino-mazandaran-businesses.xlsx",
    )
)
DEFAULT_OUTPUT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "docs", "import", "behtarino-businesses-27-columns.csv")
)
SHEET_NAME = "کسب‌وکارها"

EXPORT_COLUMNS = [
    "نام کسب‌وکار",
    "دسته اصلی",
    "زیردسته",
    "شهر (جست‌وجو)",
    "شهر / منطقه",
    "محله",
    "آدرس",
    "تلفن",
    "تلفن‌های دیگر",
    "وب‌سایت",
    "اینستاگرام",
    "تلگرام",
    "واتساپ",
    "بله",
    "ایتا",
    "روبیکا",
    "آی‌گپ",
    "سروش",
    "لینکدین",
    "توضیحات",
    "ساعات کاری",
    "عرض جغرافیایی",
    "طول جغرافیایی",
    "نوع اشتراک",
    "ویژگی‌ها",
    "برچسب‌ها",
    "نوع کسب‌وکار (main_tag)",
]

ARRAY_SEPARATOR = "\u001f"
MOBILE_RE = re.compile(r"^09\d{9}$")
SLUG_RE = re.compile(r"/p/([^~/?]+)")


def read_rows(path: str) -> list[dict[str, object]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook[SHEET_NAME] if SHEET_NAME in workbook.sheetnames else workbook.worksheets[0]
    iterator = sheet.iter_rows(values_only=True)
    headers = [str(value).strip() if value is not None else "" for value in next(iterator)]
    rows: list[dict[str, object]] = []
    for values in iterator:
        if not any(value not in (None, "") for value in values):
            continue
        rows.append(dict(zip(headers, values)))
    return rows


def text(row: dict[str, object], key: str) -> str:
    value = row.get(key)
    if value is None:
        return ""
    return str(value).strip()


def text_list(row: dict[str, object], key: str) -> list[str]:
    value = text(row, key)
    if not value:
        return []
    return [part.strip() for part in re.split(r"[,،\n]", value) if part.strip()]


def as_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def source_slug(row: dict[str, object], fallback: str) -> str:
    url = text(row, "لینک صفحه")
    match = SLUG_RE.search(url)
    if match:
        return match.group(1).strip()
    return legacy.cuid()


def url_or_base(base: str, value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return base + value.lstrip("@/")


def whatsapp_url(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    digits = "".join(ch for ch in value if ch.isdigit())
    return f"https://wa.me/{digits}" if digits else ""


def split_phones(value: str) -> list[str]:
    parts = re.split(r"[,،;/\n]", value)
    result: list[str] = []
    for part in parts:
        digits = "".join(ch for ch in part if ch.isdigit() or ch == "+")
        if digits and digits not in result:
            result.append(digits)
    return result


def phone_fields(row: dict[str, object]) -> tuple[str, str, list[str]]:
    primary = split_phones(text(row, "تلفن"))
    extra = split_phones(text(row, "تلفن‌های دیگر"))
    combined = primary + [number for number in extra if number not in primary]
    mobile = next((number for number in combined if MOBILE_RE.match(number)), "")
    landline = next(
        (number for number in combined if number != mobile and not MOBILE_RE.match(number)),
        "",
    )
    # Keep the source's «تلفن‌های دیگر» column intact instead of dropping the
    # number that happened to become the primary phone/mobile above.
    return landline, mobile, extra


def pg_array(values: list[str]) -> str:
    if not values:
        return "{}"
    escaped = []
    for value in values:
        item = value.replace("\\", "\\\\").replace('"', '\\"')
        escaped.append(f'"{item}"')
    return "{" + ",".join(escaped) + "}"


def ensure_taxonomy_nodes(
    rows: list[dict[str, object]],
    business_ids: dict[str, str],
    rng: random.Random,
) -> int:
    """Create missing «زیردسته» search nodes for the workbook's categories."""
    pairs = sorted(
        {
            (text(row, "دسته اصلی"), text(row, "زیردسته"))
            for row in rows
            if text(row, "دسته اصلی") and text(row, "زیردسته")
        }
    )
    if not pairs:
        return 0
    stamp = legacy.now_stamp()
    values = []
    for category, sub in pairs:
        if category not in business_ids:
            continue
        values.append(
            "("
            + ", ".join(
                [
                    legacy.sql_quote(legacy.cuid(rng)),
                    legacy.sql_quote(category),
                    legacy.sql_quote(sub),
                    legacy.sql_quote(stamp),
                ]
            )
            + ")"
        )
    if not values:
        return 0
    inserted = legacy.psql(
        'INSERT INTO business_taxonomy_nodes '
        '(id, name, level, "categoryId", "parentId", "isActive", "createdAt", "updatedAt") '
        "SELECT v.id, v.sub_name, 'SUB', b.id, NULL, true, "
        "v.stamp::timestamp, v.stamp::timestamp "
        f"FROM (VALUES {', '.join(values)}) AS v(id, category_name, sub_name, stamp) "
        'JOIN business_categories b ON b.name = v.category_name '
        'WHERE NOT EXISTS (SELECT 1 FROM business_taxonomy_nodes n '
        "WHERE n.level = 'SUB' AND n.\"categoryId\" = b.id AND n.name = v.sub_name) "
        "RETURNING id"
    )
    count = len([line for line in inserted.splitlines() if line.strip()])
    print(f"taxonomy nodes: added {count} missing زیردسته")
    return count


def export_csv(path: str, output: str) -> int:
    rows = read_rows(path)
    os.makedirs(os.path.dirname(output), exist_ok=True)
    with open(output, "w", encoding="utf-8-sig", newline="") as handle:
        # Quote every field so CSV readers keep leading zeros in phone numbers
        # instead of turning `0115…` into a number.
        writer = csv.writer(handle, lineterminator="\n", quoting=csv.QUOTE_ALL)
        writer.writerow(EXPORT_COLUMNS)
        for row in rows:
            writer.writerow(
                [
                    text(row, "نام کسب‌وکار"),
                    text(row, "دسته اصلی"),
                    text(row, "زیردسته"),
                    text(row, "شهر (جست‌وجو)"),
                    text(row, "شهر / منطقه"),
                    text(row, "محله"),
                    text(row, "آدرس"),
                    text(row, "تلفن"),
                    text(row, "تلفن‌های دیگر"),
                    text(row, "وب‌سایت"),
                    text(row, "اینستاگرام"),
                    text(row, "تلگرام"),
                    text(row, "واتساپ"),
                    text(row, "بله"),
                    text(row, "ایتا"),
                    text(row, "روبیکا"),
                    text(row, "آی‌گپ"),
                    text(row, "سروش"),
                    text(row, "لینکدین"),
                    text(row, "توضیحات"),
                    text(row, "ساعات کاری"),
                    text(row, "عرض جغرافیایی"),
                    text(row, "طول جغرافیایی"),
                    text(row, "نوع اشتراک"),
                    "، ".join(text_list(row, "ویژگی‌ها")),
                    "، ".join(text_list(row, "برچسب‌ها")),
                    text(row, "نوع کسب‌وکار (main_tag)"),
                ]
            )
    print(f"exported {len(rows)} rows → {output}")
    return len(rows)


def build_card_rows(
    rows: list[dict[str, object]],
    user_id: str,
    city_ids: dict[str, str],
    business_ids: dict[str, str],
    batch_id: str,
    rng: random.Random,
) -> tuple[list[list[str]], int]:
    stamp = legacy.now_stamp()
    existing: dict[str, bool] = {}
    for line in legacy.psql('SELECT slug || \'|\' || "isUnclaimed" FROM "business_cards"').splitlines():
        if "|" in line:
            slug, unclaimed = line.rsplit("|", 1)
            existing[slug] = unclaimed.strip().lower() in ("t", "true", "1")

    used: set[str] = set()
    result: list[list[str]] = []
    skipped_claimed = 0
    for row in rows:
        name = text(row, "نام کسب‌وکار")
        category = text(row, "دسته اصلی")
        if not name or not category:
            continue
        city_name = legacy.resolve_city_name(
            {
                "listed_city": text(row, "شهر (جست‌وجو)"),
                "city_name": text(row, "شهر / منطقه"),
                "address": text(row, "آدرس"),
            }
        )
        city_id = city_ids.get(city_name)
        business_id = business_ids.get(category)
        if not city_id or not business_id:
            continue

        slug = source_slug(row, name)
        if existing.get(slug) is False:
            skipped_claimed += 1
            continue
        base, suffix = slug, 2
        while slug in used:
            slug = f"{base}-{suffix}"
            suffix += 1
        used.add(slug)

        phone, mobile, other_phones = phone_fields(row)
        main_tag = text(row, "نوع کسب‌وکار (main_tag)")
        sub_category = text(row, "زیردسته")
        job_title = main_tag or sub_category or text(row, "صنف / گیلد")
        working_hours = legacy.parse_working_hours(text(row, "ساعات کاری"))
        neighborhood = text(row, "محله") or legacy.region_as_neighborhood(
            {
                "listed_city": text(row, "شهر (جست‌وجو)"),
                "city_name": text(row, "شهر / منطقه"),
            }
        )

        result.append(
            [
                legacy.cuid(rng),
                user_id,
                slug,
                city_id,
                business_id,
                name,
                job_title,
                main_tag,
                sub_category,
                neighborhood,
                text(row, "آدرس"),
                text(row, "توضیحات"),
                phone,
                mobile,
                text(row, "وب‌سایت"),
                pg_array(other_phones),
                url_or_base("https://instagram.com/", text(row, "اینستاگرام")),
                url_or_base("https://t.me/", text(row, "تلگرام")),
                whatsapp_url(text(row, "واتساپ")),
                text(row, "لینکدین"),
                text(row, "بله"),
                text(row, "ایتا"),
                text(row, "روبیکا"),
                text(row, "آی‌گپ"),
                text(row, "سروش"),
                json.dumps(working_hours, ensure_ascii=False) if working_hours else "",
                str(as_float(row.get("عرض جغرافیایی")) or ""),
                str(as_float(row.get("طول جغرافیایی")) or ""),
                text(row, "نوع اشتراک"),
                pg_array(text_list(row, "ویژگی‌ها")),
                pg_array(text_list(row, "برچسب‌ها")),
                "false",
                "APPROVED",
                stamp,
                stamp,
                "true",
                stamp,
                stamp,
                batch_id,
            ]
        )
    return result, skipped_claimed


STAGING_COLUMNS = [
    "id",
    "user_id",
    "slug",
    "city_id",
    "business_id",
    "full_name",
    "job_title",
    "main_tag",
    "sub_category",
    "neighborhood",
    "address",
    "bio",
    "phone",
    "mobile",
    "website",
    "other_phones",
    "instagram",
    "telegram",
    "whatsapp",
    "linkedin",
    "bale",
    "eitaa",
    "rubika",
    "igap",
    "soroush",
    "working_hours",
    "latitude",
    "longitude",
    "subscription_type",
    "features",
    "tags",
    "is_published",
    "status",
    "approved_at",
    "pinned_at",
    "is_unclaimed",
    "created_at",
    "updated_at",
    "import_batch_id",
]

STAGING_TYPES = {
    "other_phones": "text[]",
    "features": "text[]",
    "tags": "text[]",
}


def import_cards(
    path: str,
    limit: int | None = None,
    batch_label: str | None = None,
) -> None:
    rows = read_rows(path)
    if limit:
        rows = rows[:limit]
    rng = random.Random()
    user_id = legacy.ensure_import_user(rng)
    categories = sorted({text(row, "دسته اصلی") for row in rows if text(row, "دسته اصلی")})
    business_ids = legacy.insert_main_categories(categories, rng)
    ensure_taxonomy_nodes(rows, business_ids, rng)
    city_ids = legacy.ensure_cities(
        {
            legacy.resolve_city_name(
                {
                    "listed_city": text(row, "شهر (جست‌وجو)"),
                    "city_name": text(row, "شهر / منطقه"),
                    "address": text(row, "آدرس"),
                }
            )
            for row in rows
        },
        rng,
    )
    label = (batch_label or "").strip() or "ایمپورت اکسل به‌ترینو"
    batch_id = legacy.create_import_batch(
        f"{label} — {legacy.now_stamp()}",
        rng,
        source="behtarino-xlsx",
        note="کارت‌های واردشده از فایل اکسل غنی‌شده (منتشرنشده تا زمان تصاحب صاحب)",
    )
    card_rows, skipped_claimed = build_card_rows(
        rows, user_id, city_ids, business_ids, batch_id, rng
    )
    if not card_rows:
        legacy.psql(
            'DELETE FROM "business_card_import_batches" WHERE id = ' + legacy.sql_quote(batch_id)
        )
        print("no business cards imported; empty batch removed")
        return

    declarations = []
    for column in STAGING_COLUMNS:
        sql_type = STAGING_TYPES.get(column, "text")
        declarations.append(f"{column} {sql_type}")
    create_sql = "CREATE TEMP TABLE _xlsx_import (" + ", ".join(declarations) + ");"

    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    for row in card_rows:
        writer.writerow(row)
    copy_sql = (
        "\\copy _xlsx_import (" + ", ".join(STAGING_COLUMNS) + ") "
        "FROM STDIN WITH (FORMAT csv, NULL '')"
    )
    insert_columns = [
        "id", '"userId"', "slug", '"cityId"', '"businessId"', '"fullName"',
        '"jobTitle"', '"mainTag"', '"subCategory"', '"neighborhood"', "address",
        "bio", "phone", "mobile", "website", '"otherPhones"', "instagram",
        "telegram", "whatsapp", "linkedin", "bale", "eitaa", "rubika", "igap",
        "soroush", '"workingHours"', "latitude", "longitude", '"subscriptionType"',
        "features", "tags", '"isPublished"', "status", '"approvedAt"',
        '"pinnedAt"', '"isUnclaimed"', '"createdAt"', '"updatedAt"', '"importBatchId"',
    ]
    select_columns = [
        "id", "user_id", "slug", "city_id", "business_id", "full_name",
        "job_title", "main_tag", "sub_category", "neighborhood", "address",
        "bio", "phone", "mobile", "website", "other_phones", "instagram",
        "telegram", "whatsapp", "linkedin", "bale", "eitaa",
        "rubika", "igap", "soroush",
        "NULLIF(working_hours, '')::jsonb",
        "NULLIF(latitude, '')::double precision",
        "NULLIF(longitude, '')::double precision",
        "subscription_type", "features", "tags",
        "is_published::boolean", 'status::"BiolinkStatus"',
        "approved_at::timestamp", "pinned_at::timestamp",
        "is_unclaimed::boolean", "created_at::timestamp", "updated_at::timestamp",
        "import_batch_id",
    ]
    script = "\n".join(
        [
            "BEGIN;",
            create_sql,
            copy_sql,
            buffer.getvalue() + "\\.",
            (
                'DELETE FROM business_cards c USING _xlsx_import s '
                'WHERE c.slug = s.slug AND c."isUnclaimed" = true;'
            ),
            (
                f'INSERT INTO business_cards ({", ".join(insert_columns)}) '
                f'SELECT {", ".join(select_columns)} FROM _xlsx_import s '
                'WHERE NOT EXISTS (SELECT 1 FROM business_cards c WHERE c.slug = s.slug);'
            ),
            "SELECT 'IMPORTED|' || count(*) FROM _xlsx_import s "
            'JOIN business_cards c ON c.slug = s.slug AND c."importBatchId" = '
            + legacy.sql_quote(batch_id)
            + ";",
            "COMMIT;",
            "",
        ]
    )
    output = legacy.psql(script)
    imported = len(card_rows)
    for line in output.splitlines():
        if line.startswith("IMPORTED|"):
            imported = int(line.split("|", 1)[1])
            break
    legacy.psql(
        "DELETE FROM business_card_import_batches b "
        "WHERE b.source = 'behtarino-xlsx' "
        "AND NOT EXISTS (SELECT 1 FROM business_cards c WHERE c.\"importBatchId\" = b.id)"
    )
    print(
        f"imported {imported} business cards "
        f"(skipped {skipped_claimed} already-claimed; rows={len(rows)})"
    )
    print(f"import batch: {batch_id} — {label}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["export", "import"])
    parser.add_argument("--xlsx", default=DEFAULT_XLSX)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--batch-label", default=None)
    args = parser.parse_args()
    if args.command == "export":
        export_csv(args.xlsx, args.output)
    else:
        import_cards(args.xlsx, args.limit, args.batch_label)


if __name__ == "__main__":
    main()
