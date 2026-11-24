#!/usr/bin/env python3
"""Read-only database health audit.

Runs a fixed set of consistency checks against the project database and prints
a compact report. Nothing is modified, so it is safe to run on production.

Checks cover the invariants the application relies on:
  * every PAID payment has its invoice (AGENTS.md rule 11),
  * no orphan rows for the main relations,
  * invoice totals match their line items,
  * wallet balances match the ledger,
  * no empty slugs / invalid national codes / published unclaimed cards,
  * stale sessions and other tables that grow over time.

Usage:
  python3 scripts/db_audit.py                 # via docker compose (default)
  python3 scripts/db_audit.py --no-fail       # report only, exit 0
  python3 scripts/db_audit.py --service db --user bizcard --db bizcard

Exit code 1 when a critical check fails (unless --no-fail).
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_env(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.isfile(path):
        return values
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("'\"")
    return values


class Psql:
    def __init__(self, service: str, user: str, database: str) -> None:
        self.service = service
        self.user = user
        self.database = database

    def rows(self, sql: str) -> list[str]:
        cmd = [
            "docker",
            "compose",
            "exec",
            "-T",
            self.service,
            "psql",
            "-U",
            self.user,
            "-d",
            self.database,
            "-At",
            "-F",
            "|",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            sql,
        ]
        result = subprocess.run(
            cmd,
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "psql failed")
        return [line for line in result.stdout.splitlines() if line.strip()]


def invoice_check(source_table: str, source_type: str, extra_where: str = "") -> str:
    return f"""
      SELECT count(*)
      FROM {source_table} p
      LEFT JOIN invoices i
        ON i."sourceType" = '{source_type}' AND i."sourceId" = p.id
      WHERE p.status = 'PAID' {extra_where} AND i.id IS NULL
    """


CHECKS: list[dict[str, str]] = [
    {
        "name": "پرداخت اشتراک PAID بدون فاکتور",
        "severity": "critical",
        "sql": invoice_check("subscription_payments", "SUBSCRIPTION_PAYMENT"),
        "sample": """
          SELECT p.id FROM subscription_payments p
          LEFT JOIN invoices i ON i."sourceType"='SUBSCRIPTION_PAYMENT' AND i."sourceId"=p.id
          WHERE p.status='PAID' AND i.id IS NULL LIMIT 5
        """,
    },
    {
        "name": "پرداخت خدمت PAID بدون فاکتور",
        "severity": "critical",
        "sql": invoice_check("service_payments", "SERVICE_PAYMENT"),
        "sample": """
          SELECT p.id FROM service_payments p
          LEFT JOIN invoices i ON i."sourceType"='SERVICE_PAYMENT' AND i."sourceId"=p.id
          WHERE p.status='PAID' AND i.id IS NULL LIMIT 5
        """,
    },
    {
        "name": "تسویه کیف پول PAID بدون فاکتور",
        "severity": "critical",
        "sql": invoice_check("wallet_payments", "WALLET_PAYMENT"),
        "sample": """
          SELECT p.id FROM wallet_payments p
          LEFT JOIN invoices i ON i."sourceType"='WALLET_PAYMENT' AND i."sourceId"=p.id
          WHERE p.status='PAID' AND i.id IS NULL LIMIT 5
        """,
    },
    {
        "name": "پرداخت پله/تبلیغ PAID بدون فاکتور",
        "severity": "critical",
        "sql": """
          SELECT count(*)
          FROM request_payments p
          LEFT JOIN invoices i
            ON i."sourceType" = CASE p.target
                 WHEN 'BOOST' THEN 'BOOST_PAYMENT'
                 WHEN 'AD_HOME' THEN 'AD_HOME_PAYMENT'
                 WHEN 'AD_DIRECTORY' THEN 'AD_DIRECTORY_PAYMENT'
               END
           AND i."sourceId" = p.id
          WHERE p.status = 'PAID' AND i.id IS NULL
        """,
        "sample": """
          SELECT p.id FROM request_payments p
          LEFT JOIN invoices i
            ON i."sourceType" = CASE p.target
                 WHEN 'BOOST' THEN 'BOOST_PAYMENT'
                 WHEN 'AD_HOME' THEN 'AD_HOME_PAYMENT'
                 WHEN 'AD_DIRECTORY' THEN 'AD_DIRECTORY_PAYMENT'
               END
           AND i."sourceId" = p.id
          WHERE p.status = 'PAID' AND i.id IS NULL LIMIT 5
        """,
    },
    {
        "name": "خرید ماژول/مدیریت PAID بدون فاکتور",
        "severity": "critical",
        "sql": invoice_check("business_module_purchases", "BUSINESS_MODULE_PAYMENT"),
        "sample": """
          SELECT p.id FROM business_module_purchases p
          LEFT JOIN invoices i ON i."sourceType"='BUSINESS_MODULE_PAYMENT' AND i."sourceId"=p.id
          WHERE p.status='PAID' AND i.id IS NULL LIMIT 5
        """,
    },
    {
        "name": "فاکتور با جمع نامطابق (subtotal + tax <> total)",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM invoices WHERE subtotal + "taxAmount" <> total',
        "sample": 'SELECT id FROM invoices WHERE subtotal + "taxAmount" <> total LIMIT 5',
    },
    {
        "name": "فاکتور با جمع اقلام نامطابق",
        "severity": "critical",
        "sql": """
          SELECT count(*) FROM (
            SELECT i.id
            FROM invoices i
            JOIN invoice_items it ON it."invoiceId" = i.id
            GROUP BY i.id, i.total
            HAVING sum(it.total) <> i.total
          ) bad
        """,
        "sample": """
          SELECT i.id
          FROM invoices i
          JOIN invoice_items it ON it."invoiceId" = i.id
          GROUP BY i.id, i.total
          HAVING sum(it.total) <> i.total
          LIMIT 5
        """,
    },
    {
        "name": "موجودی کیف پول نامطابق با دفتر",
        "severity": "critical",
        "sql": """
          SELECT count(*) FROM (
            SELECT w.id
            FROM user_wallets w
            LEFT JOIN wallet_entries e ON e."walletId" = w.id
            GROUP BY w.id, w.balance
            HAVING w.balance <> coalesce(sum(e.amount), 0)
          ) bad
        """,
        "sample": """
          SELECT w.id
          FROM user_wallets w
          LEFT JOIN wallet_entries e ON e."walletId" = w.id
          GROUP BY w.id, w.balance
          HAVING w.balance <> coalesce(sum(e.amount), 0)
          LIMIT 5
        """,
    },
    {
        "name": "بیولینک یتیم (مالک ناموجود)",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM biolinks b LEFT JOIN users u ON u.id = b."userId" WHERE u.id IS NULL',
        "sample": 'SELECT b.id FROM biolinks b LEFT JOIN users u ON u.id = b."userId" WHERE u.id IS NULL LIMIT 5',
    },
    {
        "name": "کارت ویزیت یتیم (مالک ناموجود)",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM business_cards c LEFT JOIN users u ON u.id = c."userId" WHERE u.id IS NULL',
        "sample": 'SELECT c.id FROM business_cards c LEFT JOIN users u ON u.id = c."userId" WHERE u.id IS NULL LIMIT 5',
    },
    {
        "name": "پست فید یتیم",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM feed_posts p LEFT JOIN users u ON u.id = p."userId" WHERE u.id IS NULL',
        "sample": 'SELECT p.id FROM feed_posts p LEFT JOIN users u ON u.id = p."userId" WHERE u.id IS NULL LIMIT 5',
    },
    {
        "name": "نشست یتیم",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM sessions s LEFT JOIN users u ON u.id = s."userId" WHERE u.id IS NULL',
        "sample": 'SELECT s.id FROM sessions s LEFT JOIN users u ON u.id = s."userId" WHERE u.id IS NULL LIMIT 5',
    },
    {
        "name": "آیتم فاکتور یتیم",
        "severity": "critical",
        "sql": 'SELECT count(*) FROM invoice_items it LEFT JOIN invoices i ON i.id = it."invoiceId" WHERE i.id IS NULL',
        "sample": 'SELECT it.id FROM invoice_items it LEFT JOIN invoices i ON i.id = it."invoiceId" WHERE i.id IS NULL LIMIT 5',
    },
    {
        "name": "اسلاگ خالی (بیولینک/کارت)",
        "severity": "warning",
        "sql": """
          SELECT
            (SELECT count(*) FROM biolinks WHERE btrim(coalesce(slug,'')) = '')
          + (SELECT count(*) FROM business_cards WHERE btrim(coalesce(slug,'')) = '')
        """,
        "sample": """
          SELECT 'biolink:' || id FROM biolinks WHERE btrim(coalesce(slug,'')) = ''
          UNION ALL
          SELECT 'card:' || id FROM business_cards WHERE btrim(coalesce(slug,'')) = ''
          LIMIT 5
        """,
    },
    {
        "name": "کارت واردشده‌ی منتشرشده (باید منتشرنشده بماند)",
        "severity": "warning",
        "sql": 'SELECT count(*) FROM business_cards WHERE "isUnclaimed" = true AND "isPublished" = true',
        "sample": 'SELECT id FROM business_cards WHERE "isUnclaimed" = true AND "isPublished" = true LIMIT 5',
    },
    {
        "name": "کد ملی نامعتبر در پروفایل",
        "severity": "warning",
        "sql": """
          SELECT count(*) FROM users
          WHERE "nationalCode" IS NOT NULL
            AND ("nationalCode" !~ '^[0-9]{10}$' OR "nationalCode" ~ '^([0-9])\\1{9}$')
        """,
        "sample": """
          SELECT id FROM users
          WHERE "nationalCode" IS NOT NULL
            AND ("nationalCode" !~ '^[0-9]{10}$' OR "nationalCode" ~ '^([0-9])\\1{9}$')
          LIMIT 5
        """,
    },
    {
        "name": "نشست منقضی/بیکار (قابل پاک‌سازی)",
        "severity": "warning",
        "sql": """
          SELECT count(*) FROM sessions
          WHERE "expiresAt" < now()
             OR "lastUsedAt" < now() - interval '7 days'
             OR "revokedAt" < now() - interval '7 days'
        """,
        "sample": """
          SELECT id FROM sessions
          WHERE "expiresAt" < now()
             OR "lastUsedAt" < now() - interval '7 days'
             OR "revokedAt" < now() - interval '7 days'
          LIMIT 5
        """,
    },
    {
        "name": "پست فید با تگ ناقص",
        "severity": "warning",
        "sql": """
          SELECT count(*) FROM feed_posts
          WHERE "tagKind" IS NOT NULL
            AND "tagBiolinkId" IS NULL AND "tagBusinessCardId" IS NULL
        """,
        "sample": """
          SELECT id FROM feed_posts
          WHERE "tagKind" IS NOT NULL
            AND "tagBiolinkId" IS NULL AND "tagBusinessCardId" IS NULL
          LIMIT 5
        """,
    },
    {
        "name": "منبع ناشناخته در فاکتورها",
        "severity": "warning",
        "sql": """
          SELECT count(*) FROM invoices
          WHERE "sourceType" NOT IN (
            'SUBSCRIPTION_PAYMENT','BOOST_PAYMENT','AD_HOME_PAYMENT',
            'AD_DIRECTORY_PAYMENT','FEED_TAG','SERVICE_PAYMENT',
            'BUSINESS_MODULE_PAYMENT','WALLET_PAYMENT','MANUAL_SALE'
          )
        """,
        "sample": """
          SELECT id || ':' || "sourceType" FROM invoices
          WHERE "sourceType" NOT IN (
            'SUBSCRIPTION_PAYMENT','BOOST_PAYMENT','AD_HOME_PAYMENT',
            'AD_DIRECTORY_PAYMENT','FEED_TAG','SERVICE_PAYMENT',
            'BUSINESS_MODULE_PAYMENT','WALLET_PAYMENT','MANUAL_SALE'
          )
          LIMIT 5
        """,
    },
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only database audit")
    parser.add_argument("--service", default="db", help="docker compose service (default: db)")
    parser.add_argument("--user", default=None, help="Postgres user (default: POSTGRES_USER)")
    parser.add_argument("--db", default=None, help="Postgres database (default: POSTGRES_DB)")
    parser.add_argument("--no-fail", action="store_true", help="always exit 0")
    args = parser.parse_args()

    env = read_env(os.path.join(ROOT, ".env"))
    user = args.user or env.get("POSTGRES_USER") or "alooshomal"
    database = args.db or env.get("POSTGRES_DB") or user
    psql = Psql(args.service, user, database)

    critical = 0
    warnings = 0
    print(f"DB audit — {user}@{database} (service: {args.service})")
    print("-" * 64)
    for check in CHECKS:
        try:
            count = int(psql.rows(check["sql"])[0])
        except (RuntimeError, IndexError, ValueError) as error:
            print(f"[ERROR] {check['name']}: {error}")
            critical += 1
            continue
        if count == 0:
            print(f"[OK]   {check['name']}")
            continue
        if check["severity"] == "critical":
            critical += 1
            marker = "[FAIL]"
        else:
            warnings += 1
            marker = "[WARN]"
        print(f"{marker} {check['name']}: {count}")
        try:
            samples = psql.rows(check["sample"])[:5]
        except RuntimeError:
            samples = []
        if samples:
            print(f"       نمونه: {', '.join(samples)}")

    print("-" * 64)
    print(f"خلاصه: {critical} بحرانی، {warnings} هشدار")
    if critical and not args.no_fail:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
