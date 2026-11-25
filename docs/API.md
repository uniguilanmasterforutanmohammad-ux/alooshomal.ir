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
   ورود/ثبت‌نام **فقط با ایمیل و کد یکبارمصرف** (بدون رمز) از دو مسیر
   `POST /api/auth/email-otp/request` با `{ email }` و
   `POST /api/auth/email-otp/verify` با `{ email, code }` انجام می‌شود. اگر
   ایمیل وجود نداشته باشد حساب بدون رمز ساخته می‌شود و کاربر بعداً می‌تواند از
   `/dashboard/profile` یک رمز ثابت برای ورود با ایمیل تعیین کند.
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
   همین قرارداد برای `POST /api/auth/email-otp/request` هم برقرار است؛ کد
   فقط به ایمیل ارسال می‌شود و فرم «موبایل یا ایمیل» از همان شمارش معکوس
   استفاده می‌کند.
   دو مسیر تست فقط در محیط توسعه فعال‌اند و در پروداکشن ۴۰۴ می‌دهند:
   `POST /api/auth/dev/sms-test` (ارسال واقعی OTP با `{ phone }`) و
   `POST /api/auth/dev/admin-sms-test` (ارسال واقعی قالب مشترک مدیران با
   `{ phone, section?, subject? }`). جزئیات در `docs/SMS.md`.
   برای راحتی ورود در محیط توسعه، دو مسیر کمکی دیگر هم (فقط dev؛ در پروداکشن
   ۴۰۴) وجود دارد: `GET /api/auth/dev/admin` که ایمیل/موبایل مدیر محلی را برای
   پیش‌پرکردن فرم برمی‌گرداند، و `POST /api/auth/dev/quick-login` با بدنه‌ی
   `{ method?: 'email' | 'phone' }` که مدیر/ناظر محلی را با «کد یکبارمصرف فیک»
   و بدون OTP واقعی وارد می‌کند. دکمه‌های «ورود سریع مدیر» در صفحه‌ی `/login`
   فقط در حالت توسعه از همین مسیر استفاده می‌کنند.
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

### نمای کامل کاربر در پنل مدیر

پنل مدیر با کلیک روی نام هر کاربر در بخش «کاربران» یک نمای اختصاصی باز می‌کند
که از مسیر زیر تغذیه می‌شود:

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/users/:id/detail` | پروفایل و وضعیت احراز هویت (شامل `identityInquiryData` و `businessLicenseData`)، بیولینک‌ها، کارت‌های ویزیت، پست‌ها، اشتراک‌ها، کیف پول و تراکنش‌ها، پرداخت‌های درگاه، فاکتورها، امتیازها، تیکت‌ها، اعلان‌ها، نشست‌ها و فهرست فایل‌های آپلودشده‌ی همان کاربر از فضای ذخیره‌سازی. همچنین `onboardingModuleResults` (پاسخ کامل هر استعلام ماژول «شروع آسان» همراه `matched`/`matchMessage`) و `onboardingStepData` (ورودی فرم همان مرحله) را برمی‌گرداند. |

فهرست بیولینک‌ها/کارت‌ها/پست‌ها برای حساب‌های پرمحتوا به ۲۰۰ مورد نخست محدود
می‌شود؛ تعداد کل در `user._count` برگردانده می‌شود. رسانه‌ها با پیشوند
`<folder>/<userId>/` در باکت پیدا و با URL عمومی برگردانده می‌شوند.

### مرکز پشتیبان‌گیری و بازیابی (`/api/admin/backups`)

بخش «پشتیبان‌گیری» پنل مدیر یک بسته‌ی کامل (دیتابیس + رسانه‌ها) می‌سازد و امکان
دانلود و ارسال به Google Drive / S3-MinIO / WebDAV را می‌دهد. همه‌ی مسیرها
`ADMIN`-محافظت‌شده‌اند. جزئیات ساختار بسته و بازیابی در
`docs/BACKUP-RESTORE.md` آمده است.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/backups` | فهرست بسته‌ها، عملیات در حال اجرا، تنظیمات نگه‌داری و فضای آزاد دیسک. |
| `POST` | `/admin/backups` | ساخت بکاپ جدید (بدنه: `includeMedia`)؛ به‌صورت job پس‌زمینه اجرا می‌شود. |
| `GET` | `/admin/backups/jobs/:id` | وضعیت و درصد پیشرفت یک عملیات پشتیبان‌گیری. |
| `GET` | `/admin/backups/settings` | تنظیمات مقصدهای پشتیبان (مقادیر حساس ماسک‌شده). |
| `PUT` | `/admin/backups/settings` | ذخیره‌ی تنظیمات مقصدها و تعداد نگه‌داری (رمزها رمزنگاری‌شده). |
| `POST` | `/admin/backups/test/:destination` | آزمایش اتصال به یک مقصد (`google-drive`/`s3`/`webdav`). |
| `GET` | `/admin/backups/:name/download` | دانلود بسته‌ی پشتیبان. |
| `POST` | `/admin/backups/:name/destinations/:destination` | ارسال بسته به مقصد انتخاب‌شده. |
| `DELETE` | `/admin/backups/:name` | حذف یک بسته‌ی پشتیبان محلی. |

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

#### درخت دسته‌بندی کسب‌وکار در پنل ادمین (`/api/admin/businesses`)

دسته‌بندی‌های کسب‌وکار (سطح اصلی) + زیردسته (`SUB`) + زیرشاخه (`TAG`) به‌صورت
درخت قابل جست‌وجو در «تنظیمات ← شهرها و کسب‌وکارها» نمایش داده می‌شوند و
ادمین می‌تواند زیردسته/زیرشاخه بسازد، تغییر نام دهد، فعال/غیرفعال یا حذف کند.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/admin/businesses/tree` | ADMIN | درخت کامل: هر دسته با `subs[]` (زیردسته‌ها) و `tags[]` (زیرشاخه‌های هر زیردسته) + `orphanTags` + شمارش‌ها. |
| `POST` | `/admin/businesses/:id/nodes` | ADMIN | افزودن زیردسته یا زیرشاخه: `{ name, level: 'SUB' \| 'TAG', parentId? }` (برای `TAG`، `parentId` زیردسته‌ی والد الزامی است). |
| `PATCH` | `/admin/businesses/nodes/:nodeId` | ADMIN | ویرایش `{ name?, isActive? }`. |
| `DELETE` | `/admin/businesses/nodes/:nodeId` | ADMIN | حذف زیردسته/زیرشاخه. |

### تم سراسری سایت (`siteTheme`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/settings/public` | در کنار سایر تنظیمات عمومی، فیلد `siteTheme` (`vintage` \| `modern` \| `bazaar` \| `twitter` \| `kashi`) را برمی‌گرداند؛ لایه‌ی ریشه‌ی وب آن را روی `<html data-theme>` می‌نویسد (برای `twitter` به‌صورت `data-theme="modern"` + `data-skin="twitter"`). همچنین `hiddenNavHrefs`/`stoppedSections` (بخش‌های پنهان/متوقف)، `featureNoticeEnabled` (نمایش نوار اعلان «توقف موقت») و `retailCapabilities` (سوئیچ‌های سراسری سفارش فروشگاه: `snapEnabled`/`pickupEnabled`/`cashOnDeliveryEnabled`/`cardToCardEnabled`) را برمی‌گرداند. |
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
| `PATCH` | `/admin/settings` | بدنه‌ی `{ adminNotifications?, adminSmsNotifications?, businessAssetForm? }`. `businessAssetForm` قواعد فرم کارت ویزیت/بیولینک را ذخیره می‌کند: `{ businessCard: { lockedFields, submitLabel, allowMobileChange, allowMobileAdd }, biolink: {...} }`. کلید ناشناخته نادیده گرفته می‌شود. فقط مدیر. |

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
فعلی محاسبه می‌شود. اگر دوره‌ی پولی بدون ارتقا منقضی شود، حساب به‌صورت خودکار
به بسته‌ی «رایگان» برمی‌گردد و بسته‌ی «رایگان» فقط دوره‌ی **ماهانه** دارد و در
پایان هر ماه خودکار تمدید می‌شود (کار زمان‌بندی‌شده‌ی ساعتی + همگام‌سازی
هنگام خواندن `/subscriptions/me` و محاسبه‌ی سقف‌ها). برای بسته‌ی رایگان مقدار
`months` نادیده گرفته می‌شود و همیشه `1` ثبت می‌گردد.

**ارتقا فقط:** کاربر هرگز نمی‌تواند به بسته‌ی پایین‌ترِ خود (بر اساس `sortOrder`)
برود؛ مثلاً از «بلاس» به «اکو». این محدودیت هم در مسیر پرداخت (`checkout`) و هم
در `POST /subscriptions/request` با خطای ۴۰۰ اعمال می‌شود.

**اشتراک + بسته مدیریت کسب‌وکار:** کاربر ابتدا بسته‌ی اصلی (رایگان/اکو/پلاس) را
انتخاب می‌کند و سپس می‌تواند در همان پرداخت، «بسته مدیریت کسب‌وکار» را برای یک
یا چند کسب‌وکار خود بخرد. انتخاب کسب‌وکارها با آرایه‌ی `workspaceIds` در بدنه‌ی
`checkout` انجام می‌شود؛ مبلغ هر افزودنی **روزشمار** (نرخ ماهانه × روزهای پوشش)
است و به مبلغ اشتراک اضافه می‌شود. بسته و اشتراک **دقیقاً با هم منقضی می‌شوند**؛
پس از انقضا داده‌ها باقی می‌مانند و فقط کنترل بسته متوقف می‌شود. بسته‌ی رایگان
هرگز اجازه‌ی خرید این افزودنی را ندارد و شمار کسب‌وکارها از `maxBusinesses` بسته
بیشتر نمی‌شود (اکو ۱، پلاس ۳). افزودنی خریداری‌شده روی `SubscriptionPayment`
به‌صورت `businessAmount`/`withBusinessPackage`/`businessPackages` (JSON) ذخیره
و پس از تأیید پرداخت فعال می‌شود.

