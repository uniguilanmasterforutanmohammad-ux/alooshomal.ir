#!/usr/bin/env python3
"""Regenerate the api.ir web-service catalogue from the official OpenAPI spec.

api.ir documents every web service on its Scalar page
(https://s.api.ir/scalar/v1) and publishes the machine-readable spec at
https://s.api.ir/openapi/v1.json. The admin «api.ir» panel is driven by the
generated `apps/api/src/apiir/apiir.constants.ts`, so when api.ir adds or
changes a service, re-run this script and commit the result.

Usage:
    python3 scripts/sync_apiir_catalog.py                # fetch the spec
    python3 scripts/sync_apiir_catalog.py --spec spec.json

Tariffs: api.ir publishes the official per-inquiry tariff only inside its
logged-in provider panel (https://p.api.ir/service/list) — there is no public
JSON for it. Drop the numbers into `scripts/apiir_tariffs.json`
(`{"license": 25000, ...}`, keyed by the service key used in the panel) and
re-run this script; each matching service then gets a `tariff` (Toman) that the
admin panel shows on its card. Services without an entry simply omit it.
"""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
from pathlib import Path

SPEC_URL = "https://s.api.ir/openapi/v1.json"
OUTPUT = Path(__file__).resolve().parent.parent / "apps/api/src/apiir/apiir.constants.ts"
DEFAULT_TARIFFS = Path(__file__).resolve().parent / "apiir_tariffs.json"

# Persian grouping for the panel. Every service not listed falls into «سایر».
GROUPS: dict[str, str] = {
    "Shahkar": "احراز هویت",
    "ShahkarLite": "احراز هویت",
    "ShahkarPro": "احراز هویت",
    "PersonInfo": "احراز هویت",
    "PersonData": "احراز هویت",
    "Sana": "احراز هویت",
    "VideoVerifySpeechText": "احراز هویت",
    "VideoVerify": "احراز هویت",
    "NationalityStatus": "احراز هویت",
    "PassportStatus": "احراز هویت",
    "CardMatch": "بانکی",
    "CardMobileMatch": "بانکی",
    "IbanMatch": "بانکی",
    "IbanMatchPro": "بانکی",
    "BankAccountInfo": "بانکی",
    "BankCardInfo": "بانکی",
    "CardInfo": "بانکی",
    "CardToIban": "بانکی",
    "IbanInfo": "بانکی",
    "ActiveLoans": "بانکی",
    "UnpaidCheque": "بانکی",
    "UnpaidChequeLite": "بانکی",
    "UnpaidChequePro": "بانکی",
    "ChequeColor": "بانکی",
    "ChequeInfo": "بانکی",
    "CompanyInfo": "شرکت و کسب‌وکار",
    "CompanyMembers": "شرکت و کسب‌وکار",
    "CompanyNewspapers": "شرکت و کسب‌وکار",
    "CompanySignatories": "شرکت و کسب‌وکار",
    "TaxRecords": "شرکت و کسب‌وکار",
    "License": "شرکت و کسب‌وکار",
    "MedicalLicense": "شرکت و کسب‌وکار",
    "Enamad": "شرکت و کسب‌وکار",
    "DrivingScore": "خودرو و گواهینامه",
    "DrivingLisense": "خودرو و گواهینامه",
    "DrivingLicense": "خودرو و گواهینامه",
    "MilitaryStatus": "خودرو و گواهینامه",
    "ActivePlates": "خودرو و گواهینامه",
    "PlateHistory": "خودرو و گواهینامه",
    "VehicleCard": "خودرو و گواهینامه",
    "VehicleInfo": "خودرو و گواهینامه",
    "VehicleViolation": "خودرو و گواهینامه",
    "GeoToAddress": "پستی، آدرس و آی‌پی",
    "PostalCodeInfo": "پستی، آدرس و آی‌پی",
    "PostalCodePro": "پستی، آدرس و آی‌پی",
    "PostalTracking": "پستی، آدرس و آی‌پی",
    "PostalCodeLocation": "پستی، آدرس و آی‌پی",
    "IPLocation": "پستی، آدرس و آی‌پی",
    "IPIsIran": "پستی، آدرس و آی‌پی",
    "MyIP": "پستی، آدرس و آی‌پی",
    "WatterBill": "قبض و شارژ",
    "WatterBillInfo": "قبض و شارژ",
    "GasBill": "قبض و شارژ",
    "GasBillInfo": "قبض و شارژ",
    "PowerBill": "قبض و شارژ",
    "PowerBillInfo": "قبض و شارژ",
    "Call": "پیامک، تماس و ابزار",
    "CallOTP": "پیامک، تماس و ابزار",
    "CallOTPalt": "پیامک، تماس و ابزار",
    "SmsOTP": "پیامک، تماس و ابزار",
    "SendSms": "پیامک، تماس و ابزار",
    "TextToSpeech": "پیامک، تماس و ابزار",
    "IsHoliday": "پیامک، تماس و ابزار",
    "Wallpaper": "پیامک، تماس و ابزار",
    "CheckEmail": "پیامک، تماس و ابزار",
    "ChatGPT": "پیامک، تماس و ابزار",
}

