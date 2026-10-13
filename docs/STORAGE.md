# ذخیره‌سازی رسانه و آبجکت‌استوریج (MinIO)

این سند سیستم ذخیره‌سازی تصاویر آپلودی (لوگو، تصویر پروفایل) را توضیح می‌دهد:
مسیر فیزیکی فایل‌ها، الگوی پوشه‌بندی، پنل گرافیکی، اعتبارنامه‌ها، و روش کامل
انتقال به یک سرور جدید یا یک سرور رسانه‌ی جداگانه.

---

## ۱. خلاصه‌ی معماری

تصاویر آپلودی در یک **آبجکت‌استوریج سازگار با S3** ذخیره می‌شوند که سرویس
`minio` در `docker-compose.yml` / `docker-compose.prod.yml` آن را اجرا می‌کند.

نکته‌ی مهم: از آنجا که MinIO توزیع رسمی خود را در ۲۰۲۵ متوقف کرد، این سرویس روی
فورک نگه‌داشته‌شده‌ی `pgsty/silo` اجرا می‌شود که **جایگزین قطره‌ای MinIO** است
(همان S3 API، همان متغیرهای محیطی `MINIO_*`، همان هلث‌چک `mc ready local` و
همان فرمت داده روی دیسک). جزئیات ایمیج در `docs/DEPLOY.md` آمده است.

جریان یک آپلود:

1. کاربر تصویر را در فرم انتخاب می‌کند → `POST /api/uploads/logo` یا
   `POST /api/uploads/avatar` با توکن احراز هویت.
2. سرور تصویر را با `sharp` اعتبارسنجی و به **WebP** تبدیل و تغییر اندازه می‌کند
   (`apps/api/src/uploads/image.service.ts`).
3. فایل در باکت با کلید `<folder>/<ownerId>/<uuid>.webp` ذخیره می‌شود
   (`apps/api/src/uploads/storage.service.ts`).
4. سرور یک URL عمومی برمی‌گرداند که از `MINIO_PUBLIC_URL` ساخته می‌شود.
5. مرورگر آن URL را می‌گیرد؛ در پروداکشن nginx مسیر `/media/` را به سرویس
   `minio:9000` پروکسی می‌کند.

> **ساختار عمداً دسته‌بندی‌شده است** تا انتقال به سرور رسانه‌ی جدا در آینده فقط
> یک کپی از باکت باشد، بدون هیچ تغییری در کد.

---

## ۲. پوشه‌بندی و نام‌گذاری فایل‌ها

همه‌ی رسانه‌ها داخل **یک باکت** (پیش‌فرض `alooshomal`) با این الگو ذخیره می‌شوند:

```
<bucket>/<folder>/<ownerId>/<uuid>.<ext>
```

| بخش | معنا | مثال |
| --- | --- | --- |
| `<bucket>` | نام باکت از `MINIO_BUCKET` | `alooshomal` |
| `<folder>` | دسته‌ی آپلود (فولدر اختصاصی هر نوع) | `logos`, `avatars` |
| `<ownerId>` | شناسه‌ی کاربر مالک تصویر | `cmv46xp580003pa01xrxf0o5n` |
| `<uuid>` | نام تصادفی یکتا (جلوگیری از تداخل/حدس) | `71f09ecc-…-d9d64965beb0` |
| `<ext>` | همیشه `webp` | `.webp` |

نمونه‌های واقعی:

```
alooshomal/logos/cmv46xp580003pa01xrxf0o5n/71f09ecc-d538-4b96-9cd3-d9d64965beb0.webp
alooshomal/avatars/cmv46xp580003pa01xrxf0o5n/147692ff-1f1f-4b83-a7a9-17d062aa03aa.webp
```

دسته‌ها در `apps/api/src/uploads/uploads.constants.ts` تعریف شده‌اند:

| دسته (kind) | فولدر | سقف ابعاد | توضیح |
| --- | --- | --- | --- |
| `logo` | `logos` | 512×512 (inside) | لوگوی کسب‌وکار |
| `avatar` | `avatars` | 400×400 (cover مربعی) | تصویر پروفایل |

افزودن دسته‌ی جدید (مثلاً تصویر خبر یا گالری) فقط یک ورودی تازه در
`UPLOAD_CATEGORIES` است؛ ساختار `<folder>/<ownerId>/<uuid>.webp` ثابت می‌ماند.

محدودیت‌ها: حداکثر **۲ مگابایت**، فرمت‌های مجاز `png/jpeg/webp/gif`
(`MAX_UPLOAD_BYTES` و `ALLOWED_IMAGE_MIME`).

---

## ۳. فایل‌ها روی سرور کجا هستند؟

فایل‌ها **داخل کانتینر ذخیره نمی‌شوند**؛ در یک **Docker named volume** روی هاست
نگه داشته می‌شوند تا با حذف/بازسازی کانتینر از بین نروند.

