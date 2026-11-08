# معماری و ساختار ماژولار پروژه

این سند چیدمان پروژه و **قراردادهای ماژولار بودن ویژگی‌ها** را تعریف می‌کند؛
هدف این است که هر ویژگی (feature) یک «واحد خودبسنده» با محل مشخص و قابل‌پیش‌بینی
باشد. اگر ایجنت یا توسعه‌دهنده‌ی جدیدی بخواهد چیزی را پیدا یا اضافه کند، باید
بتواند بر اساس همین قواعد جای آن را حدس بزند.

> **خلاصه‌ی یک‌خطی:** API = یک پوشه به‌ازای هر ویژگی زیر `apps/api/src/` با
> `*.module.ts` إجبارى و ثبت در `app.module.ts`؛ Web = مسیر در `apps/web/app/`
> و کامپوننت‌ها در `apps/web/components/<ویژگی>/`؛ و هر قابلیت کاربری یک سوئیچ
> فعال/نمایش یکتا در `FEATURE_FLAGS` دارد.

---

## ۱. نمای کلی

مونوریپوی npm workspaces:

| مسیر | نقش |
| --- | --- |
| `apps/api` | بک‌اند: NestJS + Prisma + PostgreSQL |
| `apps/web` | فرانت‌اند: Next.js 16 (App Router، standalone) |
| `scripts/` | ابزارهای توسعه/بررسی (سینک نصب‌کننده، بررسی مستندات API، بررسی ماژول‌ها) |
| `docs/` | مستندات پروژه |
| `deploy/` و `docker-compose*.yml` | استقرار و اجرای کانتینری |

---

## ۲. ساختار API (feature-per-folder)

هر ویژگی بک‌اند دقیقاً یک پوشه زیر `apps/api/src/` دارد و **باید** شامل یک فایل
`<name>.module.ts` باشد:

```
apps/api/src/
  <feature>/
    <feature>.module.ts        # تعریف @Module — نقطه‌ی ورود ویژگی
    <feature>.controller.ts    # مسیرهای HTTP (با @ApiTags/@ApiOperation)
    <feature>.service.ts       # منطق دامنه
    dto/                        # DTOهای ورودی/خروجی (در صورت نیاز)
```

مثال‌ها: `biolinks/`، `businesscards/`، `ads/`، `boosts/`، `subscriptions/`،
`tickets/`، `request-payments/`.

پوشه‌های **زیرساختی** (نه ویژگی) که از قاعده‌ی «یک ماژول در هر پوشه» مستثنا هستند:

| پوشه | نقش |
| --- | --- |
| `config/` | خواندن/اعتبارسنجی تنظیمات محیطی (بدون `@Module`) |
| `common/` | گاردها، اینترسپتورها، ابزارهای مشترک |
| `prisma/` | `PrismaService` و ماژول آن |
| `redis/` | کلاینت Redis مشترک |

**قواعد ماژول:**

- نام فایل ماژول لازم نیست برابر نام پوشه باشد (مثلاً `businesscards/` →
  `business-cards.module.ts`)، ولی هر پوشه فقط **یک** `*.module.ts` دارد.
- هر ماژول ویژگی باید در `apps/api/src/app.module.ts` داخل `imports` ثبت شود.
- هر کنترلر `@ApiTags('<tag>')` و هر متد `@ApiOperation({ summary: '...' })`
  دارد (قانون ۸ در `AGENTS.md`). بررسی خودکار:
  `python3 scripts/check_api_docs.py`.

---

## ۳. ساختار Web

| مسیر | نقش |
| --- | --- |
| `apps/web/app/` | مسیرها (App Router)؛ هر مسیر یک پوشه با `page.tsx` |
| `apps/web/components/<feature>/` | کامپوننت‌های همان ویژگی |
| `apps/web/components/ui/` | اجزای پایه‌ی قابل‌استفاده‌ی مجدد (Button، Card، …) |
| `apps/web/components/layout/` | پوسته‌ها (هدر/فوتر/شل پنل‌ها) |
| `apps/web/lib/` | کلاینت API، هوک‌ها، ابزارهای مشترک |