**خرید میان‌دوره‌ای:** اگر کاربر از قبل اشتراک فعال دارد و فقط می‌خواهد مدیریت را
به دوره‌ی جاری اضافه کند، از `POST /subscriptions/addon/checkout` استفاده
می‌کند: دوره‌ی جدیدی ساخته نمی‌شود، مبلغ متناسب با **روزهای باقی‌مانده** محاسبه و
بسته در همان تاریخ انقضای اشتراک تمام می‌شود. برای دیدن مبلغ و تاریخ دقیق انقضا
قبل از پرداخت، از `GET /subscriptions/plans/:planId/addon-quote?months=…` با
`months=0` (حالت میان‌دوره) استفاده کنید.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/subscriptions/plans` | فهرست بسته‌های فعال (عمومی). |
| `GET` | `/subscriptions/me` | بسته‌ی فعلی (به‌همراه `planStartedAt`/`planExpiresAt`)، درخواست‌ها (با `startsAt`/`expiresAt` و وضعیت پرداخت) و ۲۰ پرداخت آخر کاربر. |
| `POST` | `/subscriptions/request` | درخواست اشتراک رایگان/بدون پرداخت (در انتظار تأیید مدیر)؛ بدنه‌ی اختیاری `{ planId, note, months }`. |
| `POST` | `/subscriptions/:planId/checkout` | شروع پرداخت آنلاین؛ بدنه‌ی اختیاری `{ months, returnTo, workspaceIds, identity, managementPackageKey, moduleStepIds }` (۱/۳/۶/۱۲)، خروجی `{ paymentId, amount, months, url, paymentCode, paypingProductCode, withBusinessPackage, businessAmount, businessPackages, identityAmount, moduleAmount, moduleItems, expiresAt }`. با `workspaceIds` مبلغ افزودنی هر کسب‌وکار روزشمار به مبلغ اشتراک اضافه می‌شود. `moduleStepIds` مراحل ماژولِ سبد «شروع آسان» را (که سرور هنگام استفاده‌ی کاربر ثبت کرده) به همین پرداخت اضافه می‌کند؛ مرحله‌ی «اختیاری» که کاربر هیچ ورودی نداده باشد (حتی اگر یک قلم کهنه در سبد مانده باشد) از `moduleItems`/`moduleAmount` حذف می‌شود و هزینه‌ای نمی‌گیرد. `returnTo` یک مسیر داخلی مثل `/dashboard/onboarding` است و پس از کال‌بک همان‌جا برگردانده می‌شود. در حالت «پرداخت فقط آنلاین» همیشه به درگاه می‌رود و کیف پول بدهکار نمی‌شود. |
| `GET` | `/subscriptions/plans/:planId/addon-quote` | استعلام افزودنی برای کسب‌وکارهای کاربر؛ `months` یکی از ۱/۳/۶/۱۲ یا `0` (میان‌دوره) است. خروجی شامل `allowed`، `maxBusinesses`، `expiresAt` و فهرست کسب‌وکارها با `amount` و `currentPaidUntil` (برای تفکیک «افزودن» از «تمدید»). |
| `POST` | `/subscriptions/addon/checkout` | خرید میان‌دوره‌ای افزودنی روی اشتراک فعال؛ بدنه‌ی اختیاری `{ workspaceIds, returnTo }`. دوره‌ی جدید ساخته نمی‌شود و بسته در انقضای فعلی تمام می‌شود. |
| `POST` | `/subscriptions/:id/activate` | فعال‌سازی اشتراک پرداخت‌شده‌ای که به‌دلیل وجود یک دوره‌ی فعال دیگر، در وضعیت `PENDING` مانده است. با فعال‌سازی، دوره‌ی قبلی لغو و مانده‌ی روزهایش حذف می‌شود. |
| `GET` | `/subscriptions/payments/:id/invoice` | فاکتور بایگانی‌شده‌ی یک پرداخت اشتراک؛ اقلام از اسنپ‌شات پرداخت بازسازی می‌شوند: دوره‌ی اشتراک، هر «بسته مدیریت کسب‌وکار»، هر استعلام ماژول «شروع آسان» با عنوان خودش، و استعلام هویت/جواز کسب (در صورت وجود تفکیک قیمت، دو ردیف جدا). جمع اقلام همیشه برابر مبلغ پرداخت‌شده است. |
| `GET` | `/subscriptions/payments/callback` | آدرس بازگشت عمومی پی‌پینگ (`paymentCode`، `refId`، `clientRefId`)؛ تراکنش را تأیید و سپس به `returnTo` (پیش‌فرض `/dashboard/subscriptions`) با `payment=...` هدایت می‌کند. برای خرید طرح دیگر پیش از پایان دوره، `activation=pending` هم اضافه می‌شود. |
| `POST` | `/admin/plans/:id/payping-product` | ساخت/همگام‌سازی **۱۶ محصول** پی‌پینگ هر بسته: ۴ دوره‌ی ۱/۳/۶/۱۲ ماهه در دو حالت «بدون» و «+ بسته مدیریت کسب‌وکار» (فقط مدیر)؛ خروجی `{ paypingProductCode, paypingProductCodes, businessAmount, paypingBundleProductCodes }`. |
| `DELETE` | `/admin/plans/payping-products` | حذف همه‌ی محصولات حساب پی‌پینگ و پاک‌کردن کدهای ذخیره‌شده‌ی محصولات حذف‌شده (فقط مدیر)؛ خروجی `{ total, deleted, deletedCodes, failed, clearedCodes }`. برای تمیزکاری پیش از همگام‌سازی دوباره استفاده می‌شود. |

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
نوع تبلیغ، بسته‌ی پست و تگ کارت/بیولینک روی پست به‌جای پرداخت لحظه‌ای، به‌صورت
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

**گیت تسویه:** ساخت بیولینک/کارت ویزیت/پست و اعمال نهایی پله، تبلیغ، تگ پست،
بسته‌ی پست و تیک آبی تا زمانی که `balance < 0` باشد با ۴۰۳ و کد `WALLET_DEBT`
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
| `GET` | `/admin/pricing` | همه‌ی اقلام دارای هزینه (پلن‌ها، بسته‌های پست، سرویس‌های زحل، پله، تبلیغ صفحه اصلی/دایرکتوری، تگ پست) با `price`، `group`، `settlementDays` و `onlineOnly`. |
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
`AD_DIRECTORY_PAYMENT`)، تگ پست (`FEED_TAG`)، خدمات و استعلام
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
| `POST` | `/admin/zohal/payping-products` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ همه‌ی ماژول‌های فعال؛ هر ماژول (از جمله «شاهکار» و «استعلام هویتی») محصول مستقل خودش را می‌گیرد. محصول واحد قدیمی «شاهکار + هویتی» در همین همگام‌سازی از پی‌پینگ حذف می‌شود. |
| `POST` | `/admin/zohal/services/:key/payping-product` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ یک ماژول مستقل؛ در صورت نبود توکن، غیرفعال‌بودن ماژول یا تعرفه‌ی کمتر از ۱٬۰۰۰ تومان، پیام خطای مشخص برمی‌گرداند. |
| `GET` | `/admin/zohal/composites` | ADMIN | فهرست محصولات ترکیبی ساخته‌شده از چند ماژول + قیمت محاسبه‌شده، وضعیت فروش و کد محصول پی‌پینگ. |
| `POST` | `/admin/zohal/composites` | ADMIN | ساخت محصول ترکیبی با `{ label, serviceKeys[], amount?, enabled?, description? }`؛ `amount=0` یعنی جمع تعرفه‌ی ماژول‌ها. |
| `PATCH` | `/admin/zohal/composites/:key` | ADMIN | ویرایش محصول ترکیبی. |
| `DELETE` | `/admin/zohal/composites/:key` | ADMIN | حذف محصول ترکیبی. |
| `POST` | `/admin/zohal/composites/:key/payping-product` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ یک محصول ترکیبی. |
| `GET` | `/zohal/offer` | کاربر | ماژول‌های هزینه‌دار و محصولات ترکیبی قابل خرید آنلاین همراه با فیلدهای ورودی. |
| `POST` | `/zohal/composites/:key/checkout` | کاربر | شروع پرداخت محصول ترکیبی با `{ payload, returnTo? }`؛ پس از تأیید درگاه همه‌ی ماژول‌ها اجرا و نتیجه در پرداخت ذخیره می‌شود. |
| `POST` | `/zohal/services/:key/checkout` | کاربر | خرید آنلاین یک ماژول هزینه‌دار (همان مسیر تحویل محصول ترکیبی). |
| `GET`/`POST` | `/zohal/payments/callback` | عمومی | بازگشت درگاه برای پرداخت محصول ترکیبی/ماژول؛ تأیید تراکنش، اجرای ماژول‌ها و هدایت به `returnTo` با `payment=success|failed`. |
| `GET` | `/payments/mine` | کاربر | فهرست یکپارچه‌ی همه‌ی پرداخت‌های کاربر (اشتراک، استعلام، کیف پول، پله، تبلیغ و ماژول/مدیریت کسب‌وکار) با جزئیات سفارش، وضعیت، نتیجه‌ی ماژول‌ها و `invoiceId`. |
| `GET` | `/payments/invoices/:id` | کاربر | فاکتور کامل یکی از پرداخت‌های خودِ کاربر (اقلام، خریدار، تاریخ) برای چاپ/PDF؛ فقط صاحب همان فاکتور. `invoiceId` هر ردیف در `GET /payments/mine` برگردانده می‌شود. |
| `GET` | `/admin/zohal/blue-tick` | ADMIN | درخواست‌های تیک آبی در انتظار بررسی + آخرین حساب‌های تأییدشده. |
| `PATCH` | `/admin/zohal/blue-tick/:id` | ADMIN | تأیید/رد درخواست تیک آبی (`{ decision, reason? }`). |
| `GET` | `/profile/identity-inquiry/status` | کاربر | آیا استعلام خودکار هویت در دسترس است؟ |
| `GET` | `/profile/identity/status` | کاربر | وضعیت دو مرحله‌ی هویت (`phoneMatched`، `verified`) و مشخصات ذخیره‌شده. |
| `POST` | `/profile/identity/checkout` | کاربر | شروع پرداخت آنلاین استعلام هویت؛ بدنه‌ی اختیاری `{ nationalCode, birthDate, withLicense?, licenseTrackingCode?, returnTo? }`. با `withLicense` هر سه استعلام (شاهکار + هویتی + جواز کسب) در یک پرداخت با مبلغ جمع تعرفه‌ها فروخته می‌شوند (بدون ساخت محصول ترکیبی در پی‌پینگ). تیک آبی فقط وقتی صادر می‌شود که کد ملی و نام و نام خانوادگی مالک جواز با هویت تأییدشده‌ی حساب یکسان باشد؛ در غیر این صورت دلیل عدم تعلق تیک آبی در `identity` و در سابقه‌ی استعلام‌ها ثبت و نمایش داده می‌شود. `returnTo` یک مسیر داخلی (مثل `/dashboard/inquiries`) است که پس از کال‌بک همان‌جا برگردانده می‌شود. خروجی `{ url, amount, paid, alreadyVerified }`. در حالت پرداخت فقط آنلاین، کیف پول بدهکار نمی‌شود. |
| `POST` | `/profile/identity/verify` | کاربر | اجرای هر دو استعلام پس از پرداخت موفق، بدون کسر مجدد (برای تلاش دوباره پس از خطای موقت). |
| `GET` | `/profile/identity/quote` | کاربر | تعرفه‌ی استعلام هویت و جواز کسب پیش از پرداخت؛ خروجی `{ identityTotal, licensePrice, licenseAvailable, total }`. |
| `GET` | `/profile/identity/payments/callback` | عمومی | بازگشت از درگاه؛ تراکنش را تأیید، هر دو استعلام را اجرا و به `returnTo` (پیش‌فرض `/dashboard/onboarding`) با پارامتر `identity=success|failed` هدایت می‌کند. |
| `POST` | `/profile/identity/phone-match` | کاربر | مسیر قدیمی مرحله ۱؛ در حالت «پرداخت فقط آنلاین» با خطا کاربر را به `identity/checkout` هدایت می‌کند. |
| `POST` | `/profile/identity/inquiry` | کاربر | مسیر قدیمی مرحله ۲؛ در حالت «پرداخت فقط آنلاین» با خطا کاربر را به `identity/checkout` هدایت می‌کند. |
| `POST` | `/profile/phones/verify` | کاربر | استعلام شاهکار برای یک شماره‌ی موبایل اضافه (مثلاً شماره‌ی کسب‌وکار)؛ بدنه `{ phone, nationalCode? }`. نتیجه در `IdentityInquiryLog` ذخیره می‌شود تا همان شماره بعداً بدون استعلام/هزینه‌ی مجدد قابل استفاده باشد. |
| `GET` | `/profile/asset-defaults` | کاربر | پیش‌فرض‌های فرم «کارت ویزیت»/«بیولینک» از اطلاعات تأییدشده: `{ fullName, mobile, businessId, cityId, nationalCode, verifiedPhones, shahkarPrice, config }`. `config.businessCard`/`config.biolink` قواعد ادمین را برمی‌گرداند (`lockedFields`، `submitLabel`، `allowMobileChange`، `allowMobileAdd`) تا فیلدهای هویتی قفل و دکمه‌ی «پرداخت و ارسال برای تأیید» نمایش داده شود. |
| `POST` | `/profile/blue-tick/request` | کاربر | ثبت درخواست تیک آبی پس از استعلام هویت. |

`GET /profile/me` علاوه بر اطلاعات حساب، فهرست `verifiedPhones` (شماره‌ی حساب +
شماره‌های تأییدشده با شاهکار)، `identityHistory` (آخرین استعلام‌ها)، و پاسخ کامل
`identityInquiryData`/`businessLicenseData` را برمی‌گرداند تا در صفحه‌ی پروفایل
هم برای استفاده‌ی مجدد و هم برای مشاهده‌ی پاسخ استعلام‌ها نمایش داده شوند.

`PATCH /profile/me` فقط برای حالت جایگزین (وقتی استعلام زحل خاموش است) باقی
مانده و در حالت عادی با خطا کاربر را به دو مرحله‌ی بالا هدایت می‌کند. تمام
مسیرهای ساخت محتوا و درخواست‌های پرداختی با `ProfileCompleteGuard` تا تکمیل
`identityVerifiedAt` مسدود می‌شوند.

## استعلام‌های api.ir (`/api/admin/apiir`)

راهنمای کامل سرویس‌ها و نحوه‌ی فعال‌سازی در `docs/APIIR.md` آمده است. کلید
api.ir فقط سمت سرور (`API_KEY_API.IR`؛ جایگزین `APIIR_TOKEN`) نگه داشته
می‌شود و هر سرویس با کلید `apiir.service.<key>` جداگانه فعال/غیرفعال می‌شود.
فهرست سرویس‌ها از اسپک رسمی api.ir تولید می‌شود
(`python3 scripts/sync_apiir_catalog.py`).

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/admin/apiir/services` | ADMIN | فهرست همه‌ی سرویس‌های api.ir (از جمله «استعلام اعتبار مجوز شغلی/پروانه کسب») + وضعیت اتصال، فعال/غیرفعال و قیمت. |
| `PATCH` | `/admin/apiir/services/:key` | ADMIN | فعال/غیرفعال‌کردن (`{ enabled }`) و/یا تعیین قیمت آینده (`{ price }`). |
| `POST` | `/admin/apiir/services/:key/test` | ADMIN | فراخوانی آزمایشی واقعی (هزینه‌زاست و از اعتبار حساب api.ir کم می‌شود) با `{ payload }`. |
| `POST` | `/admin/apiir/services/:key/payping-product` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ برای همان سرویس با مبلغ ثبت‌شده (`apiir.price.<key>`)؛ کد محصول در `apiir.payping.<key>` ذخیره می‌شود. |
| `GET` | `/admin/apiir/composites` | ADMIN | فهرست محصولات ترکیبی ساخته‌شده از چند سرویس api.ir + قیمت محاسبه‌شده، وضعیت فروش، فیلدهای مشترک و کد محصول پی‌پینگ. |
| `POST` | `/admin/apiir/composites` | ADMIN | ساخت محصول ترکیبی با `{ label, serviceKeys[], amount?, enabled?, description? }`؛ `amount=0` یعنی جمع تعرفه‌ی سرویس‌ها. |
| `PATCH` | `/admin/apiir/composites/:key` | ADMIN | ویرایش محصول ترکیبی api.ir. |
| `DELETE` | `/admin/apiir/composites/:key` | ADMIN | حذف محصول ترکیبی api.ir. |
| `POST` | `/admin/apiir/composites/:key/payping-product` | ADMIN | ساخت/همگام‌سازی محصول پی‌پینگ یک محصول ترکیبی api.ir. |

