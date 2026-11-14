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
   فرم یکپارچه‌ی «ورود یا ثبت‌نام» وب از `POST /api/auth/email` استفاده می‌کند:
   اگر ایمیل وجود داشته باشد رمز بررسی و کد ورود ارسال می‌شود (`flow: "login"`)،
   وگرنه حساب ساخته و کد ثبت‌نام ارسال می‌شود (`flow: "register"`). مرحله‌ی
   دوم همان `login/verify` یا `register/verify` است.
   ورود ادمین و مدیران هم از همان صفحه‌ی مشترک `/login` انجام می‌شود و پس از
   ورود به پنل `/jga4rm8j` (یا `/moderator`) هدایت می‌شوند. مسیرهای اختصاصی
   API برای سازگاری باقی مانده‌اند: `POST /api/auth/admin/login` و
   `POST /api/auth/admin/login/verify` (ایمیل/رمز + کد)، و
   `POST /api/auth/admin/phone/request-code` و
   `POST /api/auth/admin/phone/verify` (موبایل + کد). این مسیرها فقط
   حساب‌های `ADMIN`/`MODERATOR` را می‌پذیرند و هرگز حساب جدید نمی‌سازند.
   در محیط توسعه/لوکال (`NODE_ENV !== production`) ارسال کد این دو مسیر
   **شبیه‌سازی** می‌شود: هیچ ایمیل/پیامکی ارسال نمی‌شود و پاسخ شامل
   `devCode: "123456"` و `simulated: true` است. در پروداکشن همین مسیرها
   از SMTP/ملی‌پیامک تنظیم‌شده ارسال می‌کنند.
   در جریان `POST /api/auth/phone/request-code` می‌توانید فیلد اختیاری `email`
   را هم بفرستید؛ همان کد یکبارمصرف علاوه بر کانال موبایل به آن ایمیل هم ارسال
   می‌شود (برای کاربران موجود، ایمیل حساب ملاک است).
   **کانال موبایل:** اگر `BALE_API_SHOMALICARDBOT` و `BOT_ID` تنظیم شده باشند،
   کد ابتدا از طریق پیام‌رسان بله (سرویس سفیر، `POST
   https://safir.bale.ai/api/v3/send_message` با `otp_message`) ارسال می‌شود؛
   اگر کاربر حساب بله نداشته باشد (خطای ۱۷) یا ارسال ناموفق باشد، به‌صورت
   خودکار روی پیامک ملی‌پیامک fallback می‌شود. در توسعه، ارسال بله فقط با
   `BALE_OTP_ENABLED=true` فعال است تا تست‌های لوکال پیام واقعی نفرستند.
   اگر کد با بله ارسال شده باشد، صفحه‌ی ورود دکمه‌ی «ارسال با پیامک» را نشان
   می‌دهد؛ آن دکمه همان مسیر را با `channel: "sms"` صدا می‌زند تا ارسال پیامکی
   اجباری شود (کد قبلی بله باطل و کد تازه صادر می‌شود). مقدار مجاز `channel`
   فقط `"bale"` یا `"sms"` است و ارسال‌های بعدی/مجدد همان صفحه هم روی کانال
   انتخابی می‌مانند.
   پاسخ این مسیر شامل `expiresIn` (ثانیه‌ی اعتبار کد، ۹۰) و `resendAfter`
   (ثانیه‌ی مجاز برای ارسال مجدد، ۶۰) است؛ صفحه‌ی `/login` شمارش معکوس را از
   `expiresIn` می‌سازد و پس از پایان آن دکمه‌ی «ارسال مجدد کد» را فعال می‌کند.
   فیلد اختیاری `channel` (`bale` | `sms` | `dev`) کانال واقعی ارسال را اعلام
   می‌کند تا رابط بتواند پیام «کد در بله ارسال شد» را نشان دهد.
   همین قرارداد برای `POST /api/auth/email` (کد ایمیل) هم برقرار است؛ فرم
   «ایمیل و رمز» همان شمارش معکوس ۹۰ ثانیه‌ای و دکمه‌ی ارسال مجدد را دارد.
   دو مسیر تست فقط در محیط توسعه فعال‌اند و در پروداکشن ۴۰۴ می‌دهند:
   `POST /api/auth/dev/sms-test` (ارسال واقعی OTP با `{ phone }`) و
   `POST /api/auth/dev/admin-sms-test` (ارسال واقعی قالب مشترک مدیران با
   `{ phone, section?, subject? }`). جزئیات در `docs/SMS.md`.
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
| `GET` | `/business-cards/public/:slug` | جزئیات کامل هر مخاطب (مقصد لینک «مشاهدهٔ کارت ویزیت کامل»). کارت‌های ایمپورت‌شده‌ی تصاحب‌نشده هم با لینک مستقیم برگردانده می‌شوند، هرچند از دایرکتوری پنهان‌اند. |

### دسته‌بندی مشاغل و صفحه‌ی کسب‌وکار

