# استقرار خودکار روی سرور (GitHub Actions + GHCR)

با هر Push به برنچ `main`، ورکفلوی `.github/workflows/deploy.yml` اجرا می‌شود و:

1. دو ایمیج داکر (`api` و `web`) را از `apps/api` و `apps/web` بیلد می‌کند.
2. آن‌ها را با برچسب‌های `latest` و `sha-<short>` به **GHCR** پوش می‌کند.
3. با SSH به سرور وصل می‌شود، `docker-compose.prod.yml` را کپی می‌کند، ایمیج‌ها را `pull` و سرویس‌ها را دوباره `up -d` می‌کند.

> نکته: این پروژه دو سرویس دارد (NestJS API روی پورت ۴۰۰۰ و Next.js Web روی پورت ۳۰۰۰)،
> پس برخلاف نمونه‌ی تک‌ایمیجی، یک **build matrix** ساخته شده تا هر دو ایمیج بیلد و پوش شوند.

---

## ۱) Secret و Variableهای مخزن

مسیر: `Repository → Settings → Secrets and variables → Actions`

### Secrets (اطلاعات حساس)

| نام | مقدار |
| --- | --- |
| `SERVER_HOST` | آی‌پی یا دامنه‌ی سرور |
| `SERVER_USER` | کاربر SSH روی سرور (مثلاً `root`) |
| `SERVER_SSH_KEY` | کل محتوای کلید خصوصی (`-----BEGIN ... END-----`) |
| `SERVER_PORT` | پورت SSH (معمولاً `22`) |
| `GHCR_PAT` *(اختیاری)* | فقط اگر پکیج‌های GHCR خصوصی‌اند (`read:packages`) |

### Variables (اطلاعات غیرحساس)

مسیر: `Settings → Secrets and variables → Actions → Variables`

| نام | مقدار نمونه | توضیح |
| --- | --- | --- |
| `DEPLOY_PATH` | `/var/www/alooshomal.ir` | مسیر پروژه روی سرور (پیش‌فرض همین است) |
| `NEXT_PUBLIC_APP_URL` | `https://alooshomal.ir` | دامنه‌ی عمومی سایت |
| `NEXT_PUBLIC_API_URL` | `https://alooshomal.ir/api` | آدرس API از دید مرورگر |

> ⚠️ مقادیر `NEXT_PUBLIC_*` **هنگام بیلد داخل باندل Next.js پخته می‌شوند**؛ بنابراین
> این دو مورد باید از نوع **Variable** (نه Secret) باشند تا به‌عنوان `build-arg` به ایمیج برسند.
> اگر خالی بمانند، پیش‌فرض کد `http://localhost:4000/api` استفاده می‌شود که در پروداکشن غلط است.

### دسترسی‌ها

`Settings → Actions → General → Workflow permissions` را روی **Read and write permissions** بگذارید
(برای پوش به GHCR لازم است).

---

## ۲) آماده‌سازی سرور

```bash
mkdir -p /var/www/alooshomal.ir
cd /var/www/alooshomal.ir
```

یک فایل `.env` کنار کامپوز بسازید (این فایل هرگز در گیت نگه‌داری نمی‌شود و دستی مدیریت می‌شود):

```bash
cat > .env <<'EOF'
POSTGRES_USER=alooshomal
POSTGRES_PASSWORD=<یک-رمز-قوی>
POSTGRES_DB=alooshomal
DATABASE_URL=postgresql://alooshomal:<یک-رمز-قوی>@db:5432/alooshomal?schema=public

NODE_ENV=production
API_PORT=4000
JWT_SECRET=<یک-رشته-تصادفی-بلند>
CORS_ORIGIN=https://alooshomal.ir
ADMIN_EMAIL=admin@alooshomal.ir
ADMIN_PASSWORD=<رمز-ادمین>
ENABLE_SWAGGER=false

WEB_PORT=3000
HTTP_PORT=80
NEXT_PUBLIC_API_URL=https://alooshomal.ir/api
NEXT_PUBLIC_APP_URL=https://alooshomal.ir

# Object storage (MinIO) — uploaded logos/avatars
MINIO_ROOT_USER=alooshomal
MINIO_ROOT_PASSWORD=<یک-رمز-قوی-دیگر>
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET=alooshomal
# آدرس عمومی تصاویر (از دید مرورگر) — از طریق nginx زیر /media/ سرو می‌شود
MINIO_PUBLIC_URL=https://alooshomal.ir/media
EOF
```

### نکته‌ی مهم: یک دامنه، سه سرویس

`web` روی `3000` و `api` روی `4000` هستند و **Nginx داخل داکر** جلوی آن‌ها قرار می‌گیرد
(سرویس `nginx` در `docker-compose.prod.yml`) و مسیرها را تقسیم می‌کند:

- `https://alooshomal.ir/api/proxy/*` → `web:3000` (روت‌هندلرهای خود Next.js)
- بقیه‌ی `https://alooshomal.ir/api/*` → `api:4000` (NestJS API)
- `https://alooshomal.ir/media/*` → `minio:9000` (تصاویر آپلودی؛ لوگو، آواتار)
- بقیه‌ی مسیرها → `web:3000`

کانفیگ داخل `deploy/nginx/conf.d/` است و در کانتینر به `/etc/nginx/conf.d` mount می‌شود؛
ورک‌فلوی deploy این پوشه را همراه کامپوز روی سرور به‌روز می‌کند. Nginx روی پورت `HTTP_PORT`
(پیش‌فرض `80`) سرور گوش می‌دهد و `web`/`api` فقط به `127.0.0.1` بایند شده‌اند.