## استعلام‌های یکپارچه (`/api/admin/inquiries`)

هر فراخوانی زحل و api.ir مستقل از جریان کسب‌وکار در جدول `inquiry_logs`
ذخیره می‌شود (provider، سرویس، کاربر، کد ملی، موبایل، موفق/ناموفق، کد نتیجه،
HTTP، پیام، تأخیر، مبلغ و payload/response). این جدول مبنای فهرست کامل و
قابل جست‌وجوی پنل ادمین است.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/admin/inquiries` | ADMIN | فهرست استعلام‌ها با مرتب‌سازی نزولی زمان. پارامترهای اختیاری: `provider` (`ZOHAL` \| `APIIR`)، `q` (جست‌وجو در نام سرویس، نام/موبایل کاربر، کد ملی و پیام) و `take` (۱ تا ۳۰۰، پیش‌فرض ۱۰۰). خروجی `{ total, items }`. |

## ویزارد «شروع آسان» (`/api/onboarding`)

بخش مرحله‌به‌مرحله‌ی راه‌اندازی کسب‌وکار که در صدر داشبورد کاربر نمایش داده
می‌شود. فهرست و ترتیب مراحل در یک `Setting` ذخیره می‌شود و از پنل مدیریت
(«تنظیمات» → «مراحل شروع آسان») قابل افزودن/حذف/جابه‌جایی است. تکمیل مراحل
پیش‌فرض خودکار است و از داده‌های حساب محاسبه می‌شود؛ مراحل «خوش‌آمدگویی»
(`welcome`)، «ماژول» (`module`) و «سفارشی» (`custom`) را کاربر تیک می‌زند.
مرحله‌ی `module` به یک ماژول/محصول واقعی از کتابخانه‌ی «شروع آسان» وصل می‌شود
(`moduleKey`): سرویس‌های zohal و api.ir، هر اشتراک، هر بسته‌ی مدیریت کسب‌وکار،
بیولینک و کارت ویزیت. ویزارد در یک کادر، هر بار یک مرحله را به‌ترتیب نشان
می‌دهد و دکمه‌ی «مرحله بعد» دارد؛ متن و ترتیب همه‌ی مراحل — از جمله صفحه‌ی
خوش‌آمدگویی — از همین پنل مدیریت قابل ویرایش است. برای مرحله‌های `module`،
مدیر می‌تواند هر فیلد فرمِ ماژول را جداگانه سفارشی کند (`fieldOverrides`):
برچسب و متن راهنما، الزامی‌بودن، مقدار پیش‌فرض از اطلاعات حساب کاربر
(`userMobile`، `userNationalCode`، `userBirthDate`، `userFullName`)، قفل‌کردن
مقدار برای کاربر (`readonly`)، برچسب‌های سفارشی برای فیلدهای بولی (مثل
مرد/زن به‌جای بله/خیر) و دیتاپیکر شمسی برای فیلدهای تاریخ.
برای هر مرحله‌ی `module` ادمین می‌تواند با `onSuccess` مشخص کند که پس از
«استعلام مثبت» آن ماژول (نتیجه‌ی موفق و، در صورت وجود، `matched: true`) کدام
تیک‌ها به‌طور خودکار صادر شوند: `grantWhiteTick` برای «تیک سفید» (احراز هویت و
تطبیق شماره تماس) و `grantBlueTick` برای «تیک آبی» (استعلام جواز کسب). این
اعطا هنگام اجرای استعلام‌های پرداخت‌شده در `POST /onboarding/cart/deliver`
انجام می‌شود و تیک‌های موجود را تنزل نمی‌دهد.

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| `GET` | `/onboarding/me` | کاربر | مراحل فعال + وضعیت تکمیل/راهنمای هر مرحله + شمارش پیشرفت + وضعیت هویت (`identity`) + سابقه‌ی استعلام‌ها (`history`) + مدارک آپلودشده (`documents`) + کسب‌وکار ثبت‌شده‌ی «شروع آسان» (`business`) + سبد خرید ماژول‌های دارای هزینه (`cart`, `cartTotal`) + پرچم `pendingModuleDelivery` برای استعلام‌های پرداخت‌شده‌ی در انتظار اجرا. |
| `POST` | `/onboarding/business` | کاربر | ساخت/به‌روزرسانی کسب‌وکار مرحله ۲ (فقط فضای کسب‌وکار، بدون کارت ویزیت و بیولینک)؛ بدنه `{ name, cityId?, businessId?, mobile?, additionalMobiles?, address?, fullName? }`. این مرحله فقط شماره‌ها را ثبت می‌کند؛ شماره‌ی اصلی به‌صورت پیش‌فرض شماره‌ی تأییدشده‌ی حساب است و هر شماره‌ی جدید/اضافه هنگام استعلام هویت با همان کد ملی و شاهکار بررسی می‌شود (اگر کد ملی کاربر قبلاً ثبت شده باشد، همان لحظه‌ی ذخیره هم استعلام می‌شود). دسته‌بندی انتخاب‌شده تعیین می‌کند در مرحله‌ی طرح، «مدیریت کسب‌وکار» پیشنهاد شود یا نه. |
| `POST` | `/onboarding/steps/:id/complete` | کاربر | تیک‌زدن یک مرحله‌ی سفارشی. |
| `DELETE` | `/onboarding/steps/:id/complete` | کاربر | برداشتن تیک یک مرحله‌ی سفارشی. |
| `POST` | `/onboarding/steps/:id/data` | کاربر | ثبت فرم پویای مرحله‌ی ماژول؛ بدنه `{ data: Record<string, unknown> }`. فیلدهای الزامی ماژول اعتبارسنجی می‌شوند، مقدار فیلدهای `readonly` از اطلاعات حساب کاربر بازنویسی می‌شود (حتی اگر کلاینت مقدار دیگری بفرستد)، مقدار فیلدهای بولی/گزینه‌ای باید در گزینه‌های مجاز باشد، داده ذخیره و مرحله کامل می‌شود، و اگر ماژول قیمت داشته باشد به سبد خرید اضافه می‌گردد. اگر مرحله «اختیاری» باشد و کاربر هیچ ورودیِ خودش را پر نکند، مرحله به‌عنوان «رد‌شده» تکمیل می‌شود، هیچ استعلامی در `POST /onboarding/cart/deliver` اجرا نمی‌شود و هزینه‌ای به سبد اضافه نمی‌گردد؛ فیلدهای `readonly` که سرور از حساب کاربر پیش‌پر می‌کند «ورودی کاربر» شمرده نمی‌شوند (مثلاً مرحله‌ی جواز کسب با کد ملیِ قفل‌شده ولی کد جواز خالی، رد‌شده و رایگان است) و داده‌ی ذخیره‌شده‌ی آن خالی می‌ماند تا سبد/صورتحساب هم آن را به‌عنوان رد‌شده بشناسد. اگر مرحله `requires` داشته باشد و پیش‌نیازهایش محقق نباشند، با خطای ۴۰۰ رد می‌شود. |
| `POST` | `/onboarding/cart/deliver` | کاربر | اجرای استعلام‌های ماژول (api.ir/Zohal) که همراه پرداخت نهایی خریداری شده‌اند؛ برای محصولات ترکیبی، همه‌ی ماژول‌ها به ترتیب تعریف‌شده اجرا می‌شوند. **ترتیب اجرا قطعی است:** اقلام ابتدا بر اساس جایگاه هر مرحله در پیکربندی ویزارد (همان شماره‌ی مراحلی که کاربر می‌بیند) مرتب می‌شوند و سپس `requires` هر مرحله، پیش‌نیازش را جلوتر می‌آورد؛ بنابراین حتی اگر سبد به ترتیب دیگری پر شده باشد، استعلام هویت پیش از جواز کسب اجرا می‌شود. ماژولی که پیش‌نیازش (مرحله‌ی تکمیل‌شده یا استعلام مثبت پیشین) محقق نشده باشد اجرا نمی‌شود؛ مرحله‌ی «اختیاری» که ورودی کاربر ندارد هم رد می‌شود (بدون استعلام/هزینه). هویت کاربر پیش از هر مرحله دوباره خوانده می‌شود تا کد ملیِ تازه‌تأییدشده در مرحله‌ی هویت، مبنای تطبیق جواز کسب همان اجرا باشد. در صورت مثبت‌بودن نتیجه‌ی هر ماژول، تیک‌های پیکربندی‌شده‌ی همان مرحله (`onSuccess`: تیک سفید/آبی) صادر می‌شوند و `nationalCode`/`birthDate`/نام/نام خانوادگی/نام پدر فرم در صورت وجود روی حساب ذخیره می‌شوند (نام پدر در فاکتور و پنل کاربر/مدیر نمایش داده می‌شود)؛ داده‌ی استعلام‌های ترکیبی (که زیر `modules[].data` می‌آیند) برای استخراج نام/کد ملی و اجرای قواعد `match` با هم ادغام می‌شود. «مثبت» بودن وقتی با `match` محدود شده باشد یعنی همه‌ی قواعد تطبیق برقرار باشند؛ اگر استعلام موفق اما قاعده‌ها برقرار نباشند، پاسخ کامل ذخیره می‌شود، یک لاگ `BUSINESS_LICENSE` با وضعیت `FAILED` و `matched: false` ثبت می‌گردد و تیکی صادر نمی‌شود. خروجی `results` برای هر مرحله `{ stepId, ok, matched, message }` است تا کلاینت «موفق»، «ناموفق» و «عدم تطبیق» را جدا نشان دهد. پرداخت به‌صورت اتمیک claim می‌شود، پس درخواست‌های هم‌زمان (ریدایرکت درگاه + fallback بارگذاری) فقط یک‌بار اجرا و کسر می‌شوند و درخواست دوم `{ delivered: 0 }` می‌گیرد. idempotent و بدون کسر مجدد. |
| `POST` | `/onboarding/documents` | کاربر | ثبت فایل آپلودشده (خروجی `/uploads/document`) در فهرست مدارک حساب؛ بدنه `{ url, name?, size?, contentType? }`. |
| `DELETE` | `/onboarding/documents/:id` | کاربر | حذف یک مدرک از حساب. |
| `GET` | `/admin/onboarding/steps` | ADMIN | فهرست مراحل پیکربندی‌شده. |
| `GET` | `/admin/onboarding/steps/export` | ADMIN | خروجی JSON خودبسنده‌ی همه‌ی مراحل «شروع آسان» برای استخراج/پشتیبان‌گیری؛ شامل `{ schema: "onboarding-steps/v1", exportedAt, count, steps }` و برای هر مرحله تمام پیکربندی (`kind`, `title`, `description`, `href`, `enabled`, `optional`, `fieldOverrides`, `onSuccess`, `match`, `requires`) به‌همراه ماژولِ حل‌شده (`module.label/price/group/type`, `module.fields`، `module.resolvedFields` با اعمال `fieldOverrides` و `module.responseFields`). |
| `POST` | `/admin/onboarding/steps/import` | ADMIN | ورود/بازیابی کل پیکربندی «شروع آسان» از یک فایل خروجی؛ بدنه می‌تواند سند کامل خروجی (`{ schema, exportedAt, count, steps }`)، فقط `{ steps: [...] }` یا آرایه‌ی خام مراحل باشد. هر مرحله از همان پاک‌سازی/اعتبارسنجی `PUT /admin/onboarding/steps` عبور می‌کند، پس `kind` ناشناخته یا `moduleKey` نامعتبر با خطای ۴۰۰ رد می‌شود؛ در صورت معتبر بودن، کل پیکربندی جایگزین شده و `{ steps }` بازگردانده می‌شود. |
| `GET` | `/admin/onboarding/modules` | ADMIN | کتابخانه‌ی ماژول‌ها/محصولات قابل قرار‌گرفتن در مراحل: zohal، محصولات ترکیبی zohal، api.ir، اشتراک‌ها، مدیریت کسب‌وکار، بیولینک و کارت ویزیت (هر آیتم با `key`، `label`، `href`، `enabled`، `price` و برای ترکیبی‌ها `composite: true`). هر ماژول استعلامی `responseFields` را هم برمی‌گرداند: فهرست فیلدهای پاسخ استعلام `[{ name, label, example? }]` که از قرارداد OpenAPI همان سرویس (api.ir و زحل) استخراج شده و پنل برای کشویی «فیلد پاسخ استعلام» در قاعده‌ی تطبیق استفاده می‌کند. |
| `PUT` | `/admin/onboarding/steps` | ADMIN | ذخیره‌ی فهرست/ترتیب/فعال‌بودن/اختیاری‌بودن مراحل (`{ steps: [{ ..., optional?, moduleKey?, fieldOverrides?, onSuccess?, match?, requires? }] }`). برای `kind: "module"` مقدار `moduleKey` باید یکی از کلیدهای کتابخانه باشد، `fieldOverrides` یک شیء با کلید نام فیلد و مقادیر `{ label?, placeholder?, required?, prefill?, readonly?, options?, datePicker? }` است و `onSuccess` (اختیاری) با `{ grantWhiteTick?, grantBlueTick? }` تیک‌های صادرشده پس از استعلام مثبت را تعیین می‌کند. `match` (اختیاری) فهرست قواعد تطبیق نتیجه است؛ هر قاعده `{ resultField, compareTo, field?, mode? }` که `resultField` نام فیلد پاسخ استعلام، `compareTo` یکی از `userNationalCode` / `userFullName` / `userFirstName` / `userLastName` / `userFatherName` / `userBirthDate` / `userMobile` / `field` (مقدار فیلد همین فرم که در `field` نامش می‌آید؛ نام/نام خانوادگی/نام پدر/تاریخ تولد از استعلام هویت حساب خوانده می‌شوند) و `mode` یکی از `normalized` (پیش‌فرض) / `exact` / `nameMatch` / `masked` است. `masked` برای پاسخ‌هایی است که مقدار را ناقص/ماسک‌شده برمی‌گردانند (مثل کد ملی `536****001` در استعلام جواز کسب): فقط بخش‌های نمایان باید در مقدار کاربر وجود داشته باشند و بخش ماسک‌شده نادیده گرفته می‌شود. اگر `match` تعیین شود، استعلام فقط با برقراری همه‌ی قواعد «مثبت» شمرده می‌شود. `requires` (اختیاری) فهرست شناسه‌ی مراحل پیش‌نیاز است؛ مرحله‌ی پیش‌فرض باید تکمیل شده و مرحله‌ی ماژول باید نتیجه‌ی مثبت داده باشد تا استعلام این مرحله اجرا شود (مثلاً اجرای استعلام جواز کسب بعد از استعلام موفق هویت). |

ترتیب مراحل پیش‌فرض «شروع آسان»: `welcome` → `business` → `identity` → `plan` →
`approval`. قاعده‌ی تکمیل: `business` = وجود حداقل یک فضای کسب‌وکار (این مرحله
تنها کسب‌وکار را می‌سازد و کارت ویزیت/بیولینک ندارد؛ داده‌ی خام روی
`BusinessWorkspace.onboardingData` می‌ماند)، `identity` = تأیید استعلام هویت
(تیک سفید) و در صورت خرید اختیاری «استعلام جواز کسب» تیک آبی فقط با تطبیق کد
ملی و نام و نام خانوادگی مالک جواز با هویت تأییدشده ثبت می‌شود (وگرنه دلیل
عدم تطبیق در `businessLicenseStatus`/`businessLicenseMessage` برمی‌گردد)،
`plan` = انتخاب/تأیید صریح یک طرح (اشتراک فعال یا طرح پیش‌فرضی که خودکار
تخصیص می‌یابد) به‌همراه افزودنی اختیاری «مدیریت کسب‌وکار» وقتی دسته‌بندی
کسب‌وکار بسته‌ی مدیریت فعالی داشته باشد، و `approval` = تأیید شدن کارت توسط
مدیر. مرحله‌های قدیمی `details` و `documents` حذف شده‌اند و در ارتقای یک‌باره‌ی
تنظیمات ذخیره‌شده هم کنار گذاشته می‌شوند؛ افزودن جواز کسب جای «مدارک» برای
تیک آبی را گرفته است.

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

## پنل ماژولار کسب‌وکار (`/api/business-modules`)

هر کاربر می‌تواند چند «فضای کسب‌وکار» داشته باشد (`BusinessWorkspace`)؛ تعداد
مجاز از `maxBusinesses` اشتراک تعیین می‌شود. کسب‌وکار فعال با هدر
`x-workspace-id` انتخاب می‌شود (اعتبارسنجی مالکیت در سمت سرور) و در نبود آن،
کسب‌وکار پیش‌فرض/قدیمی‌ترین استفاده می‌شود. هر فضای کسب‌وکار بسته‌ی صنف و
ماژول‌های فعال خودش را نگه می‌دارد. تعریف ماژول‌ها و بسته‌های صنف در کد
(`apps/api/src/business-modules/business-modules.registry.ts`) است؛ افزودن
ماژول تازه فقط با یک ورودی در همین رجیستری و گارد `@RequireModule('<key>')`
روی کنترلر انجام می‌شود.

**پیش‌فرض‌ها:** فقط `businessCards` و `biolinks` برای هر کسب‌وکار فعال‌اند.
بقیه‌ی ماژول‌ها «قابل خرید» هستند: ادمین برای هر ماژول قیمت/مدت تعیین می‌کند و
کاربر پس از خرید (کیف پول یا درگاه پی‌پینگ) می‌تواند آن را فعال کند.

**دامنه‌ی داده‌ها:** هر کارت ویزیت و بیولینک به یک فضای کسب‌وکار
(`workspaceId`) تعلق دارد؛ هنگام ساخت، همان کسب‌وکار فعال در هدر
`x-workspace-id` ثبت می‌شود و مسیرهای `GET /business-cards/mine` و
`GET /biolinks/mine` فقط اقلام همان کسب‌وکار را برمی‌گردانند. برای شمارش کل
اقلام کاربر (مثلاً کاشی‌های داشبورد) پارامتر `workspace=all` اضافه شد.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/business-modules/catalog` | کاتالوگ ماژول‌ها، بسته‌های صنف و قیمت‌ها. |
| `GET` | `/business-modules/workspaces` | فهرست کسب‌وکارهای من (سوییچ پنل). |
| `POST` | `/business-modules/workspaces` | ساخت کسب‌وکار جدید (سقف اشتراک). `categoryId` (از `GET /businesses`) **الزامی** است و صنف/بسته‌ی مدیریت از آن تعیین می‌شود. |
| `PATCH` | `/business-modules/workspaces/:id` | ویرایش نام/صنف/پیش‌فرض. تغییر نام ⇒ `pendingName` و انتظار تأیید مدیر. |
| `DELETE` | `/business-modules/workspaces/:id` | حذف کسب‌وکار (حداقل یکی می‌ماند). |
| `GET` | `/business-modules/my` | کسب‌وکار فعال: ماژول‌ها، قیمت، قفل خرید، ظرفیت اشتراک، `industryLocked` و `subscriptionPaidUntil` (پایان دوره‌ی مدیریت خریداری‌شده). |
| `PATCH` | `/business-modules/my` | درخواست تغییر نام نمایشی کسب‌وکار؛ نام فعلی تا تأیید مدیر تغییر نمی‌کند و در `pendingName` برمی‌گردد. |
| `PATCH` | `/business-modules/my/industry` | انتخاب بسته‌ی صنف (ماژول‌های پیش‌فرض افزودنی فعال می‌شوند). پس از خرید یک «مدیریت کسب‌وکار» با کد `INDUSTRY_LOCKED` (۴۰۳) رد می‌شود. |
| `PATCH` | `/business-modules/my/:key` | فعال/غیرفعال‌کردن ماژول؛ خرید و وابستگی‌ها بررسی می‌شوند. |
| `POST` | `/business-modules/my/:key/purchase` | خرید ماژول (کیف پول/پی‌پینگ) و فعال‌سازی پس از پرداخت. |
| `GET` | `/business-modules/purchases` | سابقه‌ی خرید ماژول‌ها. |
| `GET` | `/business-modules/managements` | فهرست «مدیریت کسب‌وکار»ها با ماژول‌های فعال، قیمت کل و `paidUntil` (پایان دوره‌ی خریداری‌شده) و `extension` (پیشنهاد تمدید یک‌باره: `allowed`، `alreadyExtended`، `currentMonths`، `remainingDays`، `terms`). پس از خرید، فقط بسته‌ی همان کسب‌وکار برمی‌گردد تا کاربر به صنف دیگری هدایت نشود. برای کاربر بسته‌ی «رایگان» فهرست خالی برمی‌گردد (امکان خرید ندارد)؛ خرید مدیریت در حالت کلی از مسیر «اشتراک + بسته» انجام می‌شود. |
| `GET` | `/business-modules/suggested-management` | «مدیریت کسب‌وکار» متناسب با دسته‌بندی شغلی کسب‌وکار کاربر (بر اساس اتصال دسته‌بندی‌ها در پنل ادمین)؛ مستقل از پلن برمی‌گردد: `{ key, label, description, totalPrice, terms, purchased, paidUntil, canPurchase }`. `canPurchase` برای پلن رایگان `false` است تا رابط، کاربر را به ارتقا هدایت کند. |
| `POST` | `/business-modules/managements/:key/purchase` | خرید/فعال‌سازی کل یک «مدیریت کسب‌وکار» (کیف پول/پی‌پینگ)؛ بدنه‌ی اختیاری `{ months: 1|3|6|12, returnTo }`. مبلغ = مجموع قیمت ماهانه‌ی ماژول‌های خریداری‌نشده × تعداد ماه × (۱ − درصد تخفیف دوره). اگر بسته قبلاً خریداری شده باشد، همین مسیر «تمدید یک‌باره» است: فقط دوره‌ای طولانی‌تر از دوره‌ی فعلی قابل انتخاب است، مبلغ از قیمت پایه‌ی کامل محاسبه می‌شود و `paidUntil` جدید = انتهای دوره‌ی فعلی + ماه‌های انتخابی (مانده‌ی دوره‌ی قبل حفظ می‌شود). تمدید دوم با ۴۰۰ رد می‌شود. |
| `GET/POST` | `/business-modules/payments/callback` | بازگشت درگاه پس از خرید ماژول. |
| `GET` | `/public/business/:slug/extras` | (عمومی) محصولات منتشرشده‌ی فروشگاه و اقامتگاه‌های منتشرشده‌ی کسب‌وکاری که این کارت ویزیت به آن وصل است، برای نمایش در صفحه‌ی `/business/:slug`. فقط وقتی ماژول‌های `retailCatalog`/`accommodationRental` فعال باشند (و دوره‌ی بسته منقضی نشده باشد) برمی‌گردند؛ پس از انقضا `products`/`stays` خالی می‌شوند ولی خود صفحه‌ی کارت (رایگان) منتشر می‌ماند. خروجی `{ workspace: { publicSlug, name } \| null, products, stays }`. |