صفحه‌های `/categories` و `/categories/[slug]` و `/business/[slug]` روی این
مسیرهای عمومی بنا شده‌اند:

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/business-categories/public` | فهرست دسته‌بندی‌های شغلی فعال با تعداد کارت‌های منتشرشده‌ی هر دسته (`{ id, name, count }[]`). |
| `GET` | `/business-categories/public/:slug` | صفحه‌ی یک دسته: `category` + فهرست صفحه‌بندی‌شده‌ی کسب‌وکارها (`items`, `meta`, `filters`) با پارامترهای `page`، `cityId`، `q` و `sort` (`recent` \| `rating` \| `liked` \| `alpha`). `slug` همان نام دسته است (URL-encoded). |
| `GET` | `/business-taxonomy/search` | جست‌وجوی کادر «زیردسته / زیرشاخه» فرم ساخت بیولینک/کارت ویزیت/کسب‌وکار. پارامترها: `level` (`ANY` پیش‌فرض \| `SUB` \| `TAG`؛ در حالت `ANY` ابتدا «زیرشاخه» و در صورت نبود نتیجه «زیردسته» جست‌وجو می‌شود)، `categoryId` (دسته‌ی اصلی)، `parentId` یا `parentName` (محدودکردن `TAG` به یک زیردسته)، `q` و `limit` (۱ تا ۵۰، پیش‌فرض ۲۰). خروجی `{ id, name, level, parentId, parentName, categoryId }[]`. فقط دسته‌های اصلی در `/businesses` و فیلترها می‌آیند؛ این سطح‌های عمیق فقط از طریق جست‌وجو قابل انتخاب‌اند. |
| `POST` | `/business-taxonomy/requests` | وقتی هیچ سطحی با عبارت کاربر مطابقت ندارد، عبارت (`{ q, categoryId? }`) برای مدیران ارسال می‌شود (اعلان دسته‌ی `TAXONOMY` + لاگ فعالیت) و فرم به کاربر «سایر» نشان می‌دهد. نیازمند ورود. |
| `GET` | `/business-taxonomy/neighborhoods` | پیشنهادهای کادر «محله» فرم‌های ساخت بیولینک/کارت ویزیت/کسب‌وکار. پارامترها: `cityId` (محدودکردن به یک شهر)، `q` و `limit` (۱ تا ۵۰، پیش‌فرض ۲۰). خروجی `string[]` از اجتماع محله‌های ثبت‌شده روی کارت‌های منتشرشده و محله‌های ایمپورت‌شده‌ی همان شهر. مقدار «محله» آزاد است و کاربر می‌تواند عبارت تازه هم وارد کند. |
| `GET` | `/business-reviews/public/:slug` | دیدگاه‌ها و امتیاز عمومی کسب‌وکار: `summary` (میانگین، تعداد و توزیع ستاره‌ها)، `items` و `meta`. فقط دیدگاه‌های نمایش‌پذیر. |
| `GET` | `/business-reviews/public/:slug/mine` | دیدگاه کاربر جاری برای پیش‌پرکردن فرم (نیازمند ورود؛ در غیر این صورت `{ review: null }`). |
| `POST` | `/business-reviews/public/:slug` | ثبت یا ویرایش دیدگاه کاربر جاری؛ بدنه `{ rating: 1..5, comment? }`. ثبت برای مالک همان کسب‌وکار مجاز نیست. |
| `DELETE` | `/business-reviews/public/:slug/mine` | حذف دیدگاه کاربر جاری و به‌روزرسانی میانگین امتیاز. |
| `POST` | `/business-cards/:id/claim` | شروع تصاحب کسب‌وکارهای ثبت‌شده‌ی سیستمی (`isUnclaimed`) توسط کاربر وارد‌شده. اگر کارت موبایل داشته باشد (`channel: "sms"`) و در غیر این صورت اگر ایمیل معتبر داشته باشد (`channel: "email"`) کد یکبارمصرف به همان مسیر ارسال می‌شود و خروجی شامل `destination` ماسک‌شده و `resendAfter` است؛ در حالت توسعه‌ی بدون SMS/ایمیل `devCode` هم برمی‌گردد. اگر کارت هیچ راه ارتباطی قابل تأیید نداشته باشد، درخواست با `channel: "admin"` برای بررسی مدیر ثبت می‌شود. در صورت متعلق‌بودن به کاربر دیگر `409` و اگر ویژگی `featureBusinessClaim` خاموش باشد `403` برمی‌گرداند. |
| `POST` | `/business-cards/:id/claim/verify` | تأیید کد ۶ رقمی تصاحب (`{ code }`، نیازمند ورود). کد فقط برای همان کارت و همان کانال (موبایل/ایمیل) معتبر است؛ پس از تأیید مالکیت منتقل می‌شود، کارت از دسته‌ی ایمپورت (بازگردانی) خارج می‌شود و کارت ایمپورت‌شده‌ی منتشرنشده مثل یک کارت تازه به صف تأیید (`PENDING`) می‌رود. کد اشتباه/منقضی `400` و کارت متعلق به کاربر دیگر `409` برمی‌گرداند. |
| `POST` | `/business-cards/public/:slug/report` | گزارش کارت عمومی توسط بازدیدکننده (ورود اختیاری؛ مهمان هم می‌تواند). بدنه `{ reason: 'INAPPROPRIATE' \| 'OWNERSHIP' \| 'WRONG_INFO' \| 'SPAM' \| 'OTHER', note? }`. گزارش با اعلان دسته‌ی `REPORT` برای مدیران و ثبت در لاگ فعالیت همراه می‌شود؛ اگر ویژگی `featureBusinessReports` خاموش باشد `403` برمی‌گرداند. |
| `POST` | `/uploads/gallery` | آپلود تصویر گالری کسب‌وکار (WebP)؛ خروجی `url` در فیلد `gallery` کارت ویزیت ذخیره می‌شود. |
| `POST` | `/uploads/document` | آپلود مدرک/جواز کسب‌وکار برای مرحله‌ی «مدارک» (PDF یا تصویر PNG/JPG/WebP، حداکثر ۵ مگابایت). فایل بدون تبدیل ذخیره می‌شود و خروجی `url`/`size`/`contentType` است. |

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
برچسب «شهر/منطقه» را می‌گیرد؛ در فرم‌های ساخت، محله با انتخاب شهر بارگذاری
می‌شود (`/business-taxonomy/neighborhoods?cityId=…`).
سایت فقط **چهار شهر** نگه می‌دارد: تنکابن، خرم‌آباد، شیرود، رامسر. فهرست
`/cities` فقط همین چهار مورد را به همین ترتیب برمی‌گرداند؛ بقیه‌ی «شهر/منطقه»های
اسکرپ‌شده (کتالم، سخت‌سر، میر شمس‌الدین، گلیجان، خرم‌آبادِ تنکابن، …) به شهر
مطابقشان منتقل می‌شوند و دسته‌ی ترکیبی «تنکابن، شیرود» بین تنکابن و شیرود
تفکیک می‌شود؛ نام همین منطقه‌ها در نبود «محله» به‌عنوان تگ محله حفظ می‌شود.
میانگین و تعداد امتیاز (`ratingAvg`/`ratingCount`) روی خود کارت ذخیره و پس از
هر ثبت/ویرایش/حذف دیدگاه به‌صورت تراکنشی به‌روز می‌شود.

کارت‌های ویزیت در payload عمومی این فیلدهای تکمیلی را هم برمی‌گردانند:
`otherPhones` (آرایه‌ی تلفن‌های دیگر)، `features`، `tags`، `mainTag`،
`subscriptionType`، `latitude`/`longitude` و شبکه‌های `bale`، `eitaa`،
`rubika`، `igap` و `soroush` (همه به‌صورت URL کامل). فایل ۲۷ ستونی ایمپورت
کسب‌وکارها و نگاشت این فیلدها در `docs/import/README.md` توضیح داده شده است.

### تم سراسری سایت (`siteTheme`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/settings/public` | در کنار سایر تنظیمات عمومی، فیلد `siteTheme` (`vintage` \| `modern` \| `bazaar` \| `twitter` \| `kashi`) را برمی‌گرداند؛ لایه‌ی ریشه‌ی وب آن را روی `<html data-theme>` می‌نویسد (برای `twitter` به‌صورت `data-theme="modern"` + `data-skin="twitter"`). همچنین `hiddenNavHrefs`/`stoppedSections` (بخش‌های پنهان/متوقف) و `featureNoticeEnabled` (نمایش نوار اعلان «توقف موقت») را برمی‌گرداند. |
| `PATCH` | `/admin/settings` | با بدنه‌ی `{ "siteTheme": "modern" }` (یا `vintage`/`bazaar`/`twitter`/`kashi`) تم سراسری را عوض می‌کند. فقط مدیر. |

