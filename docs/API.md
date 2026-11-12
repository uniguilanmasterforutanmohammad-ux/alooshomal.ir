# مستندات API (Swagger / OpenAPI)

> **مرجع قوانین پروژه:** `AGENTS.md`. این سند مکمل `docs/DEVELOPMENT.md` و
> `docs/SECURITY.md` است و بایدی هنگام هر افزودن/تغییر مسیر API هم‌سو بماند
> (قانون ۸ در `AGENTS.md`).

API این پروژه یک سرویس NestJS است و **Swagger از قبل نصب و فعال است**؛ مستندات
به‌صورت خودکار از روی دکوراتورهای کنترلرها/DTOها ساخته می‌شود.

## آدرس‌ها

| مورد | آدرس (لوکال) | آدرس (تولید) |
| --- | --- | --- |
| Swagger UI | http://localhost:3001/api/docs | `https://alooshomal.ir/api/docs` (اگر `ENABLE_SWAGGER=true` باشد) |
| OpenAPI JSON | http://localhost:3001/api/docs-json | `https://alooshomal.ir/api/docs-json` |
| پیشوند سراسری | `/api` | `/api` |

## فعال/غیرفعال‌کردن

مستندات با متغیر محیطی `ENABLE_SWAGGER` کنترل می‌شود:

- `.env` (لوکال) و `docker-compose.yml`: پیش‌فرض `true`.
- `docker-compose.prod.yml`: پیش‌فرض `false` (در تولید به‌صورت پیش‌فرض خاموش است
  تا سطح حمله کم شود؛ برای روشن‌کردن، `ENABLE_SWAGGER=true` را در سرور ست کنید).

```bash
# نمونه‌ی فعال‌سازی روی سرور تولید
ENABLE_SWAGGER=true docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api
```

## احراز هویت در Swagger

1. با `POST /api/auth/login` (ایمیل/گذرواژه) یا `POST /api/auth/phone/verify`
   (شماره/کد پیامکی) توکن دسترسی بگیرید.
   مسیر ایمیل/گذرواژه برای **همه‌ی کاربران** فعال و دو مرحله‌ای است:
   `POST /api/auth/login` پس از تأیید گذرواژه، کد یکبارمصرف را به ایمیل
   (و در صورت تنظیم، موبایل) حساب می‌فرستد و `requiresOtp: true` برمی‌گرداند
   (بدون توکن). سپس `POST /api/auth/login/verify` با `{ email, code }` نشست را
   صادر می‌کند. ثبت‌نام با ایمیل هم همین دو مرحله را دارد:
   `POST /api/auth/register` → `POST /api/auth/register/verify`.
   ورود ادمین و مدیران صفحه‌ی مجزای `/admin/login` دارد و از این مسیرها
   استفاده می‌کند: `POST /api/auth/admin/login` و
   `POST /api/auth/admin/login/verify` (ایمیل/رمز + کد)، و
   `POST /api/auth/admin/phone/request-code` و
   `POST /api/auth/admin/phone/verify` (موبایل + کد). این مسیرها فقط
   حساب‌های `ADMIN`/`MODERATOR` را می‌پذیرند و هرگز حساب جدید نمی‌سازند.
   در جریان `POST /api/auth/phone/request-code` می‌توانید فیلد اختیاری `email`
   را هم بفرستید؛ همان کد یکبارمصرف علاوه بر پیامک به آن ایمیل هم ارسال می‌شود
   (برای کاربران موجود، ایمیل حساب ملاک است).
2. در بالای صفحه‌ی Swagger روی **Authorize** بزنید و توکن را در قالب
   `Bearer <token>` وارد کنید.
3. گزینه‌ی `persistAuthorization` فعال است، پس توکن بین رفرش‌ها حفظ می‌شود.

## قرارداد پاسخ‌ها

همه‌ی پاسخ‌ها از `TransformInterceptor` عبور می‌کنند و در پوشش یکنواخت زیر
برگردانده می‌شوند:

```json
{ "success": true, "data": { "...": "..." } }
```

و خطاها توسط `HttpExceptionFilter` به شکل:

```json
{ "success": false, "statusCode": 400, "message": "…", "timestamp": "…" }
```

## کامل‌بودن مستندات

- هر کنترلر با `@ApiTags` یک گروه مشخص دارد (شمارش دقیق در خروجی
  `python3 scripts/check_api_docs.py`).
- هر مسیر باید `@ApiOperation({ summary })` و برای ورودی‌ها DTO با
  `@ApiProperty`/`@ApiPropertyOptional` داشته باشد.
- DTOهای به‌روزرسانی با `PartialType` از DTO ساخت ارث‌بری می‌کنند، پس متادیتای
  Swagger را خودکار به ارث می‌برند.

### مسیرهای عمومی مرتبط با دفترچه تلفن

