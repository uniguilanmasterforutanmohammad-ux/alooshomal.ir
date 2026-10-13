# هیستوری ایجنت (Agent History)

این فایل تمام تغییرات اعمال‌شده توسط ایجنت را به ترتیب زمانی ثبت می‌کند.
از این پس هر تغییر جدید در همین فایل ثبت می‌شود.

> **مرجع قوانین:** این قوانین در فایل ریشه‌ی `AGENTS.md` هم ثبت شده‌اند؛ آن فایل
> توسط Codex CLI به‌صورت خودکار بارگذاری می‌شود و دامنه‌اش کل مخزن است، پس این
> وظایف ایجنت را در هر اجرا به ایجنت تحمیل می‌کند. هر دو فایل باید هم‌سو بمانند.

> **قانون دائمی:** پس از اتمام و تست هر کار، ایجنت موظف است همان تغییر را
> (هدف، فایل‌های تغییریافته، و نحوه‌ی تأیید/تست) در همین فایل `History-Agent.md`
> ثبت کند. هیچ کاری بدون ثبت در این فایل تمام‌شده تلقی نمی‌شود.

> **قانون کامیت مرحله‌به‌مرحله (قانون ۷ در `AGENTS.md`):** اگر کاربر چند تسکِ
> متفاوت و نامرتبط را پشت‌سرهم داد، ایجنت پس از انجام و تست موفقِ هر تسک، همان را
> جداگانه کامیت و در همین فایل ثبت می‌کند و سپس به تسک بعدی می‌رود. انبوه‌کردنِ چند
> تسک نامرتبط در یک کامیت ممنوع است. push همچنان وظیفه‌ی کاربر است.

> **قانون نسخه‌دهی:** پروژه از نسخه‌دهی معنایی سه‌عددی (`vMAJOR.MINOR.PATCH`) استفاده
> می‌کند و منبع یکتای آن `apps/web/lib/version.ts` است (نمایش در فوتر پنل کاربری و
> صفحات عمومی). ایجنت پس از اتمام و تست هر تغییر، به‌طور خودکار و بر اساس حجم درخواست
> نسخه را بالا می‌برد: تغییرات بزرگ/شکستن‌ساز → `MAJOR`، قابلیت جدید → `MINOR`،
> اصلاح کوچک/استایل/متن → `PATCH`. نسخه‌ی فعلی: **v2.29.0**.

## ۱۴۰۵/۰۷/۲۲ — بازبینی امنیتی auth + محدودیت نرخ و سخت‌سازی — نسخه `v2.29.0`

**هدف:** رفع حفره‌های شناسایی‌شده در سیستم احراز هویت: نبود محدودیت نرخ (brute-force
رمز و سوءاستفاده‌ی پیامک)، نشت اطلاعات با زمان‌بندی پاسخ، و امکان تغییر رمز با یک نشست
دزدیده‌شده.

**تغییرات:**
- `apps/api/src/common/rate-limit.service.ts` (جدید): محدودکننده‌ی نرخ پنجره‌ی ثابت روی
  Redis با fallback حافظه‌ای + قواعد `RATE_LIMITS` (ورود ۱۰/۱۵د، OTP ۵/شماره و
  ۲۰/IP، تأیید OTP ۱۰، ثبت‌نام ۵/ساعت). `common.module.ts` آن را Global ارائه می‌کند.
- `apps/api/src/redis/redis.service.ts`: افزودن `incr` اتمیک با تنظیم TTL برای شمارنده‌ها.
- `apps/api/src/auth/auth.service.ts`: اعمال rate-limit در `login`/`requestPhoneCode`/
  `verifyPhoneCode`/`register`؛ و مقایسه‌ی bcrypt همیشه (با هش ساختگی
  `DUMMY_BCRYPT_HASH`) تا زمان پاسخ، وجود ایمیل را لو ندهد؛ الزام `currentPassword`
  هنگام تغییر رمز موجود.
- `apps/api/src/auth/dto/set-password.dto.ts`: افزودن فیلد اختیاری `currentPassword`.
- `apps/api/src/auth/auth.controller.ts`: پاس‌دادن IP به `requestPhoneCode` و
  `currentPassword` به `setPassword`.
- `apps/web/components/dashboard/ProfilePanel.tsx`: فیلد «رمز عبور فعلی» و اعتبارسنجی آن
  هنگام تغییر رمز؛ ارسال `currentPassword`.
- `docs/SECURITY.md` (جدید): خلاصه‌ی تصمیم‌های امنیتی (هش رمز/نمک، OTP، rate limit،
  توکن‌ها، کوکی نشست و ابطال). ارجاع در `README.md`.
- `docs/DEPLOY.md`: ثبت `JWT_EXPIRES_IN`.
- `BACKLOG.md`: ثبت مورد معوق «انتقال توکن SSE به کوکی/تیکت».
- `apps/web/lib/version.ts`: نسخه به `v2.29.0`.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- تست rate limit: ۱۰ تلاش ورود ناموفق سپس `429`؛ هفت درخواست OTP برای یک شماره →
  پس از حد مجاز `429`.
- تست زمان‌بندی: میانگین زمان ورود با ایمیل موجود (رمز غلط) و ایمیل ناموجود تقریباً
  یکسان (≈۰٫۳۸s).
- تست تغییر رمز: بدون `currentPassword` → `401`، با رمز فعلی غلط → `401`، با رمز صحیح
  → `200` و ورود با رمز جدید موفق.

## ۱۴۰۵/۰۷/۲۲ — سخت‌سازی توکن‌های JWT — نسخه `v2.28.1`

**هدف:** سیاست توکن‌ها استاندارد و ایمن شود: توکن دسترسی کوتاه‌عمر، کلیم‌های
`iss`/`aud` و الگوریتم ثابت، و اجبار secret قوی در پروداکشن.

**تغییرات:**
- `apps/api/src/auth/jwt.config.ts` (جدید): منبع یکتای سیاست JWT — `resolveJwtSecret`
  (در پروداکشن بدون secret قوی خطا می‌دهد و بالا نمی‌آید؛ در توسعه fallback هشداردار)،
  `jwtSignOptions` با `issuer`/`audience` و TTL پیش‌فرض `15m`، و ثابت‌های
  `JWT_ISSUER`/`JWT_AUDIENCE`.
- `apps/api/src/auth/auth.module.ts`: استفاده از `resolveJwtSecret`/`jwtSignOptions`.
- `apps/api/src/auth/strategies/jwt.strategy.ts`: اعتبارسنجی اجباری `issuer`/`audience`
  و محدودکردن الگوریتم به `HS256`.
- `docker-compose.yml`، `docker-compose.prod.yml`، `.env.example`، `apps/api/.env.example`،
  `.env`: `JWT_EXPIRES_IN` از `7d` به `15m` (توکن دسترسی کوتاه‌عمر؛ طول عمر نشست را
  رفرش‌توکن/کوکی تأمین می‌کند).