> **هم‌ترازی دوره:** دوره‌ی «مدیریت کسب‌وکار» باید دقیقاً برابر دوره‌ی اشتراک اصلی
> کاربر باشد (`User.planTermMonths`)؛ مثلاً پلاس یک‌ماهه فقط بسته‌ی یک‌ماهه
> می‌بیند و خرید با دوره‌ی دیگر ۴۰۰ می‌گیرد. پایان دوره داده را حذف نمی‌کند و
> فقط ماژول‌ها/ویترین را از دسترس خارج می‌کند. تغییر نام نمایشی کسب‌وکار در
> `pendingName` می‌ماند تا تأیید مدیر؛ `publicSlug` (کلید URL) تغییر نمی‌کند.

مسیرهای ادمین (نقش `ADMIN`):

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/admin/business-modules/catalog` | همه‌ی ماژول‌ها + قیمت + تعداد کسب‌وکار فعال. |
| `GET` | `/admin/business-modules/managements` | کارت‌های «مدیریت کسب‌وکار» با ماژول‌ها، قیمت کل و وضعیت محصول پی‌پینگ. |
| `POST` | `/admin/business-modules/managements` | ساخت مدیریت کسب‌وکار جدید (`key`، `label`، `description`، `available`، `discounts`، `modules`، `categoryIds`). `categoryIds` **الزامی** است (حداقل یک دسته‌بندی از «شهرها و کسب‌وکارها ← مدیریت کسب‌وکارها») و بسته را به آن دسته‌ها متصل می‌کند. |
| `PATCH` | `/admin/business-modules/managements/:key` | ویرایش نام/توضیح/نمایش/درصد تخفیف دوره‌ها، فهرست ماژول‌ها و `categoryIds` (جایگزینی کامل اتصال دسته‌بندی‌ها). |
| `DELETE` | `/admin/business-modules/managements/:key` | حذف کامل مدیریت (مدیریت پایه حذف نمی‌شود؛ کسب‌وکارهای وابسته به مدیریت پایه منتقل می‌شوند). |
| `POST` | `/admin/business-modules/managements/:key/modules` | افزودن ماژول به مدیریت (`{ moduleKey }`). |
| `DELETE` | `/admin/business-modules/managements/:key/modules/:moduleKey` | حذف ماژول از مدیریت (ماژول‌های پیش‌فرض مدیریت پایه حذف نمی‌شوند). |
| `POST` | `/admin/business-modules/managements/:key/sync-payping` | ساخت/به‌روزرسانی محصول پی‌پینگ برای هر دوره (۱/۳/۶/۱۲ ماهه) با مبلغ همان دوره (در dev با شبیه‌ساز). |
| `GET` | `/admin/business-modules/workspaces` | کسب‌وکارها و ماژول‌های هرکدام (جست‌وجو با `q` و فیلتر مالک با `ownerId`؛ صفحه‌ی کاربر در پنل ادمین از همین فیلتر استفاده می‌کند). |
| `PATCH` | `/admin/business-modules/workspaces/:id/modules/:key` | فعال/غیرفعال‌کردن ماژول برای یک کسب‌وکار. |
| `GET` | `/admin/business-modules/prices` | فهرست قیمت‌ها. |
| `PATCH` | `/admin/business-modules/prices/:key` | تعیین قیمت ماهانه و فعال‌بودن یک ماژول. |
| `GET` | `/admin/business-modules/name-requests` | درخواست‌های تغییر نام نمایشی کسب‌وکار در انتظار تأیید. |
| `POST` | `/admin/business-modules/name-requests/:id/approve` | تأیید و اعمال نام جدید (`name` ← `pendingName`). |
| `POST` | `/admin/business-modules/name-requests/:id/reject` | رد درخواست تغییر نام (نام فعلی حفظ می‌شود). |

**مدل قیمت‌گذاری:** هر ماژول فقط یک «قیمت ماهانه» دارد. هر «مدیریت کسب‌وکار»
چهار دوره‌ی ۱/۳/۶/۱۲ ماهه دارد و درصد تخفیف هر دوره روی خود مدیریت ذخیره
می‌شود. قیمت هر دوره = مجموع قیمت ماهانه‌ی ماژول‌های آن مدیریت × تعداد ماه ×
(۱ − تخفیف). فهرست مدیریت‌ها و ماژول‌هایشان در جدول‌های
`business_managements` و `business_management_modules` نگهداری می‌شود و ادمین
می‌تواند آن‌ها را بسازد/ویرایش/حذف کند.

**افزودن ماژول به یک مدیریت موجود:** وقتی ادمین ماژولی را به یک «مدیریت
کسب‌وکار» اضافه می‌کند (`POST .../managements/:key/modules` یا `PATCH
.../managements/:key`)، همان ماژول بلافاصله برای کسب‌وکارهایی که آن مدیریت را
خریداری کرده‌اند فعال می‌شود؛ چه خرید مستقیم (`business_module_purchases` با
`package:<key>`) و چه به‌صورت افزودنی اشتراک
(`subscription_payments.businessPackages`). دوره‌ی باقی‌مانده‌ی همان بسته روی
ماژول جدید اعمال می‌شود و انتخاب دستی خاموش/روشن کاربر بازنویسی نمی‌شود. برای
نصب‌های قدیمی، یک‌بار در بوت (`businessManagementModuleGrantsV1`) همین
همگام‌سازی اجرا می‌شود.

ماژول‌های فعلی: `businessCards`، `biolinks`، `feeds`، `accommodationRental`،
`accommodationReservations`، `accommodationChannels`، `crm`، `retailCatalog`،
`retailOrders`، `retailInventory`، `retailReports`، `buildingUnits`،
`buildingCharges`، `buildingFinance`، `buildingMaintenance`، `propertyFiles`،
`propertyCrm`، `propertyVisits`، `propertyFinance`، `propertyReports`،
`eduClasses`، `eduStudents`، `eduAttendance`، `eduTuition`، `eduFinance`،
`eduReports` و `cardToCard`. ماژول‌های
`businessCards`/`biolinks` هم در همین رجیستری ثبت شده‌اند و اکنون فعال/غیرفعال
شدنشان روی مسیرهای مالک اعمال می‌شود؛ سوئیچ‌های سراسری ادمین
(`allowBusinessCardCreation` و `allowBiolinkCreation`) همچنان بالاتر از آن
عمل می‌کنند.

### اقامتگاه و اجاره روزانه (`/api/accommodations`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET` | `/accommodations` | فهرست اقامتگاه‌های من. |
| `POST` | `/accommodations` | ثبت اقامتگاه (پیش‌نویس/منتشرشده). |
| `POST` | `/accommodations/ai-import/estimate` | برآورد هزینه‌ی «ورود خودکار اقامتگاه از جاباما» بدون فراخوانی هوش مصنوعی؛ بدنه `{ url }`، خروجی `{ estimatedTokens, pricePer1k, minPrice, price, sourceTitle }`. |
| `POST` | `/accommodations/ai-import` | ایمپورت اقامتگاه از لینک جاباما با هوش مصنوعی (پس از تأیید هزینه)؛ بدنه `{ url, status?, cityId?, propertyType? }`، خروجی `{ property, usage, cost, importId, images }`. هزینه از کیف پول کسر و در فاکتور ثبت می‌شود. فقط عکس‌های رسمی جاباما (CDN `cdn.jabama.com`) گرفته می‌شود. |
| `GET` | `/accommodations/:id` | جزئیات + عکس‌ها، رزروها و مسدودی‌ها. |
| `PATCH` | `/accommodations/:id` | ویرایش اقامتگاه. |
| `DELETE` | `/accommodations/:id` | حذف اقامتگاه. |
| `POST` | `/accommodations/:id/photos` | افزودن عکس (URL خروجی `POST /uploads/gallery`). |
| `DELETE` | `/accommodations/:id/photos/:photoId` | حذف عکس. |
| `GET` | `/accommodations/bookings` | همه‌ی رزروها (فیلتر `status`). |
| `GET` | `/accommodations/calendar` | نمای یکپارچه‌ی تقویم کسب‌وکار در بازه‌ی `from`/`to` (`YYYY-MM-DD`): فهرست اقامتگاه‌ها + رزروهای فعال + مسدودی‌ها (دستی و کانال) با شناسه‌ی اقامتگاه. |
| `GET` | `/accommodations/reports` | گزارش بازه‌ی `from`/`to`: درآمد، شب رزروشده، اشغال، ADR، RevPAR، تفکیک اقامتگاه/کانال (ناخالص/کمیسیون/خالص) و روند ماهانه. |
| `PATCH` | `/accommodations/bookings/:id/status` | تغییر وضعیت رزرو. |
| `PATCH` | `/accommodations/bookings/:id/cancel` | لغو رزرو و محاسبه‌ی `refundAmount` بر اساس `cancellationPolicy`/`cancellationDays` اقامتگاه؛ بازگشت پول با وضعیت `PENDING` ثبت می‌شود. |
| `GET/POST` | `/accommodations/bookings/:id/messages` | صندوق پیام مهمان: فهرست و ثبت پیام/یادداشت برای یک رزرو. |
| `PATCH` | `/accommodations/bookings/:id/deposit` | ثبت دستی وضعیت ودیعه. |
| `POST` | `/accommodations/:id/bookings` | ثبت دستی رزرو توسط مالک. |
| `GET/POST` | `/accommodations/:id/blocks` | فهرست/افزودن بازه‌ی مسدود. |
| `DELETE` | `/accommodations/:id/blocks/:blockId` | حذف بازه‌ی مسدود. |
| `GET/POST` | `/accommodations/:id/rates` | نرخ‌های فصلی/آخر هفته (`dayType`: ALL/WEEKEND/WEEKDAY/HOLIDAY). |
| `PATCH/DELETE` | `/accommodations/:id/rates/:rateId` | ویرایش/حذف نرخ. |
| `POST` | `/accommodations/:id/quote` | برآورد قیمت اقامت با نرخ‌ها، هزینه‌ی نظافت، مهمان اضافه و تخفیف اقامت بلندمدت. |
| `GET` | `/accommodations/:id/calendar.ics` | خروجی iCal تقویم (مسدودی‌ها + رزروها). |
| `GET/POST/PATCH/DELETE` | `/accommodation-channels` | مدیریت کانال‌های رزرو (OTA/شبکه‌ی اجتماعی/سایت مستقیم). |
| `POST` | `/accommodation-channels/:id/sync` | همگام‌سازی تقویم از فید iCal کانال. اگر `icalUrl` یک لینک صفحه‌ی جاباما (`.../stay/...`) باشد، تقویم مستقیماً از خود جاباما خوانده می‌شود (بدون فید خارجی). |
| `POST` | `/accommodation-channels/sync-all` | همگام‌سازی همه‌ی کانال‌های فعال دارای `icalUrl` و برگرداندن نتیجه‌ی هر کانال (`results[]`). یک جاب دوره‌ای هم هر ۳۰ دقیقه (قابل تنظیم با `ACCOMMODATION_SYNC_INTERVAL_MINUTES`) کانال‌های کهنه را خودکار همگام می‌کند. |
| `GET/POST/PATCH/DELETE` | `/crm/customers` | دفترچه‌ی مشتریان و تعامل‌ها. |
| `GET/PATCH` | `/admin/accommodations/settings` | تعرفه‌ی ایمپورت هوش مصنوعی (هزینه‌ی هر ۱۰۰۰ توکن، حداقل هزینه و حداقل تعداد تصویر). |