صفحه‌ی عمومی `/phonebook` روی دو مسیر public بنا شده است:

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/business-cards/public/phonebook` | فهرست صفحه‌بندی‌شده‌ی تماس کارت‌ویزیت‌های منتشرشده‌ای که شماره دارند. پارامترهای `page`/`limit` (مشترک با `PaginationDto`) و `sort` (`alpha` پیش‌فرض / `recent`) را می‌پذیرد؛ `q` جستجو در نام/شغل/شرکت/شماره است. مرتب‌سازی الفبایی با collation فارسی در سرور انجام می‌شود (سقف ۲۰۰۰ ردیف نامزد). |
| `GET` | `/business-cards/public/:slug` | جزئیات کامل هر مخاطب (مقصد لینک «مشاهدهٔ کارت ویزیت کامل»). |

### دسته‌بندی مشاغل و صفحه‌ی کسب‌وکار

صفحه‌های `/categories` و `/categories/[slug]` و `/business/[slug]` روی این
مسیرهای عمومی بنا شده‌اند:

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/business-categories/public` | فهرست دسته‌بندی‌های شغلی فعال با تعداد کارت‌های منتشرشده‌ی هر دسته (`{ id, name, count }[]`). |
| `GET` | `/business-categories/public/:slug` | صفحه‌ی یک دسته: `category` + فهرست صفحه‌بندی‌شده‌ی کسب‌وکارها (`items`, `meta`, `filters`) با پارامترهای `page`، `cityId`، `q` و `sort` (`recent` \| `rating` \| `liked` \| `alpha`). `slug` همان نام دسته است (URL-encoded). |
| `GET` | `/business-taxonomy/search` | جست‌وجوی کادر «زیردسته / زیرشاخه» فرم ساخت بیولینک/کارت ویزیت/کسب‌وکار. پارامترها: `level` (`ANY` پیش‌فرض \| `SUB` \| `TAG`؛ در حالت `ANY` ابتدا «زیرشاخه» و در صورت نبود نتیجه «زیردسته» جست‌وجو می‌شود)، `categoryId` (دسته‌ی اصلی)، `parentId` یا `parentName` (محدودکردن `TAG` به یک زیردسته)، `q` و `limit` (۱ تا ۵۰، پیش‌فرض ۲۰). خروجی `{ id, name, level, parentId, parentName, categoryId }[]`. فقط دسته‌های اصلی در `/businesses` و فیلترها می‌آیند؛ این سطح‌های عمیق فقط از طریق جست‌وجو قابل انتخاب‌اند. |
| `POST` | `/business-taxonomy/requests` | وقتی هیچ سطحی با عبارت کاربر مطابقت ندارد، عبارت (`{ q, categoryId? }`) برای مدیران ارسال می‌شود (اعلان دسته‌ی `TAXONOMY` + لاگ فعالیت) و فرم به کاربر «سایر» نشان می‌دهد. نیازمند ورود. |
| `GET` | `/business-taxonomy/neighborhoods` | پیشنهادهای کادر «محله» فرم‌های ساخت بیولینک/کارت ویزیت/کسب‌وکار. پارامترها: `cityId` (محدودکردن به یک شهر)، `q` و `limit` (۱ تا ۵۰، پیش‌فرض ۲۰). خروجی `string[]` از محله‌های ثبت‌شده روی کارت‌های منتشرشده. مقدار «محله» آزاد است و کاربر می‌تواند عبارت تازه هم وارد کند. |
| `GET` | `/business-reviews/public/:slug` | دیدگاه‌ها و امتیاز عمومی کسب‌وکار: `summary` (میانگین، تعداد و توزیع ستاره‌ها)، `items` و `meta`. فقط دیدگاه‌های نمایش‌پذیر. |
| `GET` | `/business-reviews/public/:slug/mine` | دیدگاه کاربر جاری برای پیش‌پرکردن فرم (نیازمند ورود؛ در غیر این صورت `{ review: null }`). |
| `POST` | `/business-reviews/public/:slug` | ثبت یا ویرایش دیدگاه کاربر جاری؛ بدنه `{ rating: 1..5, comment? }`. ثبت برای مالک همان کسب‌وکار مجاز نیست. |
| `DELETE` | `/business-reviews/public/:slug/mine` | حذف دیدگاه کاربر جاری و به‌روزرسانی میانگین امتیاز. |
| `POST` | `/business-cards/:id/claim` | تصاحب کسب‌وکارهای ثبت‌شده‌ی سیستمی (`isUnclaimed`) توسط کاربر وارد‌شده؛ مالکیت انتقال می‌یابد و کارت منتشرشده می‌ماند. در صورت متعلق‌بودن به کاربر دیگر `409` و اگر ویژگی `featureBusinessClaim` خاموش باشد `403` برمی‌گرداند. |
| `POST` | `/business-cards/public/:slug/report` | گزارش کارت عمومی توسط بازدیدکننده (ورود اختیاری؛ مهمان هم می‌تواند). بدنه `{ reason: 'INAPPROPRIATE' \| 'OWNERSHIP' \| 'WRONG_INFO' \| 'SPAM' \| 'OTHER', note? }`. گزارش با اعلان دسته‌ی `REPORT` برای مدیران و ثبت در لاگ فعالیت همراه می‌شود؛ اگر ویژگی `featureBusinessReports` خاموش باشد `403` برمی‌گرداند. |
| `POST` | `/uploads/gallery` | آپلود تصویر گالری کسب‌وکار (WebP)؛ خروجی `url` در فیلد `gallery` کارت ویزیت ذخیره می‌شود. |

فیلدهای جدید کارت ویزیت در `CreateBusinessCardDto`/`UpdateBusinessCardDto`:
`gallery` (حداکثر ۱۲ URL) و `workingHours` (شیء هفت‌روزه با کلیدهای
`saturday` … `friday` و مقادیر `{ open, close, closed }` با قالب `HH:mm`).
همچنین `subCategory` و `subSubCategory` (اختیاری، حداکثر ۱۲۰ نویسه) برای ثبت
«زیردسته»/«زیرشاخه»ی انتخاب‌شده از جست‌وجوی تاکسونومی؛ همین دو فیلد به
`Biolink` هم اضافه شده‌اند. انتخاب «زیرشاخه» هر دو فیلد را پر می‌کند (نام
زیرشاخه + نام زیردسته‌ی والد) و انتخاب «زیردسته» فقط `subCategory` را. اگر هیچ
سطحی مطابقت نداشته باشد، عبارت تایپ‌شده در `subCategory` ذخیره و برای مدیران
ارسال می‌شود.
فیلد `neighborhood` («محله»، اختیاری، حداکثر ۱۲۰ نویسه) هم به `BusinessCard` و
`Biolink` اضافه شده است؛ روی کارت‌های عمومی به‌صورت تگ نمایش داده می‌شود و جای
برچسب «شهر/منطقه» را می‌گیرد. ترتیب فهرست `/cities` هم ثابت است: شهرهای اصلی
(تنکابن، خرم‌آباد، شیرود، رامسر) همیشه اول و به همین ترتیب و بقیه الفبایی.
میانگین و تعداد امتیاز (`ratingAvg`/`ratingCount`) روی خود کارت ذخیره و پس از
هر ثبت/ویرایش/حذف دیدگاه به‌صورت تراکنشی به‌روز می‌شود.