کامپوننت‌های ویژگی‌محور همیشه زیر پوشه‌ی هم‌نام با ویژگی می‌نشینند
(مثلاً `components/biolink/`، `components/admin/`، `components/dashboard/`) و
از `components/ui/` برای اجزای عمومی استفاده می‌کنند.

---

## ۴. دسته‌ی ویژگی‌ها (Feature Flags)

منبع یکتای سوئیچ‌های قابلیت‌ها آرایه‌ی `FEATURE_FLAGS` در
`apps/api/src/settings/settings.service.ts` است (قانون ۹ در `AGENTS.md`).
هر آیتم به‌طور خودکار **دو** کلید می‌گیرد:

- **فعال** (`flag.key`) — آیا قابلیت کار می‌کند؛ سمت سرور با
  `assertFeatureEnabled('<key>')` اعمال می‌شود.
- **نمایش** (`flag.key + 'Visible'`) — آیا قابلیت در رابط سایت تبلیغ/نمایش داده
  می‌شود؛ سمت کلاینت با `useFeatures().showNav(...)` / `isFeatureVisible(...)`.

اگر ویژگی مالک یک بخش عمومی است، در همان آیتم `publicSection`
(`{ name, routes, homeBox }`) ثبت می‌شود تا مسیرهایش خودکار از ناوبری پنهان و
صفحه‌اش «موقتاً غیرفعال» شود.

---

## ۵. دستور افزودن یک ویژگی جدید

1. **بک‌اند:** پوشه‌ی `apps/api/src/<feature>/` بساز؛ `module`/`controller`/
   `service` را اضافه کن و ماژول را در `app.module.ts` ثبت کن.
2. **مستندسازی:** روی کنترلرها `@ApiTags`/`@ApiOperation`/`@ApiBearerAuth` بگذار؛
   `python3 scripts/check_api_docs.py` باید سبز بماند.
3. **سوئیچ:** یک آیتم تازه در `FEATURE_FLAGS` با `key` یکتا ثبت کن و در نقطه‌ی
   ورود سرور `assertFeatureEnabled('<key>')` را صدا بزن.
4. **فرانت:** مسیر در `apps/web/app/` و کامپوننت‌ها در
   `apps/web/components/<feature>/`.
5. **بررسی:** `python3 scripts/check_modules.py`، `check_api_docs.py`،
   `tsc --noEmit` در هر دو اپ و `npm run lint` در هر دو اپ باید سبز باشند.
6. **ثبت:** ورودی `History-Agent.md` + افزایش نسخه در `apps/web/lib/version.ts`
   + `python3 scripts/sync_install.py` (قوانین ۱ تا ۳ در `AGENTS.md`).

---

## ۶. بررسی‌های خودکار

| دستور | چه چیزی را تضمین می‌کند |
| --- | --- |
| `python3 scripts/check_modules.py` | هر پوشه‌ی ویژگی یک ماژول دارد و در `app.module.ts` ثبت شده؛ کلیدهای `FEATURE_FLAGS` یکتا هستند |
| `python3 scripts/check_api_docs.py` | همه‌ی مسیرهای API مستند Swagger دارند |
| `python3 scripts/sync_install.py --check` | بلوک‌های `install.sh` با درخت فایل همگام‌اند |
| `npm run lint` (در هر دو اپ) | قواعد ESLint |
| `tsc --noEmit` (در هر دو اپ) | صحت تایپ‌ها |

این‌ها در ورک‌فلوی `ci` (`.github/workflows/ci.yml`) نیز اجرا می‌شوند تا پیش از
استقرار جلوی رگرسیون‌ها گرفته شود.

---

## ۷. نام‌گذاری و سبک

- فایل‌های بک‌اند: `kebab-case` (مثل `business-cards.service.ts`)؛ پوشه‌ها:
  `kebab-case` بدون فاصله.
- فایل‌های فرانت‌اند: کامپوننت‌ها `PascalCase.tsx`، هوک‌ها/ابزارها `kebab-case.ts`.
- متن‌های رابط کاربری فارسی‌اند؛ کد و نام‌ها انگلیسی.
- قالب‌بندی و لینت با ESLint/Prettier اجباری است (قانون ۴ در `AGENTS.md`:
  تغییرات باید هم‌سبک با کد موجود و حداقلی باشند).