مسیرهای عمومی (بدون احراز هویت) زیر `/api/public/accommodations` هستند:
`GET /public/accommodations` (دایرکتوری `/stay`) که فیلترهای
`q`، `cityId`، `type`، `guests`، `minPrice`، `maxPrice`، `checkIn`، `checkOut` و `sort`
(`newest`/`price-asc`/`price-desc`) را می‌پذیرد، `GET /public/accommodations/filters`
برای گزینه‌های فیلتر (شهرها و نوع‌های دارای اقامتگاه)، صفحه‌ی عمومی یک اقامتگاه
(همراه کانال‌های فعال)، `GET /public/accommodations/:slug/calendar.ics` (فید iCal
برای OTA)،
`GET /public/accommodations/jabama/calendar?url=<jabama-stay-url>` (پیش‌نمایش
روزهای مسدود یک اقامتگاه جاباما) و
`GET /public/accommodations/jabama/calendar.ics?url=<jabama-stay-url>` (فید iCal
ساخته‌شده از تقویم جاباما برای درج در ایربی‌ان‌بی/OTA دیگر؛ جاباما خروجی iCal
عمومی ندارد و این فید از تقویم قابل‌مشاهده‌ی صفحه‌ی اقامتگاه ساخته می‌شود)،
`POST /public/accommodations/:slug/quote` (برآورد قیمت برای فرم رزرو)،
`POST /public/accommodations/:slug/bookings` برای ثبت درخواست رزرو و
`POST /public/accommodations/:slug/bookings/:id/deposit` برای پرداخت آنلاین
ودیعه (بازگشت درگاه: `/public/accommodations/deposits/callback`). این
مسیرها با سوئیچ سراسری `featureAccommodationRental` و صفحه‌ی عمومی `/stay`
با سوئیچ «نمایش» همان ویژگی کنترل می‌شوند. ایمپورت هوش مصنوعی سوئیچ جداگانه‌ی
`featureAccommodationAiImport` دارد.