### تم سراسری سایت (`siteTheme`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/settings/public` | در کنار سایر تنظیمات عمومی، فیلد `siteTheme` (`vintage` \| `modern` \| `bazaar` \| `twitter` \| `kashi`) را برمی‌گرداند؛ لایه‌ی ریشه‌ی وب آن را روی `<html data-theme>` می‌نویسد (برای `twitter` به‌صورت `data-theme="modern"` + `data-skin="twitter"`). همچنین `hiddenNavHrefs`/`stoppedSections` (بخش‌های پنهان/متوقف) و `featureNoticeEnabled` (نمایش نوار اعلان «توقف موقت») را برمی‌گرداند. |
| `PATCH` | `/admin/settings` | با بدنه‌ی `{ "siteTheme": "modern" }` (یا `vintage`/`bazaar`/`twitter`/`kashi`) تم سراسری را عوض می‌کند. فقط مدیر. |

تغییر تم، همه‌ی صفحات عمومی، کارت ویزیت، بیولینک، داشبورد و پنل مدیر را هم‌زمان
به‌روز می‌کند؛ حالت روشن/تیره همچنان ترجیح جداگانه‌ی هر بازدیدکننده است.
راهنمای افزودن/حذف تم‌های ماژولار در `docs/THEMES.md` آمده است.

### پایش منابع سرور (`monitoring`)

