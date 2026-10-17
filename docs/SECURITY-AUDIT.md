# گزارش بررسی امنیت (Security Audit)

این سند چک‌لیست امنیتی پروژه (بر پایه‌ی «چک‌لیست بررسی و تست امنیت
NestJS + Next.js + PostgreSQL + Prisma + Docker Compose») را لایه‌به‌لایه مرور
می‌کند و وضعیت فعلی هر مورد را در این مخزن نشان می‌دهد. هدف این است که هنگام
تغییر کد، انتظارِ امنیتی هر لایه مشخص باشد.

## ۱. اسکن خودکار وابستگی‌ها (SCA)

- **وضعیت: پیاده‌سازی‌شده.** فایل `.github/dependabot.yml` برای اکوسیستم‌های
  `npm` (ریشه + `apps/api` + `apps/web`)، `github-actions` و `docker` فعال است و
  هفتگی هشدار/PR امنیتی می‌سازد.
- اجرای دستی برای بررسی فوری: `npm audit` در ریشه و در هر اپ، یا
  `npx snyk test`.
- هنگام افزودن وابستگی جدید، به‌صورت دوره‌ای `npm audit --omit=dev` را در CI یا
  قبل از انتشار اجرا کنید.

## ۲. آنالیز ایستا (SAST) و کشف Secret

- **وضعیت: ابزار آماده، اجرای دوره‌ای بر عهده‌ی تیم.**
- اجرای Semgrep روی کل مخزن:
  `npx semgrep --config=auto apps/`
- اجرای gitleaks برای اطمینان از لو نرفتن کلیدها در تاریخچه‌ی گیت:
  `npx gitleaks detect --source . -v`
- نکته: فایل‌های `.env` در `.gitignore` هستند و کد نباید هیچ Secretی را در خود
  جاسازی کند؛ همه‌ی مقادیر حساس از متغیرهای محیطی خوانده می‌شوند.

## ۳. امنیت لایه‌ی بک‌اند (NestJS + Prisma)

- **آمار خام (Raw SQL):** تمام کوئری‌های خام فقط با `$queryRaw` به‌صورت
  tagged-template استفاده شده‌اند (تنها مورد: health check در
  `apps/api/src/health/health.controller.ts`). هیچ استفاده‌ای از
  `$queryRawUnsafe` / `$executeRawUnsafe` در کد وجود ندارد؛ بنابراین پارامترها
  به prepared statement تبدیل می‌شوند و مسیر SQL Injection بسته است.
- **اعتبارسنجی ورودی:** در `apps/api/src/main.ts` یک `ValidationPipe` سراسری با
  `whitelist: true` و `forbidNonWhitelisted: true` فعال است؛ فیلدهای ناشناخته حذف
  می‌شوند و جلوی Mass Assignment گرفته می‌شود.
- **هدرها و CORS:** `helmet()` روی همه‌ی پاسخ‌ها فعال است و CORS فقط برای
  `CORS_ORIGIN`های مجاز با `credentials: true` باز می‌شود (در پروداکشن `*` نیست).
- **محدودیت نرخ (Rate Limiting):** سرویس
  `apps/api/src/common/rate-limit.service.ts` روی Redis (با fallback حافظه‌ای)
  قواعد ورود/OTP/ثبت‌نام را اعمال می‌کند. جزئیات در `docs/SECURITY.md`.
- **کنترل دسترسی (IDOR/BOLA):** همه‌ی کوئری‌های مالکیتی باید شناسه‌ی کاربر لاگین
  را در `where` لحاظ کنند (الگوی `where: { id, userId: currentUser.id }`).
  گاردهای احراز هویت و کنترل مالکیت در سرویس‌ها پیاده‌سازی شده‌اند؛ هر تغییر
  جدید باید همین الگو را حفظ کند.

## ۴. امنیت لایه‌ی فرانت‌اند (Next.js)

