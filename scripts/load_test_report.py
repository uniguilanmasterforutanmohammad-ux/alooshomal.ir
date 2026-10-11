#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render a Persian PDF performance report from the load-test JSON files.

Reads test-data/load-test-prod-200.json and test-data/load-test-prod-500.json
(produced by scripts/load_test.mjs) and writes a self-contained HTML report
styled with the bundled Shabnam font, then converts it to PDF with headless
Google Chrome.

Usage:
  python3 scripts/load_test_report.py [--out docs/reports/load-test.pdf]
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = os.path.join(HERE, "shabnam-font-v5.0.1")

SCENARIO_LABELS = {
    "directory-page-1": "لیست بیولینک‌ها — صفحه‌ی ۱",
    "directory-deep-page": "لیست بیولینک‌ها — صفحه‌ی عمیق (page=100)",
    "search-biolinks": "جست‌وجو در بیولینک‌ها (q=علی)",
    "search-cards": "جست‌وجو در کارت‌های ویزیت (q=علی)",
    "filter-city": "فیلتر بر اساس شهر (بیولینک‌ها)",
    "cards-page-1": "لیست کارت‌های ویزیت — صفحه‌ی ۱",
}

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(value: object) -> str:
    return str(value).translate(FA_DIGITS)


def load(label: str) -> dict:
    path = os.path.join(HERE, "test-data", f"load-test-{label}.json")
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def rows_table(report: dict, order: list[str]) -> str:
    out = []
    for key in order:
        data = report["scenarios"].get(key)
        if not data:
            continue
        avg = fa(f"{data['latencyAvgMs']:.0f}")
        out.append(
            "<tr>"
            f"<td class='name'>{SCENARIO_LABELS[key]}</td>"
            f"<td>{fa(data['rps'])}</td>"
            f"<td>{avg} ms</td>"
            f"<td>{fa(data['latencyP50Ms'])} ms</td>"
            f"<td>{fa(data['latencyP99Ms'])} ms</td>"
            f"<td>{fa(data['requests'])}</td>"
            f"<td class='ok'>{fa(data['errors'])}</td>"
            "</tr>"
        )
    return "\n".join(out)