سامانه‌ی پایش، مصرف رم/پردازنده/دیسک کانتینر را هر چند ثانیه نمونه‌برداری می‌کند
و در صورت عبور از آستانه، به ایمیل و موبایل ادمین هشدار می‌فرستد. تنظیمات در
جدول `settings` ذخیره می‌شود.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/monitoring` | وضعیت لحظه‌ای منابع، آستانه‌ها، گیرندگان و آخرین زمان هشدار هر منبع. فقط مدیر. |
| `PATCH` | `/admin/monitoring` | بدنه‌ی `UpdateMonitoringDto`: `enabled`، `ramThreshold`، `cpuThreshold`، `diskThreshold` (۱ تا ۱۰۰)، `sustainMinutes` (۰ تا ۱۲۰؛ مدت ماندگاری بالای آستانه پیش از هشدار)، `cooldownMinutes` (۵ تا ۱۴۴۰)، `intervalSeconds` (۳۰ تا ۳۶۰۰)، `alertEmail`، `alertPhone`. مقدار خالی ایمیل/موبایل یعنی استفاده از حساب ادمین اصلی. فقط مدیر. |
| `POST` | `/admin/monitoring/test` | ارسال پیام آزمایشی به کانال‌های تنظیم‌شده و برگرداندن `{ email, sms }` (موفق/ناموفق). فقط مدیر. |

کانال پیامک از `MELIPAYAMAK_SMS_PATH` (مسیر ساده‌ی ارسال، مثل
`/api/send/simple/<token>`) استفاده می‌کند و ایمیل از همان `MAIL_*` موجود.
در صورت تنظیم‌نبودن هر کانال، هشدار درون‌برنامه‌ای (دسته‌ی `SYSTEM`) همچنان ثبت
می‌شود.

### درگاه پرداخت پی‌پینگ (`payping`)

پنل مدیر «درگاه پرداخت» با توکن پذیرنده‌ی پی‌پینگ (متغیر محیطی `PAYPING_TOKEN`)
کار می‌کند. توکن فقط سمت سرور استفاده می‌شود و هرگز به مرورگر نمی‌رود؛ رابط
کاربری از طریق همین API با پی‌پینگ صحبت می‌کند. همه‌ی مسیرها فقط برای نقش
`ADMIN` در دسترس‌اند و پیشوندشان `/api/admin/payping` است.

| گروه | مسیرها | توضیح |
| --- | --- | --- |
| اتصال | `GET status`، `GET overview` | بررسی توکن/دسترسی و شمارنده‌های تراکنش، تسویه، مشتری، کد تخفیف و فاکتور. |
| گزارش | `POST reports/transactions`، `POST reports/transactions/count`، `POST reports/withdrawals`، `POST reports/withdrawals/count`، `GET reports/transaction/:code` | بدنه‌ی گزارش: `fromDate`/`toDate` (ISO-8601) و اختیاری `pageNumber`/`pageSize`. |
| تسویه | `POST withdrawals`، `GET withdrawals/:code` | درخواست تسویه با `{ amount }` (تومان). |
| مشتریان | `GET customers`، `GET customers/count`، `GET customers/:code`، `POST customers`، `PUT customers/:code`، `DELETE customers/:code` | CRUD مشتریان پی‌پینگ. |
| کد تخفیف | `GET coupons`، `GET coupons/count`، `GET coupons/:code`، `POST coupons`، `PUT coupons`، `DELETE coupons/:code`، `GET coupons/:code/buyers` | ساخت/ویرایش/حذف و دیدن خریداران. |
| آیتم مالی | `GET products`، `GET products/:code`، `POST products`، `PUT products`، `DELETE products/:code`، `POST permalinks`، `PUT permalinks`، `GET permalinks/:code`، `DELETE permalinks/:code`، `GET permalinks/:code/buyers` | آیتم‌های مالی و لینک ثابت (محدود به IP مجاز پی‌پینگ). |
| فاکتور | `GET invoices`، `GET invoices/count`، `GET invoices/:code`، `POST invoices`، `PUT invoices/:code`، `POST invoices/:code/archive`، `POST invoices/:code/dearchive`، `GET invoices/:code/pdf`، `POST invoices/cancel`، `POST invoices/confirm-payment`، `GET invoices/payment-code` | مدیریت کامل فاکتورها. |
| پرداخت | `POST payments`، `POST payments/verify`، `POST payments/reverse`، `POST payments/unblock`، `DELETE payments/:code` | ساخت پرداخت (لینک درگاه)، تأیید، بازگشت وجه، آزادسازی و حذف پرداخت پرداخت‌نشده. |
| اقساطی | `GET bnpl/options`، `GET bnpl/orders`، `GET bnpl/orders/detail`، `POST bnpl/orders`، `GET bnpl/plans`، `PUT bnpl/plans/toggle`، `POST bnpl/wallet-credit` | خرید اقساطی (BNPL). |
| استعلام | `GET inquiries/card-to-sheba`، `GET inquiries/card-to-deposit`، `GET inquiries/card-to-owner`، `GET inquiries/sheba-owner`، `GET inquiries/postal-code`، `GET inquiries/national-code`، `GET inquiries/national-code-mobile` | سرویس‌های استعلامی (در صورت فعال‌بودن در توکن). |
| آپلود | `POST uploads/:kind` | `ProfilePic` / `Item` / `InvoiceAttachment` به‌صورت `multipart/form-data` با فیلد `file`. |

اگر یک سرویس خطای `Client IP is not allowed` برگرداند، باید IP سرور در کنسول
توسعه‌دهنده‌ی پی‌پینگ ثبت شود. اگر `PAYPING_TOKEN` خالی باشد، `GET status`
`configured: false` برمی‌گرداند و پنل راهنمای تنظیم توکن را نشان می‌دهد.

### درگاه پرداخت پی‌پینگ — اپلیکیشن OAuth (`payping-oauth`)

پنل جداگانه‌ی «درگاه پرداخت (OAuth)» از **ClientId/ClientSecret** یک اپلیکیشن
OAuth پی‌پینگ استفاده می‌کند و کاملاً از پنل توکن پذیرنده جداست. این کلاینت
`client_credentials` را نمی‌پذیرد و فقط با **authorization_code + PKCE** کار
می‌کند؛ بنابراین مدیر یک‌بار حساب پی‌پینگ را مجوز می‌دهد و توکن‌ها سمت سرور
ذخیره می‌شوند. همه‌ی مسیرها فقط برای `ADMIN` و با پیشوند `/api/admin/payping-oauth`.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `status` | وضعیت تنظیم/اتصال، ClientId ماسک‌شده، آدرس بازگشت و scopeهای درخواستی/داده‌شده. |
| `PATCH` | `scopes` | بدنه `{ scopes }` (فاصله‌جدا) برای تغییر scopeهای درخواستی اتصال بعدی. |
| `POST` | `start` | ساخت آدرس مجوزدهی (شامل `state` و `code_challenge` S256)؛ خروجی `{ url, state }`. |
| `POST` | `callback` | بدنه `{ code, state }`؛ تبدیل کد به توکن و ذخیره‌ی آن. |
| `POST` | `disconnect` | حذف توکن‌های ذخیره‌شده. |
| `GET` | `userinfo` | اطلاعات کاربر پی‌پینگ با توکن OAuth. |
| `GET` | `probe` | صدا زدن یک endpoint نمونه برای هر scope و گزارش «دسترسی دارد/ندارد». |
| `POST` | `request` | بدنه `{ method, path, body? }`؛ فراخوانی خام یک مسیر مجاز پی‌پینگ. |

**آدرس بازگشت:** باید دقیقاً با یکی از Redirect URIهای ثبت‌شده در کنسول پی‌پینگ
یکسان باشد. برای این اپلیکیشن، آدرس ثبت‌شده `https://shomalicard.ir` (ریشه‌ی
سایت) است؛ بنابراین یک کامپوننت سراسری (`PaypingOAuthCatcher`) کد بازگشتی را در
ریشه می‌گیرد، به API می‌فرستد و سپس به `/admin?section=payping-oauth` هدایت می‌کند.

**scopeهای مجاز این کلاینت** (بررسی‌شده روی endpoint مجوزدهی):
`openid`، `pay:read`، `pay:write`، `report:read`، `product:read`،
`product:write`، `coupon:read`، `coupon:write`، `customer:read`،
`customer:write`، `invoice:read`، `invoice:write`، `upload:write`،
`bnpl:merchantread`، `bnpl:merchantwrite`.

scopeهای `profile`، `email`، `phone`، `offline_access` و همه‌ی `inquiry:*` برای
این کلاینت **مجاز نیستند** (خطای صفحه‌ی مجوزدهی). چون `offline_access` مجاز نیست،
refresh token صادر نمی‌شود و پس از انقضای توکن دسترسی باید دوباره «اتصال» زده شود.

### اشتراک‌ها و پرداخت آنلاین (`subscriptions`)