تغییر تم، همه‌ی صفحات عمومی، کارت ویزیت، بیولینک، داشبورد و پنل مدیر را هم‌زمان
به‌روز می‌کند؛ حالت روشن/تیره همچنان ترجیح جداگانه‌ی هر بازدیدکننده است.
راهنمای افزودن/حذف تم‌های ماژولار در `docs/THEMES.md` آمده است.

### اعلان‌ها و پیامک‌های مدیر (`adminNotifications` / `adminSmsNotifications`)

هر رویداد مدیریتی یک دسته‌ی اعلان دارد (`ADMIN_NOTIFY_CATEGORIES`) و دو سوئیچ
مستقل:

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/settings` | علاوه بر `adminNotifications` (اعلان زنگوله)، فیلد `adminSmsNotifications` (پیامک هر دسته) و `adminNotifyRegistry` (برچسب، توضیح و `{0}`/`{1}` قالب پیامک هر دسته) را برمی‌گرداند. فقط مدیر. |
| `PATCH` | `/admin/settings` | بدنه‌ی `{ adminNotifications?: Record<Category, boolean>, adminSmsNotifications?: Record<Category, boolean> }`. کلید ناشناخته نادیده گرفته می‌شود. فقط مدیر. |

پیش‌فرض هر دو سوئیچ روشن است. اگر برای یک دسته ردیف `notifyAdminSms.<CATEGORY>`
ذخیره نشده باشد، مقدار پیامک از سوئیچ اعلان همان دسته پیروی می‌کند. سوئیچ
سراسری پیامک و شماره‌ی گیرنده در `/admin/support/chat/sms-settings` است.
فهرست کامل رویدادها و قالب پیامک در `docs/SMS.md` آمده است.

### پایش منابع سرور (`monitoring`)

سامانه‌ی پایش، مصرف رم/پردازنده/دیسک کانتینر را هر چند ثانیه نمونه‌برداری می‌کند
و در صورت عبور از آستانه، به ایمیل و موبایل ادمین هشدار می‌فرستد. تنظیمات در
جدول `settings` ذخیره می‌شود.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/monitoring` | وضعیت لحظه‌ای منابع، آستانه‌ها، گیرندگان و آخرین زمان هشدار هر منبع. فقط مدیر. |
| `PATCH` | `/admin/monitoring` | بدنه‌ی `UpdateMonitoringDto`: `enabled`، `ramThreshold`، `cpuThreshold`، `diskThreshold` (۱ تا ۱۰۰)، `sustainMinutes` (۰ تا ۱۲۰؛ مدت ماندگاری بالای آستانه پیش از هشدار)، `cooldownMinutes` (۵ تا ۱۴۴۰)، `intervalSeconds` (۳۰ تا ۳۶۰۰)، `alertEmail`، `alertPhone`. مقدار خالی ایمیل/موبایل یعنی استفاده از حساب ادمین اصلی. فقط مدیر. |
| `POST` | `/admin/monitoring/test` | ارسال پیام آزمایشی به کانال‌های تنظیم‌شده و برگرداندن `{ email, sms }` (موفق/ناموفق). فقط مدیر. |

