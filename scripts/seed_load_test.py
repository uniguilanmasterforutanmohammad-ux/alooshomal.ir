#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Seed the local database with the generated load-testing rows.

Reads test-data/biolinks-2500.csv and test-data/business-cards-2300.csv
(produced by scripts/generate_test_data.py) and inserts them directly into
Postgres as APPROVED + published rows tagged isTestData = true. This mirrors
what the admin bulk importer does, but without going through the HTTP API, so a
fresh local load test can be prepared in seconds.

All rows are owned by the first USER account (or the admin when no user exists).
Cities and business categories are created on demand.

Usage:
  python3 scripts/seed_load_test.py [--database-url URL] [--clear]

  --clear   delete existing isTestData rows first (keeps real content intact)
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import shutil
import subprocess

DEFAULT_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://bizcard:bizcard_secret@localhost:5432/bizcard?schema=public",
)

SEED = 1405
ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"


def cuid(rng: random.Random) -> str:
    return "c" + "".join(rng.choice(ID_ALPHABET) for _ in range(24))


PSQL_CMD = shutil.which("psql")
DB_CONTAINER = os.environ.get("ALOOSHOMAL_DB_CONTAINER", "alooshomal-db")


def psql(url: str, sql: str) -> str:
    if PSQL_CMD:
        command = [PSQL_CMD, url, "-v", "ON_ERROR_STOP=1", "-tA"]
    else:
        command = ["docker", "exec", "-i", DB_CONTAINER, "psql", url, "-v", "ON_ERROR_STOP=1", "-tA"]
    result = subprocess.run(
        command,
        input=sql,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or "psql failed")
    return result.stdout.strip()


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def read_rows(path: str) -> list[dict[str, str]]:
    with open(path, encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def ensure_lookup(url: str, rng: random.Random, table: str, names: set[str]) -> dict[str, str]:
    existing = psql(url, 'SELECT name || \'|\' || id FROM "' + table + '"')
    mapping: dict[str, str] = {}
    for line in existing.splitlines():
        if "|" in line:
            name, ident = line.split("|", 1)
            mapping[name] = ident
    for name in sorted(names):
        if name in mapping:
            continue
        ident = cuid(rng)
        psql(
            url,
            'INSERT INTO "' + table + '" (id, name, "isActive", "createdAt", "updatedAt") '
            "VALUES (" + sql_quote(ident) + ", " + sql_quote(name) + ", true, now(), now()) "
            "ON CONFLICT (name) DO NOTHING",
        )
        mapping[name] = ident
    return mapping


def owner_user(url: str) -> str:
    ident = psql(url, "SELECT id FROM users WHERE role='USER' ORDER BY \"createdAt\" LIMIT 1")
    if ident:
        return ident
    ident = psql(url, "SELECT id FROM users ORDER BY \"createdAt\" LIMIT 1")
    if ident:
        return ident
    raise SystemExit("no user found; register a user first")


def insert_rows(
    url: str,
    table: str,
    rows: list[dict[str, str]],
    owner: str,
    cities: dict[str, str],
    businesses: dict[str, str],
    tag: str,
    rng: random.Random,
) -> int:
    values: list[str] = []
    for index, row in enumerate(rows, start=1):
        slug = tag + "-" + str(index).zfill(5) + "-" + rng.choice(ID_ALPHABET) + rng.choice(ID_ALPHABET)
        city_id = cities.get(row["شهر"], "")
        business_id = businesses.get(row["کسب و کار"], "")
        values.append(
            "("
            + ", ".join(
                [
                    sql_quote(cuid(rng)),
                    sql_quote(owner),
                    sql_quote(slug),
                    "NULLIF(" + sql_quote(city_id) + ", '')",
                    "NULLIF(" + sql_quote(business_id) + ", '')",
                    sql_quote(row["نام"]),
                    sql_quote(row.get("عنوان شغلی", "")),
                    sql_quote(row.get("شرکت", "")),
                    sql_quote(row.get("درباره من", "")),
                    sql_quote(row.get("تلفن", "")),
                    sql_quote(row.get("ایمیل", "")),
                    sql_quote(row.get("وبسایت", "")),
                    sql_quote(row.get("آدرس", "")),
                    "'APPROVED'",
                    "true",
                    "now()",
                    "now()",
                    "true",
                    "now()",
                    "now()",
                ]
            )
            + ")"
        )

    if not values:
        return 0

    columns = (
        "id, \"userId\", slug, \"cityId\", \"businessId\", \"fullName\", \"jobTitle\", "
        "\"company\", bio, phone, email, website, address, status, \"isPublished\", "
        "\"approvedAt\", \"publishedAt\", \"isTestData\", \"createdAt\", \"updatedAt\""
    )
    chunk = 500
    inserted = 0
    for start in range(0, len(values), chunk):
        batch = values[start : start + chunk]
        psql(url, 'INSERT INTO "' + table + '" (' + columns + ") VALUES " + ", ".join(batch))
        inserted += len(batch)
    return inserted


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database-url", default=DEFAULT_URL)
    parser.add_argument("--clear", action="store_true")
    parser.add_argument("--data-dir", default="test-data")
    args = parser.parse_args()

    url = args.database_url.replace("?schema=public", "")
    rng = random.Random(SEED)

    if args.clear:
        psql(url, 'DELETE FROM biolinks WHERE "isTestData" = true')
        psql(url, 'DELETE FROM business_cards WHERE "isTestData" = true')
        print("cleared previous test rows")

    biolink_rows = read_rows(os.path.join(args.data_dir, "biolinks-2500.csv"))
    card_rows = read_rows(os.path.join(args.data_dir, "business-cards-2300.csv"))

    all_rows = biolink_rows + card_rows
    cities = ensure_lookup(url, rng, "cities", {r["شهر"] for r in all_rows})
    businesses = ensure_lookup(url, rng, "business_categories", {r["کسب و کار"] for r in all_rows})
    owner = owner_user(url)

    for table, rows, tag in (
        ("biolinks", biolink_rows, "test-bl"),
        ("business_cards", card_rows, "test-bc"),
    ):
        inserted = insert_rows(url, table, rows, owner, cities, businesses, tag, rng)
        print(table + ": inserted " + str(inserted))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