بسته‌های اشتراک قیمت واقعی (تومان) دارند و هر بسته‌ی پولی به‌صورت یک «آیتم مالی»
در حساب پذیرنده‌ی پی‌پینگ ساخته می‌شود؛ کد محصول در
`SubscriptionPlan.paypingProductCode` نگه داشته می‌شود. پرداخت با `POST /v3/pay`
و تأیید با `POST /v3/pay/verify` انجام می‌شود و فعال‌سازی بسته فقط پس از تأیید
موفق و مطابقت مبلغ/شناسه‌ی ارجاع است.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/subscriptions/plans` | فهرست بسته‌های فعال (عمومی). |
| `GET` | `/subscriptions/me` | بسته‌ی فعلی، درخواست‌ها و ۲۰ پرداخت آخر کاربر. |
| `POST` | `/subscriptions/request` | درخواست اشتراک رایگان/بدون پرداخت (در انتظار تأیید مدیر). |
| `POST` | `/subscriptions/:planId/checkout` | شروع پرداخت آنلاین؛ خروجی `{ paymentId, amount, url, paymentCode, paypingProductCode }`. کاربر باید به `url` هدایت شود. |
| `GET` | `/subscriptions/payments/callback` | آدرس بازگشت عمومی پی‌پینگ (`paymentCode`، `refId`، `clientRefId`)؛ تراکنش را تأیید و سپس به `/dashboard/subscriptions?payment=...` هدایت می‌کند. |
| `POST` | `/admin/plans/:id/payping-product` | ساخت/همگام‌سازی محصول پی‌پینگ یک بسته (فقط مدیر). |

**آدرس بازگشت:** `${NEXT_PUBLIC_APP_URL}/api/subscriptions/payments/callback`
است؛ پس دامنه‌ی عمومی سایت باید در `NEXT_PUBLIC_APP_URL` سرور درست تنظیم شده
باشد (مثلاً `https://shomalicard.ir`). اگر `PAYPING_TOKEN` تنظیم نشده باشد،
`checkout` با خطای ۵۰۳ و پیام راهنما پاسخ می‌دهد.

### پرداخت پیش‌از‌تأیید افزایش بازدید (`payments`)

وقتی درگاه پی‌پینگ متصل است (`PAYPING_TOKEN`), درخواست‌های «افزایش بازدید» —
یعنی «پله» (`POST /boosts/request`)، «تبلیغ در صفحه اصلی» و «تبلیغ در
دایرکتوری» (`POST /ads/request`) — **ابتدا باید پرداخت شوند و سپس** برای تأیید
به صف مدیر می‌روند. مبلغ از تنظیمات پنل خوانده می‌شود (`boostPrice`،
`adHomePrice`، `adDirectoryPrice`). اگر درگاه تنظیم نباشد یا مبلغ کمتر از
۱۰۰۰ تومان باشد، رفتار قبلی (درخواست رایگان → صف مدیر) حفظ می‌شود.

هر درخواست حداکثر یک رکورد `RequestPayment` دارد (پرداخت ناتمام با فراخوانی
دوباره‌ی همان مسیر از سر گرفته می‌شود). خروجی این دو مسیر به شکل
`{ ...request, payment: { amount, status, url } | null }` است؛ اگر `payment.url`
پر بود، رابط کاربری باید مرورگر را به درگاه ببرد.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/payments/request-callback` | آدرس بازگشت عمومی پی‌پینگ برای پرداخت پله/تبلیغ (`paymentCode`، `refId`، `clientRefId`)؛ تراکنش را تأیید، درخواست را وارد صف مدیر می‌کند و سپس به `/dashboard/boost?payment=...` هدایت می‌کند. |
| `POST` | `/boosts/request` | ثبت/ادامه‌ی درخواست پله؛ با درگاه فعال، `payment.url` برمی‌گرداند. |
| `POST` | `/ads/request` | ثبت/ادامه‌ی درخواست تبلیغ (`placement`: `HOME` یا `DIRECTORY`)؛ با درگاه فعال، `payment.url` برمی‌گرداند. |

تأیید/رد درخواست‌ها همچنان با `PATCH /admin/boosts/:id` و
`PATCH /admin/ads/:id` انجام می‌شود، اما تا وقتی پرداخت `PAID` نشده باشد
تأیید با خطای ۴۰۰ رد می‌شود و درخواست‌های پرداخت‌نشده در صف «در انتظار»
نمایش داده نمی‌شوند.


### نگه‌داری حساب‌های شبکه‌های اجتماعی برند (`social-accounts`)

بخش «شبکه‌های اجتماعی» پنل مدیر، اکانت/یوزر/پسورد حساب‌های برند «شمالی کارت» را
روی اینستاگرام، بله، ایتا، آپارات (و هر شبکه‌ی دیگری در `SOCIAL_PLATFORMS`) نگه
می‌دارد. رمز عبور با **AES-256-GCM** رمزنگاری و در ستون `passwordEnc` ذخیره
می‌شود؛ کلید از `SOCIAL_CREDENTIALS_KEY` (۳۲ بایت) و در نبود آن با HKDF از
`JWT_SECRET` مشتق می‌شود. رمز هرگز در فهرست برنمی‌گردد و تنها راه خواندن آن،
مسیر بازبینی‌شده‌ی `reveal` است. همه‌ی مسیرها فقط برای نقش `ADMIN` در دسترس‌اند
و زیر پیشوند `/api/admin/social-accounts` قرار دارند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/social-accounts` | `{ items, platforms }`؛ `items` بدون رمز (`hasPassword` و `lastRotatedAt` به‌جای آن) و `platforms` رجیستری سکوها برای پرکردن فرم. |
| `POST` | `/admin/social-accounts` | ساخت حساب؛ `platform` یکی از کلیدهای رجیستری، `title`/`username`/`password` الزامی. ترکیب (platform, username) یکتاست (تکرار → ۴۰۹). |
| `PATCH` | `/admin/social-accounts/:id` | ویرایش؛ اگر `password` فرستاده شود رمز جایگزین و `lastRotatedAt` به‌روز می‌شود، در غیر این صورت رمز دست‌نخورده می‌ماند. |
| `DELETE` | `/admin/social-accounts/:id` | حذف حساب. |
| `POST` | `/admin/social-accounts/:id/reveal` | بازگرداندن `{ username, password }` رمزگشایی‌شده. `POST` است تا کش نشود؛ `reason` اختیاری در «گزارش‌های سیستم» (اکشن‌های `SOCIAL_ACCOUNT_*`) ثبت می‌شود. |