- **هدرهای امنیتی و CSP:** فایل `apps/web/proxy.ts` (جایگزین `middleware` در
  Next.js 16) روی همه‌ی مسیرها هدرهای زیر را اضافه می‌کند:
  `Content-Security-Policy`، `X-Content-Type-Options: nosniff`،
  `X-Frame-Options: DENY`، `Referrer-Policy`، `Permissions-Policy`،
  `Cross-Origin-Opener-Policy` و در HTTPS `Strict-Transport-Security`.
- **متغیرهای محیطی:** هیچ توکن/Secret حساسی با پیشوند `NEXT_PUBLIC_` ذخیره
  نمی‌شود؛ این پیشوند فقط برای URL عمومی API و آدرس اپ استفاده شده است.
- **XSS:** از `dangerouslySetInnerHTML` تنها برای تزریق JSON-LD (داده‌ی
  ساخت‌یافته‌ی JSON.stringify‌شده، بدون ورودی HTML) استفاده می‌شود که در
  `app/business-cards/[slug]/page.tsx` و `app/biolinks/[slug]/page.tsx` است.
  React بقیه‌ی مقادیر را به‌صورت خودکار escape می‌کند.
- **Server Actions / Route Handlers:** در هر مسیر سمت سرور، نشست کاربر و مجوز
  دسترسی باید بررسی شود (طبق روال فعلی پروژه).

## ۵. تست دینامیک و نفوذ (DAST)

- **وضعیت: رویه‌ی آماده، اجرای دوره‌ای توصیه می‌شود.**
- اسکن پایه با OWASP ZAP:
  `docker run -t zaproxy/zap-stable zap-baseline.py -t http://host.docker.internal:3000`
- تست دستی با Postman/Burp: دستکاری توکن JWT (انقضا و امضای جعلی)، فراخوانی
  اندپوینت‌ها بدون توکن یا با توکن کاربر دیگر، و ارسال Payloadهای SQLi/XSS در
  فیلدهای جستجو و فرم‌ها.

## ۶. امنیت داکر و زیرساخت PostgreSQL

- **عدم اجرای Root:** در `apps/api/Dockerfile` و `apps/web/Dockerfile` مرحله‌ی
  production با کاربر غیر‌روت (`USER node` / `USER nextjs`) اجرا می‌شود.
- **پورت پایگاه داده:** در `docker-compose.prod.yml` فقط پورت‌های `80/443` به
  بیرون باز هستند و API/Web به `127.0.0.1` محدود شده‌اند؛ پورت `5432` در
  محیط پروداکشن به بیرون اکسپوز نمی‌شود و اتصال از شبکه‌ی داخلی داکر است.
  (در فایل توسعه `docker-compose.yml` این پورت برای راحتی محلی باز است.)
- **رمزها:** رمز پیش‌فرض `postgres/postgres` در پروداکشن استفاده نمی‌شود؛ مقادیر
  از `.env` خوانده می‌شوند و `.env` در `.gitignore` است.
- **اسکن ایمیج:** `trivy image <image>` برای بررسی آسیب‌پذیری لایه‌های ایمیج.

## چک‌لیست پیشنهادی پیش از انتشار

1. `npm audit --omit=dev` (یا `pnpm audit`) و رفع آسیب‌پذیری‌های باز.
2. `npx gitleaks detect --source . -v` برای اطمینان از عدم لو رفتن کلید.
3. مرور کنترل‌های مالکیت (`Auth Guards` + `Ownership Check`) در سرویس‌های Prisma
   و اطمینان از نبود `$queryRawUnsafe`.
4. اسکن پایه‌ی OWASP ZAP روی اندپوینت‌های API و اسکن ایمیج با Trivy.

## منابع

- OWASP Node.js Security Cheat Sheet
- Prisma — Raw Queries / SQL Injection Prevention
- `docs/SECURITY.md` — تصمیم‌های امنیتی احراز هویت و توکن‌ها
