#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate load-testing CSV files for the admin bulk importer.

Produces two files with Persian headers understood by
`apps/api/src/admin/bulk.service.ts`:

  * ``test-data/biolinks-2500.csv``        (2500 biolinks)
  * ``test-data/business-cards-2300.csv``  (2300 business cards)

Upload them from the admin panel under «ابزار تست» → «ایمپورت گروهی (تست)».
Rows are tagged ``isTestData`` so they can be wiped in one click and never touch
real user content. Convert to .xlsx if you prefer with any spreadsheet tool.

Usage:  python3 scripts/generate_test_data.py [out_dir]
"""

from __future__ import annotations

import csv
import os
import random
import sys

SEED = 1405

FIRST = [
    "علی", "محمد", "حسین", "رضا", "امیر", "مهدی", "سعید", "فرهاد", "کاوه", "بهرام",
    "زهرا", "فاطمه", "مریم", "سارا", "نرگس", "الهام", "شیما", "پریسا", "نازنین", "یاسمن",
    "آرش", "پویا", "سینا", "نیما", "بابک", "کوروش", "داریوش", "مینا", "لیلا", "هدیه",
    "سپیده", "شقایق", "بهنام", "پیمان", "حامد", "جواد", "محمدرضا", "امید", "یاسر", "رضوان",
]
LAST = [
    "رضایی", "محمدی", "حسینی", "کریمی", "موسوی", "احمدی", "جعفری", "صادقی", "قاسمی", "نوری",
    "مرادی", "شریفی", "کرمانی", "فرهادی", "بهرامی", "سلطانی", "اکبری", "رستمی", "ظفری", "یزدانی",
    "طاهری", "امینی", "کاظمی", "نجفی", "پورمحمدی", "راد", "خسروی", "شمس", "بابایی", "نیکنام",
]
CITIES = [
    "تهران", "مشهد", "اصفهان", "شیراز", "تبریز", "کرج", "اهواز", "قم", "رشت", "یزد",
    "کرمان", "اردبیل", "بندرعباس", "ارومیه", "زاهدان", "همدان", "سنندج", "قزوین", "گرگان", "ساری",
]
BIZ = {
    "فناوری اطلاعات": ["مهندس نرم‌افزار", "مدیر فنی", "برنامه‌نویس وب", "مدیر شبکه", "کارشناس امنیت"],
    "حسابداری": ["حسابدار رسمی", "مدیر مالی", "حسابرس", "کارشناس مالیات", "تحلیلگر مالی"],
    "وکالت": ["وکیل پایه یک", "کارشناس حقوقی", "وکیل دادگستری", "مشاور حقوقی", "کارشناس قراردادها"],
    "معماری": ["مهندس معمار", "طراح داخلی", "مدیر پروژه ساخت", "کارشناس شهرسازی", "معمار منظر"],
    "پزشکی": ["پزشک عمومی", "متخصص قلب", "دندانپزشک", "داروساز", "کارشناس تغذیه"],
    "آموزش": ["مدرس زبان", "مربی آموزش", "مدیر آموزشگاه", "مدرس ریاضی", "کارشناس آموزش آنلاین"],
    "بازاریابی": ["مدیر بازاریابی", "کارشناس دیجیتال مارکتینگ", "کارشناس فروش", "مدیر برند", "تحلیلگر بازار"],
    "طراحی گرافیک": ["طراح گرافیک", "طراح رابط کاربری", "تصویرساز", "مدیر هنری", "طراح موشن"],
    "ساختمان": ["پیمانکار ساختمان", "مهندس عمران", "مجری سازه", "کارشناس تأسیسات", "مدیر کارگاه"],
    "خودرو": ["مکانیک خودرو", "فروشنده خودرو", "کارشناس برق خودرو", "نماینده بیمه خودرو", "تعمیرکار تخصصی"],
    "رستوران": ["مدیر رستوران", "سرآشپز", "کارشناس کیفیت غذا", "مدیر کافه", "کارشناس پذیرایی"],
    "ورزشی": ["مربی بدنسازی", "مربی یوگا", "مدیر باشگاه", "کارشناس فیزیولوژی ورزشی", "مربی شنا"],
}
HEADER = ["نام", "عنوان شغلی", "شرکت", "شهر", "کسب و کار", "تلفن", "ایمیل", "وبسایت", "آدرس"]
COMPANY_PREFIX = ["شرکت", "گروه", "موسسه", "هلدینگ", "مرکز", "آژانس"]
COMPANY_NAME = ["نوین", "پارس", "آریا", "کاسپین", "البرز", "زاگرس", "ماهان", "پیشرو", "سامان", "بهاران"]
STREETS = ["ولیعصر", "شریعتی", "آزادی", "انقلاب", "سعدی", "فردوسی", "امام", "طالقانی"]


def make_rows(count: int, tag: str) -> list[list[str]]:
    rng = random.Random(SEED)
    bizs = list(BIZ.keys())
    rows: list[list[str]] = []
    for i in range(1, count + 1):
        biz = rng.choice(bizs)
        name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
        job = rng.choice(BIZ[biz])
        company = f"{rng.choice(COMPANY_PREFIX)} {rng.choice(COMPANY_NAME)} {i}"
        city = rng.choice(CITIES)
        phone = "09" + "".join(rng.choice("0123456789") for _ in range(9))
        email = f"{tag}.test{i}@example.com"
        website = f"https://{tag}{i}.example.com"
        address = f"{city}، خیابان {rng.choice(STREETS)}، پلاک {rng.randint(1, 300)}"
        rows.append([name, job, company, city, biz, phone, email, website, address])
    return rows


def write_csv(path: str, rows: list[list[str]]) -> None:
    with open(path, "w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(HEADER)
        writer.writerows(rows)


def main() -> int:
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "test-data"
    os.makedirs(out_dir, exist_ok=True)
    targets = [
        ("biolinks-2500.csv", 2500, "bl"),
        ("business-cards-2300.csv", 2300, "bc"),
    ]
    for filename, count, tag in targets:
        path = os.path.join(out_dir, filename)
        write_csv(path, make_rows(count, tag))
        print(f"{path}  ({count} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