### فروشگاه و خرده‌فروشی (`/api/retail`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/POST` | `/retail/products` | فهرست/ثبت محصول (جستجو با `q`). ثبت فقط پیش‌نویس (`DRAFT`) یا ارسال برای تأیید (`PENDING_REVIEW`) یا بایگانی (`ARCHIVED`) می‌پذیرد؛ انتشار مستقیم توسط فروشنده ممکن نیست. کد کالا (`sku`) به‌طور سیستمی و یکتا تولید می‌شود و `categoryId` باید از دسته‌بندی‌های فعالِ مدیر باشد. فیلدهای اختیاری `brand` و `specs` (آرایه‌ی `{name,value}`) برای نمایش برند و جدول مشخصات فنی. |
| `PATCH/DELETE` | `/retail/products/:id` | ویرایش/حذف محصول (با همان محدودیت وضعیت فروشنده). |
| `GET` | `/retail/products/meta` | داده‌های فرم ثبت محصول: دسته‌بندی‌های فعال و محدودیت تعداد/حجم تصاویر (`maxImages`، `maxImageKb`). |
| `POST` | `/retail/products/uploads` | آپلود تصویر محصول (multipart، فیلد `file`) با اعمال محدودیت حجم تعیین‌شده توسط مدیر؛ خروجی `{ url }`. |
| `POST` | `/retail/products/ai-import/estimate` | برآورد هزینه‌ی «ورود خودکار محصول از دیجی‌کالا» بدون فراخوانی هوش مصنوعی؛ بدنه `{ url }`، خروجی `{ estimatedTokens, pricePer1k, minPrice, price, sourceTitle }`. |
| `POST` | `/retail/products/ai-import` | ایمپورت محصول از لینک دیجی‌کالا با هوش مصنوعی (پس از تأیید هزینه)؛ بدنه `{ url, categoryId, price?, stock?, unit?, status? }`، خروجی `{ product, usage:{promptTokens,completionTokens,totalTokens}, cost, importId }`. هزینه از کیف پول کسر و در فاکتور ثبت می‌شود. فقط عکس‌های رسمی دیجی‌کالا (CDN `dkstatics`) گرفته می‌شود و حداقل تعداد عکس با تنظیم `aiMinImages` کنترل می‌شود. |
| `GET` | `/retail/orders` | صف سفارش‌ها (فیلتر `status`). |
| `GET/PATCH` | `/retail/orders/:id` | جزئیات/تغییر وضعیت سفارش و پرداخت. |
| `GET` | `/retail/inventory` | موجودی، هشدار کمبود و کاردکس انبار. |
| `POST` | `/retail/inventory/movements` | ثبت ورود/خروج/اصلاح موجودی. |
| `GET/PUT` | `/retail/shop-settings` | تنظیمات فروشگاه: شهر/محله‌های تحت پوشش، کرایه‌ی ثابت ارسال، دریافت حضوری، پشتیبانی و شرایط مرجوعی. |
| `GET` | `/retail/reports/overview` | داشبورد فروش: فروش خالص، سود سفارش، واریزی‌های تطبیق‌نیافته، کالای کم‌موجود و گزارش روزانه (۳۰ روز). |

