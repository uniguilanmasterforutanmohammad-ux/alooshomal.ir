#!/usr/bin/env python3
"""Regenerate the Zohal response-field map from the official OpenAPI spec.

Zohal documents its services behind a login
(https://dashboard.zohal.io/documents); the machine-readable contract is the
`api-1.json` file it publishes. Pass it with `--spec`:

    python3 scripts/sync_zohal_response_fields.py --spec api-1.json

The script writes `apps/api/src/zohal/zohal.response-fields.ts`, a
`path -> response data fields` map. The panel reads it (through
`zohal.constants.ts`) to offer the comparable fields of a module as a dropdown,
so the admin does not have to know the wire names by heart.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

OUTPUT = (
    Path(__file__).resolve().parent.parent
    / "apps/api/src/zohal/zohal.response-fields.ts"
)

# Persian labels for the wire names shared across Zohal services.
ZOHAL_FIELD_LABELS: dict[str, str] = {
    "matched": "نتیجه‌ی تطبیق",
    "national_code": "کد ملی",
    "first_name": "نام",
    "last_name": "نام خانوادگی",
    "father_name": "نام پدر",
    "birth_date": "تاریخ تولد",
    "mobile": "موبایل",
    "phone": "تلفن",
    "alive": "زنده بودن",
    "is_dead": "فوت‌شده",
    "gender": "جنسیت",
    "card_number": "شماره کارت",
    "iban": "شبا",
    "account_number": "شماره حساب",
    "bank_name": "نام بانک",
    "national_id": "شناسه ملی",
    "company_name": "نام شرکت",
    "company_registration_number": "شماره ثبت شرکت",
    "postal_code": "کد پستی",
    "address": "آدرس",
    "province": "استان",
    "city": "شهر",
    "tracking_code": "کد پیگیری",
    "trackingCode": "کد پیگیری",
    "plate_number": "شماره پلاک",
    "enamad_code": "کد اینماد",
    "valid": "معتبر",
    "status": "وضعیت",
    "message": "پیام",
    "error_code": "کد خطا",
    "name": "نام",
    "full_name": "نام و نام خانوادگی",
    "amount": "مبلغ",
    "bill_id": "شناسه قبض",
    "payment_id": "شناسه پرداخت",
    "payment_date": "تاریخ پرداخت",
    "current_date": "تاریخ جاری",
    "previous_date": "تاریخ قبلی",
    "current_reading_date": "تاریخ قرائت فعلی",
    "previous_reading_date": "تاریخ قرائت قبلی",
    "current_counter_value": "رقم کنتور فعلی",
    "previous_counter_value": "رقم کنتور قبلی",
    "account_type": "نوع حساب",
    "consumption_type": "نوع مصرف",
    "subscription": "اشتراک",
    "taxes": "مالیات",
    "insurance": "بیمه",
    "mid_term": "بدهی میان‌مدت",
    "final_term": "بدهی نهایی",
    "inquire_price": "هزینه‌ی استعلام",
    "warning_price": "مبلغ اخطار",
    "warnings": "اخطارها",
    "price_status": "وضعیت قیمت",
    "expired": "منقضی‌شده",
    "expiry_date": "تاریخ انقضا",
    "expiration_date": "تاریخ انقضا",
    "issue_date": "تاریخ صدور",
    "issuance_date": "تاریخ صدور",
    "approve_date": "تاریخ تأیید",
    "register_date": "تاریخ ثبت",
    "created_at": "تاریخ ایجاد",
    "activity_end_date": "تاریخ پایان فعالیت",
    "register_number": "شماره ثبت",
    "company_title": "نام شرکت",
    "company_type": "نوع شرکت",
    "board_members": "اعضای هیئت‌مدیره",
    "bank_account": "شماره حساب",
    "branch_code": "کد شعبه",
    "check_type": "نوع چک",
    "chain": "زنجیره",
    "count": "تعداد",
    "page_count": "تعداد صفحه",
    "paper_id": "شناسه برگه",
    "sayad_id": "شناسه صیاد",
    "serial_no": "شماره سری",
    "series_no": "شماره سری",
    "plate": "پلاک",
    "city_name": "نام شهر",
    "state_name": "نام استان",
    "email_address": "ایمیل",
    "phone_number": "شماره تلفن",
    "fax_number": "شماره نمابر",
    "finglish_text": "متن فینگلیش",
    "srv_text": "متن سرویس",
    "is_transferable": "قابل انتقال",
    "returned_cheques": "چک‌های برگشتی",
    "ejr_inquire_no": "شماره استعلام اجرا",
    "IBAN": "شبا",
    "back": "پشت",
    "front": "روی",
}


def load_spec(path: str | None) -> dict:
    if not path:
        raise SystemExit(
            "مشخصه‌ی OpenAPI زحل را با --spec بدهید "
            "(فایل api-1.json از پنل زحل)."
        )
    return json.loads(Path(path).read_text(encoding="utf-8"))


def single_quote(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def collapse(text: str | None, limit: int = 90) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()[:limit]


def dereference(schemas: dict, schema: dict) -> dict:
    schema = schema if isinstance(schema, dict) else {}
    ref = schema.get("$ref")
    if ref:
        return schemas.get(ref.rsplit("/", 1)[-1], {}) or {}
    return schema


def nested(node: dict, *keys: str) -> dict:
    for key in keys:
        node = node.get(key, {}) if isinstance(node, dict) else {}
    return node if isinstance(node, dict) else {}


def example_values(operation: dict) -> dict:
    """Concrete per-field examples from the operation's `examples` block."""
    node = (
        nested(operation, "responses", "200", "content", "application/json")
        or {}
    )
    for example in (node.get("examples") or {}).values():
        data = nested(example, "value", "response_body", "data")
        if data:
            return data
    return {}