کانال پیامک از **قالب مشترک اطلاع‌رسانی مدیران** استفاده می‌کند
(`MELIPAYAMAK_SHARED_PATH` با `bodyId=586239`، همان کانال تأییدشده‌ی سایر
اعلان‌ها) و دیگر به simple-send وابسته نیست. `{0}` ثابت «پایش منابع سرور» و
`{1}` منبع و درصد مصرف است. فیلد `channels.sms` در `GET /admin/monitoring`
یعنی «قالب مشترک در دسترس است». ایمیل از همان `MAIL_*` موجود استفاده می‌کند.
در صورت تنظیم‌نبودن هر کانال، هشدار درون‌برنامه‌ای (دسته‌ی `SYSTEM`) همچنان ثبت
می‌شود.

### ایمپورت شهر/محله و مشاغل (`/api/admin/taxonomy`)

بخش «تنظیمات ← شهرها و کسب‌وکارها» دو ایمپورت مستقل دارد. هر دو
`multipart/form-data` با فیلد `file` (CSV با BOM یا Excel، حداکثر ۱۰ مگابایت)
می‌گیرند، فقط برای `ADMIN` هستند و تکرارپذیرند: نام‌های موجود دوباره ساخته
نمی‌شوند. فایل‌های آماده در `docs/import/` و دکمه‌ی «دانلود فایل فعلی» در پنل
همین خروجی‌ها را از وضعیت لحظه‌ای می‌سازد.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `POST` | `/admin/taxonomy/import/cities` | ایمپورت شهرها و محله‌ها؛ ستون‌های «شهر» و «محله» (آخرین ردیف شهری بدون محله می‌تواند ستون دوم خالی باشد). خروجی `{ citiesCreated, neighborhoodsCreated, skipped, errors }`. |
| `POST` | `/admin/taxonomy/import/businesses` | ایمپورت مشاغل؛ ستون‌های «کسب و کار» (دسته اصلی)، «زیردسته» و «زیرشاخه». زیردسته/زیرشاخه‌ی تکراری ساخته نمی‌شود و زیرشاخه به زیردسته‌ی همان ردیف وصل می‌شود. خروجی `{ categoriesCreated, subCategoriesCreated, subSubCategoriesCreated, skipped, errors }`. |
| `GET` | `/admin/taxonomy/export/cities` | CSV (BOM) از شهرهای فعال و محله‌هایشان با ستون‌های «شهر,محله». |
| `GET` | `/admin/taxonomy/export/businesses` | CSV (BOM) از تاکسونومی فعال با ستون‌های «کسب و کار,زیردسته,زیرشاخه». |

### دسته‌های ایمپورت کسب‌وکار (`/api/admin/import-batches`)