مسیرهای عمومی زیر `/api/public/shops` (بدون احراز هویت):
`GET /public/shops/:slug` ویترین فروشگاه (محصولات منتشرشده + تنظیمات محدوده/تحویل
+ اطلاعات کارت به کارت در صورت فعال‌بودن ماژول)،
`GET /public/shops/:slug/products/:product` صفحه‌ی یک محصول منتشرشده همراه با
محصولات مرتبط و اطلاعات کارت به کارت، `POST /public/shops/:slug/orders`
برای ثبت سفارش (روش تحویل `SNAP`/`PICKUP`، اعتبارسنجی محله و کرایه) و
`GET /public/shops/:slug/orders/:token` برای پیگیری عمومی با لینک اختصاصی
(`trackingToken`) و خط زمانی وضعیت. دایرکتوری محصولات `/shop` از
`GET /public/products` (فیلترهای `q`، `shop`، `category`، `minPrice`،
`maxPrice` و `sort`) و `GET /public/products/facets` (دسته‌ها و فروشگاه‌های
دارای محصول منتشرشده) تغذیه می‌شود؛ این دایرکتوری فقط محصولات منتشرشده‌ی
فروشگاه‌هایی را نشان می‌دهد که ماژول `retailCatalog` آن‌ها فعال و پرداخت‌شده
است. هر فروشگاه با `publicSlug` یکتا (ستون `business_workspaces.publicSlug`)
شناسایی می‌شود و صفحه‌ی عمومی آن `/shop/<slug>` است. ماژول‌های `retailCatalog`
، `retailOrders` و `retailReports` با سوئیچ‌های
`featureRetailCatalog`/`featureRetailOrders`/`featureRetailReports` کنترل
می‌شوند و صفحه‌ی `/shop` با سوئیچ «نمایش» `featureRetailCatalog` پنهان
می‌شود. هر سفارش `paymentStatus` و `deliveryStatus` جدا دارد و در تأیید واریز
کارت‌به‌کارت، فاکتور فروش (`RETAIL_ORDER_PAYMENT`) و آمار مشتری به‌طور خودکار
ثبت می‌شود.

### مدیریت فروشگاه توسط مدیر (`/api/admin/retail`)

همه‌ی مسیرها فقط برای نقش `ADMIN` و با `@ApiBearerAuth`.

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/POST` | `/admin/retail/categories` | فهرست/افزودن دسته‌بندی محصول (فروشنده فقط از این‌ها انتخاب می‌کند). |
| `PATCH/DELETE` | `/admin/retail/categories/:id` | ویرایش (نام/فعال‌بودن) یا حذف دسته‌بندی. |
| `GET/PATCH` | `/admin/retail/settings` | تنظیم حداکثر تعداد تصویر (`maxImages` ۱–۲۰)، حداکثر حجم هر تصویر (`maxImageKb` ۶۴–۲۰۴۸۰ کیلوبایت)، تعرفه‌ی ایمپورت هوش مصنوعی (`aiPricePer1k`، `aiMinPrice` تومان)، حداقل تعداد عکس رسمی ایمپورت (`aiMinImages` ۱–۲۰) و سوئیچ‌های سراسری سفارش: `snapEnabled` (ارسال با پیک)، `pickupEnabled` (دریافت حضوری)، `cashOnDeliveryEnabled` (پرداخت در محل) و `cardToCardEnabled` (کارت به کارت). مقدار مؤثر هر روش در فروشگاه = تنظیم فروشگاه AND سوئیچ سراسری. |
| `GET` | `/admin/retail/products` | صف بررسی محصولات (فیلتر `status`، `q`، `take`). |
| `PATCH` | `/admin/retail/products/:id/review` | تأیید (`approve: true` → `PUBLISHED`) یا رد (`approve: false` + `reason`) محصول در وضعیت `PENDING_REVIEW`. |

### مدیریت ساختمان (`/api/buildings`, `/api/building-charges`, `/api/building-finance`, `/api/building-maintenance`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/POST` | `/buildings` | فهرست/ثبت ساختمان‌های تحت مدیریت. |
| `GET/PATCH/DELETE` | `/buildings/:id` | جزئیات (همراه واحدها)/ویرایش/حذف ساختمان. |
| `POST` | `/buildings/:id/units` | افزودن واحد (شماره، طبقه، متراژ، مالک/مستأجر، تاریخ سکونت). |
| `PATCH/DELETE` | `/buildings/:id/units/:unitId` | ویرایش/حذف واحد. |
| `GET/POST` | `/building-charges` | فهرست (فیلتر `buildingId`/`status`)/صدور شارژ برای یک واحد. |
| `POST` | `/building-charges/bulk` | صدور گروهی شارژ برای همه‌ی واحدهای فعال؛ سهم ثابت (`amountPerUnit`) یا بر اساس متراژ (`amountPerSqm`). |
| `GET` | `/building-charges/summary/:buildingId` | خلاصه‌ی مطالبات (کل، وصولی، مانده، تعداد پرداخت‌نشده/جزئی). |
| `PATCH/DELETE` | `/building-charges/:id` | ویرایش/حذف شارژ. |
| `GET/POST` | `/building-charges/payments` | فهرست رسیدها/ثبت پرداخت (تکرار `trackingNumber` با ۴۰۹ رد می‌شود). |
| `PATCH` | `/building-charges/payments/:id` | تأیید/رد رسید؛ با تأیید، `paidAmount` و وضعیت شارژ مرتبط بازمحاسبه می‌شود. |
| `GET` | `/building-finance/overview/:buildingId` | گردش مالی: مطالبات، وصولی، هزینه، مانده صندوق و هزینه به تفکیک دسته. |
| `GET/POST` | `/building-finance/expenses` | فهرست/ثبت هزینه‌ی ساختمان. |
| `DELETE` | `/building-finance/expenses/:id` | حذف هزینه. |
| `GET` | `/building-charges/reminders` | شارژهای سررسیدشده یا نزدیک سررسید (۷ روز) برای یادآوری. |
| `GET` | `/building-charges/export` | خروجی CSV شارژها (UTF-8 BOM، سازگار با اکسل). |
| `GET` | `/building-finance/export/payments` | خروجی CSV پرداخت‌ها (UTF-8 BOM، سازگار با اکسل). |
| `GET/POST` | `/buildings/:id/members` | فهرست/افزودن عضو با نقش (`MANAGER`/`ACCOUNTANT`/`RESIDENT`) بر اساس ایمیل کاربر. |
| `DELETE` | `/buildings/:id/members/:memberId` | حذف دسترسی عضو. |
| `POST` | `/buildings/:id/units/:unitId/resident-token` | ساخت/بازگرداندن توکن پنل ساکن برای واحد. |
| `GET/POST` | `/building-finance/:buildingId/budgets` | فهرست (فیلتر `year`)/افزودن ردیف بودجه‌ی سالانه. |
| `PATCH/DELETE` | `/building-finance/budgets/:id` | ویرایش/حذف ردیف بودجه. |
| `GET/POST` | `/building-finance/:buildingId/meetings` | فهرست/ثبت جلسه (زمان، محل، دستور جلسه). |
| `PATCH/DELETE` | `/building-finance/meetings/:id` | ویرایش صورت‌جلسه/وضعیت (`SCHEDULED`/`DONE`/`CANCELLED`)/حذف. |
| `GET/POST` | `/building-finance/:buildingId/contractors` | فهرست/افزودن پیمانکار (تخصص، تماس، یادداشت). |
| `PATCH/DELETE` | `/building-finance/contractors/:id` | ویرایش/حذف پیمانکار. |
| `GET/POST` | `/building-maintenance` | فهرست/ثبت خرابی و درخواست نگهداری (اولویت `LOW`/`NORMAL`/`HIGH`/`URGENT`). |
| `PATCH/DELETE` | `/building-maintenance/:id` | تغییر وضعیت/مسئول/هزینه (با `DONE` زمان رفع ثبت می‌شود)/حذف. |
| `GET` | `/public/buildings/resident/:token` | پنل عمومی ساکن (بدون احراز هویت): ساختمان، واحد، شارژها و پرداخت‌ها. |
| `POST` | `/public/buildings/resident/:token/payments` | ثبت رسید پرداخت توسط ساکن؛ تکرار `trackingNumber` با ۴۰۹ رد می‌شود. |

هر ساختمان حساب مستقل دارد و همه‌ی کوئری‌ها با دسترسی مالک/اعضای ساختمان
(`BuildingMember`) محدود می‌شوند.
رسید به‌تنهایی تسویه نیست؛ تا زمانی که ادمین رسید را تأیید نکند، شارژ
`UNPAID`/`PARTIAL` می‌ماند. ماژول‌ها با سوئیچ‌های `featureBuildingUnits`،
`featureBuildingCharges`، `featureBuildingFinance` و `featureBuildingMaintenance`
کنترل می‌شوند و بسته‌ی «مدیریت ساختمان» (`buildingManagement`) در کاتالوگ
مدیریت‌ها ثبت شده است.