```bash
# وضعیت کانتینر nginx
docker compose -f docker-compose.prod.yml ps nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# تست و ری‌لود دستی کانفیگ
docker exec alooshomal-nginx nginx -t
docker exec alooshomal-nginx nginx -s reload
```

> نیازی به نصب Nginx روی خود سرور نیست. اگر سروری از قبل Nginx روی پورت `80`
> داشته، یا آن را متوقف کنید یا `HTTP_PORT` را در `.env` به مثلاً `8080` تغییر دهید.

#### HTTPS روی مبدأ (پورت ۴۴۳)

علاوه بر گواهی لبه‌ی آروان، می‌توان مبدأ را هم روی HTTPS آورد تا حالت
آروان → مبدأ روی **HTTPS (443)** باشد. یک‌بار روی سرور:

```bash
sudo deploy/nginx/enable-ssl.sh
```

این اسکریپت certbot را نصب می‌کند، با متد webroot گواهی Let's Encrypt برای
دامنه می‌گیرد (اگر `www` رزولو شود آن را هم اضافه می‌کند)، بلاک
`02-alooshomal-ssl.conf` را فعال می‌کند و کانتینر nginx را ری‌استارت می‌کند.
گواهی روی هاست در `/etc/letsencrypt` ذخیره و به‌صورت read-only داخل کانتینر
mount می‌شود؛ مسیر `/.well-known/acme-challenge/` هم برای تمدید خودکار سرو می‌شود.

> در پنل آروان، پس از آنکه پورت ۴۴۳ مبدأ پاسخ داد، پروتکل اتصال به مبدأ را روی
> **HTTPS** بگذارید. تا وقتی روی HTTP است، ترافیک ورودی آروان روی پورت ۸۰ می‌آید.
>
> کانفیگ‌ها با `set $...` و `resolver 127.0.0.11` نوشته شده‌اند تا nginx حتی وقتی
> `web`/`api` هنوز بالا نیامده‌اند هم استارت بخورد.

#### سازگاری با CDN آروان

کانفیگ بالادست پراکسی آروان را می‌شناسد: هدر `ar-real-ip` را می‌خواند تا
`$remote_addr` همان IP واقعی کاربر باشد (نه نود لبه‌ی CDN)، و `X-Forwarded-Proto`
را از آروان برای تشخیص `https` می‌خواند.

> ⚠️ در پنل آروان، حالت SSL را روی **Full/HTTP** بگذارید (ترافیک آروان→سرور روی HTTP).
> اگر حالت **Full (HTTPS)** را انتخاب کردید، بخش بلاک `443` در انتهای
> `deploy/nginx/alooshomal.ir.conf` را از کامنت خارج کنید و گواهی روی همین سرور نصب کنید،
> وگرنه ممکن است حلقه‌ی ریدایرکت یا خطای TLS بگیرید.

لیست IPهای آروان گاهی عوض می‌شود؛ برای به‌روزرسانی خودکار بلاک real-IP:

```bash
sudo deploy/nginx/sync-arvancloud-ips.sh
```

---

## ۳) اولین اجرا (دستی، یک‌بار)

منتظر بمانید اولین اجرای Actions تمام شود، سپس روی سرور:

```bash
cd /var/www/alooshomal.ir
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

API هنگام استارت به‌صورت خودکار `prisma db push` را اجرا می‌کند (فایل `apps/api/docker-entrypoint.sh`)،
بنابراین نیازی به مایگریشن دستی نیست.

### Redis (کش مشترک — اختیاری)

استک یک سرویس `redis` هم دارد که به‌عنوان **کش مشترک** برای نتایج دایرکتوری عمومی و
فهرست facetها استفاده می‌شود. چند نکته‌ی مهم:

- **Redis منبع حقیقت نیست؛ فقط کش است.** اگر سرویس `redis` خاموش یا حذف شود، API به‌صورت
  خودکار به کش درون‌حافظه‌ای برمی‌گردد و همه‌چیز از Postgres خوانده می‌شود؛ هیچ داده‌ای
  از بین نمی‌رود.
- اتصال با متغیر `REDIS_URL` کنترل می‌شود (پیش‌فرض `redis://redis:6379`). اگر این متغیر
  خالی باشد، لایه‌ی Redis کاملاً غیرفعال می‌شود.
- Redis با `--save "" --appendonly no` اجرا می‌شود، یعنی **هیچ دیسکی مصرف نمی‌کند** و
  فقط در RAM کش می‌کند؛ در نتیجه به دیسک سرور یا به volume دیتابیس دست نمی‌زند.
- سیاست حافظه `allkeys-lru` است؛ وقتی پر شود قدیمی‌ترین کلیدها خودکار حذف می‌شوند.
- TTLها قابل تنظیم‌اند: `FACETS_CACHE_TTL_MS` (پیش‌فرض ۳۰ ثانیه) و
  `DIRECTORY_CACHE_TTL_MS` (پیش‌فرض ۱۵ ثانیه). هر تغییر محتوا (تأیید/رد، ویرایش، حذف،
  پله، ایمپورت گروهی، تغییر شهر/دسته) کش مربوطه را فوراً باطل می‌کند.

---

## ۴) تست

```bash
git add .github/workflows/deploy.yml docker-compose.prod.yml docs/DEPLOY.md
git commit -m "ci: add ghcr build and ssh deployment workflow"
git push origin main
```

سپس در تب **Actions** مخزن مراحل بیلد دو ایمیج، پوش به GHCR و استقرار روی سرور را ببینید.