# Short Persian labels for the shared wire field names.
FIELD_LABELS: dict[str, str] = {
    "nationalCode": "کد ملی",
    "mobile": "موبایل",
    "isCompany": "شخص حقوقی",
    "birthDate": "تاریخ تولد",
    "cardNumber": "شماره کارت",
    "iban": "شبا",
    "voiceID": "شناسه فایل صوتی",
    "numbers": "شماره‌ها",
    "code": "کد",
    "number": "شماره",
    "template": "قالب پیامک",
    "message": "متن پیامک",
    "mobiles": "موبایل‌ها",
    "serialNumber": "سریال کارت ملی",
    "videoBase64": "ویدئوی سلفی (Base64)",
    "matchingThreshold": "آستانه تطبیق چهره",
    "livenessThreshold": "آستانه زنده‌سنجی",
    "speechThreshold": "آستانه تطبیق گفتار",
    "speechText": "متن تصادفی گفتار",
    "domain": "دامنه",
    "weekend": "لحاظ‌کردن تعطیلی آخر هفته",
    "ip": "آدرس IP",
    "email": "ایمیل",
    "accountNumber": "شماره حساب",
    "bankCode": "کد بانک",
    "nationalID": "شناسه ملی شرکت",
    "inquiryCode": "کد استعلام",
    "latitude": "طول جغرافیایی",
    "longitude": "عرض جغرافیایی",
    "postalCode": "کد پستی",
    "trackingCode": "کد پیگیری",
    "command": "دستور",
    "temperature": "دما",
    "text": "متن",
    "male": "صدای گوینده مرد",
    "ttsEngine": "موتور تبدیل متن به گفتار",
    "chequeID": "شناسه چک صیادی",
    "medicalCode": "کد مجوز پزشکی",
    "licenseNumber": "شماره گواهینامه",
    "plateNumber": "شماره پلاک",
    "codeType": "نوع کد",
    "billID": "شناسه قبض",
}

DATE_FIELDS = {"birthDate"}


