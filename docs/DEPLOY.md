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
NEXT_PUBLIC_API_URL=https://alooshomal.ir/api
NEXT_PUBLIC_APP_URL=https://alooshomal.ir
EOF
```

### نکته‌ی مهم: یک دامنه، دو سرویس

`web` روی `3000` و `api` روی `4000` هستند. جلوی آن‌ها Nginx قرار می‌گیرد و مسیرها را تقسیم می‌کند:

- `https://alooshomal.ir/api/proxy/*` → `http://127.0.0.1:3000` (روت‌هندلرهای خود Next.js)
- بقیه‌ی `https://alooshomal.ir/api/*` → `http://127.0.0.1:4000` (NestJS API)
- بقیه‌ی مسیرها → `http://127.0.0.1:3000`

کانفیگ آماده در `deploy/nginx/alooshomal.ir.conf` است (به همین دلیل در
`docker-compose.prod.yml` پورت API به `127.0.0.1` بایند شده و از بیرون پنهان است).

#### نصب کانفیگ Nginx

```bash
sudo apt update && sudo apt install -y nginx

# کانفیگ را روی سرور کپی کنید (مسیر را مطابق سرور خودتان تنظیم کنید)
sudo cp deploy/nginx/alooshomal.ir.conf /etc/nginx/sites-available/alooshomal.ir.conf
sudo ln -sf /etc/nginx/sites-available/alooshomal.ir.conf /etc/nginx/sites-enabled/

# کانفیگ پیش‌فرض را غیرفعال کنید تا با آن تداخل نکند
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
```

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
sudo deploy/nginx/sync-arvancloud-ips.sh /etc/nginx/sites-available/alooshomal.ir.conf
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