هر اجرای ایمپورت کسب‌وکارهای بیرونی (`scripts/import_behtarino.py`) یک ردیف در
`business_card_import_batches` می‌سازد. کارت‌های آن دسته با `importBatchId`
به همان ردیف وصل می‌شوند و تا زمانی که صاحبشان آن‌ها را تصاحب نکرده‌اند
`isUnclaimed=true` و `isPublished=false` می‌مانند (لینک مستقیم‌شان کار می‌کند).
همه‌ی مسیرها فقط برای `ADMIN` هستند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `POST` | `/admin/import-batches` | ایمپورت دسته‌ی جدید از فایل (`multipart/form-data`: `file` + `ownerUserId` اجباری، `label`/`source`/`note` اختیاری). `file` می‌تواند JSON به‌ترینو (آرایه‌ی خام کسب‌وکارها)، CSV یا Excel باشد (حداکثر ۳۲ مگابایت). کارت‌ها `isUnclaimed=true`، `isPublished=false` و `APPROVED` ثبت می‌شوند و به دسته‌ی تازه وصل می‌شوند؛ خروجی `batchId`، `label`، `imported`، `skipped` و `errors` است. |
| `GET` | `/admin/import-batches` | فهرست جعبه‌های ایمپورت با `label`، `source`، `createdAt` (تاریخ/ساعت)، `total`، `remaining` (تصاحب‌نشده) و `claimed`؛ به‌همراه `totals`. |
| `DELETE` | `/admin/import-batches/:id` | بازگردانی یک دسته؛ فقط کارت‌های `isUnclaimed=true` همان دسته حذف می‌شوند و کارت‌های تصاحب‌شده دست‌نخورده می‌مانند. |
| `DELETE` | `/admin/import-batches` | بازگردانی همه‌ی ایمپورت‌ها؛ همه‌ی کارت‌های تصاحب‌نشده حذف و همه‌ی دسته‌ها «بازگردانی‌شده» علامت می‌خورند. |
| `GET` | `/admin/import-batches/:id/export` | خروجی CSV کامل (با BOM) برای کارت‌های تصاحب‌نشده‌ی همان دسته: نام، دسته اصلی، زیردسته، main_tag، شهر، محله، آدرس، تلفن همراه/ثابت/دیگر، ایمیل، وب‌سایت، اینستاگرام، تلگرام، واتساپ، بله، ایتا، روبیکا، آی‌گپ، سروش، لینکدین، توضیحات، ساعات کاری، مختصات، نوع اشتراک، ویژگی‌ها، برچسب‌ها و لینک عمومی. سرستون‌ها با فرمت ایمپورت سازگارند. |
| `GET` | `/admin/import-batches/export` | همان CSV کامل برای همه‌ی کارت‌های تصاحب‌نشده در همه‌ی دسته‌ها. |

### درخواست‌های تصاحب (`/api/admin/claim-requests`)

کارت‌هایی که نه موبایل دارند و نه ایمیل معتبر، برای تصاحب به تأیید مدیر نیاز
دارند. این مسیرها فقط برای `ADMIN` هستند و در پنل با بخش
«بررسی محتوا ← درخواست‌های تصاحب» (`/jga4rm8j?section=claim-requests`) نمایش داده
می‌شوند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/claim-requests` | فهرست درخواست‌ها (حداکثر ۱۰۰ مورد، جدیدترین اول) با پارامتر اختیاری `status` (`PENDING` \| `APPROVED` \| `REJECTED` \| `ALL`). خروجی `{ items, total, pending }` و هر مورد شامل کاربر درخواست‌دهنده، کارت، وضعیت و یادداشت تصمیم است. |
| `POST` | `/admin/claim-requests/:id/decide` | تأیید یا رد درخواست با `{ approve: boolean, note?: string }`. تأیید مالکیت را مثل تصاحب تأییدشده منتقل می‌کند و سایر درخواست‌های در انتظار همان کارت را خودکار رد می‌کند؛ رد، وضعیت را `REJECTED` می‌کند و به کاربر اعلان می‌فرستد. درخواست ناموجود `404` و درخواست بررسی‌شده `409` برمی‌گرداند. |

### مدیریت کارت‌های ویزیت تصاحب‌شده (`/api/admin/business-cards`)

کارت‌هایی که از یک دسته‌ی ایمپورت آمده‌اند و صاحبشان آن‌ها را تصاحب کرده
(`importBatchId != null` و `isUnclaimed = false`) در پنل مدیر با نشان
«تصاحب‌شده از ایمپورت» مشخص می‌شوند. ویرایش صاحب کارت روی وضعیت `PENDING`
قرار می‌گیرد؛ پس از تأیید مدیر، صفحه‌ی عمومی اطلاعات را مطابق **اشتراک همان
صاحب کارت** (`user.plan`) نمایش می‌دهد و فیلدهای پنهانِ آن اشتراک ماسک می‌شوند.
همه‌ی مسیرها فقط برای نقش `ADMIN` هستند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/business-cards` | فهرست صفحه‌بندی‌شده با فیلترهای `status` (از `BiolinkStatus`)، `search`، `page` و `limit`. هر مورد علاوه بر خود کارت شامل `isClaimedImport` (کارت ایمپورت‌شده‌ای که تصاحب شده) و `decidedBy` است. |
| `GET` | `/admin/business-cards/:id` | جزئیات کامل برای ویرایش/بررسی؛ علاوه بر `isClaimedImport`، ردیف `importBatch` (`id`، `label`، `source`، `createdAt`)، `user` (`id`، `email`، `fullName`، `plan`) و `ownerPlan` را برمی‌گرداند. `ownerPlan` شامل `name`، `maxBiolinks`، `maxBusinessCards`، `showSocialLinks`، `hiddenFields` و `hiddenLabels` است تا پنل بتواند پیش از تأیید نشان دهد چه فیلدهایی ماسک خواهند شد. |
| `PATCH` | `/admin/business-cards/:id` | ویرایش زنده‌ی فیلدهای کارت توسط مدیر؛ خروجی همان شکل غنی‌شده‌ی `GET /admin/business-cards/:id` است. |
| `PATCH` | `/admin/business-cards/:id/moderate` | تأیید یا رد (`{ decision: 'APPROVED' \| 'REJECTED', reason? }`). با تأیید، `status=APPROVED`، `isPublished=true` و زمان تأیید/انتشار ثبت می‌شود و سپس ماسک `ownerPlan` در خواندن‌های عمومی اعمال می‌شود؛ با رد، کارت منتشرنمی‌شود و دلیل در اعلان کاربر می‌آید. |

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
ریشه می‌گیرد، به API می‌فرستد و سپس به `/jga4rm8j?section=payping-oauth` هدایت می‌کند.

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