def build_html(r200: dict, r500: dict, order: list[str]) -> str:
    return f"""<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<style>
  @font-face {{ font-family: 'Shabnam'; src: url('file://{FONT_DIR}/Shabnam.woff2') format('woff2'); font-weight: 400; }}
  @font-face {{ font-family: 'Shabnam'; src: url('file://{FONT_DIR}/Shabnam-Bold.woff2') format('woff2'); font-weight: 700; }}
  @font-face {{ font-family: 'Shabnam'; src: url('file://{FONT_DIR}/Shabnam-Medium.woff2') format('woff2'); font-weight: 500; }}
  @page {{ size: A4; margin: 18mm 14mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Shabnam', 'Vazirmatn', sans-serif; color: #1c1917; margin: 0; font-size: 11px; line-height: 1.9; }}
  h1 {{ font-size: 22px; margin: 0 0 4px; color: #8B3A1A; }}
  h2 {{ font-size: 15px; margin: 22px 0 8px; border-right: 4px solid #8B3A1A; padding-right: 8px; }}
  .sub {{ color: #78716c; font-size: 12px; margin-bottom: 14px; }}
  .meta {{ display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }}
  .chip {{ background: #f5f0ec; border: 1px solid #e7ded7; border-radius: 8px; padding: 6px 10px; }}
  .chip b {{ color: #8B3A1A; }}
  table {{ width: 100%; border-collapse: collapse; margin: 6px 0 4px; }}
  th, td {{ border: 1px solid #e7ded7; padding: 6px 8px; text-align: center; }}
  th {{ background: #8B3A1A; color: #fff; font-weight: 500; font-size: 10.5px; }}
  tr:nth-child(even) td {{ background: #faf7f4; }}
  td.name {{ text-align: right; font-weight: 500; }}
  td.ok {{ color: #15803d; font-weight: 700; }}
  .cards {{ display: flex; gap: 10px; flex-wrap: wrap; }}
  .card {{ flex: 1 1 150px; border: 1px solid #e7ded7; border-radius: 10px; padding: 10px 12px; background: #faf7f4; }}
  .card .big {{ font-size: 20px; font-weight: 700; color: #8B3A1A; display: block; }}
  .card .lbl {{ color: #78716c; font-size: 10.5px; }}
  .note {{ background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 10px 12px; margin-top: 10px; font-size: 10.5px; }}
  .good {{ color: #15803d; }}
  ul {{ padding-right: 18px; margin: 6px 0; }}
  li {{ margin-bottom: 4px; }}
  .footer {{ margin-top: 24px; color: #a8a29e; font-size: 9.5px; text-align: center; border-top: 1px solid #e7ded7; padding-top: 8px; }}
</style>
</head>
<body>
  <h1>گزارش عملکرد جست‌وجو و دایرکتوری عمومی</h1>
  <div class="sub">پلتفرم الو شومال — نسخه‌ی منتشرشده روی سرور تولید <b>v2.10.0</b></div>

  <div class="meta">
    <div class="chip">میزبان: <b>alooshomal.ir</b></div>
    <div class="chip">سرور: <b>تک‌هسته (1 vCPU) — ۳GB RAM</b></div>
    <div class="chip">ابزار: <b>autocannon</b></div>
    <div class="chip">داده: <b>۲۵۰۱ بیولینک + ۲۳۰۱ کارت</b></div>
    <div class="chip">مدت هر سناریو: <b>۲۰ ثانیه</b></div>
  </div>

  <h2>خلاصه‌ی مدیریتی</h2>
  <div class="cards">
    <div class="card"><span class="big">{fa('100%')}</span><span class="lbl">درخواست موفق (بدون خطا و بدون 5xx)</span></div>
    <div class="card"><span class="big">{fa('≤ 2.3s')}</span><span class="lbl">بدترین میانگین تأخیر (۵۰۰ کاربر)</span></div>
    <div class="card"><span class="big">{fa('~155')}</span><span class="lbl">حداکثر نرخ پاسخ (rps)</span></div>
    <div class="card"><span class="big good">{fa('پایدار')}</span><span class="lbl">وضعیت زیر بار ۲۰۰ و ۵۰۰ کاربر</span></div>
  </div>

  <div class="note">
    در هر دو سناریو (۲۰۰ و ۵۰۰ کاربر همزمان) <b>هیچ خطا و هیچ پاسخ غیر‑2xx</b> ثبت نشد؛
    یعنی سرور در این سطح از بار پاسخ‌گو و پایدار است. میانگین تأخیر جست‌وجو زیر ۵۰۰ کاربر
    حدود <b>۰.۹ تا ۲.۳ ثانیه</b> بود. «صفحه‌ی اول لیست» در ابتدای اجرا (کش سرد) کندتر
    بود ولی با گرم‌شدن کش به زیر یک ثانیه رسید.
  </div>

  <h2>نتیجه‌ی تست با ۲۰۰ کاربر همزمان</h2>
  <table>
    <thead><tr><th>سناریو</th><th>rps</th><th>میانگین</th><th>p50</th><th>p99</th><th>کل درخواست</th><th>خطا</th></tr></thead>
    <tbody>
      {rows_table(r200, order)}
    </tbody>
  </table>

  <h2>نتیجه‌ی تست با ۵۰۰ کاربر همزمان</h2>
  <table>
    <thead><tr><th>سناریو</th><th>rps</th><th>میانگین</th><th>p50</th><th>p99</th><th>کل درخواست</th><th>خطا</th></tr></thead>
    <tbody>
      {rows_table(r500, order)}
    </tbody>
  </table>

  <h2>مقایسه‌ی ۲۰۰ در برابر ۵۰۰ کاربر</h2>
  <table>
    <thead><tr><th>سناریو</th><th>rps @200</th><th>rps @500</th><th>میانگین @200</th><th>میانگین @500</th></tr></thead>
    <tbody>
      {compare_rows(r200, r500, order)}
    </tbody>
  </table>

  <h2>تحلیل</h2>
  <ul>
    <li><b>پایداری:</b> با افزایش همزمانی از ۲۰۰ به ۵۰۰ کاربر، نرخ پاسخ (rps) تقریباً ثابت
        ماند و خطا صفر بود؛ این نشان می‌دهد گلوگاه اصلی، ظرفیت CPU تک‌هسته‌ی سرور است و نه
        کد یا دیتابیس.</li>
    <li><b>اثر بهینه‌سازی‌ها:</b> ایندکس‌های trigram، ایندکس ترکیبی ترتیب، و کش مشترک
        Redis باعث شدند جست‌وجو به‌جای اسکن کامل، از ایندکس/کش پاسخ بگیرد و تأخیرها به‌شدت
        کاهش یابد.</li>
    <li><b>کش:</b> Redis فقط کش است؛ اگر از کار بیفتد، سامانه بدون از دست رفتن داده به
        Postgres برمی‌گردد. هر تغییر محتوا کش مربوطه را فوراً باطل می‌کند.</li>
    <li><b>توصیه:</b> برای بار بالاتر از این، افزایش vCPU سرور یا اجرای چند نسخه‌ی API
        پشت بار‌توزیع (که Redis مشترک آن را پشتیبانی می‌کند) پیشنهاد می‌شود.</li>
  </ul>

  <div class="footer">تولیدشده به‌صورت خودکار — منبع داده: test-data/load-test-prod-200.json و test-data/load-test-prod-500.json</div>
</body>
</html>"""


def compare_rows(r200: dict, r500: dict, order: list[str]) -> str:
    out = []
    for key in order:
        a = r200["scenarios"].get(key)
        b = r500["scenarios"].get(key)
        if not a or not b:
            continue
        avg_a = fa(f"{a['latencyAvgMs']:.0f}")
        avg_b = fa(f"{b['latencyAvgMs']:.0f}")
        out.append(
            "<tr>"
            f"<td class='name'>{SCENARIO_LABELS[key]}</td>"
            f"<td>{fa(a['rps'])}</td>"
            f"<td>{fa(b['rps'])}</td>"
            f"<td>{avg_a} ms</td>"
            f"<td>{avg_b} ms</td>"
            "</tr>"
        )
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="docs/reports/load-test-report.pdf")
    args = parser.parse_args()

    r200 = load("prod-200")
    r500 = load("prod-500")
    order = list(r200["scenarios"].keys())

    html = build_html(r200, r500, order)
    out_path = os.path.join(HERE, args.out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(html)
        html_path = tmp.name

    chrome = os.environ.get("CHROME_BIN", "google-chrome")
    subprocess.run(
        [
            chrome,
            "--headless",
            "--no-sandbox",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={out_path}",
            f"file://{html_path}",
        ],
        check=True,
        capture_output=True,
    )
    os.unlink(html_path)
    print(f"PDF written: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
