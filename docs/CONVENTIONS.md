# قراردادهای کدنویسی و چک‌لیست افزودن قابلیت

این سند قواعد روزمره‌ی نوشتن کد در این مخزن را جمع می‌کند. ساختار پوشه‌ها در
`docs/ARCHITECTURE.md` آمده است؛ اینجا تمرکز روی «چطور بنویسیم» است.

## ۱. چک‌لیست افزودن یک قابلیت کاربری

1. **API**: پوشه‌ی ویژگی زیر `apps/api/src/<feature>/` با `*.module.ts`،
   `*.controller.ts`، `*.service.ts` و `dto/`؛ ثبت ماژول در `app.module.ts`.
2. **Swagger**: `@ApiTags` روی کنترلر، `@ApiOperation({ summary })` روی هر
   مسیر، `@ApiProperty`/`@ApiPropertyOptional` روی DTO و `@ApiBearerAuth()`
   برای مسیرهای محافظت‌شده. سپس `python3 scripts/check_api_docs.py`.
3. **سوئیچ ویژگی**: یک آیتم در `FEATURE_FLAGS`
   (`apps/api/src/settings/settings.constants.ts`) با `key` یکتا؛ در نقطه‌ی
   ورود سرویس `await this.settings.assertFeatureEnabled('<key>')`؛ اگر بخش
   عمومی دارد `publicSection` را پر کنید. رابط از `useFeatures()` استفاده کند.
4. **مالکیت**: هر ردیف متعلق به کاربر باید یا در `where` با `userId` گرفته شود
   یا با `assertOwned(row.userId, userId, ...)` بررسی شود. هرگز به شناسه‌ی
   مالک از body/query اعتماد نکنید.
5. **پرداخت**: اگر قابلیت پولی است، در لحظه‌ی `PAID` با
   `FinanceService.recordSale({ sourceType, sourceId, ... })` فاکتور صادر کنید،
   منبع را به `FINANCE_SOURCE_TYPES`/`FINANCE_SOURCE_LABELS` و `backfill()`
   اضافه کنید (قانون ۱۱).
6. **Web**: مسیر در `apps/web/app/`، کامپوننت در
   `apps/web/components/<feature>/`، تایپ‌ها در `apps/web/lib/api/types/`.
7. **تست/تأیید**: `tsc --noEmit` هر دو اپ، `eslint` فایل‌های تغییریافته،
   `check_api_docs.py`، `db_audit.py` اگر دیتابیس تغییر کرده، و یک درخواست
   واقعی به مسیر جدید.
8. **ثبت**: `sync_install.py`، افزایش نسخه، ورودی `History-Agent.md` و کامیت
   مستقل (قوانین ۱–۳ و ۷ در `AGENTS.md`).

## ۲. لایه‌بندی API

- **Controller** فقط HTTP را می‌شناسد: گرفتن `@CurrentUser()`، `@Query()`،
  `@Body()` و صدا زدن سرویس. منطق دامنه در سرویس بماند.
- **Service** منطق و تراکنش را دارد. برای چند نوشتن مرتبط از
  `prisma.$transaction` استفاده کنید.
- **DTO** تنها منبع اعتبارسنجی ورودی است؛ `ValidationPipe` سراسری با
  `whitelist`/`forbidNonWhitelisted` فعال است، پس هر فیلد ناشناخته حذف/رد
  می‌شود.
- خطاها را با `HttpException`های Nest (`NotFound`, `Forbidden`, `BadRequest`,
  `Conflict`) پرتاب کنید؛ فیلتر سراسری آن‌ها را به
  `{ success: false, statusCode, message, code? }` تبدیل می‌کند.
- پیام‌های کاربر فارسی و کوتاه باشند؛ پیام‌های فنی/لاگ انگلیسی.

## ۳. کمک‌تابع‌های مشترک

قبل از نوشتن منطق تازه، این‌ها را بررسی کنید:

| نیاز | ابزار |
| --- | --- |
| محدودکردن اندازه‌ی صفحه | `clamp` / `clampLimit` در `common/pagination-meta.ts` |
| پوشش صفحه‌بندی | `paginationMeta` و `PaginationDto` |
| اسلاگ فارسی | `slugify` در `common/slug.ts` |
| بررسی مالکیت | `assertOwned` در `common/ownership.ts` |
| آدرس خروجی کاربر | `assertPublicHttpUrl` / `safeFetch` در `common/outbound-url.ts` |
| عدد فارسی/تومان | `toLocaleString('fa-IR')` (یا helper محلی موجود) |
| اعتبار کد ملی | `isValidNationalCode` در `common/national-code.ts` |
| رمزنگاری راز | `encryptSecret` / `decryptSecret` در `common/secret-box.ts` |

## ۴. دیتابیس

- منبع حقیقت `apps/api/prisma/schema.prisma` است؛ تغییرات ساختاری با
  `prisma db push` اعمال می‌شوند و entrypoint جلوی تغییر مخرب را می‌گیرد.
- برای ایندکس، سیاست `docs/DATABASE.md` را رعایت کنید: `@unique` جای
  `@@index` تکراری را می‌گیرد؛ فهرست‌های «مال من» ایندکس مرکب
  `[userId, createdAt]` می‌خواهند؛ FK را فقط وقتی ایندکس کنید که در کوئری
  استفاده می‌شود.
- پس از هر تغییر داده/اسکیما `python3 scripts/db_audit.py` بگیرید؛ خروجی
  غیرصفر یعنی یک invariant (مثل فاکتور هر پرداخت) شکسته است.
- عملیات پاک‌سازی دوره‌ای را به‌صورت job با `setInterval` + `unref` و اولین
  اجرای تأخیری اضافه کنید (نمونه: `SessionsCleanupJob`).

## ۵. امنیت

- هیچ Secretی در کد یا `NEXT_PUBLIC_*` نگذارید؛ همه از env خوانده شوند.
  `config/env.validation.ts` در بوت اعتبارسنجی می‌کند.
- هر fetch با URL کاربر باید از `safeFetch` رد شود (SSRF).
- آپلود خام (PDF/تصویر) باید با magic bytes بررسی شود، نه MIME کلاینت.
- برای مسیرهای حساس/پرهزینه rate limit اضافه کنید (`RATE_LIMITS`).
- کوئری خام فقط با tagged template (`$queryRaw`) و پارامتر امن؛
  `$queryRawUnsafe` ممنوع.
- توکن دسترسی کوتاه‌عمر و refresh در کوکی `HttpOnly` می‌ماند؛ توکن را در URL
  نگذارید (SSE با ticket یک‌بارمصرف).

## ۶. Web

- کامپوننت‌های سرور داده را از `lib/*-server.ts` می‌گیرند؛ کامپوننت‌های کلاینت
  از `lib/api` (barrel) استفاده می‌کنند.
- `cn()` از `lib/utils.ts` برای ترکیب کلاس‌ها؛ رنگ‌ها/فاصله‌ها هم‌سبک بقیه.
- برای نمایش/پنهان‌کردن منو و بخش‌ها از `useFeatures().showNav(...)` /
  `isFeatureVisible(...)` / `isSectionStopped(...)` استفاده کنید، نه شرط دستی.
- هیچ داده‌ی حساسی در `localStorage` جز توکن کوتاه‌عمر نگذارید.
- تصاویر بیرونی فقط از دامنه‌های allowlist در `next.config.ts` (SSRF ایمیج).

## ۷. دستورهای تأیید

```bash
# API
docker compose exec api ./node_modules/.bin/tsc --noEmit -p tsconfig.json
docker compose exec api ./node_modules/.bin/eslint src

# Web
docker compose exec web ./node_modules/.bin/tsc --noEmit
docker compose exec web ./node_modules/.bin/eslint .

# قراردادها و دیتابیس
python3 scripts/check_api_docs.py
python3 scripts/check_modules.py
python3 scripts/db_audit.py
python3 scripts/sync_install.py --check
```