### کیف پول کاربران (`wallet`)

هزینه‌ی استعلام هویتی، تطبیق موبایل/کد ملی (شاهکار)، خرید اشتراک، پله، هر دو
نوع تبلیغ، بسته‌ی فید و تگ کارت/بیولینک روی فید به‌جای پرداخت لحظه‌ای، به‌صورت
**بدهی منفی** در کیف پول کاربر جمع می‌شود. مهلت تسویه
(`walletSettlementDays`، پیش‌فرض ۷ روز، بازه‌ی ۱ تا ۹۰) از بخش «تنظیمات ←
کیف پول کاربران» خوانده می‌شود؛ اولین هزینه‌ی هر دوره سررسید را تعیین می‌کند و
پس از آن کاربر با **یک پرداخت** کل بدهی را تسویه می‌کند. اگر سوئیچ
`featureWallet` خاموش باشد هیچ هزینه‌ای ثبت نمی‌شود و رفتار قبلی (استعلام
رایگان و پرداخت مستقیم اشتراک از درگاه) حفظ می‌شود.

**گره‌خوردن به کد ملی:** صاحب کیف پول با کد ملی شناسایی می‌شود. هنگام هر
تغییر در گردش حساب، پرداخت درگاه یا صدور فاکتور، `nationalCode` کاربر روی همان
ردیف ثبت (snapshot) می‌شود تا تاریخچه حتی با تغییر بعدی حساب نیز گم نشود. یک
بازسازی یک‌باره (`walletNationalCodeBackfillV1`) ردیف‌های قدیمی را از روی
`User.nationalCode` پر می‌کند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/wallet/me` | `{ nationalCode, balance, dueAt, overdue, settlementDays, entries, payments }`؛ `balance` منفی یعنی بدهی. |
| `POST` | `/wallet/checkout` | شروع پرداخت یک‌جای کل بدهی؛ بدنه‌ی اختیاری `{ returnTo }` (مسیر داخلی بازگشت، پیش‌فرض `/dashboard/wallet`)؛ خروجی `{ paymentId, amount, paymentCode, url }`. اگر درگاه فعال نباشد ۵۰۳ برمی‌گرداند. |
| `GET` | `/wallet/payments/callback` | بازگشت عمومی درگاه؛ تراکنش را تأیید و بدهی را تسویه می‌کند و با `returnTo` معتبر به همان مسیر (وگرنه `/dashboard/wallet`) با پارامتر `payment` هدایت می‌کند. |
| `GET` | `/admin/wallets` | فهرست کیف پول‌های دارای بدهی/سررسید با `settlementDays`، `totalDebt` و `nationalCode` هر کیف پول. |
| `GET` | `/admin/wallets/lookup?nationalCode=...` | گردش کامل یک شخص با کد ملی: کیف پول‌ها، گردش حساب، پرداخت‌ها و فاکتورها. |
| `POST` | `/admin/wallets/:userId/adjust` | تنظیم دستی؛ `amount` مثبت = افزایش بدهی، منفی = بستانکاری، همراه `title` اختیاری. |

**گیت تسویه:** ساخت بیولینک/کارت ویزیت/پست فید و اعمال نهایی پله، تبلیغ، تگ فید،
بسته‌ی فید و تیک آبی تا زمانی که `balance < 0` باشد با ۴۰۳ و کد `WALLET_DEBT`
رد می‌شود. هر `WalletEntry` می‌تواند `idempotencyKey` یکتا داشته باشد تا تکرار
یک درخواست، بدهی دوباره ثبت نکند.

### قیمت‌گذاری یک‌جای خدمات (`/api/admin/pricing`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/pricing` | همه‌ی اقلام دارای هزینه (پلن‌ها، بسته‌های فید، سرویس‌های زحل، پله، تبلیغ صفحه اصلی/دایرکتوری، تگ فید) با `price`، `group` و `settlementDays`. |
| `PATCH` | `/admin/pricing` | به‌روزرسانی گروهی `{ items: [{ key, price }] }`؛ کلیدها به شکل `setting:*`، `zohal:*`، `plan:*` و `feedPackage:*` هستند. |

## مالیات و بایگانی مالی (`/api/admin/finance`)

