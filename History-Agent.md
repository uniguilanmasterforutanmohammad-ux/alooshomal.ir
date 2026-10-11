# هیستوری ایجنت (Agent History)

این فایل تمام تغییرات اعمال‌شده توسط ایجنت را به ترتیب زمانی ثبت می‌کند.
از این پس هر تغییر جدید در همین فایل ثبت می‌شود.

> **مرجع قوانین:** این قوانین در فایل ریشه‌ی `AGENTS.md` هم ثبت شده‌اند؛ آن فایل
> توسط Codex CLI به‌صورت خودکار بارگذاری می‌شود و دامنه‌اش کل مخزن است، پس این
> وظایف ایجنت را در هر اجرا به ایجنت تحمیل می‌کند. هر دو فایل باید هم‌سو بمانند.

> **قانون دائمی:** پس از اتمام و تست هر کار، ایجنت موظف است همان تغییر را
> (هدف، فایل‌های تغییریافته، و نحوه‌ی تأیید/تست) در همین فایل `History-Agent.md`
> ثبت کند. هیچ کاری بدون ثبت در این فایل تمام‌شده تلقی نمی‌شود.

> **قانون نسخه‌دهی:** پروژه از نسخه‌دهی معنایی سه‌عددی (`vMAJOR.MINOR.PATCH`) استفاده
> می‌کند و منبع یکتای آن `apps/web/lib/version.ts` است (نمایش در فوتر پنل کاربری و
> صفحات عمومی). ایجنت پس از اتمام و تست هر تغییر، به‌طور خودکار و بر اساس حجم درخواست
> نسخه را بالا می‌برد: تغییرات بزرگ/شکستن‌ساز → `MAJOR`، قابلیت جدید → `MINOR`،
> اصلاح کوچک/استایل/متن → `PATCH`. نسخه‌ی فعلی: **v2.7.0**.

> **قانون همگام‌سازی `install.sh`:** پس از هر ویرایش روی فایل‌های تحت `apps/`،
> `scripts/` و `docs/` (و فایل‌های ریشه‌ی فهرست‌شده در مولد)، اجرای
> `python3 scripts/sync_install.py` اجباری است و کار تا سبز شدن
> `python3 scripts/sync_install.py --check` تمام‌شده نیست.

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