def fetch_spec(path: str | None) -> dict:
    if path:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    request = urllib.request.Request(
        SPEC_URL,
        headers={"Accept": "application/json", "User-Agent": "alooshomal-sync/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_tariffs(path: str | None) -> dict[str, int]:
    """Read the optional `key -> tariff (Toman)` map; missing file means none."""
    source = Path(path) if path else DEFAULT_TARIFFS
    if not source.exists():
        return {}
    raw = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise SystemExit(f"{source} must contain a JSON object of key -> tariff")
    tariffs: dict[str, int] = {}
    for key, value in raw.items():
        if key.startswith("_"):
            continue  # allow `_comment` style keys
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise SystemExit(f"{source}: tariff for «{key}» must be a number")
        tariffs[str(key).lower()] = int(value)
    return tariffs


def collapse(text: str | None, limit: int = 220) -> str:
    clean = re.sub(r"\s+", " ", (text or "")).strip()
    return clean[:limit]


def single_quote(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


def field_type(name: str, schema: dict) -> str:
    if name in DATE_FIELDS:
        return "date"
    types = schema.get("type")
    if types == "boolean" or (isinstance(types, list) and "boolean" in types):
        return "boolean"
    return "text"


def build_fields(properties: dict, required: set[str]) -> list[str]:
    lines: list[str] = []
    for name, schema in properties.items():
        schema = schema if isinstance(schema, dict) else {}
        label = FIELD_LABELS.get(name) or name
        parts = [f"name: {single_quote(name)}", f"label: {single_quote(label)}"]
        if name in required:
            parts.append("required: true")
        kind = field_type(name, schema)
        if kind != "text":
            parts.append(f"type: {single_quote(kind)}")
        default = schema.get("default")
        if isinstance(default, str) and 0 < len(default) <= 32:
            parts.append(f"placeholder: {single_quote(default)}")
        lines.append("      { " + ", ".join(parts) + " },")
    return lines


def render(spec: dict, tariffs: dict[str, int] | None = None) -> str:
    tariffs = tariffs or {}
    schemas = spec.get("components", {}).get("schemas", {})
    paths = spec.get("paths", {})

    services: list[dict] = []
    for path, operations in paths.items():
        if not path.startswith("/api/sw1/"):
            continue
        operation = operations.get("post")
        if not operation:
            continue
        raw_key = path.rsplit("/", 1)[-1]
        properties: dict = {}
        required: set[str] = set()
        content = (operation.get("requestBody") or {}).get("content", {})
        for value in content.values():
            schema = value.get("schema", {})
            ref = schema.get("$ref")
            if ref:
                schema = schemas.get(ref.rsplit("/", 1)[-1], {})
            properties = schema.get("properties", {}) or {}
            required = set(schema.get("required", []) or [])
            break
        services.append(
            {
                "key": raw_key.lower(),
                "label": collapse(operation.get("summary")) or raw_key,
                "group": GROUPS.get(raw_key, "سایر"),
                "description": collapse(operation.get("description"))
                or collapse(operation.get("summary")),
                "path": path,
                "tariff": tariffs.get(raw_key.lower()),
                "fields": build_fields(properties, required),
            }
        )

    group_order = list(dict.fromkeys(GROUPS.values())) + ["سایر"]
    services.sort(key=lambda item: (group_order.index(item["group"]), item["key"]))

    body: list[str] = []
    for service in services:
        body.append("  {")
        body.append(f"    key: {single_quote(service['key'])},")
        body.append(f"    label: {single_quote(service['label'])},")
        body.append(f"    group: {single_quote(service['group'])},")
        body.append(f"    description: {single_quote(service['description'])},")
        body.append("    method: 'POST',")
        body.append(f"    path: {single_quote(service['path'])},")
        if service["tariff"]:
            body.append(f"    tariff: {service['tariff']},")
        if service["fields"]:
            body.append("    fields: [")
            body.extend(service["fields"])
            body.append("    ],")
        else:
            body.append("    fields: [],")
        body.append("  },")

    header = "/**\n"
    header += " * GENERATED FILE — do not edit by hand.\n"
    header += " *\n"
    header += " * Run `python3 scripts/sync_apiir_catalog.py` to regenerate it from\n"
    header += " * the official api.ir OpenAPI spec (https://s.api.ir/openapi/v1.json).\n"
    header += " */\n"
    header += "import type { ApiIrServiceDef } from './apiir.types';\n\n"
    header += "/** Setting key prefix for the per-service on/off switch. */\n"
    header += "export const APIIR_SERVICE_SETTING_PREFIX = 'apiir.service.';\n"
    header += "/** Setting key prefix for the per-service user price (Toman). */\n"
    header += "export const APIIR_PRICE_SETTING_PREFIX = 'apiir.price.';\n\n"
    header += "/** Every web service published under `/api/sw1` by api.ir. */\n"
    header += "export const APIIR_SERVICES: ApiIrServiceDef[] = [\n"
    footer = "];\n\n"
    footer += "/** Panel grouping order (declaration order of the catalogue). */\n"
    footer += "export const APIIR_GROUPS = [\n"
    footer += "  ...new Set(APIIR_SERVICES.map((service) => service.group)),\n"
    footer += "];\n"
    return header + "\n".join(body) + "\n" + footer


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", help="local spec JSON instead of fetching it")
    parser.add_argument(
        "--tariffs",
        help="optional key -> tariff JSON (defaults to scripts/apiir_tariffs.json)",
    )
    args = parser.parse_args()
    spec = fetch_spec(args.spec)
    tariffs = load_tariffs(args.tariffs)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(spec, tariffs), encoding="utf-8")
    print(
        f"wrote {OUTPUT} ({len(spec.get('paths', {}))} paths in the spec, "
        f"{len(tariffs)} tariffs applied)"
    )


if __name__ == "__main__":
    main()