همه‌ی مسیرها فقط برای نقش `ADMIN` هستند. جزئیات معماری و نحوه‌ی اتصال
قابلیت‌های پرداختی آینده در `docs/FINANCE.md` آمده است.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/finance/summary` | خلاصه‌ی فروش، هزینه، سود خالص، مالیات و ریز ماهانه/سالانه (شمسی). فیلتر اختیاری `from`/`to`. |
| `GET` | `/admin/finance/meta` | دسته‌های پیشنهادی هزینه برای فرم پنل. |
| `GET` | `/admin/finance/invoices` | فهرست فاکتورهای بایگانی‌شده با فیلتر `q`، `status`، `sourceType`، `from`، `to` و صفحه‌بندی. |
| `GET` | `/admin/finance/invoices/:id` | جزئیات فاکتور همراه با اقلام. |
| `POST` | `/admin/finance/invoices/manual` | ثبت دستی یک فروش و صدور/بایگانی فاکتور. |
| `POST` | `/admin/finance/invoices/:id/void` | ابطال فاکتور با حفظ شماره و سابقه (`status=VOID`). |
| `GET` | `/admin/finance/invoices/export` | خروجی CSV فاکتورها (با BOM برای Excel). |
| `GET` | `/admin/finance/expenses` | فهرست هزینه‌های دستی با فیلتر `q`، `category`، `from`، `to`. |
| `POST` | `/admin/finance/expenses` | ثبت هزینه‌ی جدید (سرور، پیامک، ایمیل، …). |
| `PATCH` | `/admin/finance/expenses/:id` | ویرایش هزینه. |
| `DELETE` | `/admin/finance/expenses/:id` | ابطال نرم هزینه (حذف نمی‌شود؛ `voidedAt` ثبت می‌شود). |
| `GET` | `/admin/finance/expenses/export` | خروجی CSV هزینه‌ها. |
| `POST` | `/admin/finance/backfill` | ساخت فاکتور برای تراکنش‌های پرداخت‌شده‌ی قبلی که فاکتور ندارند (idempotent). |

## استعلام‌های زحل (`/api/admin/zohal`) و تیک آبی

راهنمای کامل سرویس‌ها و نحوه‌ی فعال‌سازی در `docs/ZOHAL.md` آمده است. توکن
زحل فقط سمت سرور (`ZOHAL_TOKEN`) نگه داشته می‌شود و هر سرویس با کلید
`zohal.service.<key>` جداگانه فعال/غیرفعال می‌شود.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/admin/zohal/services` | ADMIN | فهرست همه‌ی سرویس‌های زحل + وضعیت اتصال و فعال/غیرفعال هر سرویس. |
| `PATCH` | `/admin/zohal/services/:key` | ADMIN | فعال/غیرفعال‌کردن یک سرویس (`{ enabled }`). |
| `GET` | `/zohal/pricing` | عمومی | تعرفه‌ی عمومی سرویس‌های استعلام؛ فقط سرویس‌های فعال و دارای قیمت بیشتر از صفر برمی‌گردند (سرویس غیرفعال از صفحه‌ی «تعرفه‌ها» حذف می‌شود). |
| `POST` | `/admin/zohal/services/:key/test` | ADMIN | فراخوانی آزمایشی واقعی (هزینه‌زا) با `{ payload }`. |
| `GET` | `/admin/zohal/blue-tick` | ADMIN | درخواست‌های تیک آبی در انتظار بررسی + آخرین حساب‌های تأییدشده. |
| `PATCH` | `/admin/zohal/blue-tick/:id` | ADMIN | تأیید/رد درخواست تیک آبی (`{ decision, reason? }`). |
| `GET` | `/profile/identity-inquiry/status` | کاربر | آیا استعلام خودکار هویت در دسترس است؟ |
| `GET` | `/profile/identity/status` | کاربر | وضعیت دو مرحله‌ی هویت (`phoneMatched`، `verified`) و مشخصات ذخیره‌شده. |
| `POST` | `/profile/identity/phone-match` | کاربر | مرحله ۱: `{ nationalCode, birthDate }`؛ تطبیق شاهکار، ذخیره‌ی تاریخ تولد و ثبت هزینه در کیف پول. |
| `POST` | `/profile/identity/inquiry` | کاربر | مرحله ۲: استعلام هویت با کد ملی/تاریخ تولد ذخیره‌شده، ذخیره‌ی نام/نام پدر و ثبت هزینه. |
| `POST` | `/profile/blue-tick/request` | کاربر | ثبت درخواست تیک آبی پس از استعلام هویت. |

`PATCH /profile/me` فقط برای حالت جایگزین (وقتی استعلام زحل خاموش است) باقی
مانده و در حالت عادی با خطا کاربر را به دو مرحله‌ی بالا هدایت می‌کند. تمام
مسیرهای ساخت محتوا و درخواست‌های پرداختی با `ProfileCompleteGuard` تا تکمیل
`identityVerifiedAt` مسدود می‌شوند.

## ویزارد «شروع آسان» (`/api/onboarding`)

بخش مرحله‌به‌مرحله‌ی راه‌اندازی کسب‌وکار که در صدر داشبورد کاربر نمایش داده
می‌شود. فهرست و ترتیب مراحل در یک `Setting` ذخیره می‌شود و از پنل مدیریت
(«تنظیمات» → «مراحل شروع آسان») قابل افزودن/حذف/جابه‌جایی است. تکمیل مراحل
پیش‌فرض خودکار است و از داده‌های حساب محاسبه می‌شود؛ مراحل «خوش‌آمدگویی»
(`welcome`) و «سفارشی» (`custom`) را کاربر تیک می‌زند. ویزارد در یک کادر، هر بار
یک مرحله را به‌ترتیب نشان می‌دهد و دکمه‌ی «مرحله بعد» دارد؛ متن و ترتیب همه‌ی
مراحل — از جمله صفحه‌ی خوش‌آمدگویی — از همین پنل مدیریت قابل ویرایش است.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/onboarding/me` | کاربر | مراحل فعال + وضعیت تکمیل/راهنمای هر مرحله + شمارش پیشرفت + وضعیت هویت (`identity`) + سابقه‌ی استعلام‌ها (`history`). |
| `POST` | `/onboarding/steps/:id/complete` | کاربر | تیک‌زدن یک مرحله‌ی سفارشی. |
| `DELETE` | `/onboarding/steps/:id/complete` | کاربر | برداشتن تیک یک مرحله‌ی سفارشی. |
| `GET` | `/admin/onboarding/steps` | ADMIN | فهرست مراحل پیکربندی‌شده. |
| `PUT` | `/admin/onboarding/steps` | ADMIN | ذخیره‌ی فهرست/ترتیب/فعال‌بودن مراحل (`{ steps: [...] }`). |

قاعده‌ی تکمیل مراحل پیش‌فرض: `identity` = تأیید استعلام هویت، `business` =
وجود حداقل یک کارت ویزیت، `details` = تکمیل معرفی/تماس/شهر/دسته/شبکه‌ی اجتماعی
روی کارت، `documents` = ثبت درخواست تیک آبی یا تأیید آن، `plan` = انتخاب/تأیید
صریح یک طرح (اشتراک فعال یا طرحی غیر از «رایگان»ی که خودکار به کاربر تازه
تخصیص می‌یابد)، و `approval` = تأیید شدن کارت توسط مدیر.

### بررسی سریع کامل‌بودن
```bash
# تعداد مسیرهای مستندشده
curl -s http://localhost:3001/api/docs-json | python3 -c "import sys,json;print(len(json.load(sys.stdin)['paths']))"