هر بسته می‌تواند چهار دوره‌ی قابل‌خرید داشته باشد: ماهانه (`1`)، سه‌ماهه (`3`)،
شش‌ماهه (`6`) و یک‌ساله (`12`). قیمت هر دوره = «قیمت ماهانه × تعداد ماه» منهای
«درصد تخفیف همان دوره» (`SubscriptionPlan.discount3Months` /
`discount6Months` / `discount12Months` که مدیر در پنل تنظیم می‌کند). طول دوره با
پارامتر `months` (مجاز: `1/3/6/12`، پیش‌فرض `1`) در `request` و `checkout`
انتخاب می‌شود. پرداخت موفق، `UserSubscription.months`/`expiresAt` و همچنین
`User.planExpiresAt` را پر می‌کند؛ تمدید همان بسته پیش از انقضا از تاریخ پایان
فعلی محاسبه می‌شود و انقضای دوره به‌صورت خودکار کاربر را به بسته‌ی «رایگان»
برمی‌گرداند.

**ارتقا فقط:** کاربر هرگز نمی‌تواند به بسته‌ی پایین‌ترِ خود (بر اساس `sortOrder`)
برود؛ مثلاً از «بلاس» به «اکو». این محدودیت هم در مسیر پرداخت (`checkout`) و هم
در `POST /subscriptions/request` با خطای ۴۰۰ اعمال می‌شود.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/subscriptions/plans` | فهرست بسته‌های فعال (عمومی). |
| `GET` | `/subscriptions/me` | بسته‌ی فعلی (به‌همراه `planStartedAt`/`planExpiresAt`)، درخواست‌ها (با `startsAt`/`expiresAt` و وضعیت پرداخت) و ۲۰ پرداخت آخر کاربر. |
| `POST` | `/subscriptions/request` | درخواست اشتراک رایگان/بدون پرداخت (در انتظار تأیید مدیر)؛ بدنه‌ی اختیاری `{ planId, note, months }`. |
| `POST` | `/subscriptions/:planId/checkout` | شروع پرداخت آنلاین؛ بدنه‌ی اختیاری `{ months, returnTo }` (۱/۳/۶/۱۲)، خروجی `{ paymentId, amount, months, url, paymentCode, paypingProductCode }`. `returnTo` یک مسیر داخلی مثل `/dashboard/onboarding` است و پس از کال‌بک همان‌جا برگردانده می‌شود. در حالت «پرداخت فقط آنلاین» همیشه به درگاه می‌رود و کیف پول بدهکار نمی‌شود. |
| `POST` | `/subscriptions/:id/activate` | فعال‌سازی اشتراک پرداخت‌شده‌ای که به‌دلیل وجود یک دوره‌ی فعال دیگر، در وضعیت `PENDING` مانده است. با فعال‌سازی، دوره‌ی قبلی لغو و مانده‌ی روزهایش حذف می‌شود. |
| `GET` | `/subscriptions/payments/callback` | آدرس بازگشت عمومی پی‌پینگ (`paymentCode`، `refId`، `clientRefId`)؛ تراکنش را تأیید و سپس به `returnTo` (پیش‌فرض `/dashboard/subscriptions`) با `payment=...` هدایت می‌کند. برای خرید طرح دیگر پیش از پایان دوره، `activation=pending` هم اضافه می‌شود. |
| `POST` | `/admin/plans/:id/payping-product` | ساخت/همگام‌سازی محصولات پی‌پینگ همه‌ی دوره‌های ۱/۳/۶/۱۲ ماهه‌ی یک بسته (فقط مدیر)؛ خروجی `{ paypingProductCode, paypingProductCodes }`. |

**تمدید و تغییر طرح:** خرید همان بسته پیش از پایان دوره، ماه‌های خریداری‌شده را
از تاریخ انقضای فعلی اضافه می‌کند (`startsAt` دوره‌ی جدید = انقضای قبلی). خرید
بسته‌ی دیگر در حالی که دوره‌ی فعلی هنوز فعال است، بلافاصله جایگزین نمی‌شود؛
پرداخت تأیید و یک `UserSubscription` با وضعیت `PENDING` ثبت می‌شود تا کاربر با
`POST /subscriptions/:id/activate` آن را فعال کند. هنگام فعال‌سازی، دوره‌ی قبلی
`CANCELLED` می‌شود و مانده‌ی روزهایش از بین می‌رود.

**آدرس بازگشت:** `${PAYPING_RETURN_BASE_URL}/api/subscriptions/payments/callback`
است. اگر `PAYPING_RETURN_BASE_URL` خالی باشد، ابتدا origin مرورگر
(`Origin`/`Referer`) و سپس دامنه‌ی درخواست (`X-Forwarded-Host`/`Host`) استفاده
می‌شود و در نهایت `NEXT_PUBLIC_APP_URL`.
دامنه‌ی انتخاب‌شده باید دقیقاً همان دامنه‌ای باشد که در پنل پی‌پینگ برای پذیرنده
ثبت شده است؛ در غیر این صورت پی‌پینگ خطای «آدرس بازگشت پذیرنده معتبر نمی‌باشد
(کد 105)» برمی‌گرداند. برای سایت چنددامنه‌ای، مقدار
`PAYPING_RETURN_BASE_URL=https://shomalicard.ir` را در `.env` سرور بگذارید.