def response_schema(schemas: dict, operation: dict) -> dict:
    node = nested(operation, "responses", "200", "content", "application/json")
    outer = dereference(schemas, node.get("schema", {}))
    body = dereference(schemas, (outer.get("properties") or {}).get("response_body", {}))
    data = dereference(schemas, (body.get("properties") or {}).get("data", {}))
    if not data.get("properties"):
        for option in data.get("oneOf", []) or []:
            candidate = dereference(schemas, option)
            if candidate.get("properties"):
                return candidate
    return data


def render_example(value: object) -> str | None:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str) and value.strip():
        return value.strip()[:60]
    return None


def build_fields(schemas: dict, operation: dict) -> list[str]:
    schema = response_schema(schemas, operation)
    properties = schema.get("properties") or {}
    examples = example_values(operation)
    lines: list[str] = []
    for name, prop in properties.items():
        prop = prop if isinstance(prop, dict) else {}
        label = (
            ZOHAL_FIELD_LABELS.get(name)
            or collapse(prop.get("title"))
            or name
        )
        example = render_example(examples.get(name))
        if example is None:
            example = render_example(prop.get("default"))
        parts = [f"name: {single_quote(name)}", f"label: {single_quote(label)}"]
        if example:
            parts.append(f"example: {single_quote(example)}")
        lines.append("    { " + ", ".join(parts) + " },")
    return lines


def render(spec: dict) -> str:
    schemas = spec.get("components", {}).get("schemas", {})
    entries: list[tuple[str, list[str]]] = []
    for path in sorted(spec.get("paths", {})):
        operations = spec["paths"][path]
        operation = operations.get("post") or operations.get("get") or {}
        fields = build_fields(schemas, operation)
        if fields:
            entries.append((path, fields))

    header = "/**\n"
    header += " * GENERATED FILE — do not edit by hand.\n"
    header += " *\n"
    header += " * Response `data` fields of every Zohal service keyed by its `path`,\n"
    header += " * taken from the official OpenAPI contract (`api-1.json`). Run\n"
    header += " * `python3 scripts/sync_zohal_response_fields.py --spec api-1.json` to\n"
    header += " * regenerate it. The panel uses these fields to offer the comparable\n"
    header += " * response values of a module.\n"
    header += " */\n"
    header += "import type { ZohalResponseField } from './zohal.types';\n\n"
    header += (
        "export const ZOHAL_RESPONSE_FIELDS: Record<string, ZohalResponseField[]> = {\n"
    )
    body: list[str] = []
    for path, fields in entries:
        body.append(f"  {single_quote(path)}: [")
        body.extend(fields)
        body.append("  ],")
    footer = "};\n"
    return header + "\n".join(body) + "\n" + footer


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", help="path to the Zohal api-1.json file")
    args = parser.parse_args()
    spec = load_spec(args.spec)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    text = render(spec)
    OUTPUT.write_text(text, encoding="utf-8")
    count = text.count("\n  '/")
    print(f"wrote {OUTPUT} ({count} services with response fields)")


if __name__ == "__main__":
    main()