- `docs/DEPLOY.md`: مستندسازی `JWT_EXPIRES_IN` و تفاوت آن با عمر نشست.
- `apps/web/lib/version.ts`: نسخه به `v2.28.1`.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` بدون خطا.
- بررسی دیکد توکن: کلیم‌های `iss=alooshomal-api`، `aud=alooshomal-web`، `sid` و TTL
  دقیقاً ۱۵ دقیقه.
- تست منفی: توکن امضاشده با secret صحیح اما `aud` یا `iss` اشتباه → `401`.

## ۱۴۰۵/۰۷/۲۲ — کوکی امن نشست + انقضای بی‌فعالیتی ۷ روزه — نسخه `v2.28.0`

**هدف:** رفرش توکن دیگر در `localStorage` (قابل خواندن با XSS) نگه‌داری نشود و در کوکی
`HttpOnly` قرار بگیرد؛ همچنین نشست با ۷ روز بی‌فعالیتی خودکار بسته شود و تمدید آن با
چرخش توکن انجام گردد.

**تغییرات:**
- `apps/api/src/auth/refresh-cookie.ts` (جدید): سیاست کوکی — `HttpOnly`، `Secure` در
  پروداکشن، `SameSite=Lax`، `Path=/api/auth`، `Max-Age=7d` (پنجره‌ی idle) و پارسر
  سبک Cookie بدون وابستگی جدید.
- `apps/api/src/auth/auth.controller.ts`: تنظیم کوکی روی `register`/`login`/`phone/verify`
  و `refresh`؛ حذف `refreshToken` از بدنه‌ی پاسخ (`withRefreshCookie`)؛ پذیرش توکن از
  کوکی (با fallback بدنه برای کلاینت‌های غیرمرورگری) و پاک‌کردن کوکی در `logout`.
- `apps/api/src/auth/dto/refresh.dto.ts`: `refreshToken` اختیاری شد تا مرورگر فقط با
  کوکی رفرش کند.
- `apps/web/lib/api.ts`: حذف رفرش توکن از `localStorage`؛ رفرش با `credentials:'include'`
  و بدون توکن در بدنه؛ علامت‌گذاری نشست منقضی با رویداد سراسری.
- `apps/web/lib/auth.ts` و `AuthForm`/`login page`: حذف نگه‌داری `refreshToken` در state.
- `apps/web/components/ui/SessionWatcher.tsx` (جدید) + `app/layout.tsx`: شنونده‌ی
  رویداد انقضا و هدایت به `/login?next=...`.
- `apps/web/lib/version.ts`: نسخه به `v2.28.0`.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- curl: هدر `Set-Cookie: alooshomal_rt=…; Max-Age=604800; Path=/api/auth; HttpOnly;
  SameSite=Lax` تأیید شد؛ `refreshToken` در بدنه نیست؛ رفرش فقط با کوکی موفق و توکن
  چرخش می‌کند؛ `logout` کوکی را پاک می‌کند.
- Playwright: کوکی در مرورگر ذخیره می‌شود؛ با توکن دسترسی نامعتبر، پروفایل به‌صورت
  خودکار (بدون خطا) تمدید و بارگذاری شد؛ پس از خروج اجباری ادمین، مرورگر به
  `/login?next=/dashboard/profile` هدایت شد.

## ۱۴۰۵/۰۷/۲۲ — مدیریت نشست‌ها (کاربر و ادمین) — نسخه `v2.27.0`

**هدف:** هر ورود یک «نشست» سرورمحور با قابلیت مشاهده و ابطال باشد؛ کاربر بتواند از یک
دستگاه یا همه‌ی دستگاه‌ها خارج شود و مدیر هم بتواند نشست‌های یک کاربر را ببیند و
به‌اجبار ببندد.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `Session` (userId، refreshHash یکتا، userAgent،
  ip، lastUsedAt، expiresAt، revokedAt) + ایندکس‌ها و رابطه‌ی روی `User`.
- `apps/api/src/sessions/sessions.service.ts` (جدید): ساخت/چرخش/ابطال نشست، بررسی
  نشست فعال (revoked/absolute/idle)، heartbeat، پاک‌سازی رکوردهای کهنه و فهرست نشست‌ها
  با محاسبه‌ی وضعیت فعال و زمان انقضای idle.
- `apps/api/src/sessions/sessions.controller.ts` (جدید): `GET /sessions`،
  `DELETE /sessions/:id` و `DELETE /sessions` (خروج از سایر دستگاه‌ها).
- `apps/api/src/sessions/request-context.ts` (جدید): استخراج IP (با احترام به
  `x-forwarded-for`) و User-Agent برای ثبت روی نشست.
- `apps/api/src/sessions/sessions.module.ts` (جدید): ماژول Global نشست‌ها.
- `apps/api/src/auth/*`: توکن دسترسی اکنون `sid` دارد؛ `buildAuthResponse` یک نشست
  می‌سازد و `accessToken`/`refreshToken`/`sessionId` برمی‌گرداند؛ افزودن `refresh`
  (چرخش رفرش توکن)، `logout`، اندپوینت‌های `POST /auth/refresh` و `POST /auth/logout`
  و DTO مربوطه. `register`/`login`/`verifyPhone` با context دستگاه فراخوانی می‌شوند.
- `apps/api/src/auth/strategies/jwt.strategy.ts`: هر درخواست، وجود و اعتبار نشست را
  بررسی می‌کند (توکن بدون `sid` رد می‌شود) و heartbeat می‌زند؛ `sessionId` به کاربر
  جاری اضافه شد.
- `apps/api/src/admin/*`: `GET /admin/users/:id/sessions` و
  `DELETE /admin/users/:id/sessions` (خروج اجباری + اعلان). غیرفعال‌سازی حساب هم
  همه‌ی نشست‌های کاربر را باطل می‌کند.
- وب: `SessionsPanel.tsx` (جدید) در پروفایل؛ دکمه‌ی خروج اجباری در جدول کاربران ادمین؛
  ذخیره‌ی `refreshToken` و تمدید خودکار نشست در `lib/api.ts`/`lib/auth.ts`؛ فراخوانی
  `POST /auth/logout` هنگام خروج.
- `apps/web/lib/version.ts`: نسخه به `v2.27.0`.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- تست curl: ورود دوم از دستگاه دیگر → دو نشست؛ ابطال نشست دوم → توکن آن `401`؛
  «خروج از سایر دستگاه‌ها» → نشست فعلی سالم ماند؛ چرخش رفرش توکن و رد شدن توکن قبلی؛
  خروج ادمین → توکن کاربر `401`.
- تست UI با Playwright: نمایش «نشست‌های فعال» و دکمه‌های خروج در `/dashboard/profile`
  و دکمه‌ی خروج اجباری در `/admin?section=users`.

## ۱۴۰۵/۰۷/۲۲ — حذف بازخوانی کد OTP از حافظه هنگام سلامت Redis — نسخه `v2.26.1`

**هدف:** در `OtpService` نسخه‌ی حافظه‌ای (fallback) حتی وقتی Redis سالم بود خوانده
می‌شد، پس پاک‌کردن Redis (flush یا حذف کلید توسط اپراتور) کد را واقعاً باطل نمی‌کرد و
کد مصرف‌شده قابل بازپخش بود. حالا در زمان سلامت Redis، فقط Redis منبع حقیقت است.

**تغییرات:**
- `apps/api/src/auth/otp.service.ts`: در `read` و `recentlyIssued`، اگر
  `redis.isReady` باشد و رکورد در Redis نباشد، دیگر به `memory` رجوع نمی‌شود
  (حافظه صرفاً fallback زمان قطعی است). افزودن `pruneMemory` برای پاک‌کردن ورودی‌های
  منقضی و محدودکردن حجم حافظه به `MEMORY_MAX_ENTRIES`؛ توضیح کلاس و کامنت write
  به‌روز شد.
- `apps/web/lib/version.ts`: نسخه به `v2.26.1` ارتقا یافت.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` بدون خطا.
- سناریوی ۱ (Redis سالم): ارسال کد → `flushall` → تأیید کد **ناموفق** («کد منقضی شده
  است؛ دوباره درخواست کنید») و ارسال مجدد بلافاصله **موفق** (کول‌داون هم پاک شد).
- سناریوی ۲ (قطعی Redis): `docker stop` روی Redis → ارسال و تأیید کد با fallback
  حافظه‌ای **موفق** → `docker start` و بازگشت اتصال.

## ۱۴۰۵/۰۷/۲۲ — تغییر موبایل/ایمیل پس از تأیید کد به تأیید مدیر ارجاع می‌شود — نسخه `v2.26.0`

**هدف:** طبق درخواست کاربر، تغییر شماره موبایل یا ایمیل پس از واردکردن کد یکبارمصرف
**بلافاصله اعمال نشود**؛ ابتدا برای «تأیید مدیر» ثبت شود و تنها پس از تأیید ادمین روی
حساب اعمال گردد (هم‌راستا با فرایند تغییر نام).

**تغییرات:**
- `apps/api/src/profile/profile.service.ts`: `ALLOWED_FIELDS` به `['fullName','phone','email']`
  گسترش یافت. `verifyPhoneChange`/`verifyEmailChange` دیگر مقدار را در `User` نمی‌نویسند و
  به‌جای آن با `fileChangeRequest` یک درخواست `PENDING` ثبت می‌کنند (پاسخ `applied: false`).
  `fileChangeRequest` اگر درخواست بازی وجود داشته باشد آن را **ادغام** می‌کند تا صف مدیر
  بدون نیاز به ردکردن درخواست قبلی، حداکثر یک درخواست باز برای هر کاربر داشته باشد؛
  `requestChange` (نام) هم از همین مسیر عبور می‌کند.
  در `decide` هنگام تأیید، یکتایی شماره/ایمیل دوباره بررسی می‌شود، `phoneVerified` برای
  شماره‌ی تأییدشده ست می‌شود، برچسب‌های تغییر (نام/شماره/ایمیل) ساخته می‌شود و اعلان
  کاربر + اعلان امنیتی مدیر با دسته‌ی `SECURITY` ارسال می‌گردد. اکشن‌های فعالیت جدید:
  `PROFILE_PHONE_CHANGE_REQUESTED` و `PROFILE_EMAIL_CHANGE_REQUESTED`.
- `apps/web/components/dashboard/ContactChangePanel.tsx`: پراپ `pendingValue` برای نمایش
  پیام «تأیید کد شد و پس از تأیید مدیر اعمال می‌شود»؛ حذف `setUser` بعد از تأیید (چون مقدار
  هنوز عوض نشده) و اصلاح متن راهنما.
- `apps/web/components/dashboard/ProfilePanel.tsx`: نوع `changes` شامل `phone`/`email` شد،
  `pendingValue` به دو پنل تماس پاس داده می‌شود و بنر «تغییر نام» فقط وقتی فیلد نام در
  درخواست باز باشد نمایش داده می‌شود.
- `apps/web/components/admin/AdminProfileRequests.tsx`: نمایش همه‌ی فیلدهای درخواست
  (نام/شماره/ایمیل) با برچسب فارسی و مقدار `dir="ltr"`.
- `apps/web/components/admin/ActivityLogPanel.tsx`: برچسب فارسی برای اکشن‌های
  `PROFILE_PHONE_CHANGE_REQUESTED` و `PROFILE_EMAIL_CHANGE_REQUESTED`.
- `apps/web/lib/version.ts`: نسخه به `v2.26.0` ارتقا یافت.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- تست E2E با curl روی `localhost:3001`: ثبت‌نام موبایلی → درخواست تغییر شماره → تأیید کد
  (پاسخ `applied:false`) → پروفایل همچنان شماره‌ی قبلی را نشان داد و `pendingChange.changes.phone`
  ثبت شد → تأیید ادمین (`PATCH /admin/profile-requests/:id`) → شماره اعمال شد. همین مسیر
  برای ایمیل هم بررسی شد. همچنین ثبت درخواست نام و سپس شماره، در **یک** درخواست باز ادغام شد.
- تست UI با Playwright روی `localhost:3000`: بنر «پس از تأیید مدیر اعمال می‌شود» در پروفایل،
  نمایش شماره‌ی قبلی بدون تغییر، و نمایش درخواست با برچسب «شماره موبایل جدید» در
  `/admin?section=users` تأیید شد.

## ۱۴۰۵/۰۷/۲۱ — اعلان امنیتی تغییر شماره/ایمیل + همگام‌سازی نشست — نسخه `v2.25.0`

**هدف:** پس از تغییر تأییدشده‌ی شماره موبایل یا ایمیل در پروفایل، کاربر و تیم مدیر
از این رخداد باخبر شوند (اعلان درون‌برنامه‌ای)، و نشستِ ذخیره‌شده‌ی کاربر بدون نیاز به
ورود مجدد مقدار جدید را نشان دهد.

**تغییرات:**
- `apps/api/src/profile/profile.service.ts`: پس از تغییر موفق شماره/ایمیل،
  `notifications.notify` برای خود کاربر (نوع `SUCCESS`، با ذکر مقدار قبلی در ایمیل) و
  `notifications.notifyAdmins` با دسته‌ی جدید `SECURITY` (نوع `WARNING`) ارسال می‌شود؛
  لینک اعلان مدیر به `/admin?section=reports` (جدول گزارش‌های سیستم) اصلاح شد.
- `apps/api/src/settings/settings.service.ts`: افزودن دسته‌ی `SECURITY` به
  `ADMIN_NOTIFY_CATEGORIES` (پیش‌فرض روشن و قابل خاموش‌کردن از پنل مدیر).
- `apps/web/components/admin/AdminNotificationSettings.tsx`: افزودن کلید
  «رویدادهای امنیتی» به فهرست تنظیمات اعلان مدیر.
- `apps/web/components/admin/ActivityLogPanel.tsx`: برچسب‌های فارسی برای اکشن‌های
  `PROFILE_PHONE_CHANGED`/`PROFILE_EMAIL_CHANGED`/`PROFILE_CHANGE_*`/`USER_PASSWORD_SET`.
- `apps/web/lib/auth.ts`: افزودن `setUser` به استور احراز هویت برای به‌روزرسانی کاربرِ
  کش‌شده.
- `apps/web/components/dashboard/ContactChangePanel.tsx`: پس از تأیید موفق، کاربرِ
  نشست را با مقدار جدید (شماره/ایمیل) به‌روزرسانی می‌کند تا هدر/پروفایل بی‌درنگ درست شود.
- `apps/web/lib/version.ts`: نسخه به `v2.25.0` (MINOR — افزودن قابلیت اعلان).

**تأیید/تست:**
- `tsc --noEmit` روی هر دو اپ بدون خطا.
- تست زنده‌ی API: پس از تغییر شماره و ایمیل، `GET /notifications/mine` دو اعلان کاربر
  («شماره موبایل تغییر کرد»، «ایمیل تغییر کرد» با ایمیل قبلی) را برگرداند و جدول
  `notifications` دو اعلان مدیر با دسته‌ی `SECURITY` ثبت کرد.
- تنظیمات مدیر: کلید `notifyAdmin.SECURITY` پس از مایگریشن/boot به‌صورت پیش‌فرض `true`
  ساخته شد؛ در UI کلید «رویدادهای امنیتی» نمایش داده شد و تغییر آن ذخیره شد (سپس به
  `true` بازگردانده شد).
- تست UI با Playwright: پس از تغییر شماره، مقدار جدید هم در پروفایل و هم در خط نشست
  دیده شد و صفحه‌ی `/dashboard/notifications` اعلان «شماره موبایل تغییر کرد» را نشان داد.
- داده‌های تستی (کاربران، اعلان‌ها) و کلیدهای OTP پاک شدند؛ `sync_install.py --check`
  بدون تغییر معلق.

## ۱۴۰۵/۰۷/۲۱ — تغییر تأییدشده‌ی شماره موبایل و ایمیل در پروفایل — نسخه `v2.24.0`

**هدف:** در `/dashboard/profile` امکان تغییر شماره موبایل و ایمیل اضافه شود؛ تغییر شماره
با ارسال کد یکبار مصرف به **شماره‌ی جدید** و تغییر ایمیل با ارسال کد به **شماره موبایل
فعلی** تأیید شود.

**تغییرات:**
- `apps/api/src/auth/otp.service.ts`: کدهای OTP حالا «هدف‌دار» (purposeful) شدند
  (`login` / `phone-change` / `email-change`) با فضای کلید جدا. به این ترتیب کد ورودِ
  صادرشده هرگز برای تغییر شماره/ایمیل قابل استفاده نیست. امضای `issue`/`verify` یک
  آرگومان اختیاری `purpose` گرفت (پیش‌فرض `login`).
- `apps/api/src/profile/profile.service.ts`: متدهای جدید `requestPhoneChange`/
  `verifyPhoneChange` (نرمال‌سازی شماره، رد تکراری‌بودن، ارسال و تأیید OTP، ثبت
  فعالیت) و `requestEmailChange`/`verifyEmailChange` (اعتبارسنجی یکتایی ایمیل، ارسال کد
  به شماره‌ی فعلی، تأیید و ثبت). هر دو به توگل `authPhoneLoginEnabled` وابسته‌اند.
- `apps/api/src/profile/dto/profile.dto.ts`: `RequestContactOtpDto` و
  `VerifyContactChangeDto`.
- `apps/api/src/profile/profile.controller.ts`: روت‌های
  `POST /profile/phone/request-code`، `POST /profile/phone/verify`،
  `POST /profile/email/request-code`، `POST /profile/email/verify`.
- `apps/api/src/profile/profile.module.ts` و `apps/api/src/auth/auth.module.ts`:
  واردکردن/صادرکردن `OtpService` و `SettingsService` برای استفاده در پروفایل.
- `apps/web/components/dashboard/ContactChangePanel.tsx` (جدید): کارت دومرحله‌ای
  «ارسال کد → تأیید» برای موبایل و ایمیل، با نمایش کد توسعه در لوکال.
- `apps/web/components/dashboard/ProfilePanel.tsx`: افزودن دو کارت تغییر شماره و تغییر
  ایمیل (ایمیل وقتی شماره ثبت نشده باشد غیرفعال است) و رفرش پروفایل پس از تغییر.
- `apps/web/lib/version.ts`: نسخه به `v2.24.0` (MINOR — افزودن قابلیت).

**تأیید/تست:**
- `tsc --noEmit` روی هر دو اپ (`apps/api`, `apps/web`) بدون خطا؛ hot-reload کانتینرهای
  dev مسیرهای جدید را ثبت کرد.
- تست زنده‌ی API روی `localhost:3001`:
  - تغییر شماره: `request-code` به شماره‌ی جدید → کد اشتباه رد شد → کد درست ثبت شد و
    شماره عوض شد.
  - تغییر ایمیل: `request-code` کد را به شماره‌ی فعلی فرستاد (`sentTo`)، کد اشتباه رد
    شد، کد درست ایمیل را عوض کرد؛ ایمیل تکراری/همان ایمیل فعلی خطای مناسب داد.
  - جداسازی purpose: کد صادرشده برای ورود قابل استفاده در تغییر شماره/ایمیل نیست.
- تست UI با Playwright روی `localhost:3000`: هر دو کارت رندر شدند و جریان کامل
  «ارسال کد → ورود کد → ثبت» برای موبایل و ایمیل تا نمایش مقدار جدید موفق بود.
- داده‌های تستی (کاربران `0912111*`/`contact*`) و کلیدهای OTP پاک شدند؛
  `sync_install.py --check` بدون تغییر معلق.

## ۱۴۰۵/۰۷/۲۱ — مستندسازی جریان کار لوکال و پروداکشن (hot-reload و rebuild) — نسخه `v2.23.0` (بدون تغییر کد)

**هدف:** ثبت مکتوب توضیحات و دستورهای اجرای لوکال/پروداکشن و اینکه بعد از هر تغییر،
چه زمانی به بازسازی (rebuild) کانتینر نیاز هست و چه زمانی نه — تا از این پس به‌جای
ساخت دستی کانتینر، حالت توسعه‌ی پیش‌فرض پروژه استفاده شود.

**تغییرات:**
- `docs/DEVELOPMENT.md` (جدید): راهنمای کامل فارسی شامل اجرای لوکال با
  `npm run dev` (bind-mount + watch/HMR)، جدول «چه زمانی rebuild لازم است»، تازه‌سازی
  volumeهای وابستگی، دستورهای پرکاربرد، مشکلات رایج، و مقایسه‌ی لوکال/پروداکشن.
- `README.md`: بخش «Development mode» به `npm run dev` تغییر کرد و توضیح hot-reload +
  ارجاع به `docs/DEVELOPMENT.md` اضافه شد.
- `docs/DEPLOY.md`: بخش جدید «۵) تفاوت با محیط لوکال» با جدول مقایسه و ارجاع متقابل
  به `docs/DEVELOPMENT.md`.

**تأیید/تست:**
- وضعیت واقعی لوکال بررسی شد: هر دو کانتینر با
  `docker-compose.yml` + `docker-compose.dev.yml` بالا هستند، `apps/api`/`apps/web`
  bind-mount شده‌اند، API با `nest start --watch` و Web با `next dev` اجرا می‌شوند
  و تغییر فایل روی هاست داخل کانتینر دیده می‌شود.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check` بدون تغییر
  معلق (فایل جدید در `install.sh` جاسازی شد).
- بازبینی شد که فایل‌های ابزارِ `next dev` (`apps/web/tsconfig.json`،
  `apps/web/next-env.d.ts`) روی درخت تمیز نمانند و کامیت نشوند.

**نکته:** فقط مستندات تغییر کرده و کدی دست نخورده؛ بنابراین نسخه ثابت ماند و فایل
`apps/web/lib/version.ts` افزایش نیافت.

## ۱۴۰۵/۰۷/۲۱ — یکپارچه‌سازی ورود/ثبت‌نام با موبایل + ثبت رمز عبور — نسخه `v2.23.0`

**هدف:** تبدیل صفحه‌ی ورود و ثبت‌نام به یک صفحه‌ی واحد و هوشمند: کاربر شماره موبایل
می‌دهد، اگر قبلاً ثبت‌نام کرده باشد فقط با کد یکبار مصرف وارد می‌شود و اگر شماره جدید
باشد در همان صفحه نام و ایمیل را می‌گیرد. بلافاصله بعد از ثبت‌نام، مرحله‌ی اختیاری «ثبت
رمز عبور» نمایش داده می‌شود (با گزینه‌ی «بعداً»)، و هر دکمه‌ای که نیاز به ورود دارد
کاربر مهمان را به همین صفحه هدایت می‌کند.

**تغییرات:**
- `apps/api/src/auth/auth.service.ts`: `requestPhoneCode` حالا `registered: boolean`
  برمی‌گرداند (کاربر تکراری/جدید)؛ `verifyPhoneCode` برای شماره‌ی جدید علاوه بر نام،
  «ایمیل» هم می‌خواهد (کدهای `EMAIL_REQUIRED`/`EMAIL_TAKEN` قبل از مصرف OTP بررسی
  می‌شوند تا کد نسوزد) و ایمیل را روی حساب ذخیره می‌کند؛ متد جدید `setPassword`
  (هش bcrypt + ثبت فعالیت).
- `apps/api/src/auth/auth.controller.ts`: روت جدید `POST /auth/set-password`
  (احراز هویت‌شده) و `apps/api/src/auth/dto/set-password.dto.ts` (جدید).
- `apps/api/src/auth/dto/verify-phone.dto.ts`: افزودن فیلد اختیاری `email`.
- `apps/api/src/profile/profile.service.ts`: افزودن `hasPassword` (بدون افشای هش) به
  پاسخ `GET /profile/me`.
- `apps/web/components/auth/AuthForm.tsx` (جدید، جایگزین `PhoneAuthForm.tsx`): جریان
  سه‌مرحله‌ای موبایل → کد (+فیلدهای نام/ایمیل برای کاربر جدید) → ثبت رمز عبور با
  گزینه‌ی «بعداً»، همراه با دکمه‌ی «ورود با ایمیل و رمز عبور».
- `apps/web/app/(auth)/login/page.tsx`: صفحه‌ی واحد ورود/ثبت‌نام با دو تب «موبایل و کد»
  و «ایمیل و رمز عبور»، احترام به `?next=` و بازگشت امن به مسیر قبلی.
- `apps/web/app/(auth)/register/page.tsx`: فقط به `/login` ریدایرکت می‌کند (حفظ `?next=`).
- `apps/web/components/dashboard/ProfilePanel.tsx`: بخش «ثبت رمز عبور / تغییر رمز عبور»
  برای حساب‌های موبایلی که هنوز رمز ندارند.
- دکمه‌های نیازمند ورود: `Header.tsx` («شروع کنید» → `/login`)، `app/page.tsx`
  («ساخت بیولینک رایگان» → `/login`)، و `LikeButton.tsx`/`SaveButton.tsx`
  (ریدایرکت به `/login?next=<مسیر فعلی>`).
- `apps/web/lib/version.ts`: نسخه به `v2.23.0` (MINOR — افزودن قابلیت).

**تأیید/تست:**
- `tsc --noEmit` روی هر دو اپ (`apps/api`, `apps/web`) بدون خطا.
- تست زنده‌ی API روی `localhost:3001`:
  - شماره‌ی تکراری → `registered:true`؛ شماره‌ی جدید → `registered:false`.
  - ثبت‌نام جدید: `verify` بدون فیلد → `FULLNAME_REQUIRED`، با نام → `EMAIL_REQUIRED`،
    با ایمیل تکراری → `EMAIL_TAKEN`، و با داده‌ی درست → توکن + `isNewUser:true`.
  - `POST /auth/set-password` با توکن → `{ok:true}` و سپس ورود با ایمیل و همان رمز
    موفق بود؛ `GET /profile/me` مقدار `hasPassword:true` را برگرداند.
- تست UI با Next dev (پورت ۳۰۰۰) و Playwright:
  - `/register` → ریدایرکت به `/login`؛ هر دو تب دیده شد.
  - «شروع کنید» → `/login`؛ کلیک روی لایک مهمان → `/login?next=%2Fbiolinks`.
  - جریان کامل: شماره → کد + فیلدهای نام/ایمیل → تأیید → مرحله‌ی رمز با ایمیل از پیش
    پرشده → ثبت رمز → `/dashboard`؛ مسیر «بعداً» هم به `/dashboard` رسید و در
    `/dashboard/profile` گزینه‌ی «ثبت رمز عبور» نمایش داده شد.
- داده‌های تستی (کاربران `0912111*`) و کلیدهای OTP پاک شدند؛ `sync_install.py --check`
  بدون تغییر معلق.

**نکته:** `/register` هنوز به‌عنوان مسیر وجود دارد (فقط ریدایرکت) تا لینک‌های قدیمی
نشکنند؛ می‌توان در آینده حذفش کرد.

## ۱۴۰۵/۰۷/۲۱ — فعال‌سازی پیامک واقعی OTP روی سرور تولید (ملی‌پیامک) — نسخه `v2.22.1` (بدون تغییر کد)

**هدف:** کاربر مسیر OTP ملی‌پیامک را در اختیار گذاشت
(`https://console.melipayamak.com/api/send/otp/18ab83118e8740d3b2ee9aa59bf1a6e2`، متد POST،
بدنه `{"to":"0912…"}`). هدف، فعال‌کردن پیامک واقعی روی `alooshomal.ir` و حذف کامل حالت
توسعه روی سرور بود.

**تغییرات:**
- هیچ فایل کدی تغییر نکرد. فقط متغیر محیطی روی سرور تنظیم شد:
  `/var/www/alooshomal.ir/.env` → `MELIPAYAMAK_OTP_PATH=/api/send/otp/18ab83118e8740d3b2ee9aa59bf1a6e2`
  (پیش از ویرایش، نسخه‌ی پشتیبان `.env.bak.*` گرفته شد) و کانتینر `api` با
  `docker compose -f docker-compose.prod.yml up -d api` بازراه‌اندازی شد.

**تأیید/تست:**
- اندپوینت ملی‌پیامک مستقیماً تست شد: با بدنه‌ی نامعتبر `{"phone":...}` خطای
  `to is required` (۴۰۰) و با `{"to":"09117818389"}` پاسخ `{"code":"88865","status":"عملیات موفق"}`
  — یعنی قرارداد `to` تأیید و یک پیامک واقعی ارسال شد.
- `docker exec alooshomal-api printenv MELIPAYAMAK_OTP_PATH NODE_ENV` →
  مسیر ست‌شده و `NODE_ENV=production`.
- تست زنده روی دامنه: `POST /api/auth/phone/request-code` با شماره‌ی `09117818389` →
  `{"sent":true}` و **بدون** `devCode` (پیامک واقعی رفت).
- تأیید عدم‌افشا: `POST /api/auth/phone/verify` با کد غلط `000000` → خطای
  «کد وارد‌شده صحیح نیست» (کد `123456` دیگر معتبر نیست).
- تست UI با Playwright روی `https://alooshomal.ir/login`: با شماره‌ی تستی `09120000077`
  پیام «حالت توسعه» نمایش داده نشد، `123456` دیده نشد و مرحله‌ی کد (منتظر پیامک واقعی)
  ظاهر شد.

**نتیجه:** ورود/ثبت‌نام با موبایل روی سرور اصلی الان واقعاً پیامک می‌فرستد و کد توسعه فقط
در محیط لوکال باقی می‌ماند. نکته: این فعال‌سازی روی سرور انجام شده، ولی کد اصلاح‌شده‌ی
`v2.22.1` (که در نبود مسیر در پروداکشن خطای ۵۰۳ می‌دهد) هنوز روی سرور مستقر نشده است؛
پس از push توسط کاربر و اجرای ورک‌فلوی deploy اعمال می‌شود.

## ۱۴۰۵/۰۷/۲۱ — رفع نمایش کد توسعه (123456) روی سرور اصلی — نسخه `v2.22.1`

**هدف:** کاربر گزارش داد روی دامنه‌ی اصلی (`alooshomal.ir`) هنگام ثبت‌نام/ورود با موبایل
پیام «حالت توسعه: پیامک ارسال نشد — کد شما 123456» نمایش داده می‌شود. این پیام و کد ثابت
قرار بود فقط در لوکال باشد، نه روی سرور اصلی.

**ریشه‌ی مشکل:** در `OtpService.issue()`، مسیر «dev bypass» فقط با خالی‌بودن
`MELIPAYAMAK_OTP_PATH` فعال می‌شد و به `NODE_ENV` کاری نداشت. چون روی سرور این متغیر خالی
بود، سرور پروداکشن هم دقیقاً مثل لوکال کد ثابت `123456` را می‌ساخت، در لاگ می‌نوشت و در
پاسخ API (`devCode`) برمی‌گرداند — یعنی هم پیام «حالت توسعه» روی UI می‌آمد و هم ورود با
هر شماره و کد `123456` ممکن بود.

**تغییرات:**
- `apps/api/src/auth/otp.service.ts`: افزودن فلگ `isDev` بر اساس
  `process.env.NODE_ENV !== 'production'`. مسیر dev bypass فقط وقتی مجاز است که `isDev`
  باشد؛ در پروداکشن اگر `MELIPAYAMAK_OTP_PATH` خالی (یا پاسخ ملی‌پیامک بدون کد) باشد،
  به‌جای کد ثابت، خطای `ServiceUnavailableException` (کد ۵۰۳) برمی‌گردد و هیچ `devCode`ای
  در پاسخ نمی‌آید. (حذف `randomInt` بلااستفاده.)
- `docker-compose.yml` و `docker-compose.prod.yml`: به‌روزرسانی کامنت توضیحی که خالی‌بودن
  مسیر در پروداکشن را «dev bypass» معرفی می‌کرد.
- `.env.example` و `docs/DEPLOY.md`: مستندسازی صریح تفاوت لوکال و پروداکشن و اینکه روی
  سرور ست‌کردن `MELIPAYAMAK_OTP_PATH` اجباری است.
- `apps/web/lib/version.ts`: نسخه به `v2.22.1` (PATCH — رفع باگ امنیتی).

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/api` بدون خطا و `nest build` موفق.
- تست واحد مستقیم روی `OtpService` با `Redis`/`SmsService` جعلی:
  `NODE_ENV=production` → `ServiceUnavailableException` (۵۰۳، بدون `devCode`)؛
  `NODE_ENV=development` → همان کد توسعه `123456` (بدون تغییر رفتار لوکال).
- تست HTTP واقعی با اجرای یک نسخه‌ی موازی API در حالت `NODE_ENV=production` روی پورت
  داخلی ۴۰۹۹: `POST /api/auth/phone/request-code` پاسخ `503`
  «ارسال پیامک در حال حاضر در دسترس نیست» و لاگ خطای مربوطه را داد (بدون `devCode`).
- تست لوکال `http://localhost:3001` پس از تغییر همچنان `devCode: "123456"` برمی‌گرداند.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check` بدون تغییر
  معلق.

**اقدام باقی‌مانده برای کاربر (برای اینکه ورود با موبایل روی سرور کار کند):** مقدار
`MELIPAYAMAK_OTP_PATH` باید در `.env` سرور ست شود؛ تا آن زمان ورود با موبایل روی سرور با
خطای ۵۰۳ غیرفعال است (نه اینکه کد توسعه نمایش دهد). پس از ست‌کردن، تصویر جدید را
`pull`/`up -d` کنید.

## ۱۴۰۵/۰۷/۲۱ — بررسی زنده‌ی OTP و ورود با موبایل روی سرور تولید — نسخه `v2.22.0` (بدون تغییر کد)

**هدف:** راستی‌آزمایی قابلیت ورود/ثبت‌نام با موبایل و کد یکبار مصرف (نسخه `v2.22.0`) روی
سرور تولید `alooshomal.ir` — همان محیطی که کاربر باید روی آن تست کند — و مشخص‌کردن
اینکه چه چیزی روی سرور کار می‌کند و چه چیزی هنوز تنظیم نشده است.

**تغییرات:**
- هیچ فایل کدی تغییر نکرد. این ورودی فقط سند نتیجه‌ی بررسی است (سرور دست‌نخورده ماند و
  داده‌های تستی پس از بررسی پاک شدند).

**تأیید/تست:**
- دسترسی و وضعیت سرور: `ssh root@95.38.186.227`؛ هر شش کانتینر (`web`/`api`/`minio`/
  `redis`/`nginx`/`db`) بالا و سالم‌اند و کد روی سرور همان `v2.22.0` است (فوتر سایت).
- کد روی سرور: `docker logs alooshomal-api` روت‌های `/api/auth/phone/request-code` و
  `/api/auth/phone/verify` را ثبت کرده و اندپوینت `GET /api/settings/public` مقدار
  `phoneLoginEnabled: true` برمی‌گرداند.
- تست زنده‌ی API روی `https://alooshomal.ir/api`:
  - `request-code` → کد صادر شد؛ `verify` بدون نام → خطای `FULLNAME_REQUIRED`؛ `verify`
    با نام → توکن با `isNewUser: true`؛ سپس ورود دوباره‌ی همان شماره → `isNewUser: false`.
  - کد اشتباه → «کد وارد‌شده صحیح نیست»؛ درخواست مجدد داخل cooldown → خطای cooldown؛
    شماره‌ی نامعتبر → خطای اعتبارسنجی؛ نرمال‌سازی `+98…` و ارقام فارسی درست انجام شد.
  - در پایان، حساب‌های تستی از دیتابیس (`users`) و کلیدهای OTP از `redis` پاک شدند.
- تست UI با `playwright-core` + `/usr/bin/google-chrome` روی `https://alooshomal.ir/login`:
  تب «موبایل»، مرحله‌ی کد، پیام «حالت توسعه» با کد `123456`، مرحله‌ی نام برای کاربر جدید
  و رسیدن به `/dashboard` تأیید شد. تنها خطاهای کنسول، ۴۰۴ منابع جانبی و ۴۰۰ خطای
  `FULLNAME_REQUIRED` در گام اول بودند که مورد انتظار است.

**یافته‌ی مهم (پیامک واقعی روی سرور فعال نیست):**
- متغیر `MELIPAYAMAK_OTP_PATH` در `.env` سرور **خالی** است (تأیید با
  `docker exec alooshomal-api printenv`)، بنابراین سرور در همان bypass توسعه است: پیامک
  واقعی ارسال نمی‌شود و کد ثابت `123456` در پاسخ API برگردانده می‌شود. تا وقتی این متغیر
  روی سرور مقدار درست نگیرد، ورود با موبایل برای کاربران واقعی عملاً بی‌پیامک است.
- خالی‌بودن مسیر در `.env` باعث خطا نمی‌شود؛ چون `docker-compose.prod.yml` هر دو حالت را
  پوشش می‌دهد. برای فعال‌کردن پیامک واقعی، مقدار `MELIPAYAMAK_OTP_PATH` باید در `.env`
  سرور ست و کانتینر `api` یک‌بار `up -d` شود. توکن/مسیر OTP از حساب
  `console.melipayamak.com` گرفته می‌شود (نمونه در `docs/DEPLOY.md`).

**نتیجه:** کد، اسکیمای دیتابیس و کل جریان ورود/ثبت‌نام با موبایل روی سرور تولید درست
کار می‌کند؛ تنها اقدام باقی‌مانده **تنظیم `MELIPAYAMAK_OTP_PATH` برای پیامک واقعی** است
که نیاز به توکن ملی‌پیامک از سمت کاربر دارد.

## ۱۴۰۵/۰۷/۲۱ — ورود و ثبت‌نام با موبایل و کد یکبار مصرف (OTP) — نسخه `v2.22.0`

**هدف:** افزودن روش ورود/ثبت‌نام با موبایل و کد یکبار مصرف در کنار روش فعلی
(ایمیل و رمز عبور که دست‌نخورده ماند). یک فرم واحد هم برای ورود و هم برای ثبت‌نام:
اگر شماره قبلاً ثبت شده باشد فقط وارد می‌شود، و اگر شماره جدید باشد در همان لحظه نام و
نام خانوادگی گرفته و حساب ساخته می‌شود. روش ورود با موبایل از پنل مدیر قابل فعال/غیرفعال
شدن است، و در محیط لوکال هیچ پیامکی ارسال نمی‌شود تا تست بدون گوشی واقعی ممکن باشد.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: `User.email` و `User.passwordHash` nullable شدند
  (حساب‌های موبایلی هنوز ایمیل/رمز ندارند) و فیلدهای `phone` (یکتا) و
  `phoneVerified` اضافه شدند.
- `apps/api/src/auth/otp.service.ts` (جدید): صدور/تأیید کد یکبار مصرف با ذخیره‌ی
  هش‌شده در Redis (TTL ۵ دقیقه، سقف ۵ تلاش، cooldown ۶۰ ثانیه‌ای)، نرمال‌سازی شماره‌ی
  ایرانی (پشتیبانی از ارقام فارسی/عربی و پیش‌شماره‌های `+98`/`0098`)، و bypass توسعه
  با کد ثابت `123456`.
- `apps/api/src/auth/sms.service.ts` (جدید): ارسال از طریق اندپوینت OTP ملی‌پیامک
  (`console.melipayamak.com`)، خواندن مسیر از `MELIPAYAMAK_OTP_PATH`. چون ملی‌پیامک
  خودش کد را می‌سازد و برمی‌گرداند، کد برگشتی برای تأیید محلی ذخیره می‌شود.
- `apps/api/src/auth/auth.service.ts`: افزودن `requestPhoneCode` و `verifyPhoneCode`
  (ورود یا ثبت‌نام با یک مسیر)، تضمین غیرفعال‌بودن مسیر وقتی توگل مدیر خاموش است،
  افزودن `phone` به پاسخ احراز هویت، و جلوگیری از خطای bcrypt برای حساب‌های بدون رمز.
- `apps/api/src/auth/auth.controller.ts`: روت‌های `POST /auth/phone/request-code` و
  `POST /auth/phone/verify`.
- `apps/api/src/auth/dto/{request-code,verify-phone}.dto.ts` (جدید) و به‌روزرسانی
  `auth.module.ts` (واردکردن `SettingsModule` و سرویس‌های `OtpService`/`SmsService`).
- `apps/api/src/settings/settings.service.ts` + `settings.controller.ts`: کلید جدید
  `authPhoneLoginEnabled` (پیش‌فرض روشن) در تنظیمات عمومی/مدیر.
- `apps/api/src/common/filters/http-exception.filter.ts`: عبور دادن کد ماشین‌خوان
  (`code`) در پاسخ خطا تا کلاینت بتواند حالت «نیاز به نام» را تشخیص دهد.
- `apps/api/src/common/decorators/current-user.decorator.ts` و
  `apps/api/src/auth/strategies/jwt.strategy.ts` و `apps/api/src/profile/profile.service.ts`:
  پذیرش `email` nullable و افزودن `phone`.
- `apps/web/components/auth/PhoneAuthForm.tsx` (جدید): فرم دو مرحله‌ای موبایل→کد با
  مرحله‌ی نام برای کاربر جدید و نمایش کد توسعه.
- `apps/web/app/(auth)/login/page.tsx` و `register/page.tsx`: تب‌های «ایمیل و رمز عبور»
  و «موبایل و کد».
- `apps/web/components/admin/AdminAuthSettings.tsx` (جدید): کارت تنظیمات برای فعال/غیرفعال
  کردن ورود با موبایل، وصل‌شده در `apps/web/app/admin/page.tsx` بخش «تنظیمات».
- `apps/web/lib/api.ts` و `lib/auth.ts`: `email` nullable + `phone` + `ApiError.code`.
- `apps/web/components/dashboard/ProfilePanel.tsx`: نمایش موبایل و fallback برای ایمیل خالی.
- `docker-compose.yml`، `docker-compose.prod.yml`، `.env.example`، `docs/DEPLOY.md`:
  مستندسازی و پاس‌دادن `MELIPAYAMAK_OTP_PATH`.

**تأیید/تست:**
- `tsc --noEmit` برای هر دو اپ (`apps/api`, `apps/web`) بدون خطا.
- ایمیج‌های `api`/`web` بازساخته و کانتینرها بازسازی شدند؛ `prisma db push` اسکیما را
  روی دیتابیس اعمال کرد (ستون‌های `phone`/`phoneVerified` و nullable شدن `email`/`passwordHash`).
- تست زنده‌ی API روی `localhost:3001/api`:
  - ثبت‌نام کاربر جدید با موبایل: `request-code` → `verify` بدون نام → خطای
    `FULLNAME_REQUIRED` → `verify` با نام → توکن صادر شد (`isNewUser: true`).
  - ورود کاربر موجود با همان شماره → توکن صادر شد (`isNewUser: false`).
  - کد اشتباه → خطای «کد وارد‌شده صحیح نیست»؛ درخواست مجدد داخل cooldown → خطای cooldown؛
    شماره‌ی نامعتبر → خطای اعتبارسنجی.
  - ورود ایمیل+رمز ادمین همچنان کار می‌کند.
  - توگل مدیر: با `phoneLoginEnabled=false` اندپوینت‌های موبایل خطای 403 می‌دهند.
- تست UI با Playwright روی `localhost:3000`: تب موبایل، نمایش کد توسعه، مرحله‌ی نام و
  رسیدن به `/dashboard` تأیید شد؛ کارت تنظیمات مدیر در `?section=settings` رندر شد.

## ۱۴۰۵/۰۷/۲۱ — پنل «فضای سرور» در داشبورد مدیریت (حجم آپلودها + دیسک) — نسخه `v2.21.0`

**هدف:** افزودن یک بخش تازه به پنل ادمین که به سرویس ذخیره‌سازی وصل شود و با نمای
گرافیکی نشان دهد: حجم کل تصاویر آپلودی و ریشه‌ی آپلود (باکت) به‌همراه تفکیک حجم هر
پوشه، و همچنین حجم کل هارد دیسک سرور و فضای خالی آن.

**تغییرات:**
- `apps/api/src/uploads/storage.service.ts`: افزودن `usage()` که با
  `listObjectsV2` کل باکت را پیمایش و بایت‌ها را به تفکیک پوشه‌ی سطح‌اول جمع می‌کند؛
  افزودن `StorageUsage`/`StorageFolderUsage`، فیلدهای `endpoint`/`dataDir` و
  پشتیبانی از `MINIO_DATA_DIR`.
- `apps/api/src/admin/admin.service.ts`: افزودن `storageOverview()` (ادغام آمار باکت
  و دیسک) و `diskStats()` با `statfs` روی `/` برای ظرفیت کل/آزاد/مصرف‌شده.
- `apps/api/src/admin/admin.controller.ts`: افزودن روت `GET /admin/storage`.
- `apps/api/src/admin/admin.module.ts`: افزودن `UploadsModule` به imports.
- `apps/web/components/admin/AdminStoragePanel.tsx`: کامپوننت جدید پنل با کارت‌های
  آماری، گیج دونات (SVG) برای دیسک سرور، نوارهای پیشرفت تفکیک‌شده‌ی هر پوشه و نمایش
  مسیر فیزیکی باکت؛ هشدار رنگ‌بندی‌شده وقتی فضای دیسک رو به پر شدن است.
- `apps/web/components/admin/AdminShell.tsx`: افزودن بخش `storage` («فضای سرور») به
  منوی کنار.
- `apps/web/app/admin/page.tsx`: افزودن `storage` به بخش‌ها، سرصفحه و رندر پنل.
- `.env.example`: مستندسازی `MINIO_DATA_DIR`.

**تأیید/تست:**
- `apps/api` و `apps/web` با `tsc --noEmit` بدون خطا کامپایل شدند.
- بازسازی ایمیج `api`/`web` و اجرای مجدد کانتینرها؛ روت
  `Mapped {/api/admin/storage, GET}` در لاگ Nest ثبت شد.
- فراخوانی واقعی `GET /api/admin/storage` با توکن مدیر داده‌ی درست برگرداند:
  `objectCount=8`, `totalBytes≈117710` با تفکیک `avatars`/`logos`، و
  `disk.totalBytes≈130GB`, `disk.freeBytes≈19.8GB`.
- بررسی UI با `playwright-core` + `/usr/bin/google-chrome` روی
  `/admin?section=storage`: هر چهار بخش («حجم کل آپلودها»، «فضای هارد دیسک سرور»،
  «ریشه‌ی آپلود»، «تفکیک حجم») رندر شد، ۱۵ دایره‌ی SVG و ۳ نوار پیشرفت رسم شد و هیچ
  درخواست ناموفقی ثبت نشد.

## ۱۴۰۵/۰۷/۲۱ — مستندسازی ذخیره‌سازی رسانه و انتقال سرور — نسخه `v2.20.0`

**هدف:** افزودن یک سند کامل درباره‌ی سیستم ذخیره‌سازی تصاویر آپلودی (MinIO/Silo):
الگوی پوشه‌بندی و نام‌گذاری فایل‌ها، مسیر فیزیکی روی سرور، آدرس پنل گرافیکی و
اعتبارنامه‌ها، و آموزش گام‌به‌گام انتقال والیوم رسانه به سرور جدید یا سرور
رسانه‌ی جداگانه.

**تغییرات:**
- `docs/STORAGE.md`: سند جدید (فارسی) شامل معماری، جریان آپلود، جدول دسته‌ها و
  الگوی `<bucket>/<folder>/<ownerId>/<uuid>.webp`، مسیر والیوم
  `alooshomal_minio_data`، آدرس کنسول لوکال/سرور و روش تونل SSH، اعتبارنامه‌ها،
  سناریوهای انتقال (انتقال کامل و جداسازی سرور رسانه)، و جدول متغیرهای محیطی.
- `README.md`: افزودن بخش «Media storage» با ارجاع به `docs/STORAGE.md`.
- `docs/DEPLOY.md`: افزودن زیربخش «ذخیره‌سازی رسانه» با آدرس کنسول، اعتبارنامه و
  ارجاع به سند کامل.

**تأیید/تست:**
- تطبیق محتوای سند با کد: `apps/api/src/uploads/uploads.constants.ts`
  (دسته‌های `logos`/`avatars`)، `storage.service.ts` (ساخت URL عمومی و الگوی کلید)،
  `docker-compose.prod.yml` (نبود publish برای سرویس `minio` و نام والیوم
  `alooshomal_minio_data`)، و `deploy/nginx/conf.d/alooshomal-locations.inc`
  (پروکسی `/media/` به `minio:9000`) — همه مطابق سند.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۱ — ویرایش درون‌خطی، پیش‌نویس، و اصلاح ظاهر بیلدر — نسخه `v2.19.0`

**هدف:** سه اصلاح در بیلدر کارت ویزیت/بیولینک: (۱) صفحهٔ ویرایش هم مثل صفحهٔ ساخت
با ویرایش مستقیم روی پیش‌نمایش کار کند، (۲) پس‌زمینهٔ تم گوشه‌هایش هم‌تراز گوشهٔ
گرد border شود، (۳) امکان ذخیرهٔ کارت به‌عنوان «پیش‌نویس» و بازگشت/انتشار بعدی.

**تغییرات:**
- `apps/web/app/dashboard/biolinks/[id]/edit/page.tsx` و
  `apps/web/app/dashboard/business-cards/[id]/edit/page.tsx`: پاس‌دادن `inline` و
  `showDraftButton` به فرم، هندل‌کردن گزینهٔ پیش‌نویس و متن راهنمای تازه.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: امضای `onSubmit` به
  `(values, options?)` تغییر کرد؛ حذف «رنگ اصلی (تم وینتیج)» و انتخاب رنگ؛ افزودن
  دکمهٔ «ذخیره به‌عنوان پیش‌نویس».
- `apps/web/app/dashboard/biolinks/new/page.tsx` و
  `.../business-cards/new/page.tsx`: ارسال `draft: true` و بازگشت به لیست خودم.
- `apps/web/app/globals.css`: افزودن `border-radius: var(--biolink-radius)` /
  `var(--bc-radius)` به رپر تم و `border-radius: 0` به صفحهٔ تمام‌صفحه تا گوشهٔ
  پس‌زمینه با border گرد هم‌تراز شود.
- `apps/web/lib/utils.ts`: برچسب و استایل وضعیت `DRAFT` («پیش‌نویس»).
- `apps/api/prisma/schema.prisma`: افزودن `DRAFT` به `enum BiolinkStatus`.
- `apps/api/src/biolinks/dto/create-biolink.dto.ts` و
  `.../businesscards/dto/create-business-card.dto.ts`: فیلد اختیاری `draft`.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: در `create`/`update`
  فلگ `draft` از دیتای Prisma جدا می‌شود؛ پیش‌نویس وضعیت `DRAFT` می‌گیرد، منتشر
  نمی‌شود و اعلان مدیر نمی‌فرستد؛ ویرایشِ یک پیش‌نویس با `draft:true` آن را پیش‌نویس
  نگه می‌دارد و ذخیرهٔ معمولی آن را به `PENDING` می‌برد.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا.
- سرور توسعهٔ Next روی پورت ۳۰۰۰ (هم‌راستا با CORS) بالا آمد؛ صفحهٔ ویرایش هر دو
  نوع کارت، پیش‌نمایش ویرایش‌پذیر («روی هر فیلد کلیک کنید...») و دکمهٔ
  «ذخیره به‌عنوان پیش‌نویس» را نشان داد.
- `grep "رنگ اصلی"` روی هر دو صفحهٔ `new` → صفر مورد (انتخاب رنگ حذف شد).
- اندازه‌گیری computed style: `border-radius` رپر کارت و بیولینک با کارت درونی
  برابر شد (۲۴px و ۱۴px) به‌جای ۰px.
- end-to-end API: آیتم با `draft:true` وضعیت `DRAFT`/`isPublished=false` گرفت؛
  ویرایش با `draft:true` همان `DRAFT` ماند؛ ذخیرهٔ بدون فلگ به `PENDING` رفت
  (تأیید با `psql` روی جدول `biolinks`).

## ۱۴۰۵/۰۷/۲۱ — پهن‌ترکردن ستون جزئیات در حالت تبلت دایرکتوری — نسخه `v2.18.2`

**هدف:** در صفحات دایرکتوری `/biolinks` و `/business-cards` و فقط در عرض تبلت
(md، بین ۷۶۸ تا ۱۰۲۳ پیکسل)، ستون راست (لیست کارت‌ها) کمی باریک‌تر و ستون چپ
(نمایش کارت) پهن‌تر شود تا جزئیات جای بیشتری داشته باشند.

**تغییرات:**
- `apps/web/app/biolinks/page.tsx`: گرید دایرکتوری در `md` از
  `minmax(0,1fr)_minmax(300px,38%)` به `minmax(0,1fr)_minmax(320px,44%)` تغییر کرد.
- `apps/web/app/business-cards/page.tsx`: همان تغییر.
- چیدمان دسکتاپ (`lg`: `1fr_420px`) بدون تغییر ماند.

**تأیید/تست:**
- سرور توسعهٔ Next روی پورت ۳۰۱۰ بالا آمد و با Playwright عرض واقعی ستون‌ها
  اندازه‌گیری شد: در عرض ۹۰۰px لیست از ۵۲۲px به ۴۷۰px و جزئیات از ۳۳۰px به
  ۳۸۲px رسید؛ در عرض ۱۴۰۰px (lg) همچنان `732px 420px` و بدون تغییر.

## ۱۴۰۵/۰۷/۲۱ — رفع ۴۰۴ تصاویر آپلودی روی سرور با reload کانتینر nginx — نسخه `v2.18.1`

**هدف:** رفع خطای ۴۰۴ روی تصاویر آپلودشده (`https://alooshomal.ir/media/...`). علت
ریشه‌ای نه در کد آپلود بود و نه در MinIO: کانتینر `alooshomal-nginx` حدود ۴۲ ساعت
بدون ری‌استارت بالا بود، در حالی که فایل‌های کانفیگ bind-mount شده
(`deploy/nginx/conf.d/*`) امروز به‌روزرسانی شده بودند. nginx کانفیگ را فقط هنگام
استارت می‌خواند و `docker compose up -d` هم چون تغییری در سرویس نمی‌بیند کانتینر را
restart/reload نمی‌کند؛ در نتیجه `location /media/` هرگز در حافظه‌ی nginx لود نمی‌شد و
درخواست‌ها به `location /` → Next.js می‌افتادند و Next پاسخ ۴۰۴ می‌داد.

**تغییرات:**
- `.github/workflows/deploy.yml`: در مرحلهٔ «Pull new images and restart services»،
  پس از `up -d` یک مرحلهٔ امنِ reload اضافه شد: اگر سرویس `nginx` در حال اجرا باشد،
  ابتدا `nginx -t` (تست کانفیگ) و سپس `nginx -s reload` اجرا می‌شود تا هر تغییر کانفیگ
  bind-mount شده (مثل `location /media/`) در همان دیپلوی اعمال شود. اگر nginx بالا
  نباشد، این بلوک بی‌صدا رد می‌شود و دیپلوی را نمی‌شکند.

**تأیید/تست:**
- روی سرور: `docker exec alooshomal-nginx nginx -t` → سینتکس سالم؛ سپس
  `nginx -s reload` → پس از آن `GET /media/alooshomal/avatars/.../147692ff….webp`
  از داخل کانتینر و از بیرون (`curl`) هر دو **200** با `Content-Type: image/webp`
  برگرداندند (قبلاً ۴۰۴ از Next.js).
- همان بلوک دقیقاً روی سرور با `set -e` تست شد (`ps --status running --services |
  grep -q '^nginx$'` → match، `nginx -t` → ok، `nginx -s reload` → ok).
- اعتبارسنجی YAML ورک‌فلو با `python3 -c "import yaml; ..."` → سه جاب سالم.

## ۱۴۰۵/۰۷/۲۱ — رفع شکست دیپلوی با آینه‌کردن ایمیج آبجکت‌استوریج در GHCR — نسخه `v2.18.0`

**هدف:** رفع خطای `pull access denied for minio/minio` در مرحلهٔ `docker compose
pull` روی سرور. MinIO توزیع رسمی خود را متوقف کرده است: ریپوی `minio/minio` از
Docker Hub حذف شده، `dl.min.io` کد `410 Gone` برمی‌گرداند و مخزن GitHub آرشیو شده
است. چون سرور به Docker Hub/Quay دسترسی ندارد ولی GHCR را می‌کشد، ایمیج
آبجکت‌استوریج به GHCR آینه و از همان‌جا مصرف می‌شود.

**تغییرات:**
- `.github/workflows/deploy.yml`: افزودن جاب `mirror-minio` که با
  `docker buildx imagetools create` ایمیج `pgsty/silo` (فورک نگه‌داشته‌شدهٔ MinIO
  و جایگزین قطره‌ای: همان S3 API، همان متغیرهای `MINIO_*` و همان هلث‌چک
  `mc ready local`) را با تگ غیرقابل‌تغییر به
  `ghcr.io/<repo>-minio` کپی می‌کند؛ به‌همراه تلاش best-effort برای عمومی‌کردن
  پکیج. `deploy` اکنون `needs: [build-and-push, mirror-minio]` است. تگ مبدأ از
  طریق `MINIO_SOURCE`/`MINIO_TAG` قابل‌تغییر است و روی `latest` قفل نشده.
- `docker-compose.prod.yml`: ایمیج سرویس `minio` به ایمیج آینه‌شدهٔ GHCR
  (`${MINIO_IMAGE:-ghcr.io/...-minio:RELEASE.2026-09-16T00-00-00Z}`) تغییر کرد.
- `docker-compose.yml`: همان سرویس در حالت dev به
  `${MINIO_IMAGE:-pgsty/silo:RELEASE.2026-09-16T00-00-00Z}` تغییر کرد.
- `.env.example`: توضیح وضعیت توزیع MinIO و متغیر اختیاری `MINIO_IMAGE`.
- `docs/DEPLOY.md`: بخش «ایمیج آبجکت‌استوریج از GHCR می‌آید» با علت، راه‌حل و
  روش تغییر نسخه.

**تأیید/تست:**
- `python3 -c "import yaml; ..."` روی `deploy.yml` → سه جاب `build-and-push`,
  `mirror-minio`, `deploy` و `deploy.needs` درست تجزیه شد.
- `docker compose config` روی هر دو فایل → ایمیج نهایی `pgsty/silo:RELEASE.…`
  (dev) و `ghcr.io/…-minio:RELEASE.…` (prod) بدون خطا رزولو شد.
- `docker compose up -d minio` → کانتینر `alooshomal-minio` با ایمیج جدید بالا
  آمد و هلث‌چک `mc ready local` وضعیت **healthy** داد؛ `minio server` و S3 API
  (`/minio/health/live` → 200) پاسخ دادند.

## ۱۴۰۵/۰۷/۲۱ — آپلود لوگو/آواتار با MinIO + sharp و ذخیره‌سازی فولدری — نسخه `v2.17.0`

**هدف:** افزودن قابلیت آپلود تصویر (لوگو و تصویر پروفایل) به فرم‌های کارت ویزیت و
بیولینک. تصویر سمت سرور با `sharp` به WebP تبدیل و تغییر اندازه می‌شود و در
آبجکت‌استوریج MinIO با ساختار فولدریِ مرتب و دسته‌بندی‌شده ذخیره می‌گردد تا انتقال
آیندهٔ رسانه‌ها به یک سرور جدا بدون تغییر کد ممکن باشد.

**تغییرات:**
- `apps/api/package.json`: افزودن `minio` و `sharp`.
- `apps/api/src/uploads/uploads.constants.ts` (جدید): دسته‌بندی‌های آپلود
  (`logo`/`avatar`) با فولدر اختصاصی (`logos/`, `avatars/`)، سقف ابعاد و MIME مجاز؛
  افزودن دستهٔ جدید فقط با یک ورودی تازه انجام می‌شود.
- `apps/api/src/uploads/storage.service.ts` (جدید): پوشش نازک روی MinIO با کلید
  `<folder>/<ownerId>/<uuid>.webp`، ساخت خودکار باکت + سیاست public-read، ساخت URL
  عمومی از `MINIO_PUBLIC_URL` و استخراج کلید از URL برای حذف/جایگزینی.
- `apps/api/src/uploads/image.service.ts` (جدید): اعتبارسنجی فرمت واقعی با `sharp`،
  تغییر اندازه (لوگو داخل ۵۱۲×۵۱۲، آواتار کاور مربع ۴۰۰×۴۰۰)، حذف متادیتا و خروجی WebP.
- `apps/api/src/uploads/uploads.service.ts` و `uploads.controller.ts` و
  `uploads.module.ts` (جدید): سرویس و اندپوینت‌های احرازشدهٔ `POST /api/uploads/logo`
  و `/api/uploads/avatar` با محدودیت ۲ مگابایت؛ ثبت `UploadsModule` در `app.module.ts`.
- `apps/api/src/biolinks/dto/create-biolink.dto.ts` و
  `apps/api/src/businesscards/dto/create-business-card.dto.ts`: `avatarUrl`/`logoUrl`
  با `require_tld: false` تا URL محلی MinIO در dev پذیرفته شود.
- `apps/web/components/ui/ImageUpload.tsx` (جدید): آپلودر قابل‌استفادهٔ مجدد (انتخاب/
  پیش‌نمایش/حذف/وضعیت بارگذاری) با پارامتر `kind` برای انتخاب فولدر مقصد.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: افزودن `avatarUrl`/`logoUrl`
  به مقادیر فرم و رندر آپلودر در هر دو حالت ویرایش درون‌خطی و فرم کلاسیک.
- `apps/web/components/biolink/ThemedBiolink.tsx` و
  `apps/web/components/businesscard/ThemedBusinessCard.tsx`: رندر لوگو روی کارت
  (بیولینک بالای آواتار، کارت ویزیت کنار نام) و افزودن `logoUrl` به تایپ داده.
- `apps/web/app/dashboard/biolinks/[id]/edit/page.tsx` و
  `apps/web/app/dashboard/business-cards/[id]/edit/page.tsx` و
  `apps/web/components/admin/{Biolink,BusinessCard}LiveEditor.tsx`: عبور `avatarUrl`/
  `logoUrl` از رکورد موجود به فرم ویرایش.
- `apps/web/components/{biolink,businesscard}/Directory*Item.tsx` و `Directory*Detail.tsx`
  و `apps/web/lib/api.ts`: افزودن `unoptimized` به `<Image>`ها (هاست محلی MinIO) و
  تایپ `UploadResult`.
- `docker-compose.yml` و `docker-compose.prod.yml`: سرویس `minio` + volume نام‌دار
  `alooshomal_minio_data` + متغیرهای `MINIO_*` برای API و `depends_on`.
- `deploy/nginx/conf.d/alooshomal-locations.inc`: پروکسی `location /media/` به
  `minio:9000` تا تصاویر هم‌مبدأ سرو شوند و انتقال به سرور رسانهٔ جدا ساده بماند.
- `.env.example` و `docs/DEPLOY.md`: مستندسازی متغیرهای MinIO و مسیر `/media/`.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit` بدون خطا؛ `apps/api`: `tsc --noEmit -p tsconfig.json`
  بدون خطا.
- تست API با `curl`: `POST /api/uploads/logo` و `/avatar` کد ۲۰۱ و URL
  `http://localhost:9000/alooshomal/logos|avatars/<userId>/<uuid>.webp` برگرداندند؛
  خروجی WebP با ابعاد درست (لوگو ۵۱۲×۳۴۱، آواتار ۴۰۰×۴۰۰)، دریافت عمومی ۲۰۰ و
  فرمت نامعتبر رد شد؛ ذخیرهٔ URL در `logoUrl` کارت با `PATCH` موفق بود.
- تست UI با Playwright روی `/dashboard/biolinks/new` و `/dashboard/business-cards/new`:
  هر فرم دو دکمهٔ آپلود و دو `input[type=file]` داشت، هر دو آپلود ۲۰۱ شدند و
  پیش‌نمایش لوگو (`object-contain`) و آواتار (`object-cover`) روی کارت رندر شد و
  هیچ خطای ۴۰۰ از بهینه‌ساز `next/image` ثبت نشد.
- `python3 scripts/sync_install.py` و `--check` بدون تغییر معلق.

## ۱۴۰۵/۰۷/۲۱ — صفحه‌بندی فهرست‌های کاربر + کنترل ادمین بر تعداد نمایش — نسخه `v2.16.0`

**هدف:** در `/dashboard/biolinks`، `/dashboard/business-cards`، `/dashboard/saved` و
`/dashboard/boost` فهرست کارت‌ها صفحه‌بندی شود (سرور-ساید) و ادمین بتواند تعداد
نمایش در هر صفحه را از پنل مدیریت کنترل کند.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts` و `settings.controller.ts`: کلید جدید
  `myListPageSize` (پیش‌فرض ۱۲) + getter/setter، ثبت در `ensureDefaults`، پذیرش در
  DTO ادمین و خروجی در `GET /settings/public` و `GET /admin/settings`.
- `apps/api/src/biolinks/biolinks.service.ts` و `business-cards.service.ts`:
  `findMyBiolinks`/`findMyBusinessCards`/`findMySaved` اکنون صفحه‌بندی‌شده و
  `{ items, meta }` برمی‌گردانند (`skip/take` + `count`)، با اندازهٔ صفحه از
  `getMyListPageSize`.
- `apps/api/src/boosts/boosts.service.ts` + `boosts.module.ts`: `overview` صفحه‌بندی‌شده
  (هر نوع جداگانه) + `meta`؛ تزریق `SettingsModule`/`SettingsService`.
- کنترلرهای مربوطه: افزودن `@Query() PaginationDto` و پاس‌دادن `page`/`limit`.
- `apps/web/lib/api.ts`: افزودن تایپ `Paged<T>` و `meta` در `BoostOverview`.
- `apps/web/app/dashboard/{biolinks,business-cards,saved,boost}/page.tsx`: مصرف پاسخ
  صفحه‌بندی‌شده و افزودن کامپوننت `Pagination` (در «ذخیره‌شده» و «افزایش بازدید»
  هر بخش/هر نوع جداگانه).
- `apps/web/app/dashboard/page.tsx` و `cards/page.tsx`: به‌روزرسانی مصرف‌کننده‌های
  `mine` برای ساختار جدید `{ items, meta }`.
- `apps/web/components/admin/AdminDirectorySettings.tsx`: فیلد «تعداد هر صفحه
  کارت‌های من» و ذخیره‌ی `myListPageSize`.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit` بدون خطا؛ `apps/api`: `tsc -p tsconfig.build.json`
  فقط خطاهای از قبل موجود (نبود `exceljs`/`ioredis` محلی) را نشان می‌دهد و
  تغییرات این تسک خطا ندارند.
- تست API با `curl` روی سرور محلی: با ساخت ۲۶ بیولینک، `/biolinks/mine` سه صفحه
  `12/12/2` برگرداند و `meta` درست بود؛ پس از `PATCH /admin/settings` با
  `myListPageSize=5` همان درخواست `limit=5` و ۶ صفحه شد (کنترل ادمین زنده).
  `/boosts/overview` و `/saved/mine` هم `meta` صحیح دادند.
- تست UI با Playwright: `/dashboard/biolinks` با ۱۲ کارت و کنترل صفحه‌بندی رندر شد و
  دکمهٔ «بعدی» صفحه را عوض کرد؛ `/dashboard/boost` هم صفحه‌بندی داشت؛
  `/dashboard/business-cards` و `/dashboard/saved` بدون خطا بارگذاری شدند؛ و در
  تب «تنظیمات» پنل ادمین برچسب «تعداد هر صفحه کارت‌های من» نمایش داده شد.

## ۱۴۰۵/۰۷/۲۱ — ساخت کارت به‌صورت «تم‌اول» با ویرایش مستقیم روی پیش‌نمایش — نسخه `v2.15.0`

**هدف:** در `/dashboard/biolinks/new` و `/dashboard/business-cards/new` سناریوی ساخت
عوض شود: کاربر ابتدا یک تم انتخاب می‌کند، سپس کارت با همان تم و همهٔ فیلدها باز
می‌شود و کاربر هر فیلد را مستقیم روی خودِ پیش‌نمایش تایپ می‌کند.

**تغییرات:**
- `apps/web/components/ui/ThemePicker.tsx` (جدید): انتخابگر تم با کارت‌های گرادیانی و
  علامت انتخاب؛ اولین گام ساخت.
- `apps/web/components/ui/InlineEdit.tsx` (جدید): فیلد متنی درون‌خطی
  (`contentEditable`) با `data-placeholder`؛ مقدار هنگام blur ثبت می‌شود تا مکان‌نما
  نپرد.
- `apps/web/components/biolink/ThemedBiolink.tsx` و
  `apps/web/components/businesscard/ThemedBusinessCard.tsx`: حالت `editable` اضافه شد
  که همان تم را با فیلدهای درون‌خطی (نام، عنوان، شرکت، درباره، آدرس، شهر/کسب‌وکار به
  صورت select و همهٔ راه‌های ارتباطی/شبکه‌های اجتماعی) رندر می‌کند.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: پروپ `inline`؛ نمایش
  انتخابگر تم به‌عنوان گام اول، سپس ویرایشگر روی پیش‌نمایش + پنل تم + دکمهٔ ذخیره
  (غیرفعال تا نام خالی نباشد).
- `apps/web/components/biolink/LiveBiolinkPreview.tsx` و
  `apps/web/components/businesscard/LiveBusinessCardPreview.tsx`: عبور پروپ‌های
  `editable`/`onFieldChange`/`cityOptions`/`businessOptions`.
- `apps/web/app/dashboard/biolinks/new/page.tsx` و
  `apps/web/app/dashboard/business-cards/new/page.tsx`: فعال‌کردن `inline`.
- `apps/web/app/globals.css`: استایل `.inline-edit` (hover/focus/placeholder) و
  `.bc-select` برای selectهای درون کارت.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit` بدون خطا.
- تست UI با Playwright (کروم) روی سرور dev محلی: در هر دو صفحه ابتدا انتخابگر تم
  نمایش داده می‌شود (`tiles=14/15`)؛ پس از انتخاب تم، ویرایشگر با `13` فیلد
  درون‌خطی و `2` select باز می‌شود؛ تایپ مستقیم روی پیش‌نمایش مقدار را ثبت می‌کند و
  دکمهٔ ذخیره پس از پرکردن نام فعال می‌شود.

## ۱۴۰۵/۰۷/۲۰ — دایرکتوری موبایل/تبلت: اسکرول‌بار نازک سمت راست + حذف هدر تکراری شیت — نسخه `v2.14.5`

**هدف:** در `/biolinks` و `/business-cards` روی موبایل و تبلت، اسکرول‌بار لیست به
سمت راست منتقل و نازک و هم‌رنگ تم شود؛ و در شیت پایین موبایل، تکرار عنوان
«جزئیات بیولینک/کارت ویزیت» و دکمه‌ی بستن برطرف شود.

**تغییرات:**
- `apps/web/app/globals.css`: در `@media (max-width: 1023px)`، برای `.directory-list`
  اسکرول‌بار نازک (`width: 5px`) با رنگ تم (`--vintage-accent`)، شیار شفاف و
  `scrollbar-width: thin`؛ و انتقال ظرف به `direction: ltr` + برگرداندن فرزندان به
  `rtl` تا اسکرول‌بار در حالت RTL سمت راست بایستد.
- `apps/web/components/biolink/DirectoryDetail.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: افزودن پروپ
  اختیاری `hideHeader` برای پنهان‌کردن هدر داخلی.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`: ارسال
  `hideHeader` در استفاده‌ی داخل `MobileSheet` تا هدر شیت یک‌بار نمایش داده شود.

**تأیید/تست:**
- تست UI با Playwright در ۳۹۰ و ۸۳۴ و ۱۴۰۰px برای هر دو دایرکتوری: شیت فقط یک
  عنوان و یک دکمه‌ی بستن نشان می‌دهد (`titles: 1`, `closeBtns: 1`)؛
  `scrollbar` لیست فعال و جهت ظرف `ltr` (اسکرول سمت راست) و فرزند `rtl`؛ بدون
  اسکرول افقی (`hasHScroll: false`)؛ و دسکتاپ دست‌نخورده (`direction: rtl`، فوتر
  نمایان).

## ۱۴۰۵/۰۷/۲۰ — دایرکتوری موبایل/تبلت: ثابت‌ماندن المان‌ها و اسکرول فقط لیست — نسخه `v2.14.4`

**هدف:** در `/biolinks` و `/business-cards` روی موبایل و تبلت، عنوان و فیلترها و
صفحه‌بندی ثابت بمانند و فقط فهرست کارت‌ها اسکرول شود.

**تغییرات:**
- `apps/web/app/globals.css`: کلاس‌های `directory-shell` (پرکردن ارتفاع صفحه منهای
  نوبار پایین)، `directory-grid`، `directory-list` (تنها ناحیه‌ی اسکرول‌شونده) و
  `directory-aside`، همه فقط در `max-width: 1023px`؛ دسکتاپ دست‌نخورده.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`: افزودن
  این کلاس‌ها، ثابت‌کردن هدر/فیلتر (`shrink-0`)، جداکردن لیست اسکرول‌شونده از
  صفحه‌بندی، و پنهان‌کردن فوتر در موبایل/تبلت (`hidden lg:block`) تا کل صفحه اسکرول
  نخورد.

**تأیید/تست:**
- تست UI با Playwright (۳۹۰ و ۸۳۴ و ۱۴۰۰px، برای هر دو دایرکتوری): در موبایل/تبلت
  `listScrollable=true`، `pageScroll=false`، بدون اسکرول افقی و فیلتر در حین اسکرول
  ثابت (`filterTop` بدون تغییر، `scrollY=0`)؛ در دسکتاپ اسکرول صفحه‌ی عادی و فوتر
  دیده می‌شود.

## ۱۴۰۵/۰۷/۲۰ — افزودن آیکن «نبض شهر» به نوبار موبایل/تبلت — نسخه `v2.14.3`

**هدف:** در نوبار پایین موبایل و تبلت، آیکن «نبض شهر» اضافه شود.

**تغییرات:**
- `apps/web/components/layout/MobileNav.tsx`: افزودن آیتم «نبض شهر» با آیکن
  `Newspaper` و مسیر `/pulse`؛ شبکه‌ی نوبار از `grid-cols-4` به `grid-cols-5` تغییر
  کرد.

**تأیید/تست:**
- تست UI با Playwright: در ۳۹۰px و ۸۳۴px نوبار با ۵ آیتم
  (خانه/کارت ویزیت‌ها/بیولینک‌ها/نبض شهر/ورود) دیده شد و اسکرول افقی نداشت؛ در
  ۱۰۲۴px نوبار مخفی بود.

## ۱۴۰۵/۰۷/۲۰ — باز شدن خبر منتشرشده از پنل خبرنگار در تب جدید — نسخه `v2.14.2`

**هدف:** در `/dashboard/reporter` با کلیک روی عنوان خبرِ منتشرشده، خبر در تب جدید
مرورگر باز شود.

**تغییرات:**
- `apps/web/components/reporter/ReporterPanel.tsx`: عنوان خبرهای `APPROVED` به لینک
  `/pulse/{id}` با `target="_blank"` تبدیل شد (با هاور و راهنمای «مشاهده خبر در صفحه
  جدید»)؛ خبرهای غیرمنتشرشده همچنان متن ساده می‌مانند.

**تأیید/تست:**
- تست UI با Playwright در `/dashboard/reporter`: عنوان خبر منتشرشده به‌صورت لینک با
  `target="_blank"` و `href=/pulse/{id}` رندر شد.

## ۱۴۰۵/۰۷/۲۰ — ویرایش و حذف خبر توسط خودِ شهروند خبرنگار — نسخه `v2.14.1`

**هدف:** شهروند خبرنگار بتواند خبرهای خودش — از جمله خبر منتشرشده — را ویرایش یا حذف
کند.

**تغییرات:**
- `apps/api/src/news/news.service.ts`: متد `removeMine` (حذف خبر خود با بررسی مالکیت و
  ثبت لاگ فعالیت). ویرایش همچنان خبر را به صف بررسی برمی‌گرداند.
- `apps/api/src/news/news.controller.ts`: افزودن `DELETE /news/reporter/mine/:id`.
- `apps/web/components/reporter/ReporterPanel.tsx`: افزودن دکمه‌ی «حذف» با تأییدیه در
  کنار «ویرایش» برای هر خبر (شامل خبرهای منتشرشده).

**تأیید/تست:**
- تست API با curl: خبر تأییدشده توسط خبرنگار ویرایش شد (بازگشت به PENDING) و سپس حذف
  شد (۲۰۰)؛ مالکیت بررسی می‌شود.
- تست UI با Playwright در `/dashboard/reporter`: بخش «خبرهای من» با دکمه‌های «ویرایش»
  و «حذف» رندر شد.

## ۱۴۰۵/۰۷/۲۰ — ماتریس سطوح دسترسی بر اساس نقش — نسخه `v2.14.0`

**هدف:** ایجاد لیست سطوح دسترسی به تفکیک موضوع و نقش؛ ادمین با تیک‌زدن تعیین کند هر
نقش به چه امکاناتی دسترسی دارد و همان لحظه در بک‌اند اعمال شود.

**تغییرات:**
- `apps/api/src/auth/permissions.ts` (جدید): فهرست موضوع‌ها (`PERMISSION_SUBJECTS`)،
  متادیتای گروه/برچسب/راهنما (`PERMISSION_META`)، نقش‌ها و برچسب‌ها، و ماتریس پیش‌فرض.
- `apps/api/src/auth/permissions.service.ts` (جدید): خواندن/نوشتن ماتریس در جدول
  `Setting` با کلید `perm.<subject>.<role>`، پیش‌فرض‌سازی هنگام بوت، و `can(role, subject)`
  (نقش مدیر همیشه مجاز).
- `apps/api/src/auth/permissions.decorator.ts` و `permissions.guard.ts` (جدید):
  دکوراتور `@RequirePermission('SUBJECT')` و نگهبان سراسری که بعد از احراز هویت اجرا می‌شود.
- `apps/api/src/common/common.module.ts`: ثبت گلوبال `PermissionsService` برای استفاده‌ی
  همه‌ی ماژول‌ها؛ `auth.module.ts` و `app.module.ts` هم‌سو شدند.
- `apps/api/src/admin/admin.controller.ts`: افزودن `GET /admin/permissions` و
  `PATCH /admin/permissions`.
- اعمال مجوز روی نقاط حساس: `biolinks.controller.ts` (ساخت/ویرایش/حذف)،
  `business-cards.controller.ts` (ساخت/ویرایش/حذف)، `profile.controller.ts`
  (درخواست تغییر نام)، و `news.controller.ts` (ثبت خبر و ویرایش خبر خود).
- `apps/api/src/news/news.service.ts` و `news.controller.ts`: افزودن `DELETE /news/reporter/mine/:id`
  برای حذف خبر خود توسط خبرنگار.
- `apps/web/components/admin/AdminPermissionsMatrix.tsx` (جدید): جدول موضوع×نقش با
  گروه‌بندی موضوعی و ذخیره؛ ستون مدیر همیشه تیک‌خورده و غیرفعال.
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`: بخش تازه‌ی
  «سطوح دسترسی» در پنل مدیر.

**تأیید/تست:**
- تست API با curl: خواندن ماتریس (۳ نقش، ۱۳ موضوع)؛ `PATCH` یک سلول و مشاهده‌ی مقدار
  جدید؛ خاموش‌کردن `BIOLINK_CREATE` برای USER → ساخت بیولینک ۴۰۳، روشن‌کردن دوباره →
  موفق؛ نقش مدیر همیشه مجاز.
- تست UI با Playwright در `admin?section=permissions`: جدول با ۳۹ چک‌باکس (۱۳×۳)،
  گروه‌های «محتوا»/«نبض شهر» و ستون مدیر غیرفعال رندر شد.

## ۱۴۰۵/۰۷/۲۰ — مدیریت نقش کاربران: حذف ارتقا به مدیر + تأییدیه + رفع قفل مدیر — نسخه `v2.13.3`

**هدف:** در `admin?section=users` ارتقای هیچ کاربری به نقش مدیر ممکن نباشد؛ پیش از
تغییر نقش تأییدیه گرفته شود؛ نوتیف مناسب برای کاربر ارسال شود؛ و کاربری که اشتباهاً
مدیر شده بود دوباره قابل ویرایش/حذف باشد.

**تغییرات:**
- `apps/api/src/admin/admin.service.ts`: در `setUserRole` ارتقا به `ADMIN` با ۴۰۰ رد
  می‌شود، تغییر نقش خودِ مدیر ممنوع است، و برای حساب‌های `ADMIN` فقط در صورتی که
  «آخرین مدیر فعال» نباشند تغییر مجاز است (`assertNotLastAdmin`). `deleteUser` و
  `setUserActive` هم برای حساب‌های مدیر به‌جز خود/آخرین مدیر باز شدند و `adminId`
  برای ردگیری فعالیت دریافت می‌کنند.
- `apps/api/src/admin/admin.controller.ts`: پاس‌دادن `admin.id` به `deleteUser`.
- `apps/web/components/admin/AdminTables.tsx`: گزینه‌ی «مدیر» از انتخابگر نقش حذف شد
  (فقط برای ردیف مدیرِ فعلی به‌صورت غیرفعال نمایش داده می‌شود)؛ دکمه‌های ویرایش/حذف
  برای ردیف مدیر هم در دسترس‌اند و بک‌اند محافظت‌ها را اعمال می‌کند.
- `apps/web/app/admin/page.tsx`: پیش از تغییر نقش، `window.confirm` با نام کاربر و
  نقش جدید؛ در صورت انصراف، جدول به حالت قبل برمی‌گردد.

**تأیید/تست:**
- تست API با curl: `PATCH role=ADMIN` → ۴۰۰؛ بازگرداندن «بیتا» از ADMIN به USER
  موفق؛ تغییر نقش خودِ مدیر → ۴۰۰؛ نوتیف «نقش کاربری شما تغییر کرد» برای کاربر ثبت شد.
- تست UI با Playwright در `admin?section=users`: انتخابگرهای نقش فقط «کاربر» و
  «شهروند خبرنگار» را دارند و «مدیر» تنها به‌صورت غیرفعال برای ردیف مدیر دیده می‌شود.

## ۱۴۰۵/۰۷/۲۰ — ساختار حالت تبلت: هدر/نوبار موبایلی + دایرکتوری اسپلیت — نسخه `v2.13.2`

**هدف:** اصلاح ساختار حالت تبلت (۷۶۸–۱۰۲۳px) مطابق درخواست: نوبار و هدر مانند
موبایل شود، بدون اسکرول افقی، و دایرکتوری‌های بیولینک/کارت ویزیت مثل دسکتاپ تقسیم‌شده
ولی با تناسب کاربرفرندلی باشند.

**تغییرات:**
- `apps/web/components/layout/Header.tsx`: هدر تا `lg` (۱۰۲۴px) پنهان می‌شود، پس تبلت
  هدر ندارد.
- `apps/web/components/layout/MobileNav.tsx`: نوبار پایین تا `lg` نمایش داده می‌شود،
  پس تبلت هم نوبار موبایلی دارد.
- `apps/web/app/globals.css`: فضای پایین `body` تا `max-width:1023px` اعمال می‌شود تا
  محتوا پشت نوبار پنهان نماند.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`: چیدمان
  اسپلیت از `md` فعال شد با نسبت تبلتی
  `minmax(0,1fr)_minmax(300px,38%)` (و نسبت دسکتاپی `1fr_420px` برای `lg`)؛ پنل کنار
  از `md` نمایش داده می‌شود.
- `apps/web/components/ui/MobileSheet.tsx`: شیت پایین فقط زیر `md` فعال است، پس در
  تبلت جزئیات در پنل کنار دیده می‌شود.

**تأیید/تست:**
- تست UI با Playwright در عرض‌های ۳۹۰/۷۶۸/۸۳۴/۱۰۲۴: ۳۹۰ و ۷۶۸ و ۸۳۴ → نوبار پایین
  دیده شد، هدر مخفی و بدون اسکرول افقی؛ ۱۰۲۴ → هدر دیده شد و نوبار مخفی.
- در `/biolinks` در تبلت پنل کنار («یک بیولینک را انتخاب کنید») دیده شد و شیت پایین
  باز نشد (فقط موبایل).

## ۱۴۰۵/۰۷/۲۰ — رفع باگ‌های خبر پنل مدیر: ۴۰۴ + ویرایش/حذف بعد از انتشار — نسخه `v2.13.1`

**هدف:** رفع باگ‌های درخواست ۲: دکمه‌ی «مشاهده» خبر در پنل مدیر برای خبرهای
تأییدنشده صفحه‌ی جدید باز می‌کرد و ۴۰۴ می‌داد؛ و مدیر نمی‌توانست خبر منتشرشده را
ویرایش یا حذف کند. (تغییر نقش کاربر در بخش کاربران در تسک قبل انجام شده بود.)

**تغییرات:**
- `apps/api/src/news/news.service.ts`: افزودن `adminById` (خواندن هر خبر با هر
  وضعیتی) و `adminUpdate` (ویرایش مدیر بدون بازگشت به صف بررسی؛ امکان تغییر وضعیت و
  حفظ تاریخ انتشار برای خبر تأییدشده).
- `apps/api/src/news/dto/update-news-admin.dto.ts` (جدید): DTO ویرایش مدیر شامل
  فیلد اختیاری `status`.
- `apps/api/src/news/news.controller.ts`: افزودن `GET /admin/news/:id` و
  `PATCH /admin/news/:id`؛ و انتقال روت‌های `:id` به **پس از** روت‌های ثابت
  (`reporter-requests`/`categories`) تا مسیرها سایه نیفتند.
- `apps/web/components/admin/AdminNewsEditor.tsx` (جدید): فرم ویرایش کامل خبر
  (عنوان، وضعیت، دسته‌بندی، خلاصه، متن) + حذف، برای هر وضعیتی.
- `apps/web/components/admin/AdminNewsPanel.tsx`: جایگزینی لینکِ ۴۰۴دار «مشاهده» با
  دکمه‌ی «ویرایش» (باز کردن ویرایشگر)؛ لینک عمومی «مشاهده» فقط برای خبرهای
  `APPROVED` باقی مانده است.

**تأیید/تست:**
- تست API با curl: خبر PENDING → `GET /admin/news/:id` با موفقیت (قبلاً ۴۰۴) و
  `GET /news/public/:id` همچنان ۴۰۴؛ `PATCH /admin/news/:id` با `status:APPROVED`
  خبر را منتشر کرد؛ روت `GET /admin/news/categories` سایه نیفتاد؛ `DELETE` موفق.
- تست UI با Playwright در `admin?section=news`: دکمه‌ی «ویرایش» با ویرایشگر خبر و
  انتخابگر وضعیت باز شد؛ لینک ۴۰۴دار حذف شده بود.

## ۱۴۰۵/۰۷/۲۰ — نام منتشرکننده = نام کاربر + پروفایل کاربری با تأیید مدیر — نسخه `v2.13.0`

**هدف:** در پنل شهروند خبرنگار «نام منتشرکننده» باید همان نام کاربر باشد و قابل تغییر
نباشد؛ افزودن صفحه‌ی پروفایل کاربری با امکان درخواست تغییر نام که فقط پس از تأیید
مدیر اعمال شود.

**تغییرات:**
- `apps/api/src/news/news.service.ts`: در `createMine` و `updateMine` مقدار
  `publisherName` از نام کاربر (`fullName` و در نبودش ایمیل) پر می‌شود و ورودی کلاینت
  نادیده گرفته می‌شود.
- `apps/api/src/news/dto/create-news.dto.ts`: حذف فیلد `publisherName` از DTO (با
  `forbidNonWhitelisted`، ارسال دستی آن ۴۰۰ می‌گیرد).
- `apps/api/prisma/schema.prisma`: مدل جدید `ProfileChangeRequest` (changes JSON،
  status، reason، decidedAt) برای درخواست‌های تغییر پروفایل.
- `apps/api/src/profile/` (جدید): سرویس/کنترلر/ماژول/دی‌تی‌او — `GET /profile/me`،
  `POST /profile/change-request`، `GET /admin/profile-requests` و
  `PATCH /admin/profile-requests/:id` (تأیید/رد با اعمال فیلدهای مجاز).
- `apps/api/src/admin/admin.service.ts` و `admin.controller.ts` و
  `dto/manage-user.dto.ts`: افزودن `PATCH /admin/users/:id/role` برای تغییر نقش کاربر
  (USER / CITIZEN_REPORTER / ADMIN) همراه با نوتیف و لاگ فعالیت.
- `apps/web/components/reporter/ReporterPanel.tsx`: فیلد «نام منتشرکننده» فقط‌خواندنی
  و برابر نام کاربر؛ حذف `publisherName` از payload.
- `apps/web/components/dashboard/ProfilePanel.tsx` و
  `apps/web/app/dashboard/profile/page.tsx` (جدید): صفحه‌ی پروفایل با اطلاعات حساب و
  فرم درخواست تغییر نام.
- `apps/web/components/admin/AdminProfileRequests.tsx` (جدید): بخش تأیید/رد درخواست‌های
  تغییر پروفایل در «کاربران» پنل مدیر.
- `apps/web/components/admin/AdminTables.tsx` و `apps/web/app/admin/page.tsx`:
  انتخابگر نقش کاربر در جدول کاربران.
- `apps/web/components/dashboard/UserShell.tsx`: لینک «پروفایل کاربری» در منوی پنل.

**تأیید/تست:**
- تست API با curl: ثبت خبر با `publisherName` دستی → ۴۰۰؛ ثبت خبر بدون آن →
  `publisherName` برابر نام کاربر؛ `profile/me` → ثبت درخواست تغییر → تأیید مدیر →
  نام اعمال شد و `pendingChange` خالی شد؛ `PATCH /admin/users/:id/role` نقش را تغییر
  داد؛ نقش نامعتبر ۴۰۰ و دسترسی غیرمدیر ۴۰۳.
- تست UI با Playwright: صفحه‌ی `/dashboard/profile`، بخش «درخواست‌های تغییر پروفایل»
  و انتخابگر نقش در `admin?section=users` رندر شدند.

---

## ۱۴۰۵/۰۷/۲۰ — قانون ۷: کامیت مرحله‌به‌مرحله‌ی تسک‌های نامرتبط — نسخه `v2.12.2`

**هدف:** دائمی‌کردن یکی از وظایف مهم ایجنت: اگر کاربر چند کار متفاوت و نامرتبط را
در چند مرحله تحویل داد، باید هر تسک مستقل انجام، تست، کامیت و در تاریخچه ثبت شود و
سپس به تسک بعدی رفت.

**تغییرات:**
- `AGENTS.md`: افزودن «قانون ۷ — کامیت مرحله‌به‌مرحله‌ی تسک‌های نامرتبط» با جزئیات
  ترتیب کار (پیاده‌سازی → تست → sync → تاریخچه/نسخه → کامیت → تسک بعدی) و استثنای
  تسک‌های وابسته.
- `History-Agent.md`: افزودن بلوک «قانون کامیت مرحله‌به‌مرحله» در بالای فایل کنار
  سایر قوانین دائمی.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v2.12.2`.

**تأیید/تست:**
- بازبینی متن `AGENTS.md` و `History-Agent.md` برای هم‌سویی بلوک قوانین (قانون ۵).
- `AGENTS.md` در بلوک‌های `install.sh` جاسازی نشده است (خارج از مسیرهای قانون ۳)،
  پس `sync_install.py` تغییری لازم نداشت؛ با این حال `--check` بدون تغییر معلق اجرا شد.

---

## ۱۴۰۵/۰۷/۲۰ — دکمه‌ی «درخواست شهروند خبرنگار» در سه نقطه + حذف نوتیف مدیر — نسخه `v2.12.1`

**هدف:** تکمیل بند ۴ درخواست: دکمه‌ی «درخواست شهروند خبرنگار» باید در صفحه‌ی اصلی و
صفحات اطلاعیه/اخبار مهم شهر دیده شود و برای کاربران شهروند خبرنگار/مدیر پنهان بماند؛
همچنین هنگام ثبت درخواست هیچ نوتیفی برای مدیر ارسال نشود.

**تغییرات:**
- `apps/api/src/news/news.service.ts`: حذف `notifyAdmins` از `requestReporter` تا با
  ثبت درخواست شهروند خبرنگار، نوتیفی برای مدیر ارسال نشود (درخواست‌ها در بخش «نبض شهر»
  پنل مدیر قابل مشاهده‌اند).
- `apps/web/components/news/ReporterCtaButton.tsx` (موجود، حالا استفاده‌شده): دکمه‌ی
  مشترک که برای کاربران تأییدشده پنهان می‌شود؛ نقش کاربر از `/auth/me` (نقش زنده‌ی
  دیتابیس) خوانده می‌شود، نه از endpoint ناموجود `/news/reporter/me`.
- `apps/web/components/reporter/ReporterPanel.tsx`: نقش زنده‌ی کاربر از `/auth/me`
  گرفته می‌شود تا پس از تأیید مدیر، پنل بدون نیاز به ورود مجدد فعال شود.
- `apps/web/app/page.tsx`: افزودن نوار «شهروند خبرنگار شوید» به‌همراه دکمه‌ی درخواست
  در صفحه‌ی اصلی.
- `apps/web/app/pulse/page.tsx`: افزودن دکمه به سربرگ صفحه‌ی «نبض شهر» (اخبار مهم شهر).
- `apps/web/app/dashboard/notifications/page.tsx`: افزودن دکمه به بالای صفحه‌ی اعلانات.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/web` بدون خطا؛ build داکر `apps/api` و `apps/web` موفق.
- `python3 scripts/sync_install.py --check` بدون «تغییر معلق» (بلوک‌های `install.sh`
  همگام شدند).

---

## ۱۴۰۵/۰۷/۲۰ — سیستم خبری «نبض شهر» + نقش شهروند خبرنگار — نسخه `v2.12.0`

**هدف:** افزودن بخش خبرها به صفحه اصلی (جدول تیترها با نویسنده/منتشرکننده و دکمه‌ی
«مشاهده کامل خبر»)، صفحه‌ی کامل «نبض شهر» با جست‌وجو و فیلتر، نقش جدید «شهروند خبرنگار»
با پنل کاربری مجزا، و یک بخش مدیریتی برای تأیید/تنظیمات خبر.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: enumهای `NewsStatus`، نقش `CITIZEN_REPORTER` و
  مدل‌های `NewsCategory`، `NewsItem`، `ReporterRequest`.
- `apps/api/prisma/seed.ts`: پنج دسته‌بندی پیش‌فرض خبری و دو خبر نمونه.
- `apps/api/src/news/` (جدید): سرویس/کنترلر/ماژول/دی‌تی‌او — فید عمومی، پنل خبرنگار،
  و مدیریت (تأیید خبر، درخواست‌های شهروند خبرنگار، دسته‌بندی‌ها).
- `apps/api/src/settings/settings.service.ts` و `settings.controller.ts`: تنظیم
  `newsHeadlineCount` و `newsAccessLevel` (سه سطح دسترسی).
- `apps/api/src/common/decorators/{roles,current-user}.decorator.ts` و لایه‌های auth:
  افزودن نقش `CITIZEN_REPORTER`.
- `apps/web/components/news/PulseSection.tsx`: جدول تیترهای صفحه اصلی (badge، عنوان،
  منتشرکننده، تاریخ، دکمه‌ی «مشاهده کامل خبر»).
- `apps/web/app/pulse/page.tsx` و `apps/web/app/pulse/[id]/page.tsx`: لیست کامل با
  جست‌وجو/فیلتر/صفحه‌بندی و صفحه‌ی جزئیات خبر.
- `apps/web/components/news/PulseFilters.tsx` و `apps/web/components/reporter/ReporterPanel.tsx`:
  فیلتر خبرها و پنل «خبرهای من» شهروند خبرنگار.
- `apps/web/components/admin/AdminNewsPanel.tsx` و `AdminNewsSettings.tsx`: بخش تازه‌ی
  «نبض شهر» و «تنظیمات نبض شهر» در پنل مدیر.
- `apps/web/app/admin/page.tsx`، `components/admin/AdminShell.tsx`،
  `components/dashboard/UserShell.tsx`، `components/layout/Header.tsx` و `Footer.tsx`:
  ناوبری/ورود به بخش‌های تازه.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/web` بدون خطا؛ build داکر `apps/api` و `apps/web` موفق.
- تست API با curl: فید عمومی (headlines/list/search/categories)، درخواست نقش →
  خطای ۴۰۳ پیش از تأیید → تأیید مدیر → نقش `CITIZEN_REPORTER` → ثبت خبر → تأیید خبر
  → نمایش در headlines؛ تغییر `newsHeadlineCount` و `newsAccessLevel` نیز اثر کرد.
- تست UI با Playwright + google-chrome: بخش نبض شهر در صفحه اصلی، صفحه‌ی `/pulse` با
  جست‌وجو، صفحه‌ی جزئیات، بخش «نبض شهر» پنل مدیر (سه تب) و پنل «شهروند خبرنگار» رندر شدند.
- داده‌های تستی خبرنگار و خبر تستی پس از تست پاک و تنظیمات به مقدار پیش‌فرض بازگشت.

---

## ۱۴۰۵/۰۷/۲۰ — اعلانات: حذف خوانده‌ها از زنگ + صفحه‌ی تاریخچه‌ی کامل — نسخه `v2.11.0`

**هدف:** اعلان‌های خوانده‌شده از لیست زنگ حذف شوند، لینک «مشاهده تمامی اعلانات» به
انتهای لیست اضافه شود، و صفحه‌ی اختصاصی نمایش همه‌ی اعلانات (قدیم و جدید) ساخته شود.

**تغییرات:**
- `apps/api/src/notifications/notifications.service.ts`: `listForUser`/`listForAdmin`
  فقط اعلان‌های خوانده‌نشده (`readAt: null`) را برمی‌گردانند؛ متدهای تازه‌ی
  `pageForUser`/`pageForAdmin` تاریخچه‌ی کامل را با صفحه‌بندی (`meta`) می‌دهند.
- `apps/api/src/notifications/notifications.controller.ts`: روت‌های جدید
  `GET /notifications/mine/page` و `GET /admin/notifications/page`.
- `apps/web/lib/api.ts`: تایپ `NotificationPage`.
- `apps/web/components/ui/NotificationBell.tsx`: بعد از خواندن، ردیف از لیست حذف
  می‌شود؛ لینک «مشاهده تمامی اعلانات» به انتهای پاپ‌اور اضافه شد.
- `apps/web/components/ui/NotificationsInbox.tsx`: کامپوننت تازه‌ی تاریخچه‌ی اعلانات
  با صفحه‌بندی و «خواندن همه» (مشترک بین کاربر و مدیر).
- `apps/web/app/dashboard/notifications/page.tsx`: صفحه‌ی اعلانات کاربر.
- `apps/web/app/admin/page.tsx` و `apps/web/components/admin/AdminShell.tsx`: سکشن
  تازه‌ی «اعلانات» در پنل مدیر.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit` بدون خطا.
- بازسازی ایمیج‌ها و `docker compose up -d --force-recreate api web`.
- تست API: `/notifications/mine` فقط ۵ مورد خوانده‌نشده برگرداند در حالی که
  `/notifications/mine/page` مجموع ۱۳ مورد را با `meta.totalPages=3` داد.
- تست UI با Playwright + google-chrome: زنگ فقط خوانده‌نشده‌ها را نشان می‌دهد،
  لینک «مشاهده تمامی اعلانات» موجود است، کلیک روی اعلان آن را از لیست حذف می‌کند،
  و صفحه‌ی `/dashboard/notifications` و سکشن `?section=notifications` پنل مدیر رندر شدند.

---

## ۱۴۰۵/۰۷/۲۰ — تست فشار تولید (۲۰۰ و ۵۰۰ کاربر همزمان) + گزارش PDF — نسخه `v2.10.0` (بدون تغییر کد)

**هدف:** سنجش عملکرد نسخه‌ی منتشرشده روی سرور تولید (`alooshomal.ir`, نسخه `v2.10.0`)
زیر بار ۲۰۰ و سپس ۵۰۰ کاربر همزمان که در بیولینک‌ها و کارت‌های ویزیت جست‌وجو می‌کنند،
و تحویل نتیجه در قالب فایل PDF.

**محیط:** سرور تولید تک‌هسته (1 vCPU)؛ داده: ۲۵۰۱ بیولینک + ۲۳۰۱ کارت منتشرشده؛
ابزار autocannon، هر سناریو ۲۰ ثانیه، از بیرون علیه `https://alooshomal.ir/api`.

**تغییرات:**
- `scripts/load_test.mjs`: جدا کردن سناریوی جست‌وجوی بیولینک و کارت (`search-biolinks`/`search-cards`).
- `scripts/load_test_report.py`: اسکریپت جدید تولید گزارش PDF فارسی (HTML با فونت Shabnam →
  headless Chrome) از فایل‌های JSON تست.
- `docs/reports/load-test-report.pdf`: گزارش نهایی تحویلی.

**نتیجه — ۲۰۰ کاربر همزمان (صفر خطا/غیر‑2xx):**

| سناریو | rps | میانگین | p50 | p99 |
| --- | --- | --- | --- | --- |
| لیست بیولینک‌ها صفحه‌ی ۱ | ۹۵ | ۱۷۳۲ms | ۱۴۲۰ms | ۶۴۷۴ms |
| لیست بیولینک‌ها صفحه‌ی عمیق | ۱۴۱ | ۶۴۵ms | ۵۹۴ms | ۲۲۶۴ms |
| جست‌وجوی بیولینک (`q=علی`) | ۱۴۲ | ۱۳۶۹ms | ۱۲۶۹ms | ۴۹۴۳ms |
| جست‌وجوی کارت (`q=علی`) | ۱۴۱ | ۱۲۴۶ms | ۱۰۸۶ms | ۶۲۳۳ms |
| فیلتر شهر | ۱۳۴ | ۱۳۸۰ms | ۱۲۳۹ms | ۷۹۷۵ms |
| لیست کارت‌ها صفحه‌ی ۱ | ۱۴۵ | ۱۱۶۰ms | ۹۹۵ms | ۵۰۵۹ms |

**نتیجه — ۵۰۰ کاربر همزمان (صفر خطا/غیر‑2xx):**

| سناریو | rps | میانگین | p50 | p99 |
| --- | --- | --- | --- | --- |
| لیست بیولینک‌ها صفحه‌ی ۱ | ۱۰۶ | ۹۸۲ms | ۶۷۲ms | ۹۰۵۴ms |
| لیست بیولینک‌ها صفحه‌ی عمیق | ۱۵۵ | ۸۱۸ms | ۶۹۳ms | ۸۵۶۳ms |
| جست‌وجوی بیولینک (`q=علی`) | ۱۴۸ | ۹۱۳ms | ۷۶۸ms | ۷۳۸۶ms |
| جست‌وجوی کارت (`q=علی`) | ۱۶۴ | ۲۲۷۱ms | ۲۲۰۰ms | ۹۶۳۸ms |
| فیلتر شهر | ۱۱۶ | ۹۳۱ms | ۶۶۷ms | ۸۶۶۶ms |
| لیست کارت‌ها صفحه‌ی ۱ | ۱۵۹ | ۹۳۱ms | ۸۱۲ms | ۷۶۳۰ms |

**تحلیل:** در هر دو سطح بار، نرخ پاسخ (rps) تقریباً ثابت ماند و خطا صفر بود؛ یعنی سقف
عمدتاً ظرفیت CPU تک‌هسته است نه کد/دیتابیس. جست‌وجو زیر ۵۰۰ کاربر به‌طور میانگین ~۰.۹s
(بیولینک) و ~۲.۳s (کارت) بود. «صفحه‌ی اول لیست» در ابتدای هر اجرا کندتر (کش سرد) و پس از
گرم‌شدن کش سریع‌تر شد.

**تأیید/تست:**
- `node scripts/load_test.mjs --label prod-200 --connections 200` و `--label prod-500
  --connections 500` علیه `https://alooshomal.ir/api` → خروجی بالا و فایل‌های
  `test-data/load-test-prod-200.json` / `load-test-prod-500.json`.
- `python3 scripts/load_test_report.py` → `docs/reports/load-test-report.pdf` (۲ صفحه، A4).
- تأیید نسخه‌ی منتشرشده: فوتر سایت `v2.10.0`.

---

## ۱۴۰۵/۰۷/۲۰ — کش مشترک Redis + کش نتایج دایرکتوری (تست فشار ۵۰۰ کاربر: جست‌وجو ۴.۳ برابر) — نسخه `v2.10.0`

**هدف:** رساندن تجربه‌ی جست‌وجو زیر بار ۵۰۰ کاربر همزمان بین بیولینک‌ها و کارت‌ها
به سطح «بدون کندی محسوس»، با افزودن یک لایه‌ی کش مشترک Redis و کش‌کردن صفحات
دایرکتوری (نه فقط facetها). Redis فقط کش است و هرگز جای Postgres را نمی‌گیرد.

**تغییرات:**
- `docker-compose.yml` و `docker-compose.prod.yml`: افزودن سرویس `redis:7-alpine`
  با `--save "" --appendonly no` (بدون مصرف دیسک) و `--maxmemory-policy allkeys-lru`؛
  `api` به‌صورت `condition: service_healthy` به آن وابسته شد.
- `.env` / `.env.example`: افزودن `REDIS_URL=redis://redis:6379`.
- `apps/api/src/redis/redis.service.ts` + `redis.module.ts`: کلاینت ioredis مقاوم؛
  اتصال lazy و non-throwing، fallback خودکار به حافظه در صورت قطعی، و
  `delByPrefix` با SCAN غیرمسدودکننده.
- `apps/api/src/common/facets-cache.service.ts`: کش دو لایه (حافظه + Redis) با
  `ttlOverrideMs` و متد `invalidateDirectory`.
- `apps/api/src/biolinks/biolinks.service.ts` و `businesscards/business-cards.service.ts`:
  کش صفحات دایرکتوری بر اساس کلید `(sort, cityId, businessId, q, page, limit)`
  (TTL پیش‌فرض ۱۵ ثانیه)؛ `liked/saved` هر کاربر همیشه تازه محاسبه می‌شود.
- `apps/api/src/admin/admin.service.ts`، `admin/bulk.service.ts`، `boosts/boosts.service.ts`،
  `biolinks/biolinks.service.ts`، `businesscards/business-cards.service.ts`،
  `taxonomy/taxonomy.service.ts`: باطل‌کردن کش پس از هر نوشتن محتوا (تأیید/رد،
  ویرایش، حذف، پله، ایمپورت/حذف گروهی، تغییر شهر/دسته).
- `docs/DEPLOY.md`: بخش «Redis (کش مشترک — اختیاری)» با تأکید بر اینکه Redis منبع
  حقیقت نیست و به دیتابیس/دیسک دست نمی‌زند.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.10.0`.

**تست فشار سه‌مرحله‌ای (۵۰۰ اتصال، ۲۰ ثانیه هر سناریو، صفر خطا/غیر‑2xx):**

| سناریو | rps قبل | +trigram/کش‌حافظه | +Redis/کش‌صفحه | میانگین (قبل→نهایی) |
| --- | --- | --- | --- | --- |
| لیست صفحه‌ی ۱ | ۹۸ | ۱۴۹ | ۴۱۴ | ۴۵۳۰→۶۵۹ms |
| صفحه‌ی عمیق (`page=100`) | ۱۰۲ | ۱۱۶ | ۴۰۲ | ۴۶۲۸→۱۲۰۲ms |
| جست‌وجوی فارسی (`q=علی`) | ۷۵ | ۱۰۲ | ۳۲۴ | ۶۳۴۰→۱۵۱۵ms |
| فیلتر شهر | ۱۰۹ | ۱۰۷ | ۳۴۶ | ۳۹۴۶→۱۴۱۴ms |
| لیست کارت‌ها | ۱۰۲ | ۱۶۴ | ۲۴۸ | ۴۳۴۰→۱۹۰۳ms |

**تأیید صحت:**
- `docker exec alooshomal-redis redis-cli --scan --pattern 'alooshomal:cache:*'` →
  کلیدهای `dir:biolinks:...` و `biolinks:facets` ساخته شدند.
- تأیید یک بیولینک از پنل مدیر → تعداد کلیدهای `dir:*` از ۱ به ۰ رسید (باطل‌سازی فوری).
- شمارش دیتابیس پس از همه‌ی تست‌ها بدون تغییر ماند (۲۵۰۴ بیولینک / ۲۳۰۵ کارت).
- تأخیر تک‌درخواست با کش: ~۵ms (از ~۱۷–۲۶ms بدون کش).
- `docker exec alooshomal-api npx tsc --noEmit` بدون خطا؛
  `python3 scripts/sync_install.py --check` سبز.

**یادداشت امنیت داده:** هیچ `DROP/DELETE/TRUNCATE` اضافه نشد؛ اسکیمای Postgres فقط
additive است (`CREATE EXTENSION/INDEX IF NOT EXISTS`). Redis روی volume جدا و بدون
persistence اجرا می‌شود و به `alooshomal_db_data` دسترسی ندارد.

---

## ۱۴۰۵/۰۷/۲۰ — جست‌وجوی trigram + کش facetها + تست فشار ۵۰۰ کاربر همزمان (قبل/بعد) — نسخه `v2.9.0`

**هدف:** بهینه‌سازی مسیرهای سنگین دایرکتوری عمومی (جست‌وجوی متنی و فهرست facetها)
که در تست بار قبلی گلوگاه بودند، و سنجش اثر واقعی آن‌ها با یک تست فشار ۵۰۰ کاربر
همزمان به‌صورت «قبل» و «بعد» و مقایسه‌ی نتایج.

**محیط تست (محلی):**
- سرور توسعه روی همان ماشین (۴ هسته‌ی فیزیکی)؛ کانتینرهای `alooshomal-db` (Postgres
  17) و `alooshomal-api` (حالت watch) و `alooshomal-web`.
- داده: ۲۵۰۳ بیولینک منتشرشده + ۲۳۰۴ کارت ویزیت منتشرشده (شامل ۲۵۰۰+۲۳۰۰ ردیف تستی).
- ابزار: `autocannon` (از طریق `npx`)، ۵۰۰ اتصال همزمان، ۲۰ ثانیه به‌ازای هر سناریو،
  `pipelining=1`.

**تست فشار «قبل» (کد قبلی، بدون ایندکس trigram و بدون کش facet):**

| سناریو | rps | میانگین | p99 |
| --- | --- | --- | --- |
| لیست صفحه‌ی ۱ | ۹۸ | ۴۵۳۰ms | ۸۰۴۹ms |
| صفحه‌ی عمیق (`page=100`) | ۱۰۲ | ۴۶۲۸ms | ۵۸۱۴ms |
| جست‌وجوی فارسی (`q=علی`) | ۷۵ | ۶۳۴۰ms | ۶۷۲۳ms |
| فیلتر شهر | ۱۰۹ | ۳۹۴۶ms | ۴۷۰۸ms |
| لیست کارت‌ها صفحه‌ی ۱ | ۱۰۲ | ۴۳۴۰ms | ۵۰۷۷ms |

هیچ خطا یا پاسخ غیر‑2xx ثبت نشد. گلوگاه: CPU (اسکن کامل/فیلتر روی `pinnedAt` و
`ILIKE '%q%'` روی ۴ ستون).

**تغییرات:**
- `apps/api/prisma/bootstrap.sql`: فایل SQL جدید و idempotent؛ فعال‌سازی افزونه‌ی
  `pg_trgm`، ساخت ۸ ایندکس GIN trigram روی `fullName/jobTitle/company/bio` هر دو
  جدول، و ۲ ایندکس ترکیبی `(status, isPublished, pinnedAt DESC, id DESC)`.
- `apps/api/docker-entrypoint.sh`: پس از `prisma db push`، فایل `prisma/bootstrap.sql`
  با `psql` اجرا می‌شود (شکست آن مانع بالا آمدن سرویس نمی‌شود).
- `apps/api/src/common/facets-cache.service.ts` + `common.module.ts`: کش درون‌حافظه‌ای
  کوتاه‌مدت (پیش‌فرض ۳۰ ثانیه، با `FACETS_CACHE_TTL_MS` قابل تنظیم) با ادغام
  درخواست‌های همزمان (single-flight).
- `apps/api/src/biolinks/biolinks.service.ts` و `businesscards/business-cards.service.ts`:
  کوئری‌های facet شهر/کسب‌وکار از داخل تراکنش درآمده و از کش خوانده می‌شوند؛ کوئری
  لیست/شمارش موازی اجرا می‌شود.
- `apps/api/src/taxonomy/taxonomy.service.ts`: هر افزودن/ویرایش/حذف شهر یا دسته‌بندی،
  کش facetها را باطل می‌کند.
- `apps/api/src/app.module.ts`: ثبت `CommonModule` به‌صورت global.
- `scripts/seed_load_test.py`: تولید مستقیم داده‌ی تستی در دیتابیس (بدون HTTP) از
  فایل‌های CSV موجود، برای آماده‌سازی سریع تست فشار.
- `scripts/load_test.mjs`: هارنس تست فشار autocannon با سناریوهای ثابت و خروجی JSON.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.9.0`.

**تست فشار «بعد» (همان سناریوها، همان ۵۰۰ اتصال):**

| سناریو | rps | میانگین | p99 | تغییر rps |
| --- | --- | --- | --- | --- |
| لیست صفحه‌ی ۱ | ۱۴۹ | ۳۱۳۸ms | ۴۰۴۳ms | ۹۸→۱۴۹ (+۵۲٪) |
| صفحه‌ی عمیق (`page=100`) | ۱۱۶ | ۴۰۱۴ms | ۴۸۸۳ms | ۱۰۲→۱۱۶ (+۱۴٪) |
| جست‌وجوی فارسی (`q=علی`) | ۱۰۲ | ۴۳۴۴ms | ۴۹۴۹ms | ۷۵→۱۰۲ (+۳۶٪) |
| فیلتر شهر | ۱۰۷ | ۳۹۳۸ms | ۵۰۲۲ms | ۱۰۹→۱۰۷ (≈بدون تغییر) |
| لیست کارت‌ها صفحه‌ی ۱ | ۱۶۴ | ۲۸۱۳ms | ۳۳۱۲ms | ۱۰۲→۱۶۴ (+۶۱٪) |

صفر خطا/غیر‑2xx در هر دو اجرا. بهبود p99 لیست صفحه‌ی ۱ حدود ۵۰٪ (۸۰۴۹→۴۰۴۳ms).

**برنامه‌ی کوئری (تأیید مستقیم):**
- جست‌وجو: `BitmapOr` روی ایندکس‌های `*_trgm_idx` و اجرا از ۲.۱۳ms به ۰.۶۶ms.
- لیست پیش‌فرض: `Index Only Scan` روی `biolinks_status_published_pinned_idx`
  (۰.۱۰ms، `Heap Fetches: 0`).

**تأیید/تست:**
- `python3 scripts/seed_load_test.py` → درج ۲۵۰۰ بیولینک و ۲۳۰۰ کارت.
- `node scripts/load_test.mjs --label before` و `--label after` (۵۰۰ اتصال، ۲۰s) →
  نتایج بالا؛ فایل‌های `test-data/load-test-before.json` و `test-data/load-test-after.json`.
- `docker exec alooshomal-api npx tsc --noEmit` → بدون خطا.
- `python3 scripts/sync_install.py --check` → «patched: 0 / added: 0».

---

## ۱۴۰۵/۰۷/۲۱ — اندازه‌گیری سرعت، بار و منابع سرور با ۴۸۰۰ داده‌ی تستی — نسخه `v2.8.1` (بدون تغییر کد)

**هدف:** سنجش پاسخ‌دهی، بار درخواست و منابع سرور تولید پس از ایمپورت ۲۵۰۰ بیولینک و
۲۳۰۰ کارت ویزیت تستی روی `alooshomal.ir`.

**محیط سرور:**
- سرور تک‌هسته‌ای (1 vCPU Haswell) با ۳ گیگ رم، بدون swap؛ دیسک ۲۸G (۱۵٪ استفاده).
- کانتینرهای `nginx`، `web`، `api`، `db` هر چهارتا سالم.
- دیتابیس: ۲۵۰۰/۲۳۰۰ ردیف تستی + ۲/۲ ردیف واقعی.

**تست بار (از داخل کانتینر api علیه nginx، ۸–۲۰ ثانیه، همه ۲۰۰، صفر خطا):**
- همزمانی ۱ → ‏۴۶ rps، میانگین ۲۲ms.
- همزمانی ۵ → ‏۵۰ rps، میانگین ۹۸ms.
- همزمانی ۱۰ → ‏۶۰ rps، میانگین ۱۶۶ms (p99 ‏۳۵۸ms).
- همزمانی ۲۰ → ‏۵۸ rps، میانگین ۳۳۶ms.
- همزمانی ۵۰ → ‏۵۳ rps، میانگین ۹۰۶ms (اشباع).
- بهینه‌سازی‌شده در ~۶۰ درخواست بر ثانیه؛ گلوگاه **تک‌هسته بودن سرور** است (CPU کانتینر
  api تا ~۹۸٪).

**تأخیر پایه (تک‌درخواست، بی‌بار):** لیست دایرکتوری ۱۵–۳۰ms؛ جست‌وجو ۳۱–۵۱ms.

**تفکیک مسیرها زیر همزمانی ۱۰ (میانگین/p99):** لیست بیولینک ۱۸۱/۳۷۵ms؛ صفحه‌ی عمیق
(`page=100`) ۲۲۳/۴۷۸ms؛ فیلتر شهر ۱۸۲/۳۱۱ms؛ جست‌وجو (q فارسی) ۳۱۵/۴۶۸ms؛ لیست
کارت‌ها ۱۶۰/۲۹۶ms.

**منابع زیر بار:** کانتینر api ~۲۳۰–۲۶۴MB (تیک مؤثر گلوگاه CPU)؛ web ~۶۰MB؛ db
~۴۲MB (CPU زیر ۲۰٪)؛ nginx ~۵MB (زیر ۳٪). هیچ خطای nginx/api در لاگ‌ها ثبت نشد؛
gzip فعال است.

**نتیجه:** با این حجم داده، پاسخ‌دهی تک‌کاربره کاملاً روان است و سقف ظرفیت سرور حدود
۶۰ درخواست بر ثانیه (عمدتاً محدود به CPU تک‌هسته) است. منابع آزاد برای رشد بیشتر داده
وجود دارد؛ برای بار بالاتر باید CPU سرور افزایش یابد و ایندکس/کش queryهای جست‌وجو
بهینه شود (پیشنهاد در `BACKLOG.md`).

**تأیید/تست:** اسکریپت بنچمارک Node داخل کانتینر api اجرا شد (لیست/فیلتر/جست‌وجو با
همزمانی‌های مختلف)؛ توزیع کدهای پاسخ، rps، صدک‌ها و `docker stats` نمونه‌برداری شد.
فایل‌های موقت بنچمارک از سرور پاک شدند.

---

## ۱۴۰۵/۰۷/۲۱ — اسکریپت مولد فایل‌های تست بار (۲۵۰۰ بیولینک + ۲۳۰۰ کارت ویزیت) — نسخه `v2.8.1`

**هدف:** ساخت فایل‌های داده‌ی تستی برای تست دستی روی سایت: ۲۵۰۰ ردیف بیولینک و ۲۳۰۰
ردیف کارت ویزیت، با هدرهای فارسی مورد قبول ایمپورتر گروهی، تا کاربر بتواند از پنل مدیر
آپلود کند و بار واقعی را بسنجد.

**تغییرات:**
- `scripts/generate_test_data.py` (جدید): مولد قابل‌تکرار CSV با هدر فارسی
  («نام، عنوان شغلی، شرکت، شهر، کسب و کار، تلفن، ایمیل، وبسایت، آدرس») و داده‌ی
  شبه‌واقعی (نام، شهر، دسته‌ی کسب‌وکار، تلفن و آدرس). اجرا: `python3 scripts/generate_test_data.py [out_dir]`.
- `.gitignore`: پوشه‌ی `test-data/` نادیده گرفته می‌شود (فایل‌های حجیم تستی در گیت
  نگه‌داری نمی‌شوند؛ با اسکریپت بازتولید می‌شوند).
- خروجی‌ها در `test-data/`: `biolinks-2500.csv`، `business-cards-2300.csv` و نسخه‌های
  `.xlsx` هر کدام (برای کاربر ساخته شد، اما به‌خاطر حجم gitignore شده‌اند).

**تأیید/تست:**
- ایمپورت واقعی از طریق اندپوینت `POST /api/admin/bulk/import`:
  CSV بیولینک → `imported=2500, skipped=0`؛ XLSX کارت ویزیت → `imported=2300, skipped=0`.
- کارایی دایرکتوری با ۴۸۰۰ ردیف: هر درخواست صفحه ~۱۵–۲۰ میلی‌ثانیه.
- حذف گروهی هر ۴۸۰۰ ردیف در ~۰.۵ ثانیه؛ سپس شمارش تستی صفر و ۴ بیولینک/۵ کارت
  ویزیت واقعی دست‌نخورده.

---

## ۱۴۰۵/۰۷/۲۱ — اجرای فیلتر جست‌وجو فقط با دکمه‌ی «جستجو» + ابزارهای تست بار (ایمپورت/حذف گروهی + قفل ساخت) — نسخه `v2.8.0`

**هدف:** (۷) در دایرکتوری‌های `/biolinks` و `/business-cards` فیلتر بر اساس شهر/نوع
کسب‌وکار و تایپ کلمه‌ی جست‌وجو **بلافاصله** اعمال می‌شد و با زیادشدن کارت‌ها کند می‌شد؛
باید فقط با زدن دکمه‌ی «جستجو» اعمال شود. (۸) برای تست بار روی سرور، ابزاری در پنل
مدیر بسازیم که هزاران کارت ویزیت/بیولینک را از فایل اکسل (xlsx/csv) ایمپورت کند،
بتواند آن‌ها را سریع و گروهی حذف کند، و مدیر در حین تست بتواند ساخت کاربر واقعی را
موقتاً متوقف کند تا محتوای واقعی بین داده‌های تستی گم نشود.

**بند ۷ — فیلتر فقط با submit:**
- `apps/web/components/biolink/DirectoryFilters.tsx`: state محلی `draft` افزوده شد؛
  تایپ/انتخاب شهر/نوع کسب‌وکار فقط `draft` را تغییر می‌دهد و `onChange` (فیلتر واقعی)
  تنها در `onSubmit` فرم فراخوانی می‌شود. تغییر مرتب‌سازی (جدیدترین/محبوب‌ترین) همچنان
  فوری اعمال می‌شود.
- `apps/web/components/businesscard/DirectoryBusinessCardFilters.tsx`: همان الگو.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`: حذف
  `debouncedQuery`/دیبانس؛ کوئری حالا مستقیم از `filters` تأییدشده مشتق می‌شود.

**بند ۸ — ابزار تست بار:**
- `apps/api/prisma/schema.prisma`: فیلد `isTestData Boolean @default(false)` به
  مدل‌های `Biolink` و `BusinessCard` به‌همراه `@@index([isTestData])`.
- `apps/api/src/admin/bulk.service.ts` (جدید): `BulkService` —
  `parseWorkbook()` (ExcelJS؛ پشتیبانی xlsx و csv با هدرهای فارسی/انگلیسی)،
  `importRows(kind, ownerUserId, buffer)` (برچسب `isTestData:true`، انتشار/تأیید خودکار،
  ساخت خودکار City/BusinessCategory ناموجود، سقف ۵۰۰۰ ردیف)، `counts()`، و
  `deleteTestData(kind|'ALL')` که **فقط** ردیف‌های `isTestData:true` را حذف می‌کند.
- `apps/api/src/admin/admin.controller.ts`: تزریق `BulkService` و سه اندپوینت
  `GET /api/admin/bulk/counts`، `POST /api/admin/bulk/import` (FileInterceptor روی
  فیلد `file`)، `DELETE /api/admin/bulk/test-data?kind=`.
- `apps/api/src/admin/admin.module.ts`: ثبت `BulkService`.
- `apps/api/src/settings/settings.service.ts`: کلیدهای `allowBiolinkCreation` و
  `allowBusinessCardCreation` + اینترفیس `CreationLocks` + متدهای `getCreationLocks()`
  و `setCreationLocks()` (پیش‌فرض هر دو `true`).
- `apps/api/src/settings/settings.controller.ts`: افزودن این دو فیلد به DTO، به
  پاسخ ادمین، به `/settings/public` و به PATCH.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: در `create()` بررسی قفل و
  پرتاب `ForbiddenException` با پیام فارسی در صورت غیرفعال بودن.
- `apps/web/lib/api.ts`: `request()` وقتی بدنه `FormData` است هدر `Content-Type`
  نمی‌گذارد (مرز multipart خودکار تنظیم می‌شود) + متد `api.upload<T>(path, form)`.
- `apps/web/components/admin/AdminBulkTools.tsx` (جدید): رابط «ابزار تست» شامل
  کلیدهای قفل ساخت، ایمپورت (نوع + کاربر مالک + فایل + دانلود نمونه) و شمارش/حذف
  گروهی داده‌های تستی.
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`: افزودن
  بخش `tools` و آیتم ناوبری «ابزار تست» با آیکن `FlaskConical`.
- `apps/api/package.json`: افزودن وابستگی اجرایی `exceljs@^4.4.0` و وابستگی توسعه
  `@types/multer@^2.3.0`.

**تأیید/تست:**
- بند ۷: با `playwright-core` روی `/biolinks` — تایپ متن و انتخاب شهر بدون submit
  صفر درخواست شبکه ثبت شد؛ با کلیک «جستجو» یک درخواست و URL شامل
  `?q=تست&cityId=...` شد.
- بند ۸ (UI): در `/admin?section=tools` ایمپورت ۵۰۰ ردیفی CSV از رابط کاربری
  (`201`) و پیام «۵۰۰ ردیف افزوده شد»؛ سپس حذف گروهی (`200`) و «۵۰۰ ردیف تستی حذف
  شد» و شمارش به ۰ برگشت. کلید قفل ساخت از `true` به `false` و بازگشت به `true`
  تغییر کرد (بررسی از طریق `/settings/public`).
- یکپارچگی داده: `select count(*)` روی دیتابیس محلی نشان داد پس از حذف گروهی، ۴
  بیولینک و ۵ کارت ویزیت واقعی دست‌نخورده مانده و ردیف تستی صفر است.
- بدون خطای کنسول در بارگذاری تب ابزارها (تنها یک ۴۰۴ گذرای نامرتبط).

---

## ۱۴۰۵/۰۷/۲۰ — گزارش رویدادهای سیستم با صفحه‌بندی و ماندگاری قابل‌تنظیم + حذف متن گمراه‌کننده‌ی «فعال تا» پله — نسخه `v2.7.0`

**هدف:** (۵) متن «فعال تا تاریخ» در صفحه‌ی پله گمراه‌کننده است چون فیچر پله فقط یک‌بار
اعمال می‌شود؛ حذف شود. (۶) در تب «گزارش‌های سیستم» پنل مدیر یک سیستم لاگ واقعی با
صفحه‌بندی بسازیم که همه‌ی اقدامات کاربر و مدیر را یک‌خطی ثبت کند، به‌همراه مدت ماندگاری
قابل‌تعیین توسط مدیر و پاک‌سازی خودکار قدیمی‌ها برای جلوگیری از سنگین‌شدن دیتابیس.

**حذف متن «فعال تا»:**
- `apps/web/app/dashboard/boost/page.tsx`: برچسب «فعال تا <تاریخ>» حذف شد؛ فقط نشان
  `BoostBadge` برای حالت فعال می‌ماند.

**مدل و سرویس لاگ:**
- `apps/api/prisma/schema.prisma`: مدل `ActivityLog` (`activity_logs`) با فیلدهای
  `actorId/actorEmail/actorRole/actorIsAdmin`، `action`، `summary`، `entityType/entityId`،
  `ip`, `userAgent`, `createdAt` و ایندکس‌های `createdAt/actorId/action/actorIsAdmin`.
- `apps/api/src/activity/activity.service.ts`: `log()` (best-effort، هرگز اکشن اصلی را
  نمی‌شکند)، `list()` با صفحه‌بندی/فیلتر (نوع رویداد، فقط مدیر، جستجو)، `actions()` برای
  دراپ‌داون، و `prune()` که رکوردهای قدیمی‌تر از پنجره‌ی ماندگاری را حذف می‌کند.
- `apps/api/src/activity/activity-context.ts` + `activity-context.interceptor.ts`:
  `AsyncLocalStorage` سراسری که در هر درخواست، کاربر جاری و `ip`/`userAgent` را ذخیره
  می‌کند تا محل‌های `log()` فقط یک خط باشند. ایندکس `APP_INTERCEPTOR` در `app.module.ts`.
- `apps/api/src/activity/activity-retention.job.ts`: پاک‌سازی روزانه‌ی خودکار (setInterval
  با `unref`)؛ به‌محض تغییر مقدار ماندگاری هم فوراً prune می‌شود.
- `activity.controller.ts`: `GET /api/admin/activity` (لیست+فیلتر+actions) و
  `GET/PATCH /api/admin/activity/settings` برای مدت ماندگاری (ماه).
- ثبت رویداد در: ثبت‌نام/ورود، ساخت/ویرایش/حذف بیولینک و کارت، تأیید/رد آن‌ها، تیکت‌ها
  (ایجاد/پاسخ کاربر/پاسخ مدیر/تغییر وضعیت)، اشتراک (درخواست/تأیید/رد/تخصیص)، پله
  (درخواست/تأیید/رد)، و اقدامات کاربری مدیر (فعال/غیرفعال، یادداشت، حذف).
- `settings.service.ts`: کلید `activityRetentionMonths` با پیش‌فرض ۶ ماه و اعتبارسنجی ۱..۶۰.

**رابط کاربری:**
- `apps/web/components/admin/ActivityLogPanel.tsx`: جدول تک‌خطی با برچسب فارسی هر رویداد،
  کاربر (نشان مدیر/کاربر)، تاریخ‌وساعت شمسی، IP، جستجو، فیلتر نوع رویداد، «فقط اقدامات
  مدیر»، صفحه‌بندی، و کارت «ماندگاری گزارش‌ها» با دکمه‌ی ذخیره.
- `apps/web/app/admin/page.tsx`: تب «گزارش‌ها» به `ActivityLogPanel` وصل شد (خلاصه‌ی
  گزارش‌های قدیمی در داشبورد دست‌نخورده ماند).

**تأیید/تست:**
- `tsc --noEmit` برای api و web بدون خطا؛ `prisma generate` و `db push` موفق.
- `USER_LOGIN` با actor/ip/user-agent به‌صورت خودکار ثبت شد؛ ساخت تیکت و درخواست اشتراک
  نیز رکورد گرفتند (`total` از ۱ به ۸ رسید).
- فیلترها: `adminOnly=true` → ۳ رکورد و همه مدیر؛ `action=TICKET_CREATED` → ۱؛
  `search=تیکت` → ۱.
- ماندگاری: ۳ رکورد را به ۷ ماه قبل عقب بردم، سپس `activityRetentionMonths=6` →
  پاسخ `{"pruned":3}` و تعداد رکوردها از ۸ به ۶ رسید (پاک‌سازی فوری). بازگرداندن به ۶
  در پایان تست.
- UI با `playwright-core`: تب گزارش‌ها بارگذاری شد، کارت ماندگاری و جدول دیده شد،
  فیلتر نوع رویداد ۸ ردیف را به ۱ کاهش داد.
- صفحه‌ی پله کاربر با `playwright`: هیچ متن «فعال تا» باقی نمانده (کل مخزن هم صفر است).
- `python3 scripts/sync_install.py --check` بدون تغییر معلق.
- نسخه از `v2.6.0` → **`v2.7.0`** (قابلیت جدید سیستم لاگ → MINOR).

## ۱۴۰۵/۰۷/۲۰ — اعلان زنده (SSE)، کلید خاموش/روشن دسته‌ای برای اعلان مدیر، بنر آفلاین، و رفع ریشه‌ای پرش پنل هنگام کلیک روی اعلان — نسخه `v2.6.0`

**هدف:** سه درخواست کاربر (۱) به‌روزرسانی زنده‌ی زنگوله بدون رفرش و بدون فشار به سرور،
(۲) امکان خاموش/روشن کردن اعلان‌ها بر اساس نوع کار برای مدیر (با رشد تا ۱۰۰۰ کاربر)،
(۳) پیام «وضعیت اینترنت خود را بررسی نمایید» هنگام آفلاین‌شدن — به‌همراه رفع مشکل
چهارم: پرش/لرزش پنل هنگام کلیک روی اعلان زنگوله.

**اعلان زنده (بدون poll و بدون فشار سرور):**
- `apps/api/src/notifications/notifications-events.service.ts`: سرویس pub/sub درون‌حافظه‌ای
  (یک `Subject`) که فقط به کلاینت‌های متصل سیگنال می‌دهد؛ هزینه‌اش متناسب با کاربران
  آنلاین است، نه کل کاربران.
- `notifications.controller.ts`: دو اندپوینت SSE به‌صورت `text/event-stream`:
  `GET /api/notifications/mine/stream` و `GET /api/admin/notifications/stream`؛ با
  heartbeat هر ۲۵ ثانیه و پاک‌سازی در `req.on('close')`.
- `notifications.service.ts`: پس از هر `create` موفق، رویداد زنده emit می‌شود.
- `auth/strategies/jwt.strategy.ts`: توکن از `?token=` هم خوانده می‌شود (EventSource
  نمی‌تواند هدر بفرستد).
- `apps/web/components/ui/NotificationBell.tsx`: یک اتصال `EventSource` بیکار به‌ازای هر تب؛
  عدد زنگوله بلافاصله با هر رویداد زیاد می‌شود. poll پشتیبان از ۳۰s به ۱۲۰s کاهش یافت
  (فقط برای پوشش قطع‌شدن استریم) و با باز شدن پنل، فهرست یک‌بار تازه می‌شود.

**خاموش/روشن دسته‌ای اعلان مدیر:**
- `settings.service.ts`: دسته‌های `NEW_USER/BIOLINK/BUSINESS_CARD/SUBSCRIPTION/BOOST/TICKET`
  با کلیدهای `notifyAdmin.<CATEGORY>` در جدول `Setting`، کش ۱۰ ثانیه‌ای برای اینکه هر
  رویداد یک کوئری اضافه نزند، و پیش‌فرض «روشن».
- `notifications.service.ts`: اگر دسته خاموش باشد، **هیچ رکوردی ساخته نمی‌شود** (نه فقط
  پنهان‌سازی) — کلید صرفه‌جویی در حجم دیتابیس با هزار کاربر.
- `admin/settings` (GET/PATCH): خواندن و ذخیره‌ی تنظیمات اعلان‌ها.
- `apps/web/components/admin/AdminNotificationSettings.tsx`: شش سوییچ در تب «تنظیمات»
  پنل مدیر با دکمه‌ی ذخیره.
- همه‌ی محل‌های `notifyAdmins` دسته‌ی مربوطه را پاس می‌دهند.

**بنر آفلاین:**
- `apps/web/components/ui/OfflineBanner.tsx`: نوار بالای صفحه با رویدادهای
  `online`/`offline` و بازبینی سبک `navigator.onLine` هر ۵ ثانیه (بدون ping به سرور).
- در `apps/web/app/layout.tsx` یک‌بار در ریشه‌ی اپ mount شد.

**رفع ریشه‌ای پرش پنل هنگام کلیک روی اعلان:**
- علت: در `apps/web/app/admin/page.tsx` دو افکت «URL ↔ state» در پنجره‌ی گذار
  ناوبری کلاینتِ Next.js با هم مسابقه می‌دادند؛ `searchParams` لحظه‌ای خالی می‌شد،
  `overview` استنتاج می‌شد و مقدار قدیمی `section` به URL بازنویسی می‌شد → حلقه‌ی
  `router.replace` و لرزش بنل‌ها.
- راه‌حل: حذف حالت محلی و یک‌طرفه‌کردن جریان — `section` مستقیماً از `?section=` مشتق
  می‌شود و `setSection` فقط navigate می‌کند (منبع یکتا = URL).

**تأیید/تست:**
- `tsc --noEmit` هم برای api و هم برای web بدون خطا.
- بازتولید با `playwright-core` + `/usr/bin/google-chrome` روی dev محلی:
  - قبل از اصلاح: یک کلیک روی اعلان زنگوله → **۲۲ ناوبری** و بازگشت URL به `/admin`.
  - بعد از اصلاح: **۱ ناوبری** و ماندن روی `/admin?section=<مقصد>`.
  - ۹ کلیک تب → دقیقاً ۹ ناوبری؛ back/forward و دیپ‌لینک `?section=settings` درست.
- تنظیمات: `GET /api/admin/settings` شش دسته را برگرداند؛ `PATCH` مقدار را ذخیره کرد.
- خاموشی: با `TICKET=false` ساخت تیکت جدید → تعداد اعلان ادمین ۳→۳ (هیچ رکوردی ساخته نشد)؛
  پس از روشن‌کردن → ۳→۴.
- SSE: روی استریم کاربر، پاسخ ادمین به تیکت → `{"unread":0}` سپس `{"unread":1}` **بلافاصله**.
- بنر آفلاین: با `context.setOffline(true)` و رویداد `offline` → نوار ظاهر شد و پس از
  `online` ناپدید شد.
- `python3 scripts/sync_install.py --check` بدون تغییر معلق.
- نسخه از `v2.5.4` → **`v2.6.0`** (سه قابلیت جدید → MINOR).

## ۱۴۰۵/۰۷/۲۰ — افزودن `BACKLOG.md` برای ثبت ایده‌های معوق + قانون ۶ در `AGENTS.md` — نسخه `v2.5.4`

**هدف:** کاربر خواست هر ایده/پیشنهادی که ایجنت مطرح می‌کند و به بعد موکول می‌شود
جایی ثبت شود تا بعداً قابل مرور باشد. اولین مورد ثبت‌شده همان مشکل ۵۰۲ لحظه‌ی دیپلوی است.

**تغییرات:**
- `BACKLOG.md`: فایل تازه با قالب ورودی مشخص (تاریخ، زمینه/مشکل، راه‌حل پیشنهادی،
  دلیل تعویق، اثر/فوریت، مرجع) و وضعیت‌های `معوق`/`در انتظار`/`انجام‌شده`. اولین ورودی:
  «رفع قطعی کوتاه (۵۰۲) در زمان دیپلوی» با سه راه‌حل پیشنهادی (healthcheck، پایین‌آوردن
  کش DNS، استقرار blue-green).
- `AGENTS.md`: افزودن **قانون ۶** — ثبت بی‌درنگ ایده‌های رد‌شده/معوق در `BACKLOG.md`،
  و به‌روزرسانی وضعیت ورودی هنگام انجام‌شدن.
- `apps/web/lib/version.ts`: نسخه از `v2.5.3` → **`v2.5.4`** (PATCH).

**تأیید/تست:**
- فایل‌های `BACKLOG.md` و `AGENTS.md` از نظر ساختار و قوانین بازبینی شدند.
- `python3 scripts/sync_install.py --check` بدون تغییر معلق (اجرا شد).

## ۱۴۰۵/۰۷/۲۰ — تثبیت قوانین دائمی ایجنت در `AGENTS.md` — نسخه `v2.5.3`

**هدف:** قوانین «ثبت در `History-Agent.md`»، «نسخه‌دهی معنایی» و «همگام‌سازی
`install.sh`» تا کنون فقط به‌صورت متن در `History-Agent.md` نوشته شده بودند و چون
Codex فایل‌های مارک‌داون دلخواه را خودکار بارگذاری نمی‌کند، عملاً در هر اجرا رعایت
نمی‌شدند. راهکار صحیح، `AGENTS.md` در ریشه‌ی مخزن است (فایل دستورالعمل رسمی که Codex
CLI خودکار می‌خواند و دامنه‌اش کل مخزن است).

**تغییرات:**
- `AGENTS.md`: فایل تازه در ریشه‌ی مخزن با پنج قانون دائمی — (۱) ثبت ورودی در
  `History-Agent.md` با قالب مشخص، (۲) بالا بردن نسخه‌ی `apps/web/lib/version.ts`
  بر اساس MAJOR/MINOR/PATCH، (۳) اجرای `python3 scripts/sync_install.py` و تأیید با
  `--check`، (۴) کامیت مجاز ولی بدون push، (۵) ارجاع متقابل دو فایل. به‌همراه نکات
  مونوریپو، اجرای dev و راهنمای استقرار.
- `History-Agent.md`: افزودن بلوک «مرجع قوانین» با اشاره به `AGENTS.md`، افزودن
  «قانون همگام‌سازی `install.sh`»، و به‌روزرسانی «نسخه‌ی فعلی» به `v2.5.3`.
- `apps/web/lib/version.ts`: نسخه از `v2.5.2` → **`v2.5.3`** (PATCH).

**تأیید/تست:**
- `AGENTS.md` با ساختار و قوانین مطابق فایل‌های `AGENTS.md` قابل‌خواندن توسط Codex
  نوشته شد؛ دامنه‌ی کل مخزن را پوشش می‌دهد.
- `python3 scripts/sync_install.py --check` پس از تغییرات باید بدون «تغییر معلق» برگردد
  (در گام پایانی اجرا و ثبت شد).

## ۱۴۰۵/۰۷/۲۰ — رفع لرزش/پرش صفحه‌ی ادمین بین بنل‌ها و تثبیت سینک `?section=` — نسخه `v2.5.3`

**هدف:** در `/admin` با کلیک روی «اشتراک‌ها» و سایر تب‌ها، صفحه مدام بین بنل‌ها
جا‌به‌جا می‌شد و لرزش/پرش داشت و عملاً کار با پنل ممکن نبود.

**علت ریشه‌ای:** دو افکت متقابل `section` ↔ `?section=` روی هم می‌افتادند. برای تب
`overview` پارامتر `?section=` وجود ندارد؛ گاردِ افکت نوشتن هرگز تطبیق نمی‌کرد و در
نتیجه `router.replace` در هر رندر دوباره شلیک می‌شد (حلقه‌ی بی‌پایان ناوبری) و تب
`overview` قابل‌دسترس نبود.

**تغییرات:**
- `apps/web/app/admin/page.tsx`: هر دو افکت با یک مقدار مشتق‌شده‌ی `urlSection`
  و دو افکت گارددار جایگزین شدند — «URL → state» فقط با تغییر `urlSection` و
  «state → URL» فقط وقتی `urlSection !== section` (یک بار `replace` و سپس آرام‌گرفتن).

**تأیید/تست:**
- با `playwright-core` و `/usr/bin/google-chrome` روی dev محلی: ۸ بار تعویض تب →
  دقیقاً ۸ ناوبری (بدون حلقه)، back/forward درست کار کرد و دیپ‌لینک
  `?section=settings` بنل صحیح را نشان داد.
- بعد از اصلاح، `GET /admin` و `GET /admin?section=...` کد ۲۰۰ برگرداندند.

## ۱۴۰۵/۰۷/۲۰ — رفع خرابی کانتینر dev وب (`next: not found`) با volumeهای نام‌دار — نسخه `v2.5.3`

**هدف:** پس از تغییرات استقرار، کانتینر web در حالت توسعه بالا نمی‌آمد و با
`sh: next: not found` (exit 127) مدام ری‌استارت می‌شد.

**علت ریشه‌ای:** در `docker-compose.dev.yml` روی `/usr/src/app/node_modules` یک
volume بی‌نام (anonymous) تعریف شده بود. از آنجا که سورس از هاست bind می‌شود، این
volumeِ کهنه روی `node_modules` تصویر سایه می‌انداخت و چون فاقد `.bin/next` بود،
دستور `next` پیدا نمی‌شد. Compose هم volumeهای بی‌نام را در `--force-recreate`
حفظ می‌کرد.

**تغییرات:**
- `docker-compose.dev.yml`: حجم‌های بی‌نام با volumeهای نام‌دار پایدار جایگزین شدند:
  `alooshomal_api_node_modules`، `alooshomal_web_node_modules`، `alooshomal_web_next`
  (با `name:` صریح)؛ به‌همراه توضیح فارسی و دستور `down -v` برای تازه‌سازی پس از
  تغییر `package.json`.

**تأیید/تست:**
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml down` و بالا آوردن
  مجدد با `--build`؛ سپس `--force-recreate web` → هر سه کانتینر `Up` و حجم
  `alooshomal_web_node_modules/.bin/next` موجود بود.
- `curl` روی `http://localhost:3000/` → ۲۰۰، `/admin` → ۲۰۰،
  `http://localhost:3001/api/health` → ۲۰۰.

## ۱۴۰۵/۰۷/۲۰ — سبک‌سازی `install.sh`: بازگشت به کپی فونت از پوشه‌ی کنار اسکریپت — نسخه `v2.5.2`

**هدف:** اسکریپت جاسازی‌شده با base64 بیش از حد سنگین شده بود (≈۶.۴MB). طبق تصمیم
کاربر، روش سبک جایگزین شد: پوشه‌ی فونت کنار اسکریپت قرار می‌گیرد و اسکریپت فایل‌ها را
از آن کپی می‌کند.

**تغییرات:**
- بلوک حجیم «Installing bundled fonts» (۸۱ بلوک base64) و توابع `base64_decode` /
  `decode_font` به‌طور کامل حذف شد؛ `install.sh` از ≈۶.۴MB به ≈۶۴۶KB برگشت.
- بلوک جدید «Installing fonts»:
  - Shabnam: هر فایل `.woff2/.woff/.ttf/.eot` موجود در `shabnam-font-v5.0.1/`
    (یا `shabnam-font/` / `Shabnam/`) با ساختار زیرپوشه‌ها به
    `apps/web/public/fonts/shabnam/` کپی می‌شود (همه‌ی وزن‌ها و نسخه‌ها = ۸۰ فایل).
  - Vazirmatn: فایل `Vazirmatn[wght].woff2` از ریشه یا از `apps/web/public/fonts/`
    کپی می‌شود (اختیاری).
  - اگر فونت موجود نباشد فقط `warn` می‌دهد و ادامه می‌دهد (سایت با فونت fallback بالا می‌آید).
- `scripts/sync_install.py`: پسوندهای باینری فونت (`.eot`, `.ttf`, `.otf`, `.woff`,
  `.woff2`, …) در `BINARY_EXT` می‌مانند تا اسکریپت سنک به خطای UnicodeDecodeError نخورد.
- `README.md` بخش «Bundled fonts» بازنویسی شد و ساختار پوشه‌ی فونت کنار اسکریپت را توضیح می‌دهد.

**تأیید/تست:**
- `bash -n install.sh` بی‌خطا؛ حجم `install.sh` ≈۶۴۶KB.
- اجرای `install.sh` با پوشه‌ی `shabnam-font-v5.0.1/` و `Vazirmatn[wght].woff2` کنارش →
  «Shabnam fonts installed (80 files)» و «Vazirmatn font installed».
- مقایسه‌ی کل پروژه با خروجی بازتولیدشده (شامل هر ۸۱ فایل فونت): **۰ تفاوت**.
- اجرای `install.sh` بدون پوشه‌ی فونت → هشدار تمیز و ادامه‌ی نصب بدون خطا.
- `scripts/sync_install.py --check` → بدون تغییر معلق.
- نسخه از `v2.5.1` → **`v2.5.2`** (اصلاح زیرساختی → PATCH).

## ۱۴۰۵/۰۷/۲۰ — جاسازی موقت فونت‌ها در `install.sh` (بعداً به روش کپی بازگردانده شد) — نسخه `v2.5.1`

**یادداشت تاریخی:** در نسخه‌ی `v2.5.1` فونت‌ها به‌صورت base64 داخل `install.sh`
جاسازی شدند تا اسکریپت خودکفا شود، اما حجم اسکریپت به ≈۶.۴MB رسید. در `v2.5.2` این
روش کنار گذاشته و به کپی از پوشه‌ی فونت کنار اسکریپت بازگشتیم (بخش بالا).

## ۱۴۰۵/۰۷/۲۰ — اعلان‌های ادمین/کاربر با لینک‌دهی، پیام‌های شناور، نشان اشتراک عمومی و تاریخ درخواست‌ها — نسخه `v2.5.0`

**هدف:** تکمیل دو تسک ناتمام: (۱) اعلان کامل برای مدیر و کاربر با ناوبری به صفحه‌ی
مورد نظر، و (۲) اصلاح صفحه‌ی اشتراک (دکمه‌ی «اشتراک فعلی شما»)، نمایش نوع اشتراک
در صفحات عمومی، پیام‌های شناور خطا با دکمه‌ی «بستن» و تایم ۱۰ ثانیه، و نمایش تاریخ/ساعت
درخواست و تأیید در تاریخچه.

### علت ناتمام‌ماندن تسک‌ها (ریشه‌ی باگ)
- **بیلد API شکسته بود:** در `subscriptions.service.ts` از `DEFAULT_PLAN` استفاده شده
  بود ولی import نشده بود؛ در نتیجه `npm run build` سرور با خطای TS متوقف می‌شد و
  ایمیج داکر روی بیلد قدیمی (استایل) می‌ماند. همه‌ی تغییرات سورس (اعلان ویرایش کارت
  ویزیت، اعلان تصمیم اشتراک، پلن پیش‌فرض) عملاً در کانتینر اجرا نمی‌شدند.
- **لینک اعلان ادمین بی‌اثر بود:** اعلان‌ها به `/admin?section=...` لینک می‌دادند اما
  صفحه‌ی ادمین هیچ‌گاه `?section` را نمی‌خواند؛ پس کلیک روی اعلان به تب اشتباه (نمای کلی)
  می‌رفت. این قابلیت برای کاربر وجود داشت ولی برای ادمین پیاده نشده بود.

### بخش الف — رفع بیلد و پلن پیش‌فرض
- `apps/api/src/subscriptions/subscriptions.service.ts`: import صحیح `DEFAULT_PLAN`.
- متد عمومی `assignDefaultPlan(userId)` و فراخوانی آن در `auth.service.register` تا
  کاربر تازه از همان لحظه‌ی ثبت‌نام روی پلن «رایگان» باشد (پیش‌تر lazy و فقط هنگام
  خواندن بود). `auth.module.ts` ماژول اشتراک‌ها را import می‌کند.

### بخش ب — پیام‌های شناور (Toast) با دکمه بستن و تایم ۱۰ ثانیه
- `apps/web/lib/toast.ts` (استور zustand) و `apps/web/components/ui/ToastViewport.tsx`:
  حباب پیام پایین-شروع صفحه با آیکن، لحن error/warning/success/info، دکمه‌ی «بستن»
  و حذف خودکار پس از **۱۰ ثانیه**. در `app/layout.tsx` در ریشه mount شد و در
  `lib/api.ts` هر خطای درخواست به‌طور خودکار به حباب تبدیل می‌شود. انیمیشن `toast-in`
  در `globals.css`.

### بخش پ — لینک‌دهی اعلان‌های ادمین (`?section`)
- `apps/web/app/admin/page.tsx`: خواندن `?section` برای تب اولیه، همگام‌سازی URL هنگام
  تغییر تب (`router.replace`) و واکنش به تغییر پارامتر؛ با `Suspense` مثل صفحات دایرکتوری.
  اکنون کلیک روی هر اعلان ادمین (اشتراک/کارت ویزیت/بیولینک/تیکت/کاربر/پله) مستقیم به
  همان بخش می‌رود.

### بخش ت — نوع اشتراک در صفحات عمومی
- `biolinks.service.ts` و `business-cards.service.ts`: افزودن `planName` (از پلن مالک)
  به پاسخ عمومی. `PublicBiolinkView` و `PublicBusinessCardView` نشان «نوع اشتراک: …» را
  زیر دکمه‌های بازگشت نمایش می‌دهند (`planName` به تایپ‌های `lib/api.ts` اضافه شد).

### بخش ث — تاریخ درخواست/تأیید در تاریخچه اشتراک
- `apps/web/app/dashboard/subscriptions/page.tsx`: نمایش «تاریخ درخواست» و
  «تاریخ تأیید/رد» با تاریخ و ساعت (fa-IR) برای هر ردیف تاریخچه.

### بخش ج — لینک اعلان بیولینک/کارت ویزیت ردشده
- `admin.service.ts`: اعلان تأیید به صفحه‌ی عمومی می‌رود، اما اعلان رد به
  `/dashboard/<biolinks|business-cards>/<id>/edit` (چون صفحه‌ی عمومی تا زمان تأیید ۴۰۴ است).

### تأیید/تست
- `docker compose build api` و `build web` هر دو سبز (پس از رفع باگ import).
- API: ثبت‌نام کاربر جدید → `/subscriptions/me` پلن «رایگان» و بدون درخواست؛
  درخواست بسته «بلاس» → اعلان ادمین با لینک `/admin?section=subscriptions`؛
  تأیید مدیر → اعلان کاربر «اشتراک شما فعال شد» با لینک `/dashboard/subscriptions`؛
  `requestedAt`/`decidedAt` پر می‌شوند.
- ویرایش کارت ویزیت → اعلان «ویرایش کارت ویزیت در انتظار تأیید» برای ادمین.
- بیولینک: ساخت/تأیید/رد → اعلان‌های ادمین و کاربر با لینک صحیح.
- تیکت: ساخت → اعلان ادمین؛ پاسخ مدیر → اعلان «پاسخ جدید در تیکت شما» برای کاربر.
- Chrome headless (CDP): تب ادمین با `?section=subscriptions` → «اشتراک‌ها»؛ کلیک روی
  اعلان زنگوله → `location` = `/admin?section=users` و تیتر «کاربران»؛ صفحه‌ی اشتراک
  کاربر تازه: کارت «رایگان» → «اشتراک فعلی شما»؛ نشان «نوع اشتراک: اکو» روی هر دو صفحه‌ی
  عمومی؛ حباب خطا با دکمه‌ی «بستن» دقیقاً ۱۰ ثانیه دیده می‌شود و با «بستن» فوراً می‌رود.
- `install.sh` با `scripts/sync_install.py` همگام شد (۱۷ فایل)؛ اجرای مجدد آن پروژه‌ی
  یکسان (به‌جز فونت‌های خارجی) بازتولید کرد و `bash -n install.sh` بی‌خطاست.
- داده‌های تست (کاربران/تیکت‌ها/اعلان‌ها/بیولینک‌های تست) پاک‌سازی و شرکت کارت نمونه بازگردانده شد.
- نسخه از `v2.4.1` → **`v2.5.0`** (قابلیت جدید → MINOR).

## ۱۴۰۵/۰۷/۲۰ — اصلاح ماندگاری لایک، دکمه‌های بازگشت، تاریخ پله و اخطارهای استایل‌دار — نسخه `v2.4.1`

**هدف:** رفع باگ قرمز نماندن قلب پس از رفرش، افزودن دکمه‌های بازگشت به صفحه‌های
عمومی، نمایش تاریخ آخرین پله، و نمایش اخطارهای سقف اشتراک به سبک Tailwind.

### بخش الف — ماندگاری لایک پس از رفرش
- علت باگ: صفحه‌های عمومی (`/biolinks/[slug]` و `/business-cards/[slug]`) سرور-رندر
  هستند و وضعیت لایک سمت سرور بدون هدر `x-visitor-id` مرورگر محاسبه می‌شد؛ در نتیجه
  با رفرش، `liked` غلط برمی‌گشت.
- اندپوینت جدید `GET /biolinks/public/:slug/like` و
  `GET /business-cards/public/:slug/like` برای دریافت وضعیت لایک بازدیدکننده‌ی جاری.
- `LikeButton` حالا در `useEffect` هنگام mount وضعیت واقعی لایک را از این اندپوینت
  می‌خواند و قلب/شمارش را هم‌گام می‌کند؛ پس از رفرش قلب قرمز می‌ماند.

### بخش ب — دکمه‌های بازگشت در صفحه‌های عمومی
- دو دکمه‌ی ظریف «بازگشت به دایرکتوری» و «صفحه اصلی» بالای کارت در
  `PublicBiolinkView` و `PublicBusinessCardView` اضافه شد.

### بخش پ — تاریخ آخرین پله در «افزایش بازدید»
- `GET /boosts/overview` حالا `lastBoostedAt` (زمان آخرین درخواست پله‌ی تأییدشده و
  مؤثر) را برای هر کارت/بیولینک برمی‌گرداند و صفحه‌ی `/dashboard/boost` آن را با
  برچسب «آخرین پله: تاریخ» نمایش می‌دهد.

### بخش ت — اخطارهای استایل‌دار در فرم‌های ساخت
- کامپوننت جدید `apps/web/components/ui/Alert.tsx` (سبک Tailwind با آیکن، عنوان و
  لحن error/warning/success/info به‌همراه دکمه‌ی اقدام).
- صفحه‌های `/dashboard/biolinks/new` و `/dashboard/business-cards/new` پیام‌های سقف
  اشتراک را به‌صورت هشدار (زرد) با لینک «مشاهده و ارتقای اشتراک» نمایش می‌دهند.

### تأیید/تست
- `docker compose build api` و `docker compose build web` سبز.
- لایک با `x-visitor-id` ثابت: GET → `liked:true` پس از toggle (رفع باگ تأیید شد).
- `lastBoostedAt` پس از تأیید مدیر مقدار گرفت؛ داده‌های تست پاک‌سازی شد.
- صفحه‌های `/biolinks/demo-biolink`، `/business-cards/9074939`، `/dashboard/boost` و
  صفحه‌های ساخت همه ۲۰۰.
- نسخه از `v2.4.0` → **`v2.4.1`** (اصلاح باگ → PATCH).

---

## ۱۴۰۵/۰۷/۲۰ — آمار کارت‌ها، حذف آیتم‌های تکراری، مدیریت کاربران، اعلانات و صفحه‌بندی پنل مدیر — نسخه `v2.4.0`

**هدف:** افزودن آمار خلاصه و دکمه «درخواست پله» زیر کارت‌های کاربر، حذف آیتم‌های
تکراری داشبورد، مدیریت کاربران (غیرفعال/حذف/کامنت) در پنل مدیر، فیچر اعلانات با
زنگوله برای کاربر و مدیر، و صفحه‌بندی بهینه‌ی فهرست‌های پنل مدیر.

### بخش الف — آمار خلاصه و دکمه پله زیر کارت‌های کاربر
- کامپوننت جدید `apps/web/components/dashboard/CardStatsBar.tsx`: نمایش مینیمال
  تعداد لایک، جایگاه در دایرکتوری («#۵۵ • ص۳»)، تعداد ذخیره‌شده‌ها، تعداد نمایش کل و
  دکمه‌ی کوچک «درخواست پله».
- `findMyBiolinks`/`findMyBusinessCards` در API حالا `likeCount/saveCount/views/
  boostStatus/rank` را با `_count` و `directoryRank` ضمیمه می‌کنند.
- استفاده در `apps/web/app/dashboard/biolinks/page.tsx` و
  `apps/web/app/dashboard/business-cards/page.tsx`.

### بخش ب — حذف آیتم‌های تکراری از داشبورد
- «کارت‌های من» (`/dashboard/cards`) از منوی `UserShell` حذف شد (تکراری با بیولینک).
- دکمه‌های «بیولینک جدید» و «کارت ویزیت جدید» از سایدبار و سربرگ داشبورد حذف شدند
  (در صفحه‌های «بیولینک‌های من» و «کارت‌های ویزیت من» موجودند).

### بخش پ — چیدمان داشبورد
- «آخرین کارت‌های ویزیت من» کنار «آخرین بیولینک‌های من» در یک گرید دوستونه قرار گرفت.

### بخش ت — مدیریت کاربران در پنل مدیر
- اسکیما: فیلدهای `deactivatedReason`، `deactivatedAt` و `adminComment` روی `User`.
- اندپوینت‌های جدید: `PATCH /admin/users/:id/active` (فعال/غیرفعال با علت اجباری
  برای غیرفعال‌سازی)، `PATCH /admin/users/:id/comment`، `DELETE /admin/users/:id`
  و `GET /admin/users` با صفحه‌بندی و جستجو.
- `UsersTable` دکمه‌های غیرفعال/فعال، حذف و کامنت مدیر را گرفت.
- محافظت: حساب مدیر قابل حذف/غیرفعال‌سازی نیست؛ ورود کاربر غیرفعال ۴۰۱ می‌شود.

### بخش ث — فیچر اعلانات
- اسکیما: enum `NotificationType` و مدل `Notification` (feed کاربر و feed مدیر).
- ماژول جدید `apps/api/src/notifications` با سرویس/دو کنترلر/ماژول و اندپوینت‌های
  `GET /notifications/mine`، `GET /notifications/mine/unread-count`،
  `PATCH /notifications/mine/:id/read`، `PATCH /notifications/mine/read-all` و
  معادل‌های مدیر در `GET/PATCH /admin/notifications`.
- اعلان‌ها از این رخدادها ارسال می‌شوند: ثبت‌نام کاربر، ساخت بیولینک/کارت ویزیت،
  تأیید/رد بیولینک و کارت ویزیت، درخواست/تصمیم اشتراک، درخواست/تصمیم پله،
  تیکت جدید و پاسخ، و تغییر وضعیت/غیرفعال‌سازی حساب.
- کامپوننت جدید `apps/web/components/ui/NotificationBell.tsx` (زنگوله با شمارنده،
  polling هر ۳۰ ثانیه، خواندن تک/همه) در سربرگ `UserShell` و `AdminShell`.

### بخش ج — صفحه‌بندی فهرست‌های پنل مدیر
- کلید تنظیم جدید `adminListPageSize` (پیش‌فرض ۱۰) با `GET/PATCH /admin/settings`.
- `listBiolinks`/`listBusinessCards`/`listUsers` اگر `limit` داده نشود از این تنظیم
  استفاده می‌کنند و `meta` کامل (`hasNext/hasPrev`) برمی‌گردانند.
- کامپوننت جدید `apps/web/components/ui/Pagination.tsx` و استفاده در تب‌های
  بیولینک‌ها، کارت‌های ویزیت و کاربران پنل مدیر.
- `AdminDirectorySettings` حالا هر دو اندازه صفحه (دایرکتوری و پنل مدیر) را تنظیم می‌کند.

### تأیید/تست
- `docker compose build api` و `docker compose build web` سبز.
- `/biolinks/mine` و `/business-cards/mine` شامل `likeCount/saveCount/views/rank` هستند.
- غیرفعال‌سازی بدون علت → ۴۰۰؛ با علت → موفق و ورود کاربر ۴۰۱.
- کامنت مدیر ثبت/پاک شد؛ درخواست پله اعلان مدیر ساخت؛ اعلان‌ها پاک‌سازی شدند.
- `adminListPageSize=2` → `meta.totalPages=2` و صفحه ۲ درست برگشت؛ سپس به ۱۰ بازگشت.
- نسخه از `v2.3.0` → **`v2.4.0`** (قابلیت جدید → MINOR).

---

## ۱۴۰۵/۰۷/۱۹ — ذخیره‌کردن، صفحه‌بندی دایرکتوری، تنظیمات مدیر و نمایش رتبه — نسخه `v2.3.0`

**هدف:** تکمیل قابلیت لایک با «ذخیره»، صفحه‌بندی سمت‌سرور دایرکتوری با اندازه‌ی
قابل‌تنظیم توسط مدیر، فیلترهای شهر/کسب‌وکار، نمایش نشان «پله» به همه‌ی کاربران و
نمایش رتبه/صفحه‌ی هر کارت در صفحه‌ی «افزایش بازدید».

### بخش الف — دکمه «ذخیره» و صفحه‌ی «ذخیره‌شده‌های من»
- کامپوننت جدید `apps/web/components/ui/SaveButton.tsx` (نشانک) در کنار دکمه‌ی لایک
  در آیتم‌های دایرکتوری (`DirectoryBiolinkItem` و `DirectoryBusinessCardItem`).
- صفحه‌ی جدید `apps/web/app/dashboard/saved/page.tsx` (مسیر `/dashboard/saved`):
  فهرست بیولینک‌ها و کارت‌های ویزیت ذخیره‌شده با امکان حذف از ذخیره‌شده‌ها.
- آیتم جدید «ذخیره‌شده‌های من» در `apps/web/components/dashboard/UserShell.tsx`.
- اسکیمای Prisma: enum `SaveTargetKind` و مدل‌های `BiolinkSave` / `BusinessCardSave`.
- اندپوینت‌ها: `POST /biolinks/public/:slug/save`، `GET /biolinks/saved/mine` و
  معادل‌های کارت ویزیت؛ فیلد `saved` در پاسخ دایرکتوری‌ها برگردانده می‌شود.

### بخش ب — الزام ورود برای لایک و ذخیره
- `LikeButton` و `SaveButton` در صورت نبود توکن، کاربر مهمان را به `/login` هدایت می‌کنند.
- اندپوینت‌های `like`/`save`/`saved/mine` نیازمند احراز هویت هستند (بدون توکن ۴۰۱).

### بخش پ — فیلتر و مرتب‌سازی دایرکتوری
- مرتب‌سازی «بر اساس نام» حذف شد؛ فقط «جدیدترین» و «محبوب‌ترین» (بر اساس تعداد لایک) باقی ماند.
- فیلتر «همه شرکت‌ها» حذف و به‌جای آن دو فیلتر «بر اساس شهر» و «بر اساس نوع کسب‌وکار» اضافه شد.
- DTOها: `cityId`/`businessId`/`sort: 'recent'|'liked'`؛ پاسخ دایرکتوری شامل
  `filters: { cities, businesses }` برای پرکردن لیست‌های کشویی است.

### بخش ت — صفحه‌بندی سمت‌سرور و تنظیمات مدیر
- ماژول جدید `apps/api/src/settings`: مدل `Setting` + کلید `directoryPageSize`
  (پیش‌فرض ۱۰). کنترلر عمومی `GET /settings/public` و کنترلر مدیر
  `GET/PATCH /admin/settings` (جدا شدند چون `@Public` از `@Roles('ADMIN')` رد نمی‌شود).
- دایرکتوری‌ها فقط به‌اندازه‌ی تنظیمات از بک‌اند فچ می‌کنند (`skip`/`take`) و
  `meta` شامل `page/totalPages/hasNext/hasPrev` است؛ صفحه‌بندی در وب اضافه شد.
- کامپوننت جدید `apps/web/components/admin/AdminDirectorySettings.tsx` در تب
  «تنظیمات» پنل مدیر برای تعیین تعداد کارت در هر صفحه (۱ تا ۱۰۰).

### بخش ث — نشان «پله» و نمایش رتبه
- کامپوننت جدید `apps/web/components/ui/BoostBadge.tsx`: نشان طلایی چشم‌گیر با
  تاج/جرقه که روی کارت‌های پله‌شده به همه‌ی کاربران نمایش داده می‌شود.
- `directoryRank` در سرویس بیولینک/کارت ویزیت: محاسبه‌ی `{rank, page, total, pageSize}`
  با همان ترتیب دایرکتوری (`pinnedAt desc, id desc`).
- `GET /boosts/overview` رتبه‌ی هر آیتم را ضمیمه می‌کند؛ صفحه‌ی
  `apps/web/app/dashboard/boost/page.tsx` عدد «ردیف/صفحه» را نشان می‌دهد
  (مثلاً «ردیف ۵۵ • صفحه ۳») که پس از تأیید مدیر به «ردیف ۱ • صفحه ۱» تغییر می‌کند.

### تأیید/تست
- `docker compose build api` و `docker compose build web` موفق (build سبز).
- API: `GET /settings/public` → ۲۰۰ با `directoryPageSize:10`؛
  دایرکتوری‌ها `meta.limit=10`، `filters.cities/businesses` و فیلد `saved` را برمی‌گردانند.
- بدون توکن: `saved/mine`، `save` و `admin/settings` → ۴۰۱؛ PATCH نامعتبر → ۴۰۰.
- ذخیره: toggle روشن/خاموش و بازگشت در `saved/mine` تأیید شد.
- پله: درخواست + تأیید مدیر → رتبه از ۲ به **۱ (صفحه ۱)** تغییر کرد.
- نسخه از `v2.2.0` → **`v2.3.0`** (قابلیت جدید → MINOR).

---

## ۱۴۰۵/۰۷/۱۹ — اشتراک، افزایش بازدید (پله)، لایک، حذف کارت و اسناد پشتیبان — نسخه `v2.2.0`

**هدف:** افزودن مجموعه‌ای از قابلیت‌های درخواست‌شده: سند پشتیبان‌گیری، حذف کارت/بیولینک
توسط کاربر، سیستم اشتراک (رایگان/اکو/بلاس) با تأیید مدیر، مرتب‌سازی دایرکتوری بر اساس
جدیدترین و محبوب‌ترین + لایک، صفحه‌ی «افزایش بازدید» با فیچر «پله»، کنار‌هم‌قرار‌گرفتن
QR و دکمه ذخیره مخاطب، و یکسان‌سازی فونت تمام تم‌ها با فونت سایت (شبنم).

### بخش الف — سند پشتیبان‌گیری و بازیابی
- فایل جدید `docs/BACKUP-RESTORE.md`: شرح کامل مکانیزم snapshot خودکار
  (`apps/api/docker-entrypoint.sh`)، مسیرها (`/usr/src/app/backups` و والیوم
  `alooshomal_api_backups`)، نگهداری `BACKUP_KEEP`، اسکریپت‌های دستی
  (`scripts/backup.sh` و `scripts/restore.sh`) و شیوه‌ی restore.

### بخش ب — حذف کارت ویزیت و بیولینک توسط کاربر
- `apps/web/app/dashboard/biolinks/page.tsx` و
  `apps/web/app/dashboard/business-cards/page.tsx`: دکمه‌ی حذف (با تأیید) به هر کارت اضافه شد.
- صفحه‌ی جدید `apps/web/app/dashboard/cards/page.tsx` (مسیر `/dashboard/cards`):
  فهرست یک‌جای همه‌ی بیولینک‌ها و کارت‌های ویزیت کاربر با امکان حذف هر کدام.
- API حذف از قبل موجود بود (`DELETE /biolinks/:id` و `DELETE /business-cards/:id`).

### بخش پ — سیستم اشتراک
- اسکیمای Prisma: مدل‌های `SubscriptionPlan`، `UserSubscription` و enum
  `SubscriptionStatus`؛ `planId` روی `User`.
- ماژول جدید `apps/api/src/subscriptions` با سرویس/کنترلر/DI و DTOها:
  - `GET /subscriptions/plans` (عمومی)، `GET /subscriptions/me`،
    `POST /subscriptions/request`.
  - سه بسته‌ی پیش‌فرض در `apps/api/src/common/plans.ts`: **رایگان** (۱+۱، بدون لینک)،
    **اکو** (۱+۱، همه‌ی فیلدها)، **بلاس** (۳+۳، همه‌ی امکانات اکو).
  - بسته‌ها هنگام بوت (`OnModuleInit`) و در seed ساخته می‌شوند.
- محدودیت‌ها اعمال شد: `enforceNotExceeded` در `create` بیولینک/کارت ویزیت؛
  عدم نمایش لینک‌ها/وب‌سایت در صفحات عمومی برای بسته‌ی بدون `showSocialLinks`.
- اندپوینت‌های مدیر: `GET/POST/PATCH/DELETE /admin/plans`،
  `GET /admin/subscriptions`، `PATCH /admin/subscriptions/:id`،
  `PATCH /admin/users/:id/plan`.
- صفحات کاربری: `apps/web/app/dashboard/subscriptions/page.tsx`؛ تب «اشتراک‌ها» در پنل
  مدیر (`apps/web/components/admin/AdminSubscriptions.tsx`).

### بخش ت — مرتب‌سازی دایرکتوری و لایک
- فیلد `pinnedAt` به بیولینک/کارت ویزیت اضافه شد؛ `orderBy` دایرکتوری پیش‌فرض
  «جدیدترین» روی `pinnedAt` است (نه `publishedAt` و نه `updatedAt`).
- مرتب‌سازی «محبوب‌ترین» با شمارش لایک (`apps/api/src/common/directory-sort.ts`).
- مدل‌های `BiolinkLike` / `BusinessCardLike` + اندپوینت
  `POST /biolinks/public/:slug/like` و `POST /business-cards/public/:slug/like`
  (هر بازدیدکننده یک بار؛ با `x-visitor-id` هش‌شده).
- کامپوننت `apps/web/components/ui/LikeButton.tsx` و نمایش در آیتم‌های دایرکتوری
  (`DirectoryBiolinkItem` و `DirectoryBusinessCardItem`) به‌همراه نشان «پله».
- گزینه‌ی «محبوب‌ترین» به فیلترهای دایرکتوری هر دو بخش اضافه شد.

### بخش ث — افزایش بازدید و فیچر «پله»
- اسکیمای Prisma: مدل `BoostRequest` + enum‌های `BoostTargetKind`/`BoostFeature`/`BoostStatus`؛
  `boostedUntil` روی بیولینک/کارت ویزیت.
- ماژول جدید `apps/api/src/boosts`: `GET /boosts/overview`، `POST /boosts/request`.
- تأیید مدیر: `GET /admin/boosts`، `PATCH /admin/boosts/:id`؛ با تأیید،
  `pinnedAt = now` و `boostedUntil = now + 7 روز` تنظیم می‌شود تا کارت مثل «جدیدترین»
  به بالای دایرکتوری برود و با ساخت کارت‌های جدید به پایین سُر بخورد.
- فقط کارت‌های تأییدشده/منتشرشده قابل پله هستند.
- صفحه‌ی کاربری `apps/web/app/dashboard/boost/page.tsx` («افزایش بازدید») با فهرست
  خلاصه‌ی همه‌ی کارت‌ها/بیولینک‌ها و دکمه‌ی «درخواست پله».
- تب «افزایش بازدید» در پنل مدیر (`apps/web/components/admin/AdminBoosts.tsx`).

### بخش ج — چیدمان QR و دکمه ذخیره مخاطب
- در `PublicBiolinkView` و `PublicBusinessCardView`، QR کوچک شد (۹۶px) و در کنار
  دکمه‌ی «ذخیره مخاطب» + دکمه‌ی لایک در یک ردیف چپ/راست قرار گرفت.

### بخش چ — یکسان‌سازی فونت تم‌ها
- قاعده‌ی سراسری در `apps/web/app/globals.css` اضافه شد: تمام `.biolink-theme` و
  `.bcard-theme` (و فرزندانشان) از فونت اصلی سایت (شبنم) استفاده می‌کنند؛ این قاعده
  شامل تم‌های آینده هم می‌شود.

### تأیید/تست
- `docker compose build api` و `docker compose build web` موفق.
- سالم بودن صفحات: `/`, `/dashboard/cards`, `/dashboard/subscriptions`,
  `/dashboard/boost`, `/admin` همه ۲۰۰.
- API: سه بسته ساخته شد؛ درخواست اشتراک توسط کاربر، تأیید توسط مدیر و اعمال بسته
  (پلن «بلاس» روی کاربر نمونه فعال شد) تأیید شد.
- محدودیت بسته: کاربر جدید در بسته‌ی رایگان فقط یک بیولینک و یک کارت ویزیت توانست بسازد.
- لایک: ثبت/برداشت لایک با `x-visitor-id`، مرتب‌سازی «محبوب‌ترین» و بازگشت `liked`.
- پله: درخواست + تأیید → `pinnedAt` جدید و قرارگرفتن کارت در ابتدای «جدیدترین»؛
  درخواست پله روی کارت منتشرنشده با خطای ۴۰۰ رد شد.
- فونت: قاعده‌ی سراسری در CSS اعمال شد.
- نسخه از `v2.1.0` → **`v2.2.0`** (قابلیت جدید → MINOR).

---

## ۱۴۰۵/۰۷/۱۹ — سیستم پشتیبان‌گیری خودکار از دیتابیس (snapshot) + نسخه `v2.1.0`

**هدف:** جلوگیری از تکرار فاجعه‌ی «از دست رفتن دیتای کاربران» هنگام تغییر ساختار
دیتابیس (تغییر نام جدول/ستون، حذف فیلد و اجرای `prisma db push --accept-data-loss`).
از این پس پیش از هر تغییر ساختاری، یک `pg_dump` خودکار گرفته می‌شود و بازیابی
دستی هم ممکن است.

### بخش الف — پشتیبان‌گیری خودکار (قبل از هر تغییر اسکیما)
- فایل جدید `apps/api/docker-entrypoint.sh`: هنگام هر بوت کانتینر API، هش
  `prisma/schema.prisma` را محاسبه و با هش قبلی مقایسه می‌کند.
  - اگر اسکیما **تغییر کرده باشد** و دیتابیس جدول داشته باشد، قبل از اجرای
    `prisma db push` یک snapshot فشرده (`pg_dump` + `gzip`) در `BACKUP_DIR` می‌سازد.
  - اگر دیتابیس خالی/تازه باشد، snapshot نمی‌گیرد.
  - اگر اسکیما تغییری نکرده باشد، از snapshot صرف‌نظر می‌کند.
  - نگهداری: فقط `BACKUP_KEEP` نسخه‌ی آخر (پیش‌فرض ۲۰) باقی می‌ماند.
- `apps/api/Dockerfile`: نصب بسته‌ی `postgresql17-client` (شامل `pg_dump`/`psql`) و
  استفاده از `ENTRYPOINT ["./docker-entrypoint.sh"]` به‌جای دستور قبلی CMD.
- `docker-compose.yml`: افزودن متغیرهای `BACKUP_DIR` و `BACKUP_KEEP` و یک والیوم
  پایدار `alooshomal_api_backups` تا snapshotها بین ری‌استارت‌ها باقی بمانند.

### بخش ب — اسکریپت‌های دستی
- `scripts/backup.sh`: ساخت snapshot از کانتینر `db` (کار در هر دو محیط توسعه و
  تولید)، ذخیره در `./backups/alooshomal_<stamp>.sql.gz`، ساپورت `--list` و
  نگهداری `BACKUP_KEEP`.
- `scripts/restore.sh`: بازیابی snapshot (جدیدترین به‌طور پیش‌فرض یا فایل مشخص)،
  با تأیید تعاملی (`FORCE=1` برای رد کردن پرسش).
- `scripts/sync_install.py`: ابزار هم‌گام‌سازی بلوک‌های `write_file` داخل
  `install.sh` با فایل‌های واقعی پروژه (patch/افزودن/حذف)، با حالت `--check`.
- `package.json`: اسکریپت‌های `db:backup`، `db:backups` و `db:restore`.
- `README.md`: بخش «Database snapshots (backup & restore)» اضافه شد.
- `.gitignore`: پوشه‌ی `backups/` نادیده گرفته می‌شود. `.env.example`: کلید `BACKUP_KEEP`.

### تأیید/تست
- **دستی:** `./scripts/backup.sh` → snapshot 8K ساخته شد؛ سپس دو بیولینک از
  دیتابیس حذف شد و با `./scripts/restore.sh` هر دو بازگردانده شدند (تأیید شمارش رکوردها).
- **نگهداری:** با `BACKUP_KEEP=2` نسخه‌های قدیمی حذف و فقط ۲ snapshot آخر ماند.
- **خودکار:** بوت اول API → «schema changed → snapshot saved»؛ ری‌استارت بدون تغییر اسکیما →
  «schema unchanged → skipping snapshot»؛ افزودن یک کامنت به schema و ری‌استارت →
  snapshot جدید ساخته شد. سپس کانتینر بازساخته شد و اسکیمای واقعی بازیابی شد.
- **سلامت اپ:** `/api/health`، `/`، `/biolinks`، `/business-cards` و صفحه‌ی جزئیات
  کارت ویزیت همه ۲۰۰. نسخه‌ی `v2.1.0` در فوتر تأیید شد.
- **هم‌گامی مولد:** `python3 scripts/sync_install.py` اجرا شد و `bash -n install.sh`
  بی‌خطا است؛ اجرای مجدد `install.sh` در پوشه‌ی موقت، `apps/` و `scripts/` و
  فایل‌های ریشه را یکسان بازتولید کرد (تنها تفاوت، فونت‌های باینری که از قبل خارج
  از مولد بودند). در `install.sh` هم `scripts/` به `--clean` و `chmod +x` اضافه شد.
- نسخه از `v2.0.1` → **`v2.1.0`** (قابلیت جدید → MINOR).

---

## ۱۴۰۵/۰۷/۱۹ — رفع باگ لینک صفحه‌ی کارت ویزیت در دایرکتوری + نسخه `v2.0.1`

**مشکل گزارش‌شده:** کارت ویزیت در دایرکتوری `/business-cards` دیده می‌شد و انتخاب
می‌شد، اما دکمه‌ی «مشاهده صفحه کامل» به `http://localhost:3000/businessCards/<slug>`
اشاره می‌کرد که منجر به خطای ۴۰۴ می‌شد.

**علت:** در `DirectoryBusinessCardDetail.tsx` آدرس با حرف بزرگ `C` نوشته شده بود
(`/businessCards/...`) در حالی که مسیر واقعی Next.js روی دیسک `/business-cards/<slug>`
است. تنها همین یک ارجاع اشتباه بود (سایر مسیرها درست بودند).

### فایل‌های تغییریافته
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: اصلاح `href`
  به `/business-cards/${slug}`؛ اصلاح کامنت بالای کامپوننت (`/businessCards` →
  `/business-cards`)؛ و اصلاح متن‌های فارسی که اشتباهاً «بیولینک» مانده بود
  («بیولینک یافت نشد» → «کارت ویزیت یافت نشد» و «مشاهده صفحه کامل بیولینک» →
  «مشاهده صفحه کامل کارت ویزیت»).
- `apps/web/app/business-cards/page.tsx`: اصلاح متن‌های فارسی دایرکتوری کارت ویزیت
  که اشتباهاً «بیولینک» بودند (خطای بارگذاری، «کارت ویزیتی پیدا نشد» و متن راهنمای
  انتخاب کارت).
- `apps/web/lib/version.ts`: نسخه از `v2.0.0` → **`v2.0.1`** (رفع باگ → PATCH).
- کل تغییرات در `install.sh` همگام شد (`bash -n install.sh` بی‌خطا).

### تأیید/تست
- `docker compose build web` موفق و کانتینر `web` بازساخته شد.
- `/business-cards` → ۲۰۰؛ `/business-cards/9024231` → ۲۰۰ (قبلاً صفحه‌ی خراب
  ۴۰۴ بود)؛ آدرس قدیمی اشتباه `/businessCards/9024231` → ۴۰۴.
- نسخه‌ی جدید `v2.0.1` در فوتر خانه و داشبورد تأیید شد.
- جست‌وجوی نهایی: هیچ ارجاع `businessCards/` و هیچ متن «بیولینک» در صفحات/کامپوننت‌های
  کارت ویزیت باقی نمانده است.

---

## ۱۴۰۵/۰۷/۱۹ — راستی‌آزمایی نهایی و تأیید وضعیت اجرا (بدون تغییر نسخه)

**هدف:** بررسی و تأیید اینکه همه‌ی کارهای قبلی (اسلاگ، تغییر نام به بیولینک، کارت ویزیت،
نسخه‌دهی) واقعاً اعمال و در `install.sh` همگام شده‌اند و استک بدون خطا بالاست.

- وضعیت داکر: `api`، `web` و `db` هر سه `Up` (پورت‌های ۳۰۰۱/۳۰۰۰/۵۴۳۲).
- بررسی سلامت: `/api/health` → 200؛ صفحات `/`، `/biolinks` و `/business-cards` → 200.
- **اسلاگ زنده:** با ورود کاربر نمونه و ساخت بیولینک/کارت ویزیت جدید، اسلاگ‌ها به‌صورت
  `9027135` و `9085243` تولید شدند (پیشوند ثابت `90` + ۵ رقم تصادفی) — مطابق درخواست.
- **همگامی `install.sh`:** بلوک `write_file` مربوط به `apps/web/lib/version.ts` و
  `generateSlug` برای هر دو سرویس (بیولینک/کارت ویزیت) موجود است؛ `bash -n install.sh` بی‌خطا.
- **بازمانده‌ها:** هیچ ارجاع قدیمی به `components/card/`، `/api/cards` یا `apps/api/src/cards`
  در کد باقی نمانده است.

**نتیجه:** نیازی به تغییر کد نبود؛ نسخه روی **v2.0.0** ثابت ماند.

---

## ۱۴۰۵/۰۷/۱۹ — بازنگری بزرگ: تغییر نام «کارت» → «بیولینک» + افزودن «کارت ویزیت» + نسخه‌دهی

**درخواست‌ها:**
۱) از این پس واژه‌ی «کارت» به «بیولینک» تغییر کند و همه‌ی پوشه‌ها/کامپوننت‌ها/عناوین
مرتبط در کل کد به `Biolink`/`biolink` تغییر یابند.
۲) افزودن مورد جدید «کارت ویزیت» با نام انگلیسی `businesscard`، با همان استانداردها و
تم‌های آماده‌ی ارسالی.
۳) شروع نسخه‌دهی سه‌عددی و درج آن در فوتر پنل کاربری.

### بخش الف — تغییر نام Card → Biolink (همه‌جا)
- ساختار بک‌اند: `apps/api/src/cards/` → `apps/api/src/biolinks/`؛ کلاس‌ها/فایل‌ها به
  `BiolinksService/Controller/Module`, `CreateBiolinkDto`, `UpdateBiolinkDto`,
  `PublicBiolinkQueryDto` تغییر یافتند.
- مدل Prisma: `Card`→`Biolink`, `CardStatus`→`BiolinkStatus`, `ModerationLog.cardId`→`biolinkId`,
  `ScanEvent.cardId`→`biolinkId`, جدول `cards`→`biolinks`.
- مسیرهای API: `/api/cards/*` → `/api/biolinks/*` (و `/api/admin/biolinks/*`).
- فرانت‌اند: پوشه‌ی `components/card/`→`components/biolink/`؛ کامپوننت‌ها به
  `BiolinkForm`, `ThemedBiolink`, `PublicBiolinkView`, `LiveBiolinkPreview`,
  `BiolinkStatusBadge`, `DirectoryBiolinkItem` تغییر یافتند؛ `CardLiveEditor`→`BiolinkLiveEditor`.
- مسیرهای وب: `/cards` → `/biolinks`، `/dashboard/cards` → `/dashboard/biolinks`,
  `/api/proxy/cards/*` → `/api/proxy/biolinks/*`.
- متغیرهای CSS تم‌ها از `--card-*` به `--biolink-*` و کلاس‌ها به `biolink-theme*` تغییر یافتند.
- متون فارسی «کارت» → «بیولینک» (به‌جز مورد جدید کارت ویزیت).

### بخش ب — قابلیت جدید «کارت ویزیت» (`businesscard`)
- مدل‌های Prisma جدید: `BusinessCard` و `BusinessCardScanEvent`؛ روابط در `User`, `City`,
  `BusinessCategory`. جدول `business_cards`.
- ماژول `apps/api/src/businesscards/` با سرویس/کنترلر/ماژول و DTOها؛ مسیرهای
  `/api/business-cards/*` و `/api/admin/business-cards/*`.
- تزریق در `app.module.ts` و افزودن متدهای ادمین (`listBusinessCards`,
  `moderateBusinessCard`, `getBusinessCard`, `updateBusinessCard`).
- کامپوننت‌های وب جدید در `apps/web/components/businesscard/`: `ThemedBusinessCard`،
  `BusinessCardForm`، `LiveBusinessCardPreview`، `PublicBusinessCardView`،
  `BusinessCardStatusBadge`، `DirectoryBusinessCardItem/Filters/Detail` و
  `admin/BusinessCardLiveEditor`.
- صفحات جدید: `/business-cards`, `/business-cards/[slug]`،
  `/dashboard/business-cards{,/new,/[id]/edit}`, `/api/proxy/business-cards/.../vcard`.
- پنل ادمین: بخش جدید «کارت‌های ویزیت»؛ `AdminSection` گسترش یافت؛ داشبورد کاربر و
  منوها به‌روزرسانی شدند.
- ۱۵ تم آماده‌ی کارت ویزیت (از فایل‌های نمونه‌ی `businescard/`): `glassmorphism`,
  `neo-brutalism`, `swiss-minimal`, `dark-luxury`, `neumorphism`, `vibrant-gradient`,
  `monochrome`, `gold-foil`, `neon-cyberpunk`, `watercolor`, `dark-academia`, `art-deco`,
  `corporate-clean`, `nature-organic`, `typographic` — در `BUSINESS_CARD_THEMES` و بلوک‌های
  `.bc-theme-*` در `globals.css`.
- seed: کارت ویزیت نمونه (`demo-business-card`).

### بخش ج — نسخه‌دهی
- فایل جدید `apps/web/lib/version.ts` با `APP_VERSION = 'v2.0.0'` به‌عنوان منبع یکتا.
- نمایش نسخه در فوتر پنل کاربری (`UserShell`) و فوتر عمومی (`Footer`).

### تأیید/تست
- بیلد داکر `api` و `web` هر دو موفق.
- جریان کامل: ثبت بیولینک و کارت ویزیت، تأیید مدیر، پایان‌پوینت عمومی، دایرکتوری،
  vCard و صفحه‌ی وب — همه ۲۰۰.
- ۱۵ تم کارت ویزیت با Chrome headless (CDP) بررسی شدند و استایل محاسبه‌شده‌ی هر تم
  (شعاع/بوردر/سایه/فونت) مطابق نمونه بود؛ تم‌های بیولینک هم بدون رگرسیون تست شدند.
- نمایش `v2.0.0` در فوتر خانه و داشبورد تأیید شد.
- کل تغییرات در `install.sh` همگام شد و با اجرای مجدد `install.sh` در پوشه‌ی موقت،
  خروجی با پروژه یکسان (بدون تفاوت) بازتولید شد.

---

## ۱۴۰۵/۰۷/۱۹ — پیشوند ثابت «90» روی کد ۵ رقمی slug

**درخواست:** الگوی slug کارت به شکل «۹۰ + ۵ رقم تصادفی» باشد؛ مثال: `9068310` یا `9058794`.

- `apps/api/src/cards/cards.service.ts`: در `generateSlug` پیشوند ثابت `90` به عدد
  تصادفی ۵ رقمی اضافه شد (`90${10000..99999}`)؛ یکتایی همچنان با `findUnique` تضمین می‌شود.
- `install.sh`: همان تغییر همگام شد.

**تأیید:** بیلد و ری‌استارت سرویس `api` موفق؛ ثبت کارت آزمایشی مقدار
`slug: "9097411"` (۹۰ + ۵ رقم) برگرداند و سپس پاک شد.

---

## ۱۴۰۵/۰۷/۱۹ — افزودن ۸ تم آماده‌ی کارت (biolinks)

**درخواست:** نصب سایر تم‌های آماده از فایل‌های نمونه در
`/home/mohammad/Desktop/html/opuse/biolinks/`:
`biolink_soft_pastel`، `card_bl1_glassmorphism`، `card_bl2_neo_brutalism`،
`card_bl3_swiss_minimal`، `card_bl4_dark_gradient`، `card_bl5_soft_pastel`،
`card_bl6_retro_terminal`، `card_bl7_neumorphism`، `card_bl8_neon_cyberpunk`.
توجه: `biolink_soft_pastel` و `card_bl5_soft_pastel` دقیقاً یکسان‌اند و در یک تم ادغام شدند
(جمعاً ۸ تم یکتا).

### فرانت‌اند
- `apps/web/lib/themes.ts`: افزودن ۸ تم جدید به `CARD_THEMES` —
  `glassmorphism` (شیشه‌ای)، `neo-brutalism` (نئو بروتالیسم)، `swiss-minimal` (سوئیسی مینیمال)،
  `dark-gradient` (گرادیان تاریک)، `soft-pastel` (پاستل نرم)، `retro-terminal` (ترمینال رترو)،
  `neumorphism` (نئومورفیسم)، `neon-cyberpunk` (نئون سایبرپانک) — همراه با swatch و پرچم `dark`.
  مجموع تم‌ها از ۶ به ۱۴ رسید.
- `apps/web/app/globals.css`: افزودن بلوک `.theme-<key>` برای هر ۸ تم (رنگ‌ها، شعاع، سایه،
  فونت، متغیرهای صفحه‌ی تم) مطابق فایل‌های نمونه + به‌روزرسانی قواعد
  تراز/فلش دکمه‌ها (چیدمان چپ‌چین برای `swiss-minimal`، `dark-gradient`، `retro-terminal`).
- `apps/web/components/card/ThemedCard.tsx`: بدون تغییر ساختاری؛ همه‌ی تم‌ها از همان
  مارک‌آپ مشترک استفاده می‌کنند (کارت به‌صورت «کامپوننت مشترک + کلاس تم» پیاده است).
- `install.sh`: هر دو تغییر (`themes.ts` و `globals.css`) همگام شدند.

**تأیید (Chrome headless + CDP):** برای هر ۸ تم یک کارت ساخته/تأیید شد و صفحه‌ی
`/cards/<slug>` باز شد؛ استایل‌های محاسبه‌شده مطابق نمونه بود — مثلاً:
`neo-brutalism` (سایه‌ی `8px 8px 0 #000`، دکمه‌ی `#ffd600`، حروف کاپیتال)،
`soft-pastel` (دکمه‌ی `999px` پاستلی)، `neumorphism` (سایه‌ی دوتایی نرم)،
`neon-cyberpunk` (قاب گرادیانی و درخشش نئونی)، `retro-terminal` (متن سبز روی مشکی).
بیلد داکر موفق؛ داده‌های آزمایشی سپس پاک شدند.

---

## ۱۴۰۵/۰۷/۱۹ — کد عددی ۵ رقمی تصادفی برای slug کارت

**درخواست:** در آدرس عمومی کارت (`/cards/<slug>`) به‌جای slug ساخته‌شده از نام
(مثل `mohammad-forutan`) یک کد عددی ۵ رقمی تصادفی استفاده شود.

- `apps/api/src/cards/cards.service.ts`: بازنویسی متد `generateSlug` — به‌جای ساخت
  slug از `fullName`، یک عدد تصادفی ۵ رقمی (`10000`–`99999`) تولید می‌شود و با
  بررسی `findUnique` یکتایی آن تضمین می‌گردد (حداکثر ۲۰ تلاش؛ در صورت شکست
  `ConflictException`). پارامتر `fullName` برای سازگاری حفظ شد.
- `install.sh`: همان تغییر در بلوک تولید `cards.service.ts` همگام شد (منبع اصلی پروژه).

**تأیید:** بیلد و ری‌استارت داکر سرویس `api` موفق؛ `GET /api/health` → 200.
ثبت کارت آزمایشی (`POST /api/cards`) مقدار `slug: "68310"` (۵ رقم) برگرداند؛
کارت آزمایشی سپس از دیتابیس پاک شد.

---

## ۱۴۰۵/۰۷/۱۹ — بازطراحی پنل مدیریت آدمین

**هدف:** هم‌ساخت کردن ساختار و امکانات پنل `/admin` با فایل نمونه
`dashboard_redesigned.html`، با حفظ کامل رنگ‌بندی وینتیج/رترو.

### بک‌اند
- `apps/api/prisma/schema.prisma`: افزودن enumهای `TicketStatus`، `TicketPriority`، `ReportStatus`
  و مدل‌های `Ticket` و `Report`؛ افزودن رابطه `tickets` به مدل `User`.
- `apps/api/src/admin/admin.service.ts`: گسترش `stats()` (pending/approved/rejected/published/
  users/scans/openTickets/totalTickets/recentUsers) و افزودن `recentUsers()`، `recentTickets()`،
  `recentReports()`، `signupSeries()` (نمودار ثبت‌نام ۱۲ ماه) و `updateTicket()`.
- `apps/api/src/admin/admin.controller.ts`: افزودن `GET /admin/overview`، `GET /admin/users`،
  `GET /admin/tickets`، `PATCH /admin/tickets/:id`، `GET /admin/reports`.
- `apps/api/prisma/seed.ts`: استفاده از enumهای تایپ‌شده؛ seed پنج تیکت و چهار گزارش نمونه.
  seed برای تیکت‌ها و گزارش‌ها idempotent شد (پاک‌سازی قبل از درج).

### فرانت‌اند
- `apps/web/components/admin/AdminShell.tsx`: سایدبار ثابت سمت راست + هدر + منوی موبایل.
- `apps/web/components/admin/AdminOverviewWidgets.tsx`: کارت‌های آماری و نمودار ثبت‌نام (SVG، رنگ وینتیج).
- `apps/web/components/admin/AdminTables.tsx`: جدول‌های کاربران، تیکت‌ها (تغییر وضعیت) و گزارش‌ها.
- `apps/web/app/admin/page.tsx`: بازنویسی کامل با ناوبری بخشی (نمای کلی/کارت‌ها/کاربران/تیکت‌ها/گزارش‌ها/تنظیمات).
- `apps/web/app/globals.css`: افزودن کلاس‌های `badge-open`، `badge-progress`، `badge-closed`.

### زیرساخت
- همه‌ی فایل‌های بالا در `install.sh` همگام شدند (منبع اصلی تولید پروژه).
- `docker compose up --build -d` با موفقیت اجرا شد؛ endpoint `/api/admin/overview` تست و تأیید شد.

---

## ۱۴۰۵/۰۷/۱۹ — پنل کاربری + فعال‌سازی سیستم تیکتینگ

**هدف:** هم‌سبک کردن پنل کاربری با پنل مدیریت (وینتیج) و فعال‌سازی کامل سیستم تیکت پشتیبانی.

### بک‌اند
- `apps/api/prisma/schema.prisma`: افزودن مدل `TicketMessage` (گفتگوی تیکت) و رابطه‌های `ticketMessages` در `User` و `messages` در `Ticket`.
- ماژول جدید `apps/api/src/tickets/`:
  - `tickets.service.ts`: ساخت تیکت، فهرست/جزئیات تیکت‌های کاربر، پاسخ کاربر، پاسخ مدیر،
    تغییر وضعیت، خلاصه وضعیت تیکت‌های کاربر (`summaryForUser`) و فهرست همه‌ی تیکت‌ها برای مدیر.
  - `tickets.controller.ts`: کاربر `POST /tickets`، `GET /tickets/mine`، `GET /tickets/mine/summary`،
    `GET /tickets/mine/:id`، `POST /tickets/mine/:id/reply`؛ مدیر `GET /admin/tickets`،
    `GET /admin/tickets/:id`، `POST /admin/tickets/:id/reply`، `PATCH /admin/tickets/:id`.
  - `tickets.module.ts` + DTOهای `create-ticket`، `reply-ticket`، `list-tickets`، `update-ticket-status`.
- `apps/api/src/app.module.ts`: ثبت `TicketsModule`.
- `apps/api/src/admin/admin.controller.ts`: حذف مسیرهای تکراری تیکت (به ماژول tickets منتقل شد).
- `apps/api/prisma/seed.ts`:seed نمونه تیکت‌ها اکنون پیام‌های گفتگو (کاربر/پشتیبانی) هم می‌سازد؛ idempotent.

### فرانت‌اند
- `apps/web/components/dashboard/UserShell.tsx`: سایدبار ثابت راست + هدر + منوی موبایل، هم‌سبک پنل مدیر.
- `apps/web/components/dashboard/UserTickets.tsx`: فهرست تیکت‌ها، دیالوگ ثبت تیکت جدید، جزئیات تیکت با گفتگو و ارسال پاسخ.
- مسیرهای جدید: `apps/web/app/dashboard/cards/page.tsx` (کارت‌های من) و
  `apps/web/app/dashboard/tickets/page.tsx` (تیکت‌ها).
- `apps/web/app/dashboard/page.tsx`: بازطراحی به شکل داشبورد با کارت‌های آماری، آخرین کارت‌ها،
  خلاصه وضعیت تیکت‌ها و دسترسی سریع.
- `apps/web/app/dashboard/layout.tsx`: استفاده از `UserShell`.
- `apps/web/lib/auth.ts`: افزودن پرچم `hydrated` و `onRehydrateStorage` برای رفع ریدایرکت اشتباه به `/login`
  پیش از هیدریت شدن وضعیت ذخیره‌شده.

### زیرساخت
- کل تغییرات در `install.sh` همگام شد (شامل بلوک‌های جدید tickets و dashboard).
- `install.sh`: حذف مرحله‌ی تکراری تزریق `JwtAuthGuard` روی `app.module.ts` (باعث خطای Duplicate identifier می‌شد)؛
  افزودن مسیرهای جدید به `mkdir -p`؛ ساخت خودکار `History-Agent.md` در صورت نبودن.
- بیلد کامل داکر موفق؛ جریان کامل تیکت (ثبت کاربر، پاسخ کاربر، پاسخ و بستن مدیر) تست و تأیید شد.
- نام فایل تاریخچه از `هیستوری-ایجنت.md` به `History-Agent.md` تغییر یافت.

---

## ۱۴۰۵/۰۷/۱۹ — تم‌های آماده کارت + اصلاح دایرکتوری و تیکت‌های مدیر

**هدف:** افزودن انتخاب تم آماده در ساخت کارت، ساده و خوانا کردن پنل جزئیات `/cards`،
نمایش کارت عمومی با تم انتخابی، و فعال‌کردن مشاهده/پاسخ تیکت در پنل مدیر.

### تم‌های آماده (فرانت‌اند)
- `apps/web/lib/themes.ts`: رجیستری تم‌ها با ۶ تم — `vintage` (پیش‌فرض)،
  `paper-editorial`، `aurora`، `dark-academia`، `monochrome`، `clay-3d`؛ شامل نام فارسی،
  رنگ‌های پیش‌نمایش و کلاس ریشه.
- `apps/web/app/globals.css`: افزودن بلوک `.card-theme` و متغیرهای هر تم (`.theme-*`)
  بر اساس فایل‌های نمونه `card_bl9..bl13` + تم وینتیج موجود.
- `apps/web/components/card/ThemedCard.tsx`: رندر کارت بر اساس تم انتخابی؛ مشترک بین
  پیش‌نمایش زنده و صفحه عمومی.
- `apps/web/components/card/LiveCardPreview.tsx`: واگذاری رندر به `ThemedCard`.
- `apps/web/components/card/CardForm.tsx`: افزودن `template` به مقادیر فرم + لیست کشویی تم
  + شبکه‌ی انتخاب سریع تم با پیش‌نمایش رنگ؛ تغییر تم بلافاصله پیش‌نمایش زنده را عوض می‌کند.
- `apps/web/components/card/PublicCardView.tsx`: نمایش صفحه `/cards/<slug>` کاملاً با تم انتخابی.
- `apps/web/app/dashboard/cards/[id]/edit/page.tsx` و
  `apps/web/components/admin/CardLiveEditor.tsx`: انتقال فیلد `template` از کارت به فرم.

### دایرکتوری `/cards`
- `apps/web/components/card/DirectoryDetail.tsx`: بازنویسی به صورت ساده و خوانا با استایل
  اصلی سایت (وینتیج) — بدون استایل تم کارت؛ اطلاعات تماس به شکل ردیف‌های منظم و لینک
  «مشاهده صفحه کامل کارت».

### پنل مدیر — تیکت‌ها
- `apps/web/components/admin/AdminTicketPanel.tsx`: پنل جدید مشاهده گفتگوی تیکت، ارسال پاسخ
  مدیر و تغییر وضعیت.
- `apps/web/components/admin/AdminTables.tsx`: قابل‌کلیک شدن ردیف/عنوان تیکت (`onOpen`) و
  فعال‌شدن دکمه‌های «مشاهده همه» (`onViewAll`) در جدول‌های کاربران، تیکت‌ها و گزارش‌ها.
- `apps/web/app/admin/page.tsx`: اتصال «مشاهده همه» به بخش‌های مربوطه، بارگذاری لیست کامل
  کاربران/تیکت‌ها و بازکردن `AdminTicketPanel` هنگام کلیک روی تیکت.

### زیرساخت
- کل تغییرات در `install.sh` همگام شد (شامل فایل‌های جدید themes/ThemedCard/AdminTicketPanel).
- بیلد کامل داکر موفق؛ تست مرورگر: تغییر تم در فرم ساخت کارت، نمایش تم روی صفحه عمومی،
  باز شدن پنل جزئیات `/cards`، و باز شدن/پاسخ تیکت در پنل مدیر — همه بدون خطا.

---

## ۱۴۰۵/۰۷/۱۹ — بک‌گراند تم و هماهنگی بخش پایین کارت

**هدف:** اعمال بک‌گراند صفحه متناسب با هر تم و هماهنگ کردن بخش پایین کارت
(QR، لینک، دکمه vCard و فوتر) با تم انتخابی در `/cards/<slug>`.

- `apps/web/app/globals.css`: افزودن متغیرهای سطح‌صفحه به هر تم
  (`--card-page-bg`، `--card-page-text`، `--card-page-muted`، `--card-panel-bg`، `--card-panel-border`)
  و کلاس‌های `.card-theme-page` و `.theme-panel`.
  بک‌گراندها مطابق فایل‌های نمونه: aurora (گرادیان‌های شعاعی روی سبز تیره)،
  dark-academia (قهوه‌ای تیره)، vintage (بافت کاغذ)، paper-editorial/monochrome (سفید)،
  clay-3d (#FDF6EF).
- `apps/web/components/card/PublicCardView.tsx`: بازنویسی — کل صفحه داخل
  `card-theme-page` قرار گرفت، بک‌گراند تم روی کل ویوپورت اعمال می‌شود و بخش پایین
  (پنل QR، دکمه vCard، فوتر) با کلاس‌های تم هماهنگ شد.
- تست با CDP: بررسی محاسبه‌شده‌ی رنگ‌ها برای تم‌های dark (aurora) و light (paper-editorial)
  تأیید شد؛ بیلد داکر موفق و در `install.sh` همگام شد.

---

## ۱۴۰۵/۰۷/۱۹ — هم‌ساخت کامل چیدمان کارت با فایل‌های نمونه

**هدف:** نزدیک‌کردن چیدمان و رنگ‌بندی کارت به فایل‌های نمونه (به‌ویژه
`card_bl13_clay_3d.html`): دکمه‌های درشت و واضح، برچسب‌های انگلیسی و کاپیتال،
عنوان کسب‌وکار بزرگ در بالا، و رنگ‌بندی دقیق.

- `apps/web/components/card/ThemedCard.tsx`: بازنویسی چیدمان به‌سبک نمونه —
  آواتار وسط‌چین با گرادیان بنفش→فیروزه‌ای (`#8b5cf6`→`#22d3ee`)، عنوان بزرگ وسط‌چین
  (`clamp(27px,7vw,34px)`) که کسب‌وکار/عنوان شغلی را در بالا نشان می‌دهد، بیو با
  `max-width:34ch`، و دکمه‌های تمام‌عرض تک‌ستونه با برچسب انگلیسی کاپیتال
  (`PHONE`, `WHATSAPP`, `EMAIL`, `WEBSITE`, `INSTAGRAM`, `LINKEDIN`, `TELEGRAM`, `TWITTER / X`)
  و فوتر `Find me around the web`. حذف نوار بنر بالای کارت (نمونه‌ها بنر ندارند).
- `apps/web/app/globals.css`: اندازه/شکل دکمه‌ها مطابق نمونه — ارتفاع حداقل `52px`،
  `font-size:15px`، و رنگ‌بندی هر تم بازنویسی شد (خمیری با سایه‌ی آفست ۴px و پالت
  `#f3c2ad/#d9c9ed/#bddded/#c4e2cb`، وینتیج با حلقه‌ی نقطه‌چین و دکمه‌ی
  `#8b3a1a`، monochrome مشکی، aurora شیشه‌ای سبز، dark-academia طلایی، کاغذی outline).
  آواتار برای همه‌ی تم‌ها گرادیان بنفش→فیروزه‌ای نمونه را گرفت.
- `apps/web/components/card/PublicCardView.tsx`: عرض کارت به `480px` (عرض نمونه) تغییر کرد.

**تأیید با اندازه‌گیری:** عرض کارت ۴۸۰px، دکمه‌ها ۴۱۴×۵۶px (نمونه: ۴۱۳×۵۶)،
آواتار ۹۶px، عنوان ۳۴px وسط‌چین، ۸ دکمه‌ی انگلیسی کاپیتال — منطبق با اسکرین‌شات نمونه.
بیلد داکر موفق و در `install.sh` همگام شد.

---

## ۱۴۰۵/۰۷/۱۹ — رفع نمایش شهر/کسب‌وکار و حذف درباره‌من/آدرس از کارت عمومی

**مشکلات:** در `/cards/<slug>` چیپ‌های شهر و کسب‌وکار نمایش داده نمی‌شدند (فقط در پیش‌نمایش زنده بودند)،
و بخش‌های «درباره من» و «آدرس» باید از همه تم‌ها حذف می‌شدند.

- `apps/api/src/cards/cards.service.ts`: در `findPublicBySlug` رابطه‌های `city` و `business`
  با `include` اضافه شد تا endpoint عمومی هم نام شهر و کسب‌وکار را برگرداند.
- `apps/web/lib/api.ts`: افزودن `city` و `business` به تایپ `Card`.
- `apps/web/components/card/PublicCardView.tsx`: پاس‌دادن `card.city?.name` و
  `card.business?.name` به `ThemedCard`.
- `apps/web/components/card/ThemedCard.tsx`: حذف کامل بخش «درباره من» (bio) و «آدرس» (address)
  از همه تم‌ها؛ حذف import بی‌استفاده `MapPin`.

**تأیید:** خروجی API اکنون `city: {name:'رامسر'}` و `business: {name:'بازاریابی و فروش'}` را
برمی‌گرداند؛ در هر شش تم، چیپ‌های شهر/کسب‌وکار نمایش داده می‌شوند و متن بیو/آدرس وجود ندارد.
بیلد داکر موفق و در `install.sh` همگام شد.

---

## ۱۴۰۵/۰۷/۱۹ — درشت‌کردن تگ‌های شهر/کسب‌وکار و فونت شبنم برای متون فارسی

**درخواست:** تگ‌های شهر و کسب‌وکار روی کارت عمومی درشت‌تر شوند و متون فارسی کارت
(عنوان، نام، چیپ‌ها) با فونت «شبنم» که در پروژه نصب است رندر شوند.

- `apps/web/app/globals.css`:
  - `.card-theme .theme-chip` بزرگ‌تر شد — `font-size: clamp(15px,4vw,18px)`،
    `font-weight:700`، `padding:8px 18px`، `border-radius:999px` (قبلاً `11px` و padding کوچک).
  - کلاس کمکی `.card-theme .theme-fa` اضافه شد که `font-family:'Shabnam'` را اعمال می‌کند
    تا متون فارسی مستقل از فونت لاتینِ هر تم، همیشه با شبنم رندر شوند.
- `apps/web/components/card/ThemedCard.tsx`:
  - چیپ‌های شهر/کسب‌وکار با `theme-chip theme-fa rounded-full px-[18px] py-2 font-bold`
    و فاصله‌ی بیشتری بین آن‌ها (`gap-2.5`, `mt-4`).
  - عنوان و نام کامل و ردیف عنوان شغلی کلاس `theme-fa` گرفتند تا شبنم را تضمین کنند.
  - برچسب‌های انگلیسی دکمه‌ها (`PHONE`, `WEBSITE`, ...) عمداً با فونت لاتینِ تم می‌مانند.

**تأیید با اندازه‌گیری (Chrome headless computed styles):**
چیپ‌های «رامسر» و «بازاریابی و فروش» در تم dark-academia و «تبریز/فناوری اطلاعات» در تم aurora
اکنون `font-size:18px`، `font-family: Shabnam, ...`، `padding:8px 18px` و ارتفاع ۴۳px دارند
(قبلاً ۱۱px). عنوان کارت هم `Shabnam` شد. بیلد داکر موفق و هر دو فایل در `install.sh` همگام شدند.