پی‌پینگ نتیجه‌ی پرداخت را به‌صورت **POST** با
`Content-Type: application/x-www-form-urlencoded` و بدنه‌ی
`status=1&errorCode=&data={"paymentCode":…,"paymentRefId":…,"clientRefId":…}` به
همین آدرس می‌فرستد؛ هر چهار کال‌بک (`subscriptions`، `wallet`، `profile` و
`payments`) هم `GET` و هم `POST` را می‌پذیرند. اگر `PAYPING_TOKEN` تنظیم نشده
باشد، `checkout` با خطای ۵۰۳ و پیام راهنما پاسخ می‌دهد.

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

### تعرفه‌ی عمومی خدمات (`/api/pricing`)

صفحه‌ی عمومی «تعرفه‌ها» از این مسیر پر می‌شود. خروجی همان اقلامِ پنل مدیر است،
با این تفاوت که بسته‌ها/سرویس‌های غیرفعال حذف می‌شوند تا فقط چیزهای قابل خرید
نمایش داده شوند. اشتراک‌ها فقط قیمت پایه‌ی ماهانه و درصد تخفیف دوره‌ها را دارند؛
قیمت نهایی هر دوره در رابط با `planPriceForMonths` محاسبه می‌شود.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/pricing` | `{ items, settlementDays }`؛ هر آیتم `key`، `label`، `group`، `description`، `price`، `source` (`SETTING` \| `ZOHAL` \| `PLAN` \| `FEED_PACKAGE`) و در صورت وجود `active` دارد. |

### قیمت‌گذاری یک‌جای خدمات (`/api/admin/pricing`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/pricing` | همه‌ی اقلام دارای هزینه (پلن‌ها، بسته‌های فید، سرویس‌های زحل، پله، تبلیغ صفحه اصلی/دایرکتوری، تگ فید) با `price`، `group`، `settlementDays` و `onlineOnly`. |
| `PATCH` | `/admin/pricing` | به‌روزرسانی گروهی `{ items?: [{ key, price }], onlineOnly? }`؛ کلیدها به شکل `setting:*`، `zohal:*`، `plan:*` و `feedPackage:*` هستند. `onlineOnly=true` پرداخت اشتراک و استعلام هویت را در همان مرحله به درگاه می‌فرستد و کیف پول را بدهکار نمی‌کند. |

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

هر پرداخت موفق کاربر به‌صورت خودکار فاکتور می‌گیرد: اشتراک
(`SUBSCRIPTION_PAYMENT`)، پله/تبلیغ (`BOOST_PAYMENT`، `AD_HOME_PAYMENT`،
`AD_DIRECTORY_PAYMENT`)، تگ فید (`FEED_TAG`)، خدمات و استعلام
(`SERVICE_PAYMENT`) و تسویه کیف پول (`WALLET_PAYMENT`). عنوان فاکتور اشتراک
شامل مدت دوره است (مثلاً «خرید اشتراک «اکو» — سه‌ماهه») و `metadata` نیز
`months`، `term`، `startsAt` و `expiresAt` را نگه می‌دارد. `backfill` علاوه بر
ساخت فاکتورهای جاافتاده، عنوان/مدت فاکتورهای قدیمی اشتراک را هم تکمیل می‌کند.

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
| `POST` | `/admin/zohal/payping-products` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ همه‌ی خدمات فعال؛ دو استعلام «شاهکار» و «هویتی» به‌صورت یک محصول واحد با مبلغ جمع دو تعرفه ساخته می‌شوند. |
| `GET` | `/admin/zohal/blue-tick` | ADMIN | درخواست‌های تیک آبی در انتظار بررسی + آخرین حساب‌های تأییدشده. |
| `PATCH` | `/admin/zohal/blue-tick/:id` | ADMIN | تأیید/رد درخواست تیک آبی (`{ decision, reason? }`). |
| `GET` | `/profile/identity-inquiry/status` | کاربر | آیا استعلام خودکار هویت در دسترس است؟ |
| `GET` | `/profile/identity/status` | کاربر | وضعیت دو مرحله‌ی هویت (`phoneMatched`، `verified`) و مشخصات ذخیره‌شده. |
| `POST` | `/profile/identity/checkout` | کاربر | شروع پرداخت آنلاین محصول واحد «شاهکار + استعلام هویتی»؛ بدنه‌ی اختیاری `{ nationalCode, birthDate }`. خروجی `{ url, amount, paid, alreadyVerified }`. در حالت پرداخت فقط آنلاین، کیف پول بدهکار نمی‌شود. |
| `POST` | `/profile/identity/verify` | کاربر | اجرای هر دو استعلام پس از پرداخت موفق، بدون کسر مجدد (برای تلاش دوباره پس از خطای موقت). |
| `GET` | `/profile/identity/payments/callback` | عمومی | بازگشت از درگاه؛ تراکنش را تأیید، هر دو استعلام را اجرا و به `/dashboard/onboarding?identity=success|failed` هدایت می‌کند. |
| `POST` | `/profile/identity/phone-match` | کاربر | مسیر قدیمی مرحله ۱؛ در حالت «پرداخت فقط آنلاین» با خطا کاربر را به `identity/checkout` هدایت می‌کند. |
| `POST` | `/profile/identity/inquiry` | کاربر | مسیر قدیمی مرحله ۲؛ در حالت «پرداخت فقط آنلاین» با خطا کاربر را به `identity/checkout` هدایت می‌کند. |
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
| `GET` | `/onboarding/me` | کاربر | مراحل فعال + وضعیت تکمیل/راهنمای هر مرحله + شمارش پیشرفت + وضعیت هویت (`identity`) + سابقه‌ی استعلام‌ها (`history`) + مدارک آپلودشده (`documents`). |
| `POST` | `/onboarding/steps/:id/complete` | کاربر | تیک‌زدن یک مرحله‌ی سفارشی. |
| `DELETE` | `/onboarding/steps/:id/complete` | کاربر | برداشتن تیک یک مرحله‌ی سفارشی. |
| `POST` | `/onboarding/documents` | کاربر | ثبت فایل آپلودشده (خروجی `/uploads/document`) در فهرست مدارک حساب؛ بدنه `{ url, name?, size?, contentType? }`. |
| `DELETE` | `/onboarding/documents/:id` | کاربر | حذف یک مدرک از حساب. |
| `GET` | `/admin/onboarding/steps` | ADMIN | فهرست مراحل پیکربندی‌شده. |
| `PUT` | `/admin/onboarding/steps` | ADMIN | ذخیره‌ی فهرست/ترتیب/فعال‌بودن/اختیاری‌بودن مراحل (`{ steps: [{ ..., optional? }] }`). |