### مشاورین املاک (`/api/property-files`, `/api/property-leads`, `/api/property-visits`, `/api/property-contracts`, `/api/property-cooperations`, `/api/property-audits`, `/api/property-reports`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/POST` | `/property-files` | فهرست (فیلتر `status`/`dealType`/`neighborhood`/`q`)/ثبت فایل ملکی (فروش/رهن/اجاره). |
| `GET/PATCH/DELETE` | `/property-files/:id` | جزئیات (بازدیدها و قراردادها)/ویرایش (شامل `verify` برای ثبت استعلام)/حذف. |
| `GET` | `/property-files/duplicates` | بررسی فایل تکراری با `ownerPhone`/`address` (و `excludeId`). |
| `POST` | `/property-files/:id/merge/:duplicateId` | ادغام فایل تکراری در فایل اصلی؛ بازدیدها و قراردادها منتقل و فایل تکراری بایگانی می‌شود. |
| `GET` | `/property-files/:id/matches` | تقاضاهای فعال متناسب با فایل. |
| `GET/POST` | `/property-leads` | فهرست/ثبت تقاضای خریدار یا مستأجر. |
| `GET/PATCH/DELETE` | `/property-leads/:id` | جزئیات/ویرایش (اقدام بعدی)/حذف تقاضا. |
| `GET` | `/property-leads/:id/matches` | فایل‌های فعال متناسب با تقاضا. |
| `GET/POST` | `/property-visits` | فهرست/هماهنگی بازدید. |
| `PATCH/DELETE` | `/property-visits/:id` | ثبت نتیجه/وضعیت/پیشنهاد قیمت یا حذف بازدید. |
| `GET/POST` | `/property-contracts` | فهرست/ثبت قرارداد و کمیسیون. |
| `PATCH/DELETE` | `/property-contracts/:id` | ویرایش وصولی/سهم دفتر-مشاور-معرف/وضعیت یا حذف. |
| `GET` | `/property-reports/overview` | داشبورد: فایل فعال/کهنه، تقاضای بی‌پیگیری، بازدید، نسبت تبدیل و کمیسیون به تفکیک مشاور/محله/منبع. |
| `GET` | `/property-files/:id/public-link` | وضعیت انتشار و توکن لینک عمومی آگهی. |
| `POST` | `/property-files/:id/publish` | انتشار عمومی آگهی و ساخت لینک اختصاصی (`/p/<token>`). |
| `POST` | `/property-files/:id/unpublish` | لغو انتشار عمومی آگهی. |
| `GET` | `/property-leads/waitlist` | فهرست انتظار تقاضاها (در انتظار فایل متناسب). |
| `PATCH` | `/property-leads/:id/waitlist` | افزودن/برداشتن تقاضا از فهرست انتظار (`onWaitlist`، `waitlistNote`). |
| `GET/POST` | `/property-cooperations` | فهرست (فیلتر `propertyId`)/ثبت همکاری بین مشاوران یا شعب با سهم (`PERCENT`/`FIXED`). |
| `PATCH/DELETE` | `/property-cooperations/:id` | ویرایش سهم/وضعیت یا حذف همکاری. |
| `GET` | `/property-audits` | سابقه‌ی دسترسی به اطلاعات حساس (مشاهده‌ی تماس مالک، انتشار، درخواست عمومی، همکاری). |
| `GET` | `/public/properties/:token` | (عمومی) آگهی منتشرشده بدون اطلاعات تماس/نشانی مالک؛ شمارنده‌ی بازدید را زیاد می‌کند. |
| `POST` | `/public/properties/:token/inquiry` | (عمومی) ثبت درخواست بازدید/تماس که به تقاضای مشتری با منبع `PUBLIC` تبدیل می‌شود. |

اطلاعات خصوصی مالک (`ownerPhone`، `address`، `internalNote`) جدا از خلاصه‌ی
قابل اشتراک نگهداری می‌شود و هر مشاهده‌ی آن در `property_audit_logs` ثبت
می‌گردد. انتشار عمومی با توکن تصادفی (`publicToken`) انجام می‌شود و اطلاعات
تماس مالک هرگز در آگهی عمومی نمایش داده نمی‌شود. مبالغ ملکی (قیمت/رهن/اجاره/کمیسیون) به‌صورت
`BigInt` ذخیره می‌شوند تا ارقام میلیاردی تومان جا شوند و در JSON به عدد
برگردانده می‌شوند. ماژول‌ها با سوئیچ‌های `featurePropertyFiles`،
`featurePropertyCrm`، `featurePropertyVisits`، `featurePropertyFinance` و
`featurePropertyReports` کنترل می‌شوند و بسته‌ی «مشاورین املاک» (`realEstate`)
در کاتالوگ مدیریت‌ها ثبت شده است.

### مربیان و آموزشگاه (`/api/edu-classes`, `/api/edu-students`, `/api/edu-enrollments`, `/api/edu-sessions`, `/api/edu-progress`, `/api/edu-tuition`, `/api/edu-finance`, `/api/edu-reports`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/POST` | `/edu-classes` | فهرست/تعریف کلاس (رشته، حالت، ظرفیت، مدت، شهریه‌ی بسته). |
| `GET/PATCH/DELETE` | `/edu-classes/:id` | جزئیات (ثبت‌نام‌ها و جلسات)/ویرایش/حذف کلاس. |
| `GET/POST` | `/edu-students` | فهرست/ثبت پرونده‌ی هنرجو (شامل ولی برای کم‌سن). |
| `GET/PATCH/DELETE` | `/edu-students/:id` | جزئیات (ثبت‌نام/پرداخت/پیشرفت)/ویرایش/حذف. |
| `GET/POST` | `/edu-enrollments` | فهرست/ثبت‌نام در کلاس با کنترل ظرفیت (۴۰۹ در صورت پر بودن). |
| `PATCH/DELETE` | `/edu-enrollments/:id` | ویرایش تخفیف/انقضا/وضعیت یا حذف. |
| `GET/POST` | `/edu-sessions` | فهرست/زمان‌بندی جلسه. |
| `PATCH/DELETE` | `/edu-sessions/:id` | جابه‌جایی/لغو/تغییر وضعیت یا حذف جلسه. |
| `GET/POST` | `/edu-sessions/:id/attendance` | فهرست ثبت‌نام‌ها و حضور جلسه/ثبت حضور یک هنرجو (بازمحاسبه‌ی اعتبار). |
| `GET/POST` | `/edu-progress` | یادداشت برنامه/پیشرفت یک ثبت‌نام. |
| `PATCH/DELETE` | `/edu-progress/:id` | ویرایش/حذف یادداشت پیشرفت. |
| `GET` | `/edu-tuition/balances` | مانده‌ی شهریه‌ی هر ثبت‌نام (شهریه، تخفیف، پرداخت‌شده، بدهی). |
| `GET/POST` | `/edu-tuition/payments` | فهرست/ثبت رسید شهریه (تکرار شماره پیگیری ۴۰۹). |
| `PATCH` | `/edu-tuition/payments/:id` | تأیید/رد رسید؛ با تأیید، `paidAmount` بازمحاسبه می‌شود. |
| `GET/POST` | `/edu-finance/expenses` | فهرست/ثبت هزینه‌ی کلاس. |
| `DELETE` | `/edu-finance/expenses/:id` | حذف هزینه. |
| `GET/POST` | `/edu-finance/settlements` | فهرست/ثبت تسویه‌ی مربی (ثابت/جلسه‌ای/درصدی). |
| `PATCH/DELETE` | `/edu-finance/settlements/:id` | تغییر وضعیت/مبلغ یا حذف تسویه. |
| `GET` | `/edu-reports/overview` | داشبورد: ظرفیت، نرخ حضور، مطالبات/وصولی، بسته‌ی رو به اتمام و سود هر کلاس. |
| `POST` | `/edu-students/:id/access-token` | ساخت/بازگرداندن توکن پنل هنرجو/ولی (`/student/<token>`). |
| `GET` | `/edu-sessions/reminders` | جلسات ۴۸ ساعت آینده برای یادآوری. |
| `POST` | `/edu-sessions/recurring` | زمان‌بندی تکرارشونده (تعداد/فاصله‌ی روز) با بررسی تداخل سالن (۴۰۹). |
| `GET/POST` | `/edu-enrollments/waitlist` | فهرست/افزودن به فهرست انتظار کلاس پر. |
| `PATCH/DELETE` | `/edu-enrollments/waitlist/:id` | تغییر وضعیت (`WAITING`/`OFFERED`/`ENROLLED`/`CANCELLED`) یا حذف. |
| `GET/POST` | `/edu-tuition/installments` | فهرست (فیلتر ثبت‌نام)/زمان‌بندی قسط شهریه. |
| `PATCH/DELETE` | `/edu-tuition/installments/:id` | ویرایش/علامت‌گذاری پرداخت (`PAID`) یا حذف قسط. |
| `GET` | `/edu-tuition/reminders` | اقساط سررسیدشده یا نزدیک سررسید (۷ روز). |
| `GET` | `/edu-tuition/export/payments` | خروجی CSV پرداخت‌های شهریه (UTF-8 BOM، سازگار با اکسل). |
| `GET` | `/edu-finance/export/expenses` | خروجی CSV هزینه‌های آموزشگاه (UTF-8 BOM، سازگار با اکسل). |
| `GET` | `/public/edu/student/:token` | (عمومی) پنل هنرجو/ولی: ثبت‌نام‌ها، جلسات پیش‌رو، اقساط، پرداخت‌ها و پیشرفت (بدون یادداشت خصوصی). |
| `POST` | `/public/edu/student/:token/payments` | (عمومی) ثبت رسید شهریه توسط هنرجو/ولی؛ تکرار `trackingNumber` با ۴۰۹ رد می‌شود. |

پرداخت شهریه و مصرف اعتبار جلسات جدا ثبت می‌شوند: تأیید رسید فقط
`paidAmount` را تغییر می‌دهد و حضور/غیبت با `consumesCredit` اعتبار بسته را
کم می‌کند. زمان‌بندی جلسه در صورت تداخل سالن (`location` کلاس) با ۴۰۹ رد
می‌شود. پنل عمومی هنرجو با توکن تصادفی (`accessToken`) کار می‌کند و یادداشت
خصوصی مربی (`privateNote`) هرگز نمایش داده نمی‌شود. مبالغ با `BigInt` ذخیره می‌شوند. ماژول‌ها با سوئیچ‌های
`featureEduClasses`، `featureEduStudents`، `featureEduAttendance`،
`featureEduTuition`، `featureEduFinance` و `featureEduReports` کنترل می‌شوند
و بسته‌ی «مربیان و آموزشگاه» (`education`) در کاتالوگ مدیریت‌ها ثبت شده است.

### پرداخت کارت به کارت (`/api/card-to-card`)

| متد | مسیر | توضیح |
| --- | --- | --- |
| `GET/PUT` | `/card-to-card/settings` | مشاهده/ثبت شماره کارت، صاحب کارت، بانک، شبا و توضیح واریز. |
| `GET` | `/card-to-card/payments` | صف رسیدهای دریافتی (فیلتر `status`). |
| `PATCH` | `/card-to-card/payments/:id` | تأیید/رد رسید (`{ status: 'APPROVED' \| 'REJECTED', reviewNote }`). |

مسیرهای عمومی (بدون احراز هویت):
`GET /public/card-to-card/:slug` اطلاعات کارت کسب‌وکار،
`POST /public/card-to-card/:slug/payments` ثبت رسید توسط مشتری، و
`POST /public/uploads/receipt` آپلود فایل رسید (تصویر یا PDF، حداکثر ۵ مگابایت).
با تأیید رسیدی که `referenceType` آن `ORDER` است، سفارش مرتبط
`paymentStatus=PAID` (و در صورت `PENDING` بودن، `status=CONFIRMED`) می‌شود؛
برای `referenceType=BOOKING` وضعیت ودیعه‌ی رزرو `PAID` ثبت می‌شود. ماژول با
سوئیچ `featureCardToCard` کنترل می‌شود.

## وظیفه‌ی دائمی ایجنت (قانون ۸)

هنگام **افزودن یا تغییر هر مسیر API**، ایجنت موظف است پیش از اعلام اتمام کار:

1. کنترلر/مسیر جدید را با `@ApiTags`، `@ApiOperation` و DTO مستندشده
   (`@ApiProperty`) بنویسد.
2. مطمئن شود مسیر در `GET /api/docs-json` دیده می‌شود و `summary` دارد.
3. این سند (`docs/API.md`) را در صورت تغییر قرارداد/آدرس به‌روز کند.
4. طبق قوانین ۱ و ۲، در `History-Agent.md` ثبت و نسخه را بالا ببرد.