# مسیرهای بدون summary
curl -s http://localhost:3001/api/docs-json | python3 - <<'PY'
import sys, json
doc = json.load(sys.stdin)
missing = [f"{m.upper()} {p}" for p, ops in doc["paths"].items() for m, o in ops.items() if not o.get("summary")]
print(missing or "همه‌ی مسیرها summary دارند")
PY
```

## پشتیبانی آنلاین (`/api/support/chat`)

گفتگوی زنده‌ی کاربر با واحد پشتیبانی. دکمه‌ی شناور «پشتیبانی آنلاین» در همه‌ی
صفحات سایت و مسیر `/dashboard/support` از این API استفاده می‌کنند. پیام‌ها از
طریق **SSE** (رویدادهای `message` / `read` / `status`) همان لحظه به هر دو طرف
می‌رسند؛ ارسال پیام یک `POST` معمولی با توکن Bearer است. جریان SSE مانند
اعلان‌ها با «تیکت یک‌بارمصرف» احراز هویت می‌شود، نه با قرار دادن JWT در URL.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/support/chat/me` | کاربر | گفتگوی باز جاری یا آخرین گفتگو (همراه پیام‌ها). |
| `GET` | `/support/chat/me/conversations` | کاربر | تاریخچه‌ی صفحه‌بندی‌شده‌ی گفتگوهای من. |
| `GET` | `/support/chat/me/conversations/:id` | کاربر | جزئیات یک گفتگوی خودم. |
| `POST` | `/support/chat/me/messages` | کاربر | ارسال پیام؛ اگر گفتگوی بازی نباشد خودکار ساخته می‌شود. `conversationId` اختیاری است. |
| `POST` | `/support/chat/me/read` | کاربر | خواندن پیام‌های گفتگوی باز جاری. |
| `POST` | `/support/chat/me/conversations/:id/read` | کاربر | خواندن پیام‌های یک گفتگوی مشخص. |
| `POST` | `/support/chat/me/close` | کاربر | بستن گفتگوی باز جاری. |
| `GET` | `/support/chat/me/unread-count` | کاربر | تعداد پیام‌های خوانده‌نشده‌ی پشتیبانی. |
| `GET` | `/support/chat/me/stream-ticket` | کاربر | صدور تیکت یک‌بارمصرف برای اتصال SSE. |
| `GET` | `/support/chat/me/stream?ticket=…` | عمومی (با تیکت) | جریان زنده‌ی پیام‌های من. |
| `GET` | `/admin/support/chat` | ADMIN | فهرست گفتگوها با فیلتر `status` و جستجوی `q`. |
| `GET` | `/admin/support/chat/unread-count` | ADMIN | مجموع پیام‌های خوانده‌نشده و تعداد گفتگوهای باز. |
| `GET` | `/admin/support/chat/:id` | ADMIN | جزئیات کامل گفتگو. |
| `POST` | `/admin/support/chat/:id/messages` | ADMIN | پاسخ مدیر (گفتگو در صورت بسته‌بودن باز می‌شود). |
| `POST` | `/admin/support/chat/:id/read` | ADMIN | خواندن پیام‌های کاربر. |
| `PATCH` | `/admin/support/chat/:id` | ADMIN | تغییر وضعیت (`OPEN`/`CLOSED`) یا `assignToMe`. |
| `GET` | `/admin/support/chat/stream-ticket` | ADMIN | صدور تیکت برای جریان زنده‌ی صندوق پشتیبانی. |
| `GET` | `/admin/support/chat/stream?ticket=…` | عمومی (با تیکت) | جریان زنده‌ی همه‌ی گفتگوها برای مدیران. |

**نکته‌ی حقوقی/دسترسی:** پشتیبانی و همه‌ی راه‌های تماس با پشتیبان مطابق
`AGENTS.md` همیشه فعال هستند و سوئیچ ویژگی نمی‌گیرند. هر کاربر فقط به گفتگوهای
خودش دسترسی دارد؛ مسیرهای `/admin/support/chat` فقط برای نقش `ADMIN` باز است.

## وظیفه‌ی دائمی ایجنت (قانون ۸)

هنگام **افزودن یا تغییر هر مسیر API**، ایجنت موظف است پیش از اعلام اتمام کار:

1. کنترلر/مسیر جدید را با `@ApiTags`، `@ApiOperation` و DTO مستندشده
   (`@ApiProperty`) بنویسد.
2. مطمئن شود مسیر در `GET /api/docs-json` دیده می‌شود و `summary` دارد.
3. این سند (`docs/API.md`) را در صورت تغییر قرارداد/آدرس به‌روز کند.
4. طبق قوانین ۱ و ۲، در `History-Agent.md` ثبت و نسخه را بالا ببرد.