قاعده‌ی تکمیل مراحل پیش‌فرض: `identity` = تأیید استعلام هویت، `business` =
وجود حداقل یک کارت ویزیت (فرم این مرحله فقط فیلدهای اجباری را می‌گیرد)،
`documents` = آپلود حداقل یک مدرک یا ثبت/تأیید درخواست تیک آبی (این مرحله
`optional` است و مانع ادامه نمی‌شود)، `plan` = انتخاب/تأیید صریح یک طرح
(اشتراک فعال یا طرحی غیر از «رایگان»ی که خودکار به کاربر تازه تخصیص می‌یابد)،
و `approval` = تأیید شدن کارت توسط مدیر. مرحله‌ی قدیمی `details` حذف شده و
در ارتقای یک‌باره‌ی تنظیمات ذخیره‌شده هم کنار گذاشته می‌شود.

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
| `GET` | `/admin/support/chat/sms-settings` | ADMIN | تنظیمات پیامک هشدار: `enabled`، `phone` (مقدار ذخیره‌شده)، `resolvedPhone` (شماره‌ی مؤثر)، `phoneFromAdminAccount` و `channelReady` (آماده‌بودن مسیر توکنی یا نام کاربری/APIKey همراه خط فرستنده). |
| `PATCH` | `/admin/support/chat/sms-settings` | ADMIN | ذخیره‌ی `{ enabled?, phone? }`؛ `phone` خالی یعنی استفاده از `SUPPORT_CHAT_ALERT_PHONE` و سپس شماره‌ی قدیمی‌ترین ادمین فعال. |
| `POST` | `/admin/support/chat/sms-test` | ADMIN | ارسال پیامک آزمایشی به شماره‌ی مؤثر و برگرداندن `{ sent, phone, channelReady, enabled }`. |
| `GET` | `/admin/support/chat/:id` | ADMIN | جزئیات کامل گفتگو. |
| `POST` | `/admin/support/chat/:id/messages` | ADMIN | پاسخ مدیر (گفتگو در صورت بسته‌بودن باز می‌شود). |
| `POST` | `/admin/support/chat/:id/read` | ADMIN | خواندن پیام‌های کاربر. |
| `PATCH` | `/admin/support/chat/:id` | ADMIN | تغییر وضعیت (`OPEN`/`CLOSED`) یا `assignToMe`. |
| `GET` | `/admin/support/chat/stream-ticket` | ADMIN | صدور تیکت برای جریان زنده‌ی صندوق پشتیبانی. |
| `GET` | `/admin/support/chat/stream?ticket=…` | عمومی (با تیکت) | جریان زنده‌ی همه‌ی گفتگوها برای مدیران. |

اعلان داخل پنل برای نخستین پیام خوانده‌نشده‌ی هر دسته ثبت می‌شود، اما **پیامک
فقط یک‌بار به ازای شروع یک گفتگوی تازه (یا باز شدن دوباره‌ی گفتگوی بسته)
ارسال می‌شود** (`{0}=پشتیبانی`، `{1}=پشتیبانی آنلاین`). پیام‌های بعدی همان
گفتگو، حتی بعد از خواندن توسط ادمین، پیامک تکراری نمی‌فرستند.
ارسال از مسیر قالب مشترک (`MELIPAYAMAK_SHARED_PATH`، پیش‌فرض پروژه در
پروداکشن) و `bodyId=586239` انجام می‌شود. جزئیات و روش افزودن اطلاع‌رسانی
جدید در `docs/SMS.md` آمده است. `POST /admin/support/chat/sms-test` نتیجه‌ی
واقعی همین کانال را برمی‌گرداند.

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
