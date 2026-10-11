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
EOF
```

### نکته‌ی مهم: یک دامنه، سه سرویس

`web` روی `3000` و `api` روی `4000` هستند و **Nginx داخل داکر** جلوی آن‌ها قرار می‌گیرد
(سرویس `nginx` در `docker-compose.prod.yml`) و مسیرها را تقسیم می‌کند:

- `https://alooshomal.ir/api/proxy/*` → `web:3000` (روت‌هندلرهای خود Next.js)
- بقیه‌ی `https://alooshomal.ir/api/*` → `api:4000` (NestJS API)
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

---

## ۴) تست

```bash
git add .github/workflows/deploy.yml docker-compose.prod.yml docs/DEPLOY.md
git commit -m "ci: add ghcr build and ssh deployment workflow"
git push origin main
```

سپس در تب **Actions** مخزن مراحل بیلد دو ایمیج، پوش به GHCR و استقرار روی سرور را ببینید.
