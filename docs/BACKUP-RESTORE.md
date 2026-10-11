# پشتیبان‌گیری و بازیابی دیتابیس (Backup & Restore)

این سند مکانیزم پشتیبان‌گیری خودکار و دستی دیتابیس پلتفرم آلوشمال را، همراه با
مسیر فایل‌ها، نحوه‌ی بازیابی و دلیل انتخاب این مکانیزم، شرح می‌دهد.

---

## ۱. چرا این مکانیزم ساخته شد؟

پروژه از Prisma با دستور `prisma db push` استفاده می‌کند. این دستور در صورت تغییر
ساختار (تغییر نام جدول/ستون، حذف فیلد و ...) ممکن است با پرچم
`--accept-data-loss` اجرا شود و دیتای واقعی کاربران را از بین ببرد.
برای جلوگیری از تکرار چنین فاجعه‌ای، **پیش از هر تغییر ساختاری یک snapshot
خودکار از دیتابیس گرفته می‌شود** و بازیابی دستی هم ممکن است.

---

## ۲. پشتیبان‌گیری خودکار (قبل از هر تغییر اسکیما)

فایل مسئول: `apps/api/docker-entrypoint.sh`

این اسکریپت هنگام **هر بوت کانتینر API** به ترتیب زیر عمل می‌کند:

1. هش `sha256` فایل `prisma/schema.prisma` را محاسبه می‌کند.
2. آن را با هش قبلی ذخیره‌شده در `$BACKUP_DIR/.last-schema-hash` مقایسه می‌کند.
3. اگر هش **تغییر کرده باشد** و دیتابیس جدول داشته باشد، **قبل از** اجرای
   `prisma db push` یک snapshot فشرده (`pg_dump` + `gzip`) می‌سازد.
4. اگر دیتابیس خالی/تازه باشد، snapshot نمی‌گیرد (چیزی برای از دست دادن نیست).
5. اگر اسکیما تغییری نکرده باشد، از snapshot صرف‌نظر می‌کند
   (پیام `schema unchanged → skipping snapshot`).
6. فقط `BACKUP_KEEP` نسخه‌ی آخر (پیش‌فرض ۲۰) نگه داشته می‌شود و قدیمی‌ترها حذف می‌شوند.
7. سپس `prisma db push --skip-generate --accept-data-loss` اجرا و اپلیکیشن بالا می‌آید.

### مسیر ذخیره‌ی snapshotهای خودکار

- داخل کانتینر API: `/usr/src/app/backups`
- روی هاست (والیوم پایدار داکر): `alooshomal_api_backups`
- الگوی نام‌گذاری: `alooshomal_YYYYMMDD-HHMMSS.sql.gz`
- فایل هش: `$BACKUP_DIR/.last-schema-hash`

متغیرهای محیطی مرتبط (در `docker-compose.yml`):

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `BACKUP_DIR` | `/usr/src/app/backups` | مسیر ذخیره‌ی snapshotها داخل کانتینر |
| `BACKUP_KEEP` | `20` | تعداد snapshotهایی که نگه داشته می‌شود |

---

## ۳. پشتیبان‌گیری دستی

فایل: `scripts/backup.sh` (یا `npm run db:backup`)

```bash
./scripts/backup.sh                       # ساخت snapshot در ./backups
BACKUP_KEEP=50 ./scripts/backup.sh        # تغییر تعداد نگهداری
./scripts/backup.sh --list                # فهرست snapshotهای موجود
npm run db:backups                        # معادل --list
```

### مسیر ذخیره‌ی snapshotهای دستی

- روی هاست (ریپازیتوری): `./backups/alooshomal_<stamp>.sql.gz`
- اسکریپت از طریق کانتینر در حال اجرای `db` (نام پیش‌فرض `alooshomal-db`) با
  `pg_dump -U <user> -d <db> --clean --if-exists` دامپ می‌گیرد و سپس `gzip` می‌کند.
- اعتبارها از فایل `.env` خوانده می‌شوند
  (`POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`).
- پوشه‌ی `backups/` در `.gitignore` نادیده گرفته شده است.
- همین اسکریپت در هر دو محیط توسعه و تولید یکسان کار می‌کند چون از طریق کانتینر
  با دیتابیس صحبت می‌کند.

---

## ۴. بازیابی (Restore)

فایل: `scripts/restore.sh` (یا `npm run db:restore`)

```bash
./scripts/restore.sh                                   # بازیابی جدیدترین snapshot
./scripts/restore.sh backups/alooshomal_20261011-090000.sql.gz
FORCE=1 ./scripts/restore.sh <file>                     # رد کردن پرسش تأیید
npm run db:restore                                      # معادل حالت پیش‌فرض
```

روند کار:

1. اگر فایل داده نشود، جدیدترین `backups/alooshomal_*.sql.gz` انتخاب می‌شود.
2. یک پرسش تأیید نمایش داده می‌شود (با `FORCE=1` رد می‌شود).
3. محتوای فشرده با `gunzip -c` باز شده و مستقیم داخل `psql` کانتینر `db` ریخته می‌شود
   (`-v ON_ERROR_STOP=1`). چون دامپ با `--clean --if-exists` گرفته شده،
   جدول‌های فعلی ابتدا پاک و سپس بازسازی می‌شوند — یعنی **محتوای فعلی دیتابیس
   با snapshot جایگزین می‌شود**.

### بازیابی snapshotهای خودکار داخل کانتینر

snapshotهای خودکار در والیوم `alooshomal_api_backups` هستند. برای کپی آن‌ها به
هاست و بازیابی دستی:

```bash
docker cp alooshomal-api:/usr/src/app/backups/alooshomal_<stamp>.sql.gz ./backups/
FORCE=1 ./scripts/restore.sh ./backups/alooshomal_<stamp>.sql.gz
```

---

## ۵. جمع‌بندی مسیرها

| نوع snapshot | محل | نام فایل |
| --- | --- | --- |
| خودکار (قبل از تغییر اسکیما) | والیوم `alooshomal_api_backups` → `/usr/src/app/backups` | `alooshomal_<stamp>.sql.gz` |
| دستی (`./scripts/backup.sh`) | `./backups/` روی هاست | `alooshomal_<stamp>.sql.gz` |
| بازیابی | `./scripts/restore.sh [file]` یا `npm run db:restore` | — |

---

## ۶. نکات عملیاتی

- برای تست سالم بودن یک snapshot، می‌توانید آن را در یک دیتابیس موقت بازیابی کنید
  یا حداقل `gunzip -t` بگیرید.
- پیش از هر تغییر ساختاری مهم (تغییر نام/حذف ستون) توصیه می‌شود یک snapshot دستی
  هم بگیرید: `npm run db:backup`.
- برای بازیابی نقطه‌ای (point-in-time) از snapshotهای خودکار استفاده کنید؛
  برای بازیابی هدفمند و کنترل‌شده از snapshot دستی.