- نام والیوم: `alooshomal_minio_data`
- داخل کانتینر: `/data`
- روی هاست:

```
/var/lib/docker/volumes/alooshomal_minio_data/_data/
```

ساختار داخل والیوم دقیقاً همان کلیدهای آبجکت است:

```
/var/lib/docker/volumes/alooshomal_minio_data/_data/alooshomal/
├── logos/
│   └── <userId>/
│       └── <uuid>.webp/        ← نام آبجکت به‌صورت پوشه
│           └── xl.meta         ← متادیتای MinIO/Silo
└── avatars/
    └── <userId>/
        └── <uuid>.webp/
            └── xl.meta
```

> **هشدار مهم:** فایل `xl.meta` را حذف/دستکاری نکنید. MinIO هر آبجکت را به‌صورت
> یک پوشه‌ی هم‌نام با فایل `xl.meta` (نسخه‌بندی داخلی) نگه می‌دارد؛ کپی دستی
> تک‌فایلی بدون `xl.meta` باعث از دست رفتن آبجکت می‌شود.

مسیر والیوم روی سرور را این‌طور ببینید:

```bash
docker volume inspect alooshomal_minio_data --format '{{.Mountpoint}}'
```

---

## ۴. پنل گرافیکی (MinIO/Silo Console)

آبجکت‌استوریج یک **کنسول وب** دارد که با آن می‌توان باکت‌ها، فایل‌ها و سیاست
دسترسی را مرور/مدیریت کرد.

- **آدرس لوکال:** `http://localhost:9001/login`
- **آدرس روی سرور (فقط از داخل خود سرور):** `http://127.0.0.1:9001/login`

### چرا روی سرور از بیرون باز نمی‌شود؟

در `docker-compose.prod.yml` سرویس `minio` **هیچ پورتی publish نمی‌کند** (نه
`9000` و نه `9001`)؛ چون تصاویر از طریق nginx زیر `/media/` سرو می‌شوند و کنسول
مدیریتی نباید در اینترنت باز باشد. دسترسی به کنسول روی سرور از طریق تونل SSH:

```bash
# روی سیستم خودتان اجرا کنید (پورت 9001 سرور را به لوکال می‌آورد)
ssh -L 9001:127.0.0.1:9001 root@<SERVER_HOST>
# سپس در مرورگر: http://localhost:9001/login
```

### اعتبارنامه‌ی ورود (username / password)

نام کاربری و رمز، همان `MINIO_ROOT_USER` و `MINIO_ROOT_PASSWORD` در فایل `.env`
هستند (و به کانتینر به‌عنوان همان متغیرها پاس می‌شوند):

```dotenv
MINIO_ROOT_USER=alooshomal
MINIO_ROOT_PASSWORD=change_me_in_production
```

- **لوکال:** مقادیر پیش‌فرض `alooshomal` / `change_me_in_production`.
- **سرور (پروداکشن):** در `.env` سرور (`/var/www/alooshomal.ir/.env`) تعریف
  شده‌اند. اگر در `.env` نبودند، سرویس به پیش‌فرض‌های بالا برمی‌گردد؛ **حتماً در
  پروداکشن رمز قوی بگذارید** و در `.env` سرور تنظیم کنید.

> رمز پروداکشن را در این سند ننویسید. مقدارش فقط در `.env` سرور است و با
> `grep MINIO /var/www/alooshomal.ir/.env` قابل مشاهده است.

برای عوض‌کردن رمز: مقدار `MINIO_ROOT_PASSWORD` را در `.env` عوض کنید و کانتینر
را بازسازی کنید (`docker compose -f docker-compose.prod.yml up -d --force-recreate minio`).
توجه: با عوض‌کردن رمزِ ریشه، اتصال API (که با `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`
کار می‌کند و در `docker-compose` از همان مقادیر ریشه پر می‌شود) هم باید
هم‌زمان به‌روز شود؛ کافی است `.env` را عوض و کل استک را دوباره بالا بیاورید.

---

## ۵. انتقال به سرور جدید (یا سرور رسانه‌ی جداگانه)

چون همه‌چیز در یک والیوم و با ساختار کلید ثابت است، انتقال = کپی همان والیوم.
دو سناریو داریم.

### سناریو الف — انتقال کل پروژه به سرور جدید (همراه دیتابیس)

روی **سرور مبدأ**:

```bash
# ۱) یک آرشیو از والیوم رسانه بسازید
docker run --rm \
  -v alooshomal_minio_data:/data \
  -v "$PWD":/backup \
  alpine tar czf /backup/minio_data.tar.gz -C /data .

# ۲) (اختیاری) فایل env و کدها را هم کنارش بگذارید
ls -lh minio_data.tar.gz
```

فایل `minio_data.tar.gz` را به سرور مقصد منتقل کنید (`scp`):

```bash
scp minio_data.tar.gz root@<NEW_SERVER>:/root/
```

روی **سرور مقصد**:

```bash
# ۱) والیوم را بسازید و آرشیو را داخلش باز کنید
docker volume create alooshomal_minio_data
docker run --rm \
  -v alooshomal_minio_data:/data \
  -v /root:/backup \
  alpine sh -c 'tar xzf /backup/minio_data.tar.gz -C /data && ls -la /data'

# ۲) استک را بالا بیاورید (سرویس minio همان والیوم را می‌شناسد)
cd /var/www/alooshomal.ir
docker compose -f docker-compose.prod.yml up -d
```

در `docker-compose.prod.yml` نام والیوم ثابت است
(`minio_data: { name: alooshomal_minio_data }`)، پس کانتینر جدید دقیقاً همان
والیوم را پیدا می‌کند و تصاویر بدون هیچ تغییری در دسترس‌اند.

### سناریو ب — جدا کردن رسانه روی یک سرور مستقل (آینده)

معماری کد از ابتدا برای این حالت آماده است. مراحل:

1. روی سرور رسانه‌ی جدید، فقط سرویس `minio` را بالا بیاورید و والیوم را (طبق
   سناریو الف) منتقل کنید.
2. در سرور اپلیکیشن، `.env` را طوری تغییر دهید که API به آن سرور وصل شود:

```dotenv
# سرور اپلیکیشن (API)
MINIO_ENDPOINT=media.alooshomal.ir   # یا IP سرور رسانه
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_PUBLIC_URL=https://media.alooshomal.ir
```

3. اگر `MINIO_PUBLIC_URL` روی یک دامنه‌ی جدا تنظیم شود، URL تصاویر همان‌جا
   ساخته می‌شود و دیگر نیازی به پروکسی `/media/` روی سرور اپلیکیشن نیست
   (می‌توانید آن `location` را در nginx حذف کنید).
4. سرویس `minio` محلی در `docker-compose.prod.yml` سرور اپلیکیشن را می‌توانید
   حذف کنید (دیگر لازم نیست).

> نکته: کد و کلیدهای آبجکت هیچ تغییری لازم ندارند؛ فقط نقطه‌ی اتصال
> (`MINIO_ENDPOINT`) و آدرس عمومی (`MINIO_PUBLIC_URL`) عوض می‌شوند. همین ویژگی
> دلیل «الگوی فولدری مرتب» در طراحی اولیه بوده است.

---

## ۶. متغیرهای محیطی مرتبط

همه در `.env` (نمونه‌اش در `.env.example`):

| متغیر | پیش‌فرض | توضیح |
| --- | --- | --- |
| `MINIO_ROOT_USER` | `alooshomal` | نام کاربری ریشه/کنسول |
| `MINIO_ROOT_PASSWORD` | `change_me_in_production` | رمز ریشه/کنسول (در پروداکشن عوض شود) |
| `MINIO_ENDPOINT` | `minio` | هاست آبجکت‌استوریج از دید API |
| `MINIO_PORT` | `9000` | پورت S3 API |
| `MINIO_USE_SSL` | `false` | استفاده از TLS در اتصال API |
| `MINIO_BUCKET` | `alooshomal` | نام باکت |
| `MINIO_PUBLIC_URL` | `http://localhost:9000` (لوکال) / `https://alooshomal.ir/media` (پروداکشن) | مبنای URL عمومی تصاویر |
| `MINIO_IMAGE` | ایمیج آینه‌شده در GHCR (پروداکشن) / `pgsty/silo:…` (لوکال) | ایمیج سرویس `minio` |
| `MINIO_ENABLED` | `true` | اگر `false` شود، ذخیره‌سازی غیرفعال می‌شود |

پورت‌های کنسول و API فقط در حالت **توسعه** به هاست publish می‌شوند
(`MINIO_PORT`/`MINIO_CONSOLE_PORT` در `docker-compose.yml`).

---

## ۷. نکات عملیاتی

- **بکاپ رسانه:** رسانه‌ها داخل والیوم `alooshomal_minio_data` هستند و در بکاپ
  دیتابیس (`docs/BACKUP-RESTORE.md`) قرار نمی‌گیرند. برای بکاپ دوره‌ای رسانه‌ها از
  همان دستور `docker run … tar czf` بخش ۵ استفاده کنید.
- **بررسی سلامت:** `docker exec alooshomal-minio mc ready local` باید
  «The cluster 'local' is ready» بدهد.
- **دسترسی عمومی:** باکت با سیاست read-only برای `s3:GetObject` تنظیم می‌شود
  (`storage.service.ts` → `readOnlyPolicy`) تا تصاویر بدون احراز هویت سرو شوند.
- **حذف تصویر:** هنگام جایگزینی لوگو/آواتار، آبجکت قدیمی از همان کلید
  (`keyFromUrl`) حذف می‌شود تا فضای بی‌استفاده نماند.
