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
> اصلاح کوچک/استایل/متن → `PATCH`. نسخه‌ی فعلی: **v3.34.4**.

## ۱۴۰۵/۰۸/۲۰ — افزودن راه‌های تماس مستقیم به صفحه‌ی تماس — نسخه `v3.34.4`

**هدف:** افزودن شماره‌ی تماس، ایمیل و چت مستقیم پیام‌رسان بله به صفحه‌ی
`/contact` با لینک‌های قابل‌کلیک.

**تغییرات:**
- `apps/web/app/contact/page.tsx`: افزودن بخش «راه‌های تماس مستقیم» با سه کارت:
  تماس تلفنی (`tel:+989207818389`)، ایمیل (`mailto:support@shomalicard.ir`) و
  پیام‌رسان بله (`https://ble.ir/09207818389` که مستقیم چت با همان شماره را باز
  می‌کند)؛ به‌روزرسانی متن معرفی و توضیحات متادیتا.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.34.4`.

**تأیید/تست:**
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json` در `apps/web` → بدون خطا.
- `npx eslint app/contact/page.tsx` → بدون خطا.
- `curl http://localhost:3000/contact` → کد ۲۰۰ و وجود هر سه لینک
  `tel:+989207818389`، `mailto:support@shomalicard.ir` و
  `https://ble.ir/09207818389` در HTML.
- بررسی مسیر بله: `https://ble.ir/09207818389` شماره را به‌عنوان `phone` در
  payload صفحه می‌شناسد و مسیر `[peer]` را برای چت مستقیم باز می‌کند.

## ۱۴۰۵/۰۸/۲۰ — حذف کامل نوار ناوبری پایین موبایل — نسخه `v3.34.3`

**هدف:** حذف `MobileNav` (نوار ناوبری ثابت پایین در موبایل/تبلت) از همه‌ی
صفحه‌ها و پاک‌سازی فضاهای رزروشده برای آن.

**تغییرات:**
- `apps/web/app/layout.tsx`: حذف ایمپورت و رندر `MobileNav`.
- `apps/web/components/layout/MobileNav.tsx`: حذف فایل (دیگر استفاده نمی‌شد).
- `apps/web/app/globals.css`: حذف `padding-bottom` بدنه در موبایل، حذف
  `--dir-bottom` از `directory-shell`، حذف رزرو ۵۶px در `card-public-page` و
  `blt-page`، حذف استایل دارک نوار پایین و به‌روزرسانی توضیحات.
- `apps/web/app/page.tsx`: حذف ۵۶px رزروشده‌ی نوار پایین از ارتفاع کمینه‌ی
  `home-shell`.
- `apps/web/components/layout/Header.tsx` و
  `apps/web/components/layout/FeaturesProvider.tsx`: به‌روزرسانی توضیحات.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.34.3`.

**تأیید/تست:**
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json` در `apps/web` → بدون خطا.
- `npx eslint` روی فایل‌های تغییریافته → بدون خطا.
- `curl` روی `/`، `/services`، `/business-cards`، `/biolinks` و `/pulse` →
  هیچ‌کدام `ناوبری پایین` در HTML ندارند.
- CSS کامپایل‌شده‌ی dev server دیگر `padding-bottom:calc(56px...)`، `dir-bottom`
  و `100dvh - 56px` ندارد.

## ۱۴۰۵/۰۸/۲۰ — حذف هدر و فوتر از صفحه‌ی خدمات — نسخه `v3.34.2`

**هدف:** نمایش صفحه‌ی عمومی `/services` بدون هدر و فوتر سایت، به‌صورت یک صفحه‌ی
مستقل.

**تغییرات:**
- `apps/web/app/services/page.tsx`: حذف ایمپورت و رندر `Header` و `Footer`؛ محتوای
  صفحه اکنون فقط داخل `<main>` رندر می‌شود.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.34.2`.

**تأیید/تست:**
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json` در `apps/web` → بدون خطا.
- `npx eslint app/services/page.tsx` → بدون خطا.
- `curl http://localhost:3000/services` → کد ۲۰۰، محتوای «لیست خدمات شمالی کارت»
  موجود و هیچ تگ `<header>` یا `<footer>` در خروجی HTML نبود.

## ۱۴۰۵/۰۸/۲۰ — حذف گردی پایین کادر آبی صفحه اصلی — نسخه `v3.34.1`

**هدف:** حذف `border-radius` پایین کادر آبی (هیرو) صفحه اصلی در تم «نوین».

**تغییرات:**
- `apps/web/app/globals.css`: تغییر `border-radius` قاعده‌ی
  `html[data-theme='modern'] .home-hero` از `0 0 36px 36px` به `0`.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.34.1`.

**تأیید/تست:**
- رندر `/` در Chrome headless با تم `modern`: مقدار محاسبه‌شده‌ی
  `border-radius` و هر دو گوشه‌ی پایین `0px` شد؛ بدون تغییر در چیدمان.

## ۱۴۰۵/۰۸/۲۰ — نمایش امتیاز ستاره‌ای و تعداد دیدگاه‌ها — نسخه `v3.34.0`

**هدف:** نمایش امتیاز ستاره‌ای واقعی و تعداد دیدگاه‌ها روی کارت‌های صفحه اصلی
(مطابق نمونه) و قابل‌دسترس‌کردن آن از صفحه‌ی کارت ویزیت.

**تغییرات:**
- `apps/api/src/businesscards/business-cards.service.ts`: افزودن
  `ratingAvg`/`ratingCount` به خروجی `/business-cards/public/latest`.
- `apps/web/lib/home-server.ts`: افزودن فیلدهای امتیاز به تایپ و اولویت‌دادن
  پیشنهادها بر اساس میانگین امتیاز، سپس تعداد دیدگاه و تأیید هویت.
- `apps/web/components/home/HomeBusinessSections.tsx`: نمایش ستاره + میانگین +
  تعداد دیدگاه روی کارت پیشنهادی و در ردیف وضعیت کارت تازه؛ حالت «بدون امتیاز»
  برای کارت‌های بدون دیدگاه.
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: افزودن لینک
  امتیاز در پنل اشتراک که به بخش دیدگاه‌های `/business/:slug#reviews` می‌رود.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.34.0`.

**تأیید/تست:**
- `tsc -p apps/web/tsconfig.json --noEmit` و `eslint` روی فایل‌های تغییریافته →
  بدون خطا.
- `python3 scripts/check_api_docs.py` → ۳۷ کنترلر و ۳۹۰ مسیر، بدون خطا.
- فراخوانی `GET /business-cards/public/latest` نشان داد کارت «محسن» با
  `ratingAvg=5` و `ratingCount=1` برمی‌گردد و در ردیف پیشنهادها اول قرار می‌گیرد.
- رندر `/` در Chrome headless: کارت دارای دیدگاه «⭐ ۵٫۰ (۱)» و بقیه «بدون
  امتیاز» نمایش می‌دهند.
- صفحه‌ی `/business-cards/9049576` در عرض‌های ۱۳۶۶ و ۳۹۰ بدون سرریز افقی؛ لینک
  امتیاز «۵٫۰ (۱ دیدگاه)» در پنل اشتراک به `#reviews` اشاره می‌کند.

## ۱۴۰۵/۰۸/۲۰ — همسان‌سازی کامل «تازه‌ترین کسب‌وکارها» با نمونه — نسخه `v3.33.2`

**هدف:** یکسان‌کردن دقیق استایل و اندازه‌ی نمایش بخش «تازه‌ترین کسب‌وکارها» با
بخش مشابه در نمونه‌ی `localhost:3100` (کارت ۶۱۲×۱۳۸، تصویر ۱۲۸×۱۱۲، شعاع‌های
۱۶/۱۲ و چیدمان دوستونی).

**تغییرات:**
- `apps/web/components/home/HomeBusinessSections.tsx`: بازسازی کارت‌های تازه با
  ساختار نمونه: تصویر `object-cover` با پس‌زمینه‌ی `#eff0f6`، عنوان + نشان
  تأیید، ردیف وضعیت با پیل «تازه»، آدرس دوخطی، چیپ‌های دسته/شهر و تاریخ انتشار
  در انتهای ردیف؛ حذف پنل دور بخش و استفاده از `max-w-7xl` برای عرض دقیق
  `1232px` و کارت‌های `612px`.
- `apps/web/app/globals.css`: جدا کردن پس‌زمینه‌ی فوتر از کلاس مشترک
  `.footer-palette` (بخش‌های خانه شفاف می‌مانند) و افزودن رنگ‌های
  `--footer-thumb`/`--footer-chip` مطابق نمونه.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.33.2`.

**تأیید/تست:**
- `tsc -p apps/web/tsconfig.json --noEmit` و `eslint` روی کامپوننت → بدون خطا.
- مقایسه‌ی Computed Style با نمونه در عرض ۱۳۶۶: کارت `612×138`، شعاع کارت
  `16px`، تصویر `128×112` با شعاع `12px`، گرید `612px 612px`، فاصله‌ی `8px`،
  عنوان `14px/700`، آدرس `11px/20px` و چیپ‌ها `10px` — یکسان.
- بررسی عرض `390px`: کارت `358px`، تصویر `96×96` و بدون سرریز افقی.

## ۱۴۰۵/۰۸/۲۰ — جایگزینی لوگوی صفحه اصلی با لوگوی خوشنویسی — نسخه `v3.33.1`

**هدف:** جایگزینی نشان قبلی (آواتار واکسنتی + متن) با فایل لوگوی خوشنویسی
ارائه‌شده در هدر صفحه اصلی و فوتر، با حفظ خوانایی در حالت تیره.

**تغییرات:**
- `apps/web/public/shomali-card-calligraphy.svg`: افزودن فایل لوگوی ارائه‌شده
  (viewBox `1561×762`).
- `apps/web/components/layout/Header.tsx`: جایگزینی آواتار و متن «شمالی کارت» با
  تصویر لوگو (`h-9` در `lg` و `h-10` از `xl`).
- `apps/web/components/layout/Footer.tsx`: جایگزینی نشان فوتر با لوگو در کنار
  شعار سایت.
- هدر و فوتر در حالت تیره با `dark:invert` لوگو را سفید می‌کنند.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.33.1`.

**تأیید/تست:**
- `tsc -p apps/web/tsconfig.json --noEmit` و `eslint` روی هدر/فوتر → بدون خطا.
- `GET /shomali-card-calligraphy.svg` → `200 image/svg+xml`.
- رندر `/` در Chrome headless: لوگو با ابعاد `82×40`، `naturalWidth=300` و
  `complete=true` بارگذاری شد؛ در حالت تیره `filter: invert(1)` اعمال شد.
- بررسی عرض `390px`: لوگوی فوتر `82×40` و بدون سرریز افقی
  (`scrollWidth == clientWidth == 390`).

## ۱۴۰۵/۰۸/۲۰ — افزودن «پیشنهاد شمالی کارت» و «کسب‌وکارهای تازه» به صفحه اصلی — نسخه `v3.33.0`

**هدف:** افزودن دو بخش محتوایی زیر هیروی صفحه اصلی، با همان پالت و استایل
فوتر جدید: «پیشنهاد شمالی کارت» و «کسب و کارهای تازه».

**تغییرات:**
- `apps/web/lib/home-server.ts`: واکشی سرور‌ساید آخرین کارت‌های ویزیت از
  `/business-cards/public/latest` و تقسیم آن‌ها به پیشنهادها (کارت‌های تأییدشده
  در اولویت) و تازه‌ترین‌ها بدون تکرار.
- `apps/web/components/home/HomeBusinessSections.tsx`: دو ریل با پنل‌های
  `#f8f9fc`، حاشیه‌ی `#e6e8f0`, گوشه‌ی `12px`، کارت‌های پیشنهادی چهارستونی
  (تصویر/لوگو، شهر و دسته) و کارت‌های تازه‌ی دوستونی با تلفن.
- `apps/web/app/page.tsx`: واکشی داده و رندر دو بخش پس از هیرو؛ فوتر صفحه اصلی
  دیگر در موبایل پنهان نمی‌شود.
- `apps/web/components/layout/Footer.tsx`: حذف prop بی‌استفاده‌ی `mobileHidden`.
- `apps/web/app/globals.css`: قابل‌استفاده‌کردن پالت فوتر با کلاس مشترک
  `.footer-palette` (روشن/تیره).
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.33.0`.

**تأیید/تست:**
- `tsc -p apps/web/tsconfig.json --noEmit` و `eslint` روی فایل‌های تغییریافته →
  بدون خطا.
- رندر واقعی `/` در Chrome headless (عرض ۱۳۶۶): دو پنل با پس‌زمینه‌ی
  `rgb(248,249,252)`، حاشیه‌ی `rgb(230,232,240)` و شعاع `12px`؛ ۴ کارت پیشنهادی
  در ۴ ستون و ۵ کارت تازه در ۲ ستون.
- بررسی عرض ۳۹۰px: پنل‌ها تک‌ستونی و فوتر صفحه اصلی هم نمایش داده می‌شود.
- تصاویر لوگو/آواتار کارت‌ها با `naturalWidth > 0` بارگذاری شدند.

## ۱۴۰۵/۰۸/۲۰ — بازطراحی فوتر به سبک نمونه‌ی مرجع — نسخه `v3.32.2`

**هدف:** هم‌شکل‌کردن فوتر عمومی با فوتر نمونه‌ی مرجع (localhost:3100) از نظر
رنگ‌بندی، کادرها، اندازه‌ها، حاشیه‌ها و آیکن‌ها؛ فوتر قبلی یک ردیف تیره‌ی فشرده
بود و فقط در دسکتاپ دیده می‌شد.

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: بازنویسی کامل در قالب چهار ستون
  (برند + پنج کاشی آیکن، «صاحب کسب‌وکار هستید؟»، «صفحه‌های شمالی کارت»،
  «دسترسی سریع» و «ارتباط با ما») با همان اندازه‌های نمونه: پنل `#f8f9fc`،
  خطوط `#e6e8f0`، کاشی‌های `36px` با شعاع `12px` و سایه‌ی `0 1px 2px`،
  تیتر `text-sm` و لینک‌های `text-xs` با ارتفاع خط `24px`.
- `apps/web/components/layout/Footer.tsx`: نمایش فوتر در موبایل/تبلت (ستون‌های
  چیده‌شده) و افزودن prop اختیاری `mobileHidden` برای حفظ صفحه‌ی تک‌صفحه‌ای خانه.
- `apps/web/app/page.tsx`: استفاده از `mobileHidden` در صفحه‌ی خانه.
- `apps/web/app/globals.css`: افزودن پالت اختصاصی فوتر (متغیرهای `--footer-*`،
  نسخه‌ی روشن/تیره) و حذف پنل‌های تیره‌ی مخصوص تم‌های modern/twitter/dark که با
  چیدمان جدید تعارض داشتند.
- `apps/web/app/themes/kashi.css`: حذف پنل تیره‌ی فوتر تم کاشی تا فوتر در همه‌ی
  تم‌ها یکسان بماند.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.32.2`.

**تأیید/تست:**
- `apps/web/node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit` → بدون خطا.
- `./node_modules/.bin/eslint components/layout/Footer.tsx app/page.tsx` در
  `apps/web` → بدون خطا.
- مقایسه‌ی Computed Style با نمونه در Chrome headless: پس‌زمینه `rgb(248,249,252)`،
  border بالا `rgb(230,232,240)`، کاشی `36×36` با شعاع `12px`، چهار ستون `290px`
  با فاصله‌ی `24px`، تیتر `14px/700` و لینک `12px` با `line-height: 24px` یکسان.
- بررسی ریسپانسیو با عرض `390px`: فوتر در `/guide` نمایش دارد و در صفحه‌ی خانه
  با `mobileHidden` پنهان می‌ماند.

## ۱۴۰۵/۰۸/۲۰ — رفع خطای Unauthorized هنگام تغییر تم — نسخه `v3.32.1`

**هدف:** تغییر تم از پنل مدیر وقتی توکن دسترسی منقضی شده بود با خطای
`Unauthorized` شکست می‌خورد، هرچند کوکی refresh هنوز معتبر بود. علت این بود که
این عملیات به‌جای کلاینت مشترک `api`، با `fetch` خام و توکن قدیمی
`useAuth().token` انجام می‌شد و مسیر refresh خودکار را دور می‌زد.

**تغییرات:**
- `apps/web/lib/api/client.ts`: افزودن `api.postSameOrigin` برای درخواست به
  مسیرهای same-origin نکست (مثل `/api/proxy/site-theme`) با همان منطق
  Authorization، refresh یک‌باره روی 401 و تلاش مجدد؛ همچنین حفظ `baseUrl` در
  تلاش مجدد تا درخواست پس از refresh به origin اشتباه نرود.
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: استفاده از
  `api.postSameOrigin` به‌جای `fetch` خام و حذف وابستگی به توکن stale.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.32.1`.

**تأیید/تست:**
- سناریوی واقعی با Playwright: ورود ادمین، سپس جایگزینی توکن دسترسی با یک JWT
  منقضی و نگه‌داشتن کوکی refresh معتبر، و کلیک روی تم «کاشی ایرانی».
- توالی شبکه پس از اصلاح: `POST /api/proxy/site-theme → 401`،
  `POST /api/auth/refresh → 200`، `POST /api/proxy/site-theme → 200`؛
  `data-theme` روی `kashi` قرار گرفت و پیام موفقیت نمایش داده شد
  (بدون `Unauthorized`).
- `docker exec alooshomal-web npx tsc --noEmit` → exit 0.
- در پایان، مقدار `siteTheme` دیتابیس dev به `modern` برگردانده شد.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۸/۲۰ — افزودن تم ماژولار «کاشی ایرانی» — نسخه `v3.32.0`

**هدف:** افزودن یک تم کامل و مستقل برای کل سایت با همان ساختار تایپوگرافی،
فونت شبنم، هدر/فوتر و کامپوننت‌های موجود، اما با هویت بصری تازه‌ی کاشی‌کاری
ایرانی (لاجورد، فیروزه و طلا). تم به‌صورت ماژولار پیاده شد تا هیچ قاعده‌ای با
تم‌های دیگر قاطی نشود و حذف آن در آینده فقط حذف همین ماژول باشد.

**تغییرات:**
- `apps/web/app/themes/kashi.css`: تمام قواعد تم جدید، کاملاً محدود به
  `html[data-theme='kashi']`؛ شامل بوم ستاره‌ای، هدر با خط طلایی، فوتر
  لاجوردی، فرم‌ها، دکمه‌ها، کارت رکورد، کارت ویزیت، تبلیغات، دفترچه تلفن،
  صفحات فید/بلاگ و حالت تیره.
- `apps/web/lib/site-themes/types.ts`: قرارداد ماژول تم.
- `apps/web/lib/site-themes/kashi.ts`: متادیتای تم (کلید، نام، توضیح، رنگ نوار مرورگر).
- `apps/web/lib/site-themes/index.ts`: رجیستری واحد تم‌های ماژولار.
- `apps/web/lib/site-theme.ts`: اشتقاق `SiteTheme`، `SITE_THEMES`، گزینه‌های پنل،
  نگاشت `data-theme`/`data-skin` و رنگ viewport از رجیستری.
- `apps/web/app/layout.tsx`: استفاده از هلپر رنگ تم برای `generateViewport`.
- `apps/web/app/globals.css`: ایمپورت ماژول CSS تم.
- `apps/web/components/admin/theme-previews/KashiThemePreview.tsx` و
  `apps/web/components/admin/theme-previews/index.tsx`: پیش‌نمایش مستقل تم.
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: رندر پیش‌نمایش از
  رجیستری و پیام موفقیت عمومی بر پایه‌ی نام تم.
- `apps/api/src/settings/settings.constants.ts` و
  `apps/api/src/settings/settings.controller.ts`: افزودن `kashi` به تم‌های مجاز API.
- `docs/API.md` و `docs/THEMES.md`: به‌روزرسانی فهرست تم‌ها و افزودن راهنمای
  افزودن/حذف تم ماژولار.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.32.0`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → exit 0.
- `python3 scripts/check_api_docs.py` → ۳۷ کنترلر و ۳۹۰ مسیر، بدون خطا (exit 0).
- تم را در دیتابیس dev روی `kashi` گذاشتم و با Playwright + Chrome صفحات
  `/`، `/business-cards`، `/biolinks/<slug>`، `/business-cards/<slug>` و
  `/business-cards?view=notebook&sort=alpha` را بررسی کردم: `data-theme="kashi"`،
  بوم `rgb(246,241,230)`، هدر/هیرو/فوتر/کارت رکورد/کارت ویزیت/دفترچه تلفن با
  استایل‌های تازه، بدون خطای کنسول.
- حالت تیره: بوم `rgb(6,18,27)`، هیرو `rgb(7,30,42)`، فوتر `rgb(6,18,27)` و
  دکمه‌ی اصلی با گرادیان فیروزه‌ای→آبی→نیلی؛ بدون باقی‌ماندن رنگ‌های قهوه‌ای تم کلاسیک.
- موبایل ۳۹۰×۸۴۴: `scrollWidth == clientWidth` (بدون سرریز افقی) و نوار پایین
  با حاشیه‌ی طلایی.
- در پایان، مقدار `siteTheme` دیتابیس dev به `modern` برگردانده شد.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق» اجرا شد.

## ۱۴۰۵/۰۸/۲۰ — throttle نوشتن `lastUsedAt` در هر درخواست (`sessions.touch`) — نسخه `v3.31.4`

**هدف:** کاهش بار دیتابیس و مصرف CPU. تا پیش از این، هر درخواست احراز‌شده یک
`UPDATE` روی جدول `sessions` می‌زد تا مهلت بی‌فعالیتی تازه شود؛ در حالی که این
مهلت ۷ روزه است، پس نوشتن در هر درخواست اتلاف بود و روی یک ردیفِ ثابت هم رقابت
ایجاد می‌کرد.

**تغییرات:**
- `apps/api/src/sessions/sessions.service.ts`: افزودن ثابت
  `SESSION_TOUCH_INTERVAL_MS = 60_000` و تغییر `touch(sessionId, lastUsedAt?)`
  تا وقتی نشست تازه مهر شده باشد، `UPDATE` را رد کند.
- `apps/api/src/auth/strategies/jwt.strategy.ts`: ارسال `session.lastUsedAt` به
  `touch` — بدون کوئری اضافه، چون همان مقدار از قبل در `findActive` خوانده شده است.

**تأیید/تست:**
- با یک تریگر موقت روی جدول `sessions` در دیتابیس dev: نشست را stale کردم و ۳۰
  درخواست احراز‌شده‌ی پی‌درپی زدم؛ فقط **۱** بار `UPDATE` ثبت شد (قبلاً ۳۰ بار).
  تریگر موقت پس از تست حذف شد.
- `tsc --noEmit` داخل کانتینر `alooshomal-api` بدون خطا (exit 0). (خطاهای
  `tsc` روی هاست مربوط به کلاینت Prisma تولیدنشده است و از قبل وجود دارد.)

## ۱۴۰۵/۰۸/۲۰ — افزایش بازه‌ی پول پشتیبانی آنلاین از ۲۰ به ۶۰ ثانیه — نسخه `v3.31.3`

**هدف:** کاهش بار سرور و مصرف CPU با کم‌کردن تعداد پول‌های تکراری رابط چت.
چون پیام‌های زنده از قبل روی SSE (`/support/chat/me/stream`) می‌آیند، این پول
فقط نقش «تور اطمینان» را دارد؛ کلاینت EventSource هم در صورت قطع، خودش طی چند
ثانیه دوباره وصل می‌شود. پس بازه‌ی بلندتر تجربه‌ی لحظه‌ای را خراب نمی‌کند و
بار هر کاربر را حدوداً سه برابر کم می‌کند.

**تغییرات:**
- `apps/web/lib/support-chat.ts`: افزودن ثابت مشترک `SUPPORT_POLL_MS = 60_000`
  همراه توضیح.
- `apps/web/components/support/SupportChatPanel.tsx`،
  `apps/web/components/support/SupportChatWidget.tsx`،
  `apps/web/components/support/SupportChatHistory.tsx` و
  `apps/web/components/admin/AdminSupportChat.tsx`: جایگزینی `20_000` با
  `SUPPORT_POLL_MS`.

**تأیید/تست:**
- تست Playwright روی نسخه‌ی dev محلی (کاربر و گفتگوی موقت): پس از بارگذاری
  اولیه در ~۲.۲s، پول بعدی در **۶۲.۰s** ثبت شد و هیچ پولی در ۲۰s یا ۴۰s
  نبود؛ مجموع ۱۳ درخواست GET چت در ۷۰ ثانیه.
- `tsc --noEmit` در `apps/web` بدون خطا.

## ۱۴۰۵/۰۸/۲۰ — رفع چشمک‌زدن مداوم صفحه‌ی چت پشتیبانی (حلقه‌ی read) — نسخه `v3.31.2`

**هدف:** رفع چشمک‌زدن (flicker) ممتد و مصرف بالای CPU در صفحه‌ی گفتگوی
آنلاین پشتیبانی. علت، یک حلقه‌ی بازخورد بود: هر بار `load()` در پنل کاربر
هنگام وضعیت `OPEN` بدون توجه به وجود پیام خوانده‌نشده، `POST /read` می‌فرستاد؛
سرور هم بی‌قید `read` را روی SSE منتشر می‌کرد؛ کلاینت با دریافت `read` دوباره
`load()` را صدا می‌زد و چرخه بی‌پایان می‌شد. علاوه بر آن، هر `load()` مقدار
`loading` را true می‌کرد و کل رشته‌ی پیام‌ها با اسپینر جایگزین می‌شد و
همین «چشمک» را دیدنی می‌کرد.

**تغییرات:**
- `apps/api/src/support-chat/support-chat.service.ts`: در `markUserRead` و
  `markStaffRead` خروجی تراکنش گرفته و رویداد `read` فقط وقتی منتشر می‌شود که
  واقعاً پیامی خوانده‌شده باشد (`marked.count > 0 || unread > 0`)؛ حذف انتشار
  بی‌قید که منبع حلقه بود.
- `apps/web/components/support/SupportChatPanel.tsx`: ارسال رسید خواندن فقط
  هنگام `data.userUnread > 0`؛ نادیده‌گرفتن رویداد `read` در SSE (فقط `status`
  باعث بارگذاری مجدد می‌شود)؛ نمایش اسپینر تنها در بارگذاری اولیه
  (`loading && messages.length === 0`) و حفظ پیام‌ها در پول‌های پس‌زمینه.

**تأیید/تست:**
- تست Playwright دو‌نشستی روی کانتینرهای dev: پیام کاربر، مشاهده در پنل مدیر،
  پاسخ مدیر و دریافت زنده در پنل کاربر (`USER_SENT_OK`،
  `ADMIN_SAW_USER_MESSAGE_OK`، `ADMIN_REPLIED_OK`، `USER_RECEIVED_LIVE_OK`،
  `DASHBOARD_SUPPORT_OK`).
- اندازه‌گیری ۲۵ ثانیه‌ای قبل/بعد: قبل ≈۷۸۱ درخواست `GET /support/chat/me`،
  ≈۷۷۸ درخواست `POST /read` و ≈۵۰۱۲ تغییر DOM؛ بعد ۳ بارگذاری، ۰ درخواست
  `read` و ۰ تغییر DOM/اسپینر.
- `apps/web` با `tsc --noEmit` بدون خطا؛ خطاهای `wallet.service.ts` در API از
  قبل و مربوط به کلاینت Prisma تولیدنشده است و به این تغییر ربطی ندارد.

## ۱۴۰۵/۰۸/۲۰ — رفع خطای `denied` در pull ایمیج‌های GHCR هنگام استقرار — نسخه `v3.31.1`

**هدف:** رفع شکست مرحله‌ی Deploy با خطای
`error from registry: denied` هنگام `docker compose pull` روی سرور. علت این بود
که ورک‌فلو فقط در صورت وجود `GHCR_PAT` روی سرور `docker login` می‌کرد؛ در
غیر این صورت pull ناشناس انجام می‌شد و پکیج‌های تازه‌ی GHCR به‌صورت پیش‌فرض
خصوصی‌اند.

**تغییرات:**
- `.github/workflows/deploy.yml`: مرحله‌ی SSH حالا همیشه با `GITHUB_TOKEN`
  (مجوز `packages: read` در job دیپلوی) یا `GHCR_PAT` در صورت وجود، روی سرور
  `docker login ghcr.io` می‌کند؛ توکن موقت با `trap` پس از پایان از docker
  config پاک می‌شود و در صورت شکست pull پیام راهنمای صریح چاپ می‌شود.
- `docs/DEPLOY.md`: توضیح ورود خودکار به GHCR، نقش اختیاری `GHCR_PAT` و بخش
  عیب‌یابی خطای `denied`.

**تأیید/تست:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"` → `YAML_OK`.
- بررسی دستی اسکریپت: `GHCR_TOKEN` از `GHCR_PAT || GITHUB_TOKEN` پر می‌شود،
  `docker login` پیش از `pull` اجرا می‌شود و `trap` خروج امن دارد.
- `python3 scripts/sync_install.py --check` بدون تغییر معلق.
- اجرای واقعی استقرار نیازمند push کاربر است (طبق قانون ۱۰ ایجنت deploy انجام نمی‌دهد).

## ۱۴۰۵/۰۸/۲۰ — پشتیبانی آنلاین و چت زنده با واحد پشتیبانی — نسخه `v3.31.0`

**هدف:** راه‌اندازی سامانه‌ی کامل پشتیبانی آنلاین؛ کاربر با فشردن دکمه‌ی شناور
«پشتیبانی آنلاین» در هر صفحه، بدون واسطه و به‌صورت زنده با واحد پشتیبانی گفتگو
می‌کند. مدیران یک صندوق پشتیبانی زنده با فهرست گفتگوها، شمارنده‌ی پیام تازه،
جستجو، واگذاری و بستن/بازگشایی گفتگو دارند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن enumهای `SupportChatStatus`/`SupportChatSender` و مدل‌های `SupportConversation`/`SupportMessage` با شمارنده‌های خوانده‌نشده‌ی دوطرفه و ایندکس‌های لازم؛ افزودن relationهای کاربر.
- `apps/api/src/support-chat/support-chat.service.ts`: منطق گفتگو (ایجاد خودکار، پیام کاربر/مدیر، خواندن، بستن، فهرست/جستجو، واگذاری، شمارنده‌ها) و ارسال اعلان/لاگ فعالیت.
- `apps/api/src/support-chat/support-chat-events.service.ts`: گذرگاه رویداد درون‌فرایندی برای پخش زنده‌ی پیام‌ها.
- `apps/api/src/support-chat/support-chat.controller.ts`: مسیرهای کاربر (`/support/chat/me/*`) و مدیر (`/admin/support/chat/*`) همراه با SSE و تیکت یک‌بارمصرف جریان.
- `apps/api/src/support-chat/dto/*`: DTOهای ارسال پیام، فهرست گفتگو و به‌روزرسانی وضعیت/واگذاری با مستندات Swagger.
- `apps/api/src/support-chat/support-chat.module.ts` و `apps/api/src/app.module.ts`: ثبت ماژول.
- `apps/api/src/main.ts`: افزودن تگ `support-chat` به Swagger.
- `apps/web/components/support/SupportChatPanel.tsx`: نمای گفتگوی زنده (حباب پیام، وضعیت اتصال، پاسخ سریع، خواندن خودکار، اتصال SSE و fallback).
- `apps/web/components/support/SupportChatWidget.tsx`: دکمه‌ی شناور سراسری با نشان پیام تازه و پنل گفتگو.
- `apps/web/components/support/SupportChatHistory.tsx` و `apps/web/app/dashboard/support/page.tsx`: صفحه‌ی پشتیبانی داشبورد با سابقه‌ی گفتگوها.
- `apps/web/components/admin/AdminSupportChat.tsx`: صندوق پشتیبانی مدیر (فهرست زنده، جستجو، فیلتر، پاسخ، واگذاری، بستن/بازگشایی).
- `apps/web/components/admin/AdminShell.tsx`، `apps/web/app/admin/admin-console.ts` و `apps/web/app/admin/page.tsx`: افزودن بخش «پشتیبانی آنلاین» به پنل مدیریت.
- `apps/web/components/dashboard/UserShell.tsx`: افزودن لینک «پشتیبانی آنلاین» به منوی داشبورد.
- `apps/web/app/layout.tsx`: نصب دکمه‌ی شناور در همه‌ی صفحات.
- `apps/web/app/contact/page.tsx` و `apps/web/components/layout/Footer.tsx`: معرفی و لینک‌دهی به گفتگوی آنلاین.
- `apps/web/lib/api/types/support.ts` و `apps/web/lib/api.ts`: تایپ‌های کلاینت گفتگو.
- `docs/API.md`: مستندسازی کامل مسیرهای پشتیبانی آنلاین و رفتار SSE.

**تأیید/تست:**
- `npx prisma validate` و `npx prisma generate` در کانتینر API موفق؛ `npx prisma db push` جدول‌ها را بدون خطا ساخت.
- `npx tsc --noEmit` در `apps/api` و `apps/web` بدون خطا؛ `npx eslint` روی فایل‌های جدید بدون error (فقط ۴ هشدار سبک React hooks).
- `python3 scripts/check_api_docs.py` → ۳۹۰ مسیر، همه با `@ApiOperation`/`@ApiTags`؛ `GET /api/docs-json` همه‌ی ۱۷ مسیر `support` را با summary برگرداند.
- تست API با توکن کاربر/مدیر: ارسال پیام، فهرست مدیر، پاسخ مدیر، شمارنده‌ی خوانده‌نشده، خواندن و بستن گفتگو همه پاسخ درست دادند.
- تست Playwright با دو نشست هم‌زمان (کاربر + مدیر): پیام کاربر در صندوق مدیر ظاهر شد، پاسخ مدیر بدون رفرش در پنل کاربر رسید (`USER_RECEIVED_LIVE_OK`)، و صفحه‌ی `/dashboard/support` با سابقه‌ی گفتگوها بارگذاری شد.
- تست موبایل (۳۹۰×۸۴۴): دکمه و پنل داخل viewport، بدون سرریز افقی، و ارسال پیام موفق.
- `python3 scripts/sync_install.py --check` بدون تغییر معلق.

## ۱۴۰۵/۰۸/۲۰ — اصلاح مسیر کیف پول در «شروع آسان» — نسخه `v3.30.1`

**هدف:** رفع خطای `Cannot GET /api/wallet/mine` هنگام بازکردن
`/dashboard/onboarding`؛ ویزارد برای خواندن بدهی، مسیر اشتباه را صدا می‌زد.

**تغییرات:**
- `apps/web/components/dashboard/OnboardingWizard.tsx`: تغییر مسیر درخواست کیف پول از `/wallet/mine` به `/wallet/me` (مسیر واقعی کنترلر).

**تأیید/تست:**
- تست Playwright روی `/dashboard/onboarding`: فرم کسب‌وکار رندر شد، پیام `Cannot GET` دیگر دیده نشد و هیچ پاسخ ۴xx برای مسیرهای `/wallet/` ثبت نشد.
- `tsc --noEmit` در `apps/web` بدون خطا؛ `python3 scripts/sync_install.py --check` بدون تغییر معلق.

## ۱۴۰۵/۰۸/۲۰ — فرم یک‌جای کسب‌وکار در «شروع آسان» + شبیه‌سازی کامل پرداخت کیف پول — نسخه `v3.30.0`

**هدف:** کاربر بتواند در همان صفحه‌ی `/dashboard/onboarding` عنوان کسب‌وکار و
همه‌ی مشخصات لازم برای کارت ویزیت، بیولینک و صفحه‌ی مشاغل را وارد کند و بدون
ارجاع به بخش‌های دیگر ثبت شود؛ همچنین پرداخت بدهی کیف پول در محیط لوکال کامل
شبیه‌سازی شود و پس از تسویه کاربر به همان مرحله برگردد.

**تغییرات:**
- `apps/web/components/dashboard/OnboardingBusinessForm.tsx`: فرم درون‌صفحه‌ای تازه برای «عنوان کسب‌وکار» و «تکمیل مشخصات» شامل فیلدهای اجباری (عنوان، نام مدیر، شهر، دسته‌بندی، موبایل، آدرس) و اختیاری (تلفن ثابت، ایمیل، وب‌سایت، درباره، شبکه‌های اجتماعی)؛ ثبت کارت ویزیت و ساخت/اتصال خودکار بیولینک از همان داده‌ها؛ نمایش درون‌صفحه‌ای بدهی کیف پول و دکمه‌ی پرداخت شبیه‌سازی‌شده.
- `apps/web/components/dashboard/OnboardingWizard.tsx`: نمایش فرم بالا در مراحل `business` و `details` به‌جای لینک به بیلدرهای جداگانه؛ حذف لینک «ادامه‌ی این مرحله در پنل» برای این دو مرحله؛ ارسال `returnTo=/dashboard/onboarding` هنگام پرداخت بدهی.
- `apps/web/app/payments/simulate/page.tsx`: افزودن مسیر بازگشت کیف پول (`/api/wallet/payments/callback`) به فهرست callbackهای مجاز شبیه‌ساز تا پرداخت بدهی در لوکال کامل شود.
- `apps/api/src/wallet/dto/wallet.dto.ts`: افزودن `CheckoutWalletDto` با فیلد اختیاری `returnTo` و مستند Swagger.
- `apps/api/src/wallet/wallet.controller.ts`: پذیرش بدنه‌ی `returnTo` در `POST /wallet/checkout` و هدایت امن پس از callback به همان مسیر داخلی.
- `apps/api/src/wallet/wallet.service.ts`: انتقال `returnTo` در URL بازگشت درگاه.
- `docs/API.md`: به‌روزرسانی قرارداد `POST /wallet/checkout` و مسیر callback.

**تأیید/تست:**
- `tsc --noEmit` در `apps/web` بدون خطا؛ `apps/api` فقط خطاهای از پیش موجودِ Prisma client تولیدنشده را دارد و فایل‌های تغییریافته خطای تازه ندارند.
- `python3 scripts/check_api_docs.py` → ۳۷۲ مسیر، همه با `@ApiOperation`/`@ApiTags`، بدون خطا.
- تست API: `POST /wallet/checkout` با `returnTo=/dashboard/onboarding` لینک شبیه‌ساز ساخت؛ فراخوانی callback با `Location: http://localhost:3000/dashboard/onboarding?payment=success` پاسخ داد و `balance` از `-298000` به `0` رسید.
- تست Playwright روی `http://localhost:3000/dashboard/onboarding`: فرم «عنوان و اطلاعات اصلی» رندر شد، لینک ارجاع به پنل دیده نشد، ثبت فرم کارت ویزیت `PENDING` ساخت و بیولینک موجود به آن متصل شد؛ سپس داده‌ی آزمایشی حذف و بیولینک از کارت جدا شد.
- `python3 scripts/sync_install.py --check` بدون تغییر معلق.

## ۱۴۰۵/۰۸/۲۰ — بازطراحی «شروع آسان» به ویزارد مرحله‌به‌مرحله + مرحله‌ی خوش‌آمدگویی — نسخه `v3.29.0`

**هدف:** صفحه‌ی `/dashboard/onboarding` به‌جای فهرست آکاردئونی، یک کادر
مینیمال و مدرن باشد که هر بار فقط یک مرحله را به‌ترتیب نشان دهد و دکمه‌ی «مرحله
بعد» داشته باشد. همچنین یک مرحله‌ی «خوش‌آمدگویی» در ابتدای مسیر اضافه شد که متن
آن از پنل مدیریت قابل ویرایش است.

**تغییرات:**
- `apps/api/src/onboarding/onboarding.constants.ts`: افزودن نوع مرحله‌ی تازه‌ی `welcome` (خوش‌آمدگویی) به‌عنوان نخستین مرحله‌ی پیش‌فرض و معرفی `MANUAL_STEP_KINDS` (مراحلی که کاربر دستی تیک می‌زند: `welcome` و `custom`).
- `apps/api/src/onboarding/onboarding.service.ts`: تشخیص مراحل دستی از `MANUAL_STEP_KINDS` (به‌جای فقط `custom`) تا مرحله‌ی `welcome` هم تیک دستی بخورد؛ افزودن راهنمای گام خوش‌آمدگویی.
- `apps/web/components/dashboard/OnboardingWizard.tsx`: بازنویسی کامل ظاهر به ویزارد تک‌کارتی (هدر پیشرفت + نقطه‌های مراحل، نمایش یک مرحله در هر بار، دکمه‌های «مرحله قبل/بعد»، پیام پایان مسیر) با حفظ همه‌ی منطق قبلی (استعلام هویت، صورتحساب، کیف پول، سابقه‌ی استعلام‌ها) و حالت خوش‌آمدگویی با دکمه‌ی «شروع کنیم».
- `apps/web/components/admin/AdminOnboardingSteps.tsx`: افزودن گزینه‌ی «خوش‌آمدگویی» به فهرست انواع مرحله.
- `docs/API.md`: توضیح رفتار ویزارد و مرحله‌ی خوش‌آمدگویی به‌روزرسانی شد.

**تأیید/تست:**
- `tsc --noEmit` در هر دو کانتینر `api` و `web` بدون خطا؛ `npx eslint` بدون error.
- `python3 scripts/check_api_docs.py` بدون خطا.
- رزرو مرحله‌ی `welcome` روی نمونه‌ی زنده از طریق `PUT /api/admin/onboarding/steps` ذخیره و سپس `GET /api/onboarding/me` ترتیب صحیح (`welcome, identity, …`) را برگرداند.
- تست مرورگر (Playwright): نمایش کادر تک‌مرحله‌ای با دکمه‌ی «شروع کنیم»، طی‌کردن مراحل با «مرحله بعد» تا «منتظر تأیید مدیر» (بدون دکمه‌ی بعد در آخرین مرحله)، و نمایش گزینه‌ی «خوش‌آمدگویی» و هر ۷ مرحله در پنل مدیریت.

## ۱۴۰۵/۰۸/۲۰ — گره‌خوردن کیف پول و تاریخچه‌اش به کد ملی — نسخه `v3.28.0`

**هدف:** کیف پول هر شخص به کد ملی او متصل باشد و گردش حساب، تاریخچه‌ی
پرداخت‌ها، صورتحساب‌ها و لاگ کلیه‌ی تغییرات با کد ملی کاربر ذخیره گردد؛ به‌ویژه
پس از تغییر قابلیت‌ها این سوابق از بین نرود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `nationalCode` (snapshot) به `UserWallet`، `WalletEntry`، `WalletPayment` و `Invoice` (`customerNationalCode`) به همراه ایندکس‌های مربوطه.
- `apps/api/src/wallet/wallet.service.ts`: `OnModuleInit` + بازسازی یک‌باره‌ی `walletNationalCodeBackfillV1` برای پرکردن ردیف‌های قدیمی؛ ثبت کد ملی در `charge()`، `applyPayment()`، `adjust()` و ساخت `WalletPayment` در `checkout()`؛ `getMine()` حالا `nationalCode` را هم برمی‌گرداند؛ متد تازه‌ی `historyByNationalCode()` برای گردش کامل یک شخص.
- `apps/api/src/wallet/wallet.controller.ts`: مسیر `GET /admin/wallets/lookup?nationalCode=...` با مستند Swagger.
- `apps/api/src/finance/finance.service.ts` + `dto/create-manual-invoice.dto.ts`: افزودن `customerNationalCode` به ورودی/خروجی فروش، پرکردن خودکار آن از حساب خریدار، افزودن به جستجوی فاکتورها و پذیرش آن در فاکتور دستی.
- `apps/web/lib/api/types/wallet.ts` + `finance.ts`: افزودن میدان‌های `nationalCode`/`customerNationalCode` به تایپ‌ها.
- `apps/web/app/dashboard/wallet/page.tsx`: نمایش کد ملی صاحب کیف پول و کد ملی روی هر ردیف گردش/پرداخت.
- `apps/web/components/admin/AdminWallets.tsx`: نمایش ستون کد ملی، جستجوی نام/موبایل/کد ملی و پنل «گردش کامل کیف پول با کد ملی» (کیف پول، گردش حساب، پرداخت‌ها، فاکتورها).
- `apps/web/components/admin/AdminFinance.tsx`: نمایش کد ملی خریدار در فهرست فاکتورها.
- `docs/API.md`: به‌روزرسانی مستندات کیف پول و مسیر جدید lookup.

**تأیید/تست:**
- `tsc --noEmit` در هر دو کانتینر `api` و `web` بدون خطا.
- `python3 scripts/check_api_docs.py` بدون خطا؛ مسیر جدید در `GET /api/docs-json` با `summary` دیده شد.
- بازسازی زنده: `walletNationalCodeBackfillV1` اجرا شد و `nationalCode='0013529536'` روی کیف پول و هر دو ردیف گردش کاربر `09207818389` ثبت شد.
- تست API: `GET /api/wallet/me` کد ملی را برگرداند و `GET /api/admin/wallets/lookup?nationalCode=0013529536` مجموع بدهی، ۲ گردش حساب، ۱ پرداخت و ۳ فاکتور را داد.
- تست مرورگر (Playwright): صفحه‌ی کیف پول کاربر برچسب «کد ملی صاحب کیف پول» و پنل مدیر «گردش کامل کیف پول با کد ملی» با نتیجه‌ی موفق رندر شدند.

## ۱۴۰۵/۰۸/۲۰ — سابقه‌ی پایدار استعلام‌های هویت در «شروع آسان» — نسخه `v3.27.0`

**هدف:** در `/dashboard/onboarding` اگر کاربر یک‌بار استعلام هویت و تطبیق موبایل
را انجام داده باشد، با تغییر ظاهر/قابلیت‌ها نباید دوباره از او خواسته شود که
استعلام کند و هزینه بپردازد. یک سابقه‌ی ماندگار از همه‌ی استعلام‌ها و نتایج آن‌ها
ذخیره و در بنل کاربری نمایش داده می‌شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `IdentityInquiryLog` (جدول `identity_inquiry_logs`) با انوم‌های `IdentityInquiryKind` (`PHONE_MATCH`/`IDENTITY_INQUIRY`) و `IdentityInquiryStatus` (`SUCCESS`/`FAILED`/`CACHED`) برای ثبت تغییرناپذیر هر تلاش استعلام.
- `apps/api/src/profile/profile.service.ts`: متد `logInquiry()` (به‌صورت best-effort) و ثبت ردیف در همه‌ی مسیرهای `matchIdentityPhone`/`inquiryIdentity`؛ idempotency برای جلوگیری از شارژ مجدد و ثبت ردیف `CACHED` در تلاش تکراری؛ `me()` حالا `identityHistory` (۲۵ مورد آخر) هم برمی‌گرداند.
- `apps/api/src/onboarding/onboarding.service.ts` + `onboarding.constants.ts`: `GET /onboarding/me` حالا `identity` و `history` می‌دهد؛ یک بازسازی یک‌باره‌ی `backfillIdentityState()` (با نشانگر `identityStateBackfillV1`) حساب‌هایی را که کد ملی/تاریخ تولد دارند ولی فلگ‌های تأیید خالی‌اند تعمیر می‌کند و ردیف `CACHED` ثبت می‌کند.
- `apps/web/components/dashboard/OnboardingWizard.tsx`: گام هویت حالا بر اساس وضعیت ذخیره‌شده (تأییدشده / موبایل تطبیق‌شده / نیازمند استعلام) نمایش داده می‌شود و بخش «سابقه‌ی استعلام‌ها و نتایج» با برچسب‌های فارسی نوع/وضعیت، تاریخ شمسی و مبلغ در پایین ویزارد اضافه شد.
- `docs/API.md`: توضیح `GET /onboarding/me` به‌روزرسانی شد (`identity` + `history`).

**تأیید/تست:**
- `tsc --noEmit` در هر دو کانتینر `api` و `web` بدون خطا.
- `python3 scripts/check_api_docs.py` بدون خطا (exit 0).
- تست زنده: `GET /api/onboarding/me` برای کاربر `09207818389` (کد ملی `0013529536`) هم `identity` تأییدشده و هم ۲ ردیف `CACHED` (بدون هزینه) برگرداند؛ و در مرورگر (Playwright) بخش «سابقه‌ی استعلام‌ها و نتایج» رندر شد.

## ۱۴۰۵/۰۸/۲۰ — تقسیم صفحه‌ی «تنظیمات» پنل مدیر به پنل‌های مستقل — نسخه `v3.26.0`

**هدف:** صفحه‌ی `/admin?section=settings` با ده فرم پشت‌سرهم خیلی شلوغ شده بود؛
هر بخش تنظیمات به یک آیتم/پنل مستقل در منوی پنل مدیر منتقل شد.

**تغییرات:**
- `apps/web/components/admin/AdminShell.tsx`: افزودن ده بخش تازه به
  `AdminSection` و ایجاد گروه منوی «تنظیمات سایت» با آیتم‌های مستقل: ظاهر سایت،
  ویژگی‌ها و دسترسی‌ها، شروع آسان، قالب بیولینک، نمایش دایرکتوری، شهرها و
  کسب‌وکارها، ورود و ثبت‌نام، کیف پول و تسویه، اعلان‌ها، اخبار شهر. گروه
  «تنظیمات و سیستم» به «سیستم» تغییر نام یافت.
- `apps/web/app/admin/admin-console.ts`: ثبت بخش‌های تازه در `ADMIN_SECTIONS`
  و افزودن عنوان/زیرعنوان هر پنل در `PAGE_HEAD`.
- `apps/web/app/admin/sections.tsx`: جایگزینی `SettingsSection` شلوغ با یک صفحه‌ی
  «نمای کلی تنظیمات» (کارت‌های لینک‌دار برای سازگاری با لینک قدیمی
  `?section=settings`) و ده کامپوننت مستقل: `SettingsAppearanceSection`،
  `SettingsFeaturesSection`، `SettingsOnboardingSection`،
  `SettingsTemplatesSection`، `SettingsDirectorySection`،
  `SettingsTaxonomySection`، `SettingsAuthSection`، `SettingsWalletSection`،
  `SettingsNotificationsSection` و `SettingsNewsSection`.
- `apps/web/app/admin/page.tsx`: مسیریابی بخش‌های تازه به کامپوننت‌های مستقل.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.26.0`.

**تأیید/تست:**
- `npx tsc --noEmit -p tsconfig.json` در کانتینر `alooshomal-web` → exit 0.
- بررسی بصری با `playwright-core` + `/usr/bin/google-chrome` روی محیط محلی
  (با یک حساب ادمین آزمایشی): منوی «تنظیمات سایت» با ده آیتم رندر شد و هر مسیر
  مستقل محتوای خودش را نشان داد — `?section=settings` (نمای کلی کارت‌ها)،
  `settings-features` (ویژگی‌ها و دسترسی‌ها)، `settings-onboarding` (مراحل شروع
  آسان) و `settings-taxonomy` (شهرها و کسب‌وکارها).

## ۱۴۰۵/۰۸/۲۰ — انتقال «شروع آسان» به بخش مجزا، حذف استعلامات پروفایل و پُر شدن خودکار اطلاعات — نسخه `v3.25.0`

**هدف:** ۱) جدا کردن بخش «شروع آسان» از خودِ صفحه‌ی داشبورد و قرار دادن آن در
یک بخش/صفحه‌ی مستقل با آیتم منو؛ ۲) حذف بخش «استعلامات هویت» از پروفایل کاربری
چون این کار حالا در «شروع آسان» انجام می‌شود؛ ۳) نمایش خودکار اطلاعات هویتی
دریافت‌شده از استعلام در پروفایل کاربری.

**تغییرات:**
- `apps/web/app/dashboard/onboarding/page.tsx` (جدید): صفحه‌ی مستقل «شروع آسان»
  در داشبورد با عنوان و ویزارد کامل.
- `apps/web/components/dashboard/UserShell.tsx`: افزودن آیتم منو «شروع آسان»
  (با گیت `featureOnboarding`)؛ هدایت بنر «پروفایل ناقص» به همین صفحه و اصلاح
  متن آن.
- `apps/web/app/dashboard/page.tsx`: حذف ویزارد درون‌خطی از صفحه‌ی داشبورد و
  افزودن لینک سریع «شروع آسان» به جعبه‌ی «دسترسی سریع».
- `apps/web/components/dashboard/OnboardingWizard.tsx`: ساده‌سازی هدر (حذف
  عنوان تکراری) و اکتفا به نوار پیشرفت، چون عنوان در صفحه‌ی اختصاصی آمده است.
- `apps/web/components/dashboard/ProfilePanel.tsx`: حذف کامل فرم/دکمه‌های
  «تطبیق شاهکار» و «استعلام هویت» و state/واردات مرتبط؛ جای آن کارت فقط-خواندنی
  «مشخصات هویتی» (نام، نام خانوادگی، نام پدر، کد ملی، تاریخ تولد و تیک سفید)
  که به‌صورت خودکار از استعلام هویت پر می‌شود، به‌همراه لینک «رفتن به شروع آسان»
  تا پیش از تکمیل استعلام.
- `apps/web/components/dashboard/ProfileRequiredNotice.tsx`: هدایت کاربر به
  «شروع آسان» و به‌روزرسانی متن.
- `apps/web/app/pricing/page.tsx` و `apps/web/components/auth/AuthForm.tsx`:
  هدایت دکمه‌ی «درخواست استعلام» و متن راهنما به مسیر `/dashboard/onboarding`.
- `apps/api/src/settings/settings.constants.ts`: به‌روزرسانی توضیح فلگ
  `featureOnboarding` متناسب با بخش مجزا.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.25.0` (قابلیت جدید/بازآرایی UI).

**تأیید/تست:**
- `npx tsc --noEmit -p tsconfig.json` در کانتینرهای `alooshomal-web` و
  `alooshomal-api` → هر دو exit 0.
- بررسی بصری با `playwright-core` + `/usr/bin/google-chrome`:
  · منوی داشبورد آیتم «شروع آسان» را نشان می‌دهد و `/dashboard/onboarding` با
    عنوان و ویزارد کامل رندر می‌شود.
  · در `/dashboard` دیگر ویزارد درون‌خطی نیست و فقط لینک سریع «شروع آسان» دیده
    می‌شود.
  · در `/dashboard/profile` دکمه‌های «تطبیق شاهکار/استعلام هویت» حذف شده‌اند
    (بررسی رشته‌ای: `has old shahkar button = false`).
- تست زنده‌ی پُر شدن خودکار: با شبیه‌سازی خروجی استعلام روی یک کاربر
  (`firstName/lastName/fatherName/fullName/nationalCode/birthDate`)،
  `GET /profile/me` مقادیر را برگرداند (`profileCompleted = true`) و صفحه‌ی
  پروفایل آن‌ها را به‌صورت فقط-خواندنی نمایش داد.
- `python3 scripts/check_api_docs.py` → exit 0؛ `python3 scripts/sync_install.py
  --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۹ — رفع قاعده‌ی تکمیل مرحله‌ی «انتخاب طرح اشتراک» — نسخه `v3.24.1`

**هدف:** در تست زنده‌ی ویزارد «شروع آسان» معلوم شد مرحله‌ی «انتخاب طرح اشتراک»
برای کاربر تازه‌وارد بلافاصله تیک‌خورده نمایش داده می‌شود. علت این بود که سامانه
هنگام ثبت‌نام به‌طور خودکار طرح «رایگان» را به کاربر تخصیص می‌دهد و قاعده‌ی
تکمیل فقط وجود `planId` را بررسی می‌کرد.

**تغییرات:**
- `apps/api/src/onboarding/onboarding.service.ts`: قاعده‌ی مرحله‌ی `plan` اصلاح
  شد؛ اکنون فقط با «انتخاب صریح» کاربر تکمیل می‌شود: وجود اشتراک فعال
  (`UserSubscription` با وضعیت `ACTIVE`) یا تخصیص طرحی غیر از طرح پیش‌فرض
  «رایگان» (شناسه از `DEFAULT_PLAN` خوانده می‌شود).
- `docs/API.md`: توضیح قاعده‌ی تکمیل مرحله‌ی `plan` به‌روزرسانی شد.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.24.1` (اصلاح باگ).

**تأیید/تست:**
- `npx tsc --noEmit -p tsconfig.json` در کانتینر `alooshomal-api` → exit 0.
- اجرای کامل استک با
  `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build`؛
  `GET /api/health` → 200 و `GET /` وب → 200.
- تست زنده با کاربر تازه (ورود موبایل + کد توسعه): پیشرفت `0 از 6` و
  `currentStepId = identity` برگشت؛ پیش از اصلاح `1 از 6` و مرحله‌ی `plan`
  اشتباهاً تیک‌خورده بود.

## ۱۴۰۵/۰۸/۱۹ — بخش «شروع آسان» در داشبورد کاربری + مدیریت مراحل در پنل — نسخه `v3.24.0`

**هدف:** افزودن یک ویزارد مرحله‌به‌مرحله در صدر داشبورد کاربری برای طی مسیر
کامل راه‌اندازی کسب‌وکار (از استعلام هویت و پرداخت صورتحساب تا ساخت کسب‌وکار،
تکمیل مشخصات، ارسال مدارک/تیک آبی، انتخاب اشتراک و انتظار تأیید مدیر) با
امکان افزودن/حذف/جابه‌جایی مراحل از پنل مدیریت.

**تغییرات:**
- `apps/api/src/onboarding/onboarding.constants.ts` (جدید): رجیستری مراحل
  پیش‌فرض (شش مرحله‌ی خواسته‌شده)، نوع `OnboardingStepKind` و ساختار خروجی
  وضعیت/پیشرفت.
- `apps/api/src/onboarding/onboarding.service.ts` (جدید): خواندن/اعتبارسنجی
  فهرست مراحل از `Setting` (`onboardingSteps`)، محاسبه‌ی خودکار تکمیل مراحل
  پیش‌فرض از داده‌ی حساب (استعلام هویت، وجود کارت کسب‌وکار، کامل‌بودن مشخصات،
  تیک آبی، اشتراک فعال، تأیید کارت توسط مدیر) و تیک دستی مراحل سفارشی.
- `apps/api/src/onboarding/onboarding.controller.ts` (جدید): مسیرهای کاربر
  `GET /onboarding/me`، `POST|DELETE /onboarding/steps/:id/complete` و مسیرهای
  مدیر `GET /admin/onboarding/steps` و `PUT /admin/onboarding/steps` (همراه با
  `@ApiTags`/`@ApiOperation` طبق قانون ۸).
- `apps/api/src/onboarding/dto/onboarding.dto.ts` و
  `apps/api/src/onboarding/onboarding.module.ts` (جدید): DTO مستندشده و ماژول.
- `apps/api/src/app.module.ts`: ثبت `OnboardingModule`.
- `apps/api/prisma/schema.prisma`: مدل `OnboardingStepCompletion` برای تیک
  دستی مراحل سفارشی + رابطه‌ی آن روی `User`.
- `apps/api/src/settings/settings.constants.ts`: افزودن فلگ `featureOnboarding`
  به رجیستری `FEATURE_FLAGS` (طبق قانون ۹؛ سوئیچ‌های فعال/نمایش خودکار).
- `apps/web/components/dashboard/OnboardingWizard.tsx` (جدید): ویزارد داشبورد؛
  نوار پیشرفت، بازشدن مرحله‌ی جاری، فرم دریافت کد ملی/تاریخ تولد، نمایش
  صورتحساب استعلام، دکمه‌ی «تأیید و پرداخت»، و پس از منفی‌شدن اعتبار کیف پول
  دو گزینه‌ی «پرداخت آنلاین» و «بعداً پرداخت می‌کنم».
- `apps/web/app/dashboard/page.tsx`: نمایش ویزارد در صدر داشبورد در صورت
  `isFeatureVisible('featureOnboarding')`.
- `apps/web/components/admin/AdminOnboardingSteps.tsx` (جدید): ویرایشگر مراحل
  در پنل (افزودن/حذف/جابه‌جایی/فعال‌سازی/ویرایش عنوان و لینک).
- `apps/web/app/admin/sections.tsx`: افزودن ویرایشگر مراحل به بخش «تنظیمات».
- `docs/API.md`: مستندسازی مسیرهای `/api/onboarding` و `/api/admin/onboarding`
  و قاعده‌ی تکمیل هر مرحله.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.24.0` (قابلیت جدید).

**تأیید/تست:**
- `python3 scripts/check_api_docs.py` → exit 0 (۳۶ کنترلر / ۳۷۱ مسیر، همه با
  `@ApiOperation`).
- `npx tsc --noEmit -p tsconfig.json` در کانتینرهای `alooshomal-api` و
  `alooshomal-web` → هر دو exit 0.
- تست زنده‌ی API روی کانتینر محلی: `GET /api/onboarding/me` مراحل و پیشرفت را
  برگرداند؛ `PUT /api/admin/onboarding/steps` افزودن مرحله‌ی سفارشی، سپس
  `POST`/`DELETE /onboarding/steps/:id/complete` تیک/برداشتن تیک و بازگردانی
  فهرست پیش‌فرض؛ ورودی نامعتبر `kind` با ۴۰۰ رد شد.
- بررسی بصری با `playwright-core` + `/usr/bin/google-chrome`: ویزارد «شروع
  آسان» با پیشرفت «۴ از ۶»، صورتحساب استعلام و فرم هویت در `/dashboard` و
  ویرایشگر مراحل در `/admin?section=settings` رندر شدند.
- `python3 scripts/sync_install.py` و `python3 scripts/sync_install.py --check`
  → «تغییر معلق» صفر.

## ۱۴۰۵/۰۸/۱۹ — بازبینی جامع UI/UX دسته‌بندی مشاغل و پروفایل کسب‌وکار — نسخه `v3.23.0`

**هدف:** بازبینی جامع رابط صفحه‌های «دسته‌بندی مشاغل» و «صفحه‌ی کسب‌وکار»،
رفع نواقص، تمیز و استانداردسازی کد و کاربرپسند/ریسپانسیو کردن UI در همه‌ی
سایزها و همه‌ی تم‌ها (vintage/modern/twitter/bazaar + حالت تاریک).

**تغییرات:**
- `apps/web/components/business/BusinessSectionNav.tsx` (جدید): نوار تب‌های
  چسبان درون‌صفحه‌ای («درباره، تصاویر، آدرس و تماس، ساعات کاری، دیدگاه‌ها») با
  اسکرول نرم، همگام‌سازی با `IntersectionObserver` و برجسته‌سازی بخش فعال؛ روی
  موبایل به‌صورت افقی اسکرول می‌شود تا هیچ تبی شکسته/پنهان نماند.
- `apps/web/app/business/[slug]/page.tsx`: افزودن `id` به بخش‌ها برای لنگرها؛
  بازچینش اکشن‌های هدر (گروه تماس/ابزار)، آیکونی‌کردن اشتراک/ذخیره با
  `aria-label`، حذف چیپ گمراه‌کننده‌ی «مسیریابی (به‌زودی)» (جایگاه نقشه کافی
  است)، مسیر راهنمای ریسپانسیو (پنهان‌کردن مسیرهای میانی روی موبایل)،
  برش‌پذیری نام طولانی و جداسازی کارت QR از کارت تماس سریع (پنهان‌شدن وقتی
  اطلاع تماسی نیست).
- `apps/web/components/business/BusinessReviews.tsx`: جایگزینی `window.confirm`
  با تأیید درون‌خطی («بله، حذف کن/انصراف»)، ناوبری ستاره‌ها با کلیدهای جهت‌دار
  و `tabIndex`/`focus-visible`، و اصلاح محاسبه‌ی `meta` (totalPages/hasNext)
  پس از ثبت/حذف دیدگاه؛ ویرایش با `ref` فرم به‌جای `querySelector`.
- `apps/web/app/business/[slug]/not-found.tsx` و
  `apps/web/app/categories/[slug]/not-found.tsx` (جدید): صفحه‌ی ۴۰۴ دوستانه‌ی
  فارسی برای مسیرهای جزئیات، هم‌سبک با سایر مسیرها (وضعیت HTTP ۴۰۴ حفظ شد).
- `apps/web/app/globals.css`: استایل تب‌های چسبان، `scroll-margin-top` روی
  بخش‌ها برای عدم پوشش‌شدن زیر هدر، شبکه‌ی دوستونی اکشن‌های تماس روی موبایل،
  حداقل ارتفاع لمسی برای چیپ‌ها/ابزارها، بازچینش ردیف نتایج دسته روی موبایل
  (بدون پدینگ سخت‌کد‌شده)، و اوررایدهای حالت تاریک برای رنگ‌های پاستلی
  تأیید/تبلیغ/نوارهای امتیاز؛ حذف استایل مرده‌ی `biz-route-soon`.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.23.0` (قابلیت جدید: تب‌های
  درون‌صفحه + صفحه‌های ۴۰۴).

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` و
  `./node_modules/.bin/tsc --noEmit` (هر دو بدون خطا).
- `./node_modules/.bin/eslint "app/business" "app/categories" "components/business"` (exit 0).
- Playwright (Chrome واقعی) در عرض‌های ۳۶۰/۳۹۰/۴۳۰/۷۶۸/۱۰۲۴/۱۲۸۰/۱۴۴۰ روی
  `/business/sample-full-card`، `/categories` و `/categories/<دسته>`: هیچ
  سرریز افقی (`scrollWidth==clientWidth`) و بدون خطای کنسول؛ تب‌های لنگر با
  آفست درست (بخش زیر هدر پنهان نمی‌شود) و `aria-current` درست.
- Playwright روی تم‌های vintage/modern/twitter/bazaar و حالت تاریک هر دو: بدون
  سرریز و رنگ‌های خوانا. جریان کامل دیدگاه (ثبت امتیاز ۴ ستاره → ذخیره →
  نمایش دکمه‌ی حذف → تأیید درون‌خطی → حذف → بازگشت فرم) روی ۳۹۰ و ۱۲۸۰ تست شد.
- صفحه‌های ۴۰۴: `curl` کد وضعیت ۴۰۴ را تأیید کرد؛ `check_api_docs.py` (۳۵
  کنترلر/۳۶۶ مسیر) exit 0.
- `python3 scripts/sync_install.py` و `--check` بدون «تغییر معلق».


## ۱۴۰۵/۰۸/۱۹ — صفحه‌های دسته‌بندی مشاغل و پروفایل کسب‌وکار با دیدگاه و امتیاز — نسخه `v3.22.0`

**هدف:** برای هر دسته‌بندی شغلی یک صفحه‌ی مستقل ساخته شود و اطلاعات هر
کسب‌وکار در یک صفحه‌ی کامل به سبک دایرکتوری‌های کسب‌وکار (نمونه‌های بهتری‌نو)
نمایش داده شود: اطلاعات تماس، آدرس، گالری، ساعات کاری، امتیاز و دیدگاه کاربران.
نقشه طبق درخواست کاربر فعلاً به‌صورت جایگاه «به‌زودی» رزرو شده است.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `workingHours` (JSON هفتگی)، `gallery`
  و فیلدهای تجمیعی `ratingAvg`/`ratingCount` به `BusinessCard` و مدل جدید
  `BusinessReview` (یک دیدگاه برای هر کاربر/کسب‌وکار، با امکان ویرایش).
- `apps/api/src/businesscards/business-categories.controller.ts`: مسیرهای عمومی
  `GET /business-categories/public` (دسته‌ها + تعداد) و
  `GET /business-categories/public/:slug` (دسته + فهرست صفحه‌بندی‌شده).
- `apps/api/src/businesscards/business-reviews.controller.ts` و
  `business-reviews.service.ts`: فهرست دیدگاه‌ها/خلاصه‌ی امتیاز، دیدگاه من،
  ثبت/ویرایش و حذف دیدگاه با به‌روزرسانی تراکنشی میانگین امتیاز.
- `apps/api/src/businesscards/business-cards.service.ts`،
  `business-cards-directory.service.ts`، `working-hours.ts` و
  `business-cards.module.ts`: پشتیبانی از گالری/ساعات کاری، اعتبارسنجی و
  پاک‌سازی JSON، افزودن `address`/امتیاز به ردیف‌های دایرکتوری و ثبت کنترلرها.
- `apps/api/src/businesscards/dto/*`: `CreateBusinessReviewDto`،
  `WorkingHoursDto` و فیلدهای جدید کارت + مرتب‌سازی `rating`.
- `apps/api/src/settings/settings.constants.ts`: کلید
  `featureBusinessReviews` (فعال/نمایش خودکار در پنل) و افزودن مسیرهای
  `/categories` و `/business` به بخش عمومی کارت‌های ویزیت.
- `apps/api/src/uploads/*`: دسته‌ی آپلود `gallery` و مسیر `POST /uploads/gallery`.
- `apps/api/src/seo/seo.service.ts`: افزودن `/categories`، صفحه‌های دسته و
  `/business/:slug` به نقشه‌ی سایت.
- `apps/web/app/categories/page.tsx` و `categories/[slug]/page.tsx`: صفحه‌ی
  فهرست دسته‌ها و صفحه‌ی هر دسته با جستجو، فیلتر شهر، مرتب‌سازی (جدیدترین/
  امتیاز/محبوب/الفبا)، ردیف‌های رتبه‌بندی‌شده و صفحه‌بندی.
- `apps/web/app/business/[slug]/page.tsx` + `components/business/*`: پروفایل
  کامل کسب‌وکار به سبک بهتری‌نو (هدر، تماس/واتساپ/اشتراک/ذخیره/لایک، درباره،
  گالری، اطلاعات تماس، جدول ساعات کاری، جایگاه نقشه، دیدگاه‌ها، مشابه‌ها،
  JSON-LD `LocalBusiness` + `AggregateRating`).
- `apps/web/components/ui/GalleryUpload.tsx` و
  `components/business/WorkingHoursEditor.tsx`: آپلود چندتصویری گالری و ویرایشگر
  ساعات کاری؛ اتصال آن‌ها به فرم کارت ویزیت (داشبورد و پنل مدیر).
- `apps/web/lib/catalog-server.ts`، `lib/api/types/{catalog,reviews}.ts` و
  `lib/api.ts`: تایپ‌ها و واکشی‌های سمت سرور صفحه‌های دسته/کسب‌وکار.
- `apps/web/lib/nav.ts`، `app/page.tsx` و لینک‌های دایرکتوری/کارت عمومی:
  افزودن ورودی «مشاغل» به ناوبری (با کوتاه‌کردن برچسب‌ها برای جلوگیری از سرریز
  در عرض ۱۰۲۴–۱۴۴۰ پیکسل) و دسترسی از خانه، ردیف دایرکتوری و کارت عمومی.
- `apps/web/app/globals.css`: طراحی کامل صفحه‌های دسته/پروفایل، جدول ساعات،
  گالری، فرم و خلاصه‌ی دیدگاه‌ها و حالت‌های موبایل.
- `docs/API.md`: مستندسازی مسیرهای جدید، فیلدهای گالری/ساعات کاری و جریان
  دیدگاه/امتیاز.
- `BACKLOG.md`: ثبت «نقشه و مسیریابی» به‌عنوان مورد معوق به درخواست کاربر.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.22.0`.

**تأیید/تست:**
- `apps/api`: `./node_modules/.bin/tsc --noEmit --incremental false` → بدون خطا.
- `apps/web`: `./node_modules/.bin/tsc --noEmit` → بدون خطا.
- `python3 scripts/check_api_docs.py` → ۳۵ کنترلر و ۳۶۶ مسیر، exit 0.
- `prisma db push` روی دیتابیس لوکال → همگام شد (بدون تغییر مخرب).
- تست زنده‌ی API: دسته‌ها، صفحه‌ی «فناوری اطلاعات»، ثبت دیدگاه ۵ ستاره با
  حساب دمو، خواندن میانگین/توزیع و به‌روزرسانی `ratingAvg=5`/`ratingCount=1`.
- تست زنده‌ی UI با Playwright/Chrome: رندر `/categories`،
  `/categories/فناوری اطلاعات` و `/business/sample-full-card`؛ ورود با حساب
  دمو، پیش‌پر شدن فرم دیدگاه و ذخیره‌ی ویرایش دیدگاه از مرورگر.
- بررسی سرریز افقی در عرض‌های ۳۶۰/۳۹۰/۷۶۸/۱۰۲۴/۱۲۸۰ → بدون overflow؛
  ناوبری هدر در ۱۰۲۴–۱۴۴۰ پیکسل کامل داخل عرض می‌ماند.
- `python3 scripts/sync_install.py` و `--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۹ — نمایش تیک آبی تأییدشده روی کارت‌ها و بیولینک‌ها — نسخه `v3.21.1`

**هدف:** پس از تأیید درخواست تیک آبی توسط مدیر در پنل «زحل»، نشان تأیید هویت
بلافاصله روی کارت ویزیت و بیولینک همان کاربر (در دایرکتوری، کاشی‌ها، دفترچه،
پنل جزئیات و صفحه «کارت‌های من») نمایش داده شود.

**تغییرات:**
- `apps/api/src/biolinks/biolinks-directory.service.ts` و
  `apps/api/src/businesscards/business-cards-directory.service.ts`: افزودن
  `ownerVerified` به ردیف‌های دایرکتوری بر اساس `user.verifiedAt`.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: افزودن
  `ownerVerified` به پاسخ فهرست کارت‌های خود کاربر.
- `apps/api/src/zohal/zohal.service.ts`: پس از تأیید/رد تیک آبی، کش دایرکتوری
  بیولینک و کارت ویزیت پاک می‌شود تا نشان جدید فوراً دیده شود.
- `apps/web/lib/api/types/catalog.ts`: افزودن `ownerVerified` به انواع
  `DirectoryBiolink` و `DirectoryBusinessCard`.
- `apps/web/components/ui/DirectoryContactTile.tsx`،
  `components/biolink/DirectoryBiolinkItem.tsx`،
  `components/biolink/DirectoryBiolinkTile.tsx`،
  `components/biolink/DirectoryBiolinkDetail.tsx`،
  `components/businesscard/DirectoryBusinessCardItem.tsx`،
  `components/businesscard/DirectoryBusinessCardTile.tsx`،
  `components/businesscard/DirectoryBusinessCardNotebook.tsx` و
  `components/businesscard/DirectoryBusinessCardDetail.tsx`: نمایش نشان
  «تأیید هویت» (BadgeCheck) برای مالک تأییدشده.
- `apps/web/app/dashboard/cards/page.tsx`: نمایش تیک آبی روی کارت‌های خود کاربر.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.21.1`.

**تأیید/تست:**
- `apps/web`: `./node_modules/.bin/tsc --noEmit` → بدون خطا.
- `apps/api`: `./node_modules/.bin/tsc --noEmit --incremental false` → فقط سه
  خطای محیطی از پیش موجود.
- `python3 scripts/check_api_docs.py` → exit 0.
- تست زنده: درخواست تیک آبی برای مالک `sample-full-biolink` ثبت و با
  `PATCH /api/admin/zohal/blue-tick/:id` تأیید شد؛ `verifiedAt` ذخیره شد و
  بلافاصله `GET /api/biolinks/public` و `GET /api/business-cards/public`
  مقدار `ownerVerified: true` را برگرداندند (پاک‌سازی کش مؤثر بود). سپس داده‌ی
  تست به حالت قبل برگردانده شد.

## ۱۴۰۵/۰۸/۱۹ — استعلام دو‌مرحله‌ای هویت، کیف پول حساب‌شده و قیمت‌گذاری یک‌جای خدمات — نسخه `v3.21.0`

**هدف:** پیاده‌سازی سناریوی کامل ورود با موبایل → استعلام هویت اجباری
(مرحله ۱ شاهکار + مرحله ۲ استعلام زحل) → ثبت همه‌ی هزینه‌ها در کیف پول و
الزام تسویه پیش از اعمال هر خدمت پولی؛ به‌همراه یک بخش یک‌جا در پنل مدیر
برای مشاهده و ویرایش مبلغ همه‌ی خدمات دارای هزینه.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `fatherName`، `identityVerifiedAt` و
  `identityInquiryData` به کاربر؛ افزودن انواع `BOOST`، `AD_HOME`،
  `AD_DIRECTORY`، `FEED_TAG` و `FEED_PACKAGE` به `WalletEntryKind`؛ افزودن
  `idempotencyKey` یکتا به `WalletEntry`.
- `apps/api/src/wallet/wallet.service.ts`: شارژ idempotent (کلید یکتا + مدیریت
  همزمانی P2002)، `balanceOf` و `assertSettled` با خطای ۴۰۳ و کد `WALLET_DEBT`.
- `apps/api/src/profile/profile.service.ts` و `profile.controller.ts` و
  `dto/profile.dto.ts`: مسیرهای `GET /profile/identity/status`،
  `POST /profile/identity/phone-match` و `POST /profile/identity/inquiry`؛
  شارژ فقط وقتی زحل واقعاً پاسخ داده، پیام دقیق برای «عدم تطبیق» و ذخیره‌ی
  نام/نام پدر/داده‌ی خام استعلام؛ `me()` حالا `identityInquiryAvailable` هم
  برمی‌گرداند.
- `apps/api/src/common/national-code.ts` و `common/guards/profile-complete.guard.ts`:
  تکمیل پروفایل یعنی تاریخ تولد + تطبیق شاهکار + استعلام هویت؛ پیام راهنمای
  دو‌مرحله‌ای.
- `apps/api/src/zohal/zohal.service.ts`: تیک آبی فقط با هویت تأییدشده و پیام
  درست برای عدم تطبیق شاهکار؛ تأیید تیک آبی توسط مدیر پشت `assertSettled`.
- `apps/api/src/biolinks/*` و `businesscards/*`: ساخت بیولینک/کارت پشت
  `assertSettled`.
- `apps/api/src/boosts/*` و `ads/*`: با روشن‌بودن کیف پول، هزینه به‌جای درگاه
  به کیف پول اضافه می‌شود (کلید idempotent) و تأیید مدیر پشت `assertSettled`.
- `apps/api/src/feeds/*`: شارژ بسته‌ی فید و تگ فید با کلید idempotent،
  `assertSettled` در ساخت پست و تأیید مدیر، و rollback رکورد در صورت خطای شارژ.
- `apps/api/src/subscriptions/subscriptions-payment.service.ts`: ثبت اشتراک سپس
  شارژ با کلید `subscription:<id>` و بازگردانی پلن قبلی در صورت خطا.
- `apps/api/src/pricing/*` (جدید) و `app.module.ts`: کاتالوگ یک‌جای
  `GET/PATCH /api/admin/pricing` شامل پله، تبلیغ صفحه اصلی/دایرکتوری، تگ فید،
  همه‌ی پلن‌ها، بسته‌های فید و سرویس‌های زحل؛ اعتبارسنجی کامل کلیدها پیش از
  اعمال تا به‌روزرسانی نیمه‌کاره رخ ندهد.
- `apps/web/components/admin/AdminPricingPanel.tsx` (جدید) و
  `AdminSubscriptions.tsx`: تب «قیمت خدمات» با جدول گروه‌بندی‌شده و ذخیره‌ی
  گروهی.
- `apps/web/components/dashboard/ProfilePanel.tsx`: رابط دو‌مرحله‌ای استعلام
  هویت (شاهکار سپس استعلام خودکار) و نمایش نام پدر.
- `apps/web/app/dashboard/wallet/page.tsx`، `lib/api/types/wallet.ts`،
  `lib/api/types/boosts.ts`، `lib/api/types/ads.ts` و
  `components/dashboard/BoostTable.tsx`: برچسب انواع جدید، نمایش پیام بدهی
  کیف پول پس از ثبت درخواست پله/تبلیغ.
- `docs/API.md`: مستندسازی مسیرهای استعلام هویت، قیمت‌گذاری یک‌جا و قاعده‌ی
  `WALLET_DEBT`.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.21.0`.

**تأیید/تست:**
- `apps/web`: `./node_modules/.bin/tsc --noEmit` → بدون خطا.
- `apps/api`: `./node_modules/.bin/tsc --noEmit --incremental false` → فقط سه
  خطای محیطی از پیش موجود (`@prisma/adapter-pg` و `nodemailer` که در کانتینر
  موجودند).
- `python3 scripts/check_api_docs.py` → exit 0 (۳۳ کنترلر، ۳۵۹ مسیر).
- تست زنده روی کانتینر dev: `GET /api/admin/pricing` فهرست کامل را داد؛
  `PATCH` مبلغ پله را ۶۰۰۰۰ کرد و برگرداند؛ درخواست با کلید نامعتبر ۴۰۰ داد و
  هیچ تغییری اعمال نشد (اعتبارسنجی پیش از نوشتن).
- تست زنده استعلام: `POST /api/profile/identity/phone-match` با کد ملی نامطابق
  پیام فارسی «شماره‌ی موبایل تأییدشده با این کد ملی تطبیق ندارد…» را برگرداند
  (پیش‌تر پیام گمراه‌کننده‌ی «موفق» زحل نمایش داده می‌شد).
- تست زنده کیف پول: کاربر با بدهی ۲۹۸٬۰۰۰ تومان در `POST /api/biolinks` پاسخ
  ۴۰۳ با کد `WALLET_DEBT` و متن بدهی گرفت.
- `python3 scripts/sync_install.py` سپس `--check` → `patched: 0, added: 0`.

## ۱۴۰۵/۰۸/۱۹ — خرید اشتراک آگاه از وضعیت ورود در صفحه تعرفه — نسخه `v3.20.1`

**هدف:** دکمه‌های «خرید اشتراک» و «درخواست استعلام» در صفحه‌ی تعرفه‌ها بر اساس
وضعیت ورود کاربر مسیردهی شوند: کاربر واردشده مستقیم به پنل و بخش اشتراک‌ها و
کاربر مهمان به صفحه‌ی ورود با بازگشت به همان مقصد.

**تغییرات:**
- `apps/web/app/pricing/page.tsx`: استفاده از `useAuth` و تعیین `subscriptionsHref`
  و `inquiryHref` بر اساس ورود؛ افزودن دکمه‌ی برجسته‌ی «خرید اشتراک» در بالای صفحه.
- `apps/web/lib/version.ts`: افزایش نسخه به `v3.20.1`.

**تأیید/تست:**
- `./node_modules/.bin/tsc --noEmit` در `apps/web` → بدون خطا.
- `npx eslint app/pricing/page.tsx` → بدون خطا.
- بررسی Playwright روی `localhost:3000/pricing`: در حالت مهمان CTAها به
  `/login?next=/dashboard/subscriptions` و با توکن ذخیره‌شده به
  `/dashboard/subscriptions` اشاره کردند؛ لینک «تعرفه‌ها» در هدر نیز موجود بود.
- `python3 scripts/sync_install.py` و `--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — صفحه تعرفه خدمات و نمایش در هدر — نسخه `v3.20.0`

**هدف:** صفحه‌ی عمومی «تعرفه‌ها» از روی سرویس‌های سایت ساخته شود و در هدر
قرار بگیرد؛ تعرفه‌ی هر سرویسی که مدیر غیرفعال کرده است نمایش داده نشود.

**تغییرات:**
- `apps/api/src/zohal/zohal.service.ts`: `publicPricing()` که فقط سرویس‌های
  فعال و دارای قیمت مثبت را برمی‌گرداند و سرویس‌های هویت/تیک آبی را در صورت
  خاموش بودن سوئیچ ویژگی پنهان می‌کند.
- `apps/api/src/zohal/zohal-pricing.controller.ts` و `zohal.module.ts`:
  مسیر عمومی `GET /api/zohal/pricing`.
- `apps/web/app/pricing/page.tsx`: صفحه‌ی «تعرفه‌ها» شامل استعلام‌های فعال
  (گروه‌بندی‌شده) و اشتراک‌های فعال با CTA ورود.
- `apps/web/lib/nav.ts`: افزودن «تعرفه‌ها» به ناوبری عمومی (هدر و فوتر).
- `docs/API.md`: مستندسازی مسیر تعرفه.

**تأیید/تست:**
- `npx tsc --noEmit` و `npx eslint` در نسخه‌های موقت API و وب → بدون خطا.
- `python3 scripts/check_api_docs.py` و `check_modules.py` → exit 0.
- روی استک dev: با ثبت قیمت تستی برای `shahkar` و
  `national_identity_inquiry`، `GET /api/zohal/pricing` هر دو را برگرداند؛ با
  غیرفعال‌کردن `shahkar` از خروجی حذف و پس از فعال‌سازی دوباره برگشت. سپس
  قیمت‌ها به صفر بازگردانده شد.
- رندر صفحه با Playwright در `localhost:3000/pricing`: هر دو بخش «استعلام‌ها»
  و «اشتراک‌ها» پر شد و ناوبری هدر با ۱۰ لینک در عرض‌های ۱۰۲۴ و ۱۲۸۰ پیکسل
  بدون سرریز ماند.
- `python3 scripts/sync_install.py` و `--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — کیف پول کاربران و پرداخت یک‌جای بدهی — نسخه `v3.19.0`

**هدف:** هزینه‌ی استعلام هویتی، تطبیق موبایل/کد ملی (تیک آبی) و خرید اشتراک
به‌صورت بدهی منفی در کیف پول کاربر جمع شود، مدیر مهلت تسویه را تعیین کند و
کاربر پس از سررسید فقط یک‌بار کل مبلغ را پرداخت کند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل‌های `UserWallet`، `WalletEntry` و
  `WalletPayment` به‌همراه enum `WalletEntryKind` و رابطه‌های `User`.
- `apps/api/src/wallet/`: ماژول تازه با `WalletService` (شارژ، گردش حساب،
  سررسید و یادآوری، پرداخت یک‌جا با پی‌پینگ/شبیه‌ساز، تنظیم دستی مدیر)،
  کنترلرهای کاربر و ادمین و DTO.
- `apps/api/src/profile/profile.service.ts`: شارژ هزینه‌ی
  `national_identity_inquiry` پس از استعلام خودکار هویت.
- `apps/api/src/zohal/zohal.service.ts`: شارژ هزینه‌ی `shahkar` پس از تطبیق
  موفق موبایل و کد ملی.
- `apps/api/src/subscriptions/subscriptions-payment.service.ts`: با فعال بودن
  کیف پول، اشتراک بلافاصله فعال و مبلغش به بدهی اضافه می‌شود (بدون پرداخت
  جداگانه درگاه).
- `apps/api/src/settings/`: تنظیم `walletSettlementDays` (۱ تا ۹۰ روز) و
  سوئیچ ویژگی `featureWallet`.
- `apps/api/src/finance/finance.constants.ts`: منبع درآمد `WALLET_PAYMENT`.
- `apps/web/app/dashboard/wallet/page.tsx` و `apps/web/lib/api/types/wallet.ts`:
  پنل کیف پول کاربر (بدهی، سررسید، گردش حساب، پرداخت یک‌جا).
- `apps/web/components/dashboard/UserShell.tsx` و
  `apps/web/app/dashboard/subscriptions/page.tsx`: ورودی «کیف پول» در منو و
  پیام فعال‌سازی اشتراک از کیف پول.
- `apps/web/components/admin/AdminWallets.tsx`،
  `apps/web/components/admin/AdminWalletSettings.tsx` و اتصال در
  `AdminShell.tsx`/`admin-console.ts`/`page.tsx`/`sections.tsx`: پنل ادمین
  کیف پول‌ها و تنظیم مهلت تسویه.
- `docs/API.md`: مستندسازی مسیرهای کیف پول.

**تأیید/تست:**
- `npx prisma generate` و `npx tsc --noEmit -p tsconfig.json` در نسخه‌ی
  موقت API → بدون خطا؛ `npx eslint src` → بدون خطا.
- `npx tsc --noEmit` و `npx eslint .` در نسخه‌ی موقت وب → بدون خطا.
- `python3 scripts/check_api_docs.py` و `check_modules.py` → exit 0.
- اجرای واقعی روی استک dev: `prisma db push`، سپس با توکن ادمین/کاربر
  `POST /api/admin/wallets/:id/adjust` (بدهی ۵۰٬۰۰۰)، `POST /api/wallet/checkout`
  (شبیه‌ساز پی‌پینگ) و `GET /api/wallet/payments/callback` → `balance` به صفر
  و `dueAt` پاک شد؛ `POST /api/subscriptions/:plan/checkout` → `wallet:true`،
  بدهی ۹۹٬۰۰۰ و فعال‌سازی اشتراک. داده‌های تست سپس پاک شد.
- `python3 scripts/sync_install.py` و `--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — استعلام تطبیق موبایل و کد ملی برای تیک آبی — نسخه `v3.18.0`

**هدف:** تیک آبی فقط پس از تطبیق شماره موبایل با کد ملی (شاهکار) ثبت شود؛
استعلام هویت قبلاً برای تکمیل پروفایل انجام شده است و تکرار آن لازم نیست.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `phoneMatchVerifiedAt` به `User`.
- `apps/api/src/zohal/zohal.service.ts`: `requestBlueTick` به‌جای استعلام
  هویت، `verifyPhoneOwnership` (شاهکار) را اجرا و نتیجه را ثبت می‌کند؛ فهرست
  درخواست‌های ادمین هم این وضعیت را برمی‌گرداند.
- `apps/api/src/profile/profile.service.ts`: برگرداندن `phoneMatchVerifiedAt`
  در اطلاعات پروفایل.
- `apps/web/components/dashboard/ProfilePanel.tsx`: متن توضیح تیک آبی و نشان
  «تطبیق موبایل و کد ملی تأیید شده».

**تأیید/تست:**
- `prisma generate` و `npx tsc --noEmit` در `apps/api` → بدون خطا.
- `npx tsc --noEmit` در `apps/web` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — قیمت‌گذاری هر سرویس استعلام زحل — نسخه `v3.17.0`

**هدف:** تعیین هزینه‌ی هر فراخوانی استعلام توسط مدیر تا هزینه‌ها بعداً از
کاربر (از طریق کیف پول) دریافت شود.

**تغییرات:**
- `apps/api/src/zohal/zohal.constants.ts`: افزودن پیشوند تنظیم
  `zohal.price.<key>`.
- `apps/api/src/zohal/zohal.service.ts`: خواندن/ذخیره‌ی قیمت هر سرویس،
  `updateService` برای تغییر هم‌زمان سوئیچ و قیمت و نمایش `price` در فهرست.
- `apps/api/src/zohal/dto/zohal.dto.ts` و `zohal.controller.ts`: پذیرش
  `enabled` و `price` در `PATCH /admin/zohal/services/:key`.
- `apps/web/components/admin/AdminZohal.tsx`: فیلد ورود مبلغ و دکمه‌ی ثبت در
  هر کارت سرویس، همراه با نمایش هزینه‌ی فعلی.

**تأیید/تست:**
- `npx tsc --noEmit` در `apps/api` و `apps/web` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — حذف فیلد ایمیل از ورود موبایل — نسخه `v3.16.3`

**هدف:** ساده‌کردن ورود/ثبت‌نام با موبایل؛ کاربر فقط شماره و کد یکبارمصرف
را وارد می‌کند و ایمیل/نام در مرحله‌ی تکمیل پروفایل و استعلام هویت گرفته
می‌شود.

**تغییرات:**
- `apps/web/components/auth/AuthForm.tsx`: حذف فیلد «ایمیل (اختیاری)»، مرحله‌ی
  نام/ایمیل و مرحله‌ی رمز عبور از جریان موبایل؛ پس از تأیید کد، کاربر مستقیماً
  وارد پنل می‌شود. ورود با «ایمیل و رمز عبور» همچنان از تب جداگانه کار می‌کند.

**تأیید/تست:**
- `npx tsc --noEmit` در کپی تمیز `apps/web` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — آیکن‌های برند محلی و ارتقای lucide-react — نسخه `v3.16.2`

**هدف:** رفع شکست typecheck پس از حذف آیکن‌های برند (`Instagram`، `Linkedin`،
`Twitter`) از `lucide-react` 1.x و هم‌گام‌کردن سایت با نسخه‌ی جدید.

**تغییرات:**
- `apps/web/components/ui/SocialBrandIcons.tsx` (تازه): سه آیکن برند با
  `createLucideIcon` و همان مسیرهای قبلی lucide.
- شش کامپوننت `biolink`/`businesscard`: جایگزینی import و استفاده‌ی آیکن‌های
  برند با `InstagramIcon`/`LinkedinIcon`/`TwitterIcon` و تایپ `LucideIcon`.
- `apps/web/package.json`: ارتقای `lucide-react` به `^1.70.0`.

**تأیید/تست:**
- نصب تازه در کپی تمیز `apps/web` با `lucide-react@1.70.0` → موفق.
- `npx tsc --noEmit` → بدون خطا (خطاهای قبلی `TS2305` رفع شد).
- `npx eslint .` → بدون error (فقط warningهای ازپیش‌موجود).
- اسکن همه‌ی importهای `lucide-react` نشان داد تنها آیکن‌های گم‌شده همین سه
  برند بودند.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — مهاجرت به Prisma 7 و رفع شکست CI وابستگی‌ها — نسخه `v3.16.1`

**هدف:** هم‌گام‌کردن پروژه با Prisma 7 (که `url` را از `datasource` حذف و
driver adapter را اجباری کرده) تا `prisma generate` در نصب/CI و اجرای
کانتینر دوباره کار کند.

**تغییرات:**
- `apps/api/package.json`: ارتقای `@prisma/client` و `prisma` به `^7.10.1` و
  افزودن `@prisma/adapter-pg`.
- `apps/api/prisma/schema.prisma`: حذف `url` از بلوک `datasource`.
- `apps/api/prisma.config.ts` (تازه): تعریف مسیر schema و URL اتصال از
  `DATABASE_URL` برای CLI؛ نبودِ URL هنگام `generate` مانع نصب نمی‌شود.
- `apps/api/src/prisma/prisma.service.ts` و `apps/api/prisma/seed.ts`: ساخت
  `PrismaClient` با `PrismaPg` و بررسی وجود `DATABASE_URL`.
- `apps/api/docker-entrypoint.sh`: پرچم‌های جدید `migrate diff`
  (`--from-config-datasource`/`--to-schema`) و حذف `--skip-generate` از
  `db push`.
- `apps/api/Dockerfile`: کپی `prisma.config.ts` در مرحله‌های deps و production.
- `apps/api/package-lock.json`: هم‌گام با نسخه‌های جدید.

**تأیید/تست:**
- نصب تازه در یک کپی تمیز: `npm install` (شامل postinstall `prisma generate`)
  → موفق، Prisma Client v7.10.1.
- `npx prisma generate` بدون `DATABASE_URL` → موفق؛ `npx prisma validate` →
  «schema is valid».
- `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
  --script` → پرچم‌ها پذیرفته شد (خطای اتصال P1001 به‌دلیل نبود DB، نه خطای آرگومان).
- `npx tsc --noEmit -p tsconfig.json` و `npx eslint src` در `apps/api` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — ماژول استعلام‌های زحل، تکمیل خودکار هویت و تیک آبی — نسخه `v3.16.0`

**هدف:** اتصال ماژولار به همه‌ی سرویس‌های استعلام زحل، تکمیل پروفایل بدون
ورود دستی نام (استعلام کد ملی + تاریخ تولد)، و راه‌اندازی جریان تیک آبی.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: فیلدهای `birthDate`، `verifiedAt`،
  `blueTickRequestedAt` و `blueTickNote` روی `User`.
- `apps/api/src/zohal/zohal.constants.ts` (تازه): فهرست کامل ۳۵ سرویس زحل با
  گروه، مسیر، فیلدهای ورودی و وضعیت پیش‌فرض.
- `apps/api/src/zohal/zohal.types.ts`، `zohal.service.ts`، `zohal.controller.ts`،
  `zohal.module.ts` و `dto/zohal.dto.ts` (تازه): کلاینت Bearer، سوییچ مستقل هر
  سرویس (`zohal.service.<key>`)، فراخوانی آزمایشی، استعلام هویت، جریان تیک آبی
  و مسیرهای ادمین/کاربر.
- `apps/api/src/app.module.ts` و `profile/profile.module.ts`: ثبت `ZohalModule`.
- `apps/api/src/profile/profile.service.ts` و `dto/profile.dto.ts`: `PATCH
  /profile/me` اکنون `nationalCode` + `birthDate` می‌گیرد و نام را از استعلام
  پر می‌کند (فیلدهای نام فقط برای حالت جایگزین).
- `apps/api/src/settings/settings.constants.ts`: دو فلگ `featureIdentityInquiry`
  و `featureBlueTick`.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `businesscards/business-cards.service.ts`: افزودن `ownerVerified` به
  payload عمومی.
- `apps/web/components/admin/AdminZohal.tsx` (تازه) + ثبت بخش «زحل» در
  `AdminShell.tsx`، `admin-console.ts` و `app/admin/page.tsx`.
- `apps/web/components/dashboard/ProfilePanel.tsx`: فرم کد ملی + تاریخ تولد
  شمسی با استعلام خودکار، نمایش نام استعلام‌شده، و کارت تیک آبی.
- `apps/web/components/biolink/PublicBiolinkView.tsx` و
  `businesscard/PublicBusinessCardView.tsx` + `lib/api/types/catalog.ts`: نشان
  «تأیید هویت».
- `.env.example`، `docker-compose.yml` و `docker-compose.prod.yml`: متغیرهای
  `ZOHAL_TOKEN` و `ZOHAL_BASE_URL`.
- `docs/ZOHAL.md` (تازه) و `docs/API.md`: مستندات اتصال، سرویس‌ها و مسیرها.

**تأیید/تست:**
- `tsc --noEmit` در `apps/web` بدون خطا؛ در `apps/api` فقط خطای از پیش موجود
  `nodemailer`.
- `python3 scripts/check_api_docs.py` (۳۰ کنترلر/۳۴۸ مسیر) و
  `scripts/check_modules.py` بدون خطا.
- جریان کامل با یک mock محلی زحل (بدون هزینه): تکمیل هویت با
  `PATCH /profile/me` نام «علی رضایی» را خودکار ثبت کرد؛ درخواست تیک آبی ثبت
  و با تأیید ادمین `verifiedAt` ست شد؛ سوییچ سرویس‌ها و حالت جایگزین (خاموش
  بودن استعلام) هم بررسی شد.
- Playwright: پنل `?section=zohal` هر ۳۵ سرویس، وضعیت اتصال و بخش تیک آبی را
  بدون خطای کنسول نشان داد؛ صفحه‌ی پروفایل فرم استعلام (بدون ورودی دستی نام) و
  نشان تیک آبی را رندر کرد.
- داده‌های تستی (کاربر آزمایشی، تنظیمات سرویس و موبایل ادمین) پاک شدند.

## ۱۴۰۵/۰۸/۱۸ — قالب رسمی فاکتور فروش و مشخصات کامل مشتری — نسخه `v3.15.0`

**هدف:** فاکتور چاپی فروش ظاهری رسمی‌تر و شکیل‌تر داشته باشد و مشخصات کامل
خریدار (نام، کد ملی، موبایل، ایمیل) روی آن درج شود.

**تغییرات:**
- `apps/api/src/finance/finance.service.ts`: در `getInvoice` فیلدهای
  `firstName`، `lastName` و `nationalCode` کاربر مشتری هم انتخاب می‌شود.
- `apps/web/lib/api/types/finance.ts`: نوع `FinanceInvoice.customer` با همین
  سه فیلد تکمیل شد.
- `apps/web/components/admin/AdminFinance.tsx`: بازنویسی قالب چاپ فاکتور
  (سربرگ برند، شماره/تاریخ صدور و پرداخت، بلوک فروشنده و خریدار، جدول
  ردیف‌دار، جمع‌بندی، مبلغ به حروف، جای مهر/امضا، واترمارک «باطل»)، به‌همراه
  تابع تبدیل عدد به حروف فارسی.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit` بدون خطا.
- با Playwright روی `http://localhost:3000/admin?section=finance` یک فاکتور
  آزمایشی چاپ شد و خروجی پنجره‌ی چاپ شامل «صورتحساب فروش کالا و خدمات»،
  مشخصات کامل خریدار (کد ملی `0012345679`)، «مبلغ به حروف: چهارصد و نود و
  پنج هزار تومان» و بلوک‌های مهر/امضا بود. داده‌ی تستی سپس حذف شد.

## ۱۴۰۵/۰۸/۱۸ — ثبت‌نام فقط با موبایل و الزام تکمیل پروفایل پیش از اقدام‌ها — نسخه `v3.14.0`

**هدف:** ثبت‌نام با یک شماره موبایل کافی باشد و پیش از ساخت بیولینک/کارت ویزیت،
ثبت پست فید، درخواست پله/تبلیغ و خرید اشتراک، کاربر ابتدا نام، نام خانوادگی و کد
ملی خود را در پروفایل تکمیل کند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: فیلدهای `firstName`، `lastName` و
  `nationalCode` (یکتا) روی `User`.
- `apps/api/src/common/national-code.ts` (تازه): اعتبارسنجی کد ملی ایران
  (۱۰ رقم، عدم تکرار، رقم کنترل) و `isProfileComplete`.
- `apps/api/src/common/guards/profile-complete.guard.ts` (تازه) و ثبت آن در
  `common.module.ts`: پاسخ ۴۰۳ با پیام فارسی تا تکمیل پروفایل.
- گیت روی `POST /biolinks`، `POST /business-cards`، `POST /feeds/mine` و
  `POST /feeds/mine/uploads`، `POST /feeds/mine/subscriptions/request`،
  `POST /boosts/request`، `POST /ads/request`، `POST /subscriptions/request`،
  `POST /subscriptions/:planId/checkout` و `POST /news/reporter/request`.
- `apps/api/src/auth/auth.service.ts`: ثبت‌نام موبایلی فقط با شماره انجام
  می‌شود (نام/ایمیل اختیاری) و کاربر بلافاصله وارد می‌شود.
- `apps/api/src/profile/*`: مسیر `PATCH /profile/me` برای ثبت مشخصات هویتی،
  همگام‌سازی `fullName`، بررسی یکتایی کد ملی، و `profileCompleted` در پاسخ
  `GET /profile/me`؛ تأیید تغییر نام توسط مدیر هم `firstName/lastName` را
  به‌روز می‌کند.
- `apps/web/components/dashboard/ProfilePanel.tsx`: بخش «مشخصات هویتی» با
  وضعیت تکمیل/نیازمند تکمیل و فرم نام، نام خانوادگی و کد ملی.
- `apps/web/lib/profile-status.ts` و
  `apps/web/components/dashboard/ProfileRequiredNotice.tsx` (تازه): خواندن وضعیت
  پروفایل و نمایش پیام «ابتدا پروفایل خود را تکمیل کنید».
- `apps/web/components/dashboard/UserShell.tsx`: نوار هشدار سراسری پنل کاربری
  تا تکمیل پروفایل.
- `apps/web/app/dashboard/biolinks/new/page.tsx`،
  `apps/web/app/dashboard/business-cards/new/page.tsx` و
  `apps/web/app/dashboard/feeds/page.tsx`: جایگزینی فرم ساخت با پیام تکمیل پروفایل.

**تأیید/تست:**
- `prisma generate` و `db push` روی دیتابیس dev؛ `tsc` وب بدون خطا و API فقط
  خطای محیطی قبلی `nodemailer`؛ `check_api_docs.py` (۳۴۱ مسیر) و
  `check_modules.py` exit 0؛ `eslint` فایل‌های جدید بدون خطا.
- تست زنده API: ثبت‌نام فقط با موبایل (۲۰۰)، `profileCompleted=false`،
  `POST /biolinks` → ۴۰۳؛ کد ملی نامعتبر → ۴۰۰؛ کد ملی معتبر → ۲۰۰ و
  `profileCompleted=true`؛ سپس `POST /biolinks` → ۲۰۱؛ کد ملی تکراری برای
  کاربر دیگر → ۴۰۹.
- Playwright: نوار هشدار در داشبورد، گیت صفحه‌ی «بیولینک جدید»، ذخیره‌ی
  مشخصات در پروفایل و نمایش فرم پس از تکمیل؛ بدون خطای کنسول.
- داده‌های تست (کاربران موبایلی، بیولینک و نشست‌ها) پاک‌سازی شد.

## ۱۴۰۵/۰۸/۱۸ — دیت‌پیکر شمسی در همه‌ی بخش‌های سایت — نسخه `v3.13.0`

**هدف:** هر جا تاریخ نمایش داده می‌شود یا انتخاب می‌شود، تقویم شمسی باشد؛
ورودی‌های بومی `type="date"` که تقویم میلادی نشان می‌دادند حذف شوند.

**تغییرات:**
- `apps/web/lib/jalali.ts`: توابع تبدیل دقیق شمسی↔میلادی (الگوریتم بدون
  وابستگی)، طول ماه شمسی، سال کبیسه، `isoToJalali`/`jalaliToIso`،
  `formatJalali`، `parseJalali`، `todayIso` و `faDigits`.
- `apps/web/components/ui/JalaliDatePicker.tsx` (تازه): دیت‌پیکر شمسی با
  تقویم ماهانه، ناوبری ماه/سال، «امروز»، پاک‌کردن، تایپ دستی («۱۴۰۵/۰۸/۱۸»)
  و محدوده‌ی `min`/`max`؛ مقدار ذخیره‌شده همچنان ISO میلادی است تا قرارداد API
  تغییر نکند.
- `apps/web/components/admin/AdminFinance.tsx`: فیلتر «از/تا تاریخ»، تاریخ
  پرداخت فاکتور دستی و تاریخ هزینه با دیت‌پیکر شمسی.
- `apps/web/components/admin/payping/TransactionsTab.tsx`: فیلتر «از/تا تاریخ»
  گزارش تراکنش‌ها با دیت‌پیکر شمسی.

**تأیید/تست:**
- تست تبدیل: ۱۰ سال روزبه‌روز رفت‌وبرگشت ISO↔شمسی بدون اختلاف؛ نوروزها
  (۲۰۲۴/۰۳/۲۰ → ۱۴۰۳/۰۱/۰۱، ۲۰۲۵/۰۳/۲۱ → ۱۴۰۴/۰۱/۰۱) و اسفند کبیسه‌ی ۱۴۰۳
  (۳۰ روز) درست.
- Playwright: در «مالیاتی» و «درگاه پرداخت» هیچ `input[type=date]` نمانده؛
  تقویم باز شد، سربرگ «آبان ۱۴۰۵» و روزهای «ش ی د س چ پ ج»، انتخاب روز ۵ مقدار
  «۱۴۰۵/۰۸/۰۵» و تایپ دستی «۱۴۰۵/۰۹/۰۳» درست ثبت شد؛ بدون خطای کنسول.
- `tsc --noEmit` وب و `eslint` فایل‌های تغییریافته: بدون خطا.

## ۱۴۰۵/۰۸/۱۸ — شبیه‌سازی کامل پرداخت‌ها در توسعه/لوکال‌هاست — نسخه `v3.12.0`

**هدف:** در حالت توسعه و روی لوکال‌هاست، خرید اشتراک، «پله» و هر دو جایگاه
تبلیغ بدون توکن درگاه و بدون کسر وجه واقعی تا مرحله‌ی نهایی (تأیید، فعال‌سازی و
صدور فاکتور مالیاتی) قابل تکمیل باشد.

**تغییرات:**
- `apps/api/src/payping/payment-simulator.service.ts` (تازه): ساخت سفارش
  شبیه‌سازی‌شده با کد `SIM-…`، صفحه‌ی درگاه آزمایشی، تأیید شبیه‌سازی‌شده و
  بازنویسی آدرس بازگشت لوکال به origin API (چون وب لوکال پروکسی `/api` ندارد).
  فعال‌سازی خودکار وقتی `NODE_ENV != production` و `NEXT_PUBLIC_APP_URL` روی
  لوکال‌هاست است؛ با `PAYMENT_SIMULATOR=false/true` قابل اجبار است.
- `apps/api/src/payping/payping.module.ts`: ثبت و export سرویس شبیه‌ساز.
- `apps/api/src/subscriptions/subscriptions-payment.service.ts`: استفاده از
  شبیه‌ساز در checkout و verify، و ردکردن ساخت محصول پی‌پینگ در حالت شبیه‌سازی.
- `apps/api/src/request-payments/request-payments.service.ts`: «پله»/تبلیغ در
  حالت شبیه‌سازی هم پرداخت‌دار می‌شود و از همان مسیر تأیید/فاکتور می‌گذرد.
- `apps/web/app/payments/simulate/page.tsx` (تازه): صفحه‌ی درگاه آزمایشی با
  «پرداخت موفق» و «انصراف»؛ فقط در محیط غیر production و با callback مجاز.
- `apps/web/app/robots.ts`: مسیر درگاه آزمایشی از ایندکس خارج شد.
- `docker-compose.yml` / `docker-compose.prod.yml`: پاس‌دادن
  `NEXT_PUBLIC_API_URL` و `PAYMENT_SIMULATOR` به سرویس API.
- `.env.example` و `docs/DEVELOPMENT.md`: مستندسازی حالت شبیه‌سازی.

**تأیید/تست:**
- `tsc --noEmit` وب: بدون خطا؛ API فقط خطای محیطی قبلی `nodemailer`.
- `check_api_docs.py` (۳۴۰ مسیر) و `check_modules.py`: exit 0؛ `eslint` فایل‌های
  جدید: exit 0.
- تست زنده API: checkout اشتراک → `SIM-…`، callback موفق → فعال‌سازی و فاکتور
  `INV-1405-000006`؛ callback انصراف → `payment=failed`؛ درخواست «پله» →
  پرداخت شبیه‌سازی‌شده و فاکتور `INV-1405-000007`.
- تست Playwright با Chrome: صفحه‌ی درگاه آزمایشی رندر شد، «پرداخت موفق» به
  `/dashboard/subscriptions?payment=success` برگشت و پیام موفقیت نمایش داده شد.
- داده‌های تست پرداخت/فاکتور/اشتراک پاک‌سازی شد.

## ۱۴۰۵/۰۸/۱۸ — بخش «مالیاتی»: بایگانی فاکتور فروش، هزینه و سود خالص — نسخه `v3.11.0`

**هدف:** برای ارائه‌ی اسناد به اداره مالیات، هر فروش (اشتراک، پله، تبلیغ، تگ فید
و هر قابلیت پرداختی آینده) به‌صورت خودکار فاکتور شماره‌دار و بایگانی‌شده داشته
باشد؛ ادمین هزینه‌های دستی (سرور، پیامک، ایمیل و …) را ثبت کند و گزارش فروش،
هزینه و سود خالص به‌تفکیک ماه/سال شمسی و نوع فروش در دسترس باشد.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل‌های `Invoice`، `InvoiceItem`، `Expense` و
  `FinanceCounter` به‌همراه enum `InvoiceStatus`؛ یکتایی `(sourceType, sourceId)`
  برای idempotency فاکتور و فیلدهای ابطال نرم.
- `apps/api/src/finance/` (ماژول تازه): `FinanceService.recordSale` نقطه‌ی ورود
  واحد فروش، `voidBySource`/`voidInvoice`، CRUD هزینه، گزارش `summary`،
  `backfill` (همگام‌سازی تراکنش‌های قبلی + اجرای خودکار در استارت) و خروجی CSV؛
  `FinanceController` زیر `/admin/finance` با `@ApiTags('finance')` و
  `@ApiOperation` برای همه‌ی مسیرها.
- اتصال خودکار صدور فاکتور در `request-payments.service.ts` (پله/تبلیغ)،
  `subscriptions-payment.service.ts` (اشتراک) و `feeds-admin.service.ts`
  (تأیید/رد تگ فید؛ هر تأیید یک `sourceId` یکتا دارد).
- `apps/web/components/admin/AdminFinance.tsx` (جدید): سه تب «گزارش سود و زیان»،
  «فاکتورهای فروش» (چاپ، ابطال، ثبت فروش دستی، CSV) و «هزینه‌ها» (ثبت/ویرایش/
  ابطال، CSV)؛ اتصال به `?section=finance` در `AdminShell`، `admin-console` و
  `page.tsx`.
- `apps/web/lib/api/types/finance.ts` و `api.download` برای خروجی CSV؛
  `docs/API.md` (۲۹ کنترلر/۲۸ برچسب + جدول مسیرهای مالی) و `docs/FINANCE.md`
  (قرارداد اتصال قابلیت‌های پرداختی آینده).

**تأیید/تست:**
- `npx prisma generate` و `prisma db push` در کانتینر dev → بدون خطا؛ جدول‌های
  `invoices`، `invoice_items`، `expenses` و `finance_counters` ساخته شدند.
- تست واقعی API با توکن ادمین: ثبت هزینه، صدور فاکتور دستی
  (`INV-1405-000001`)، `backfill` (۲ فاکتور تگ فید)، `summary`
  (فروش/هزینه/سود/مالیات و ریز ماهانه)، ابطال فاکتور و هزینه (خارج‌شدن از
  گزارش)، خروجی CSV با `Content-Type: text/csv` و `Content-Disposition`.
- اجرای دوباره‌ی `backfill` → `{created:0, skipped:2}` (idempotent).
- تست UI با Playwright/Chrome: باز شدن `/admin?section=finance`، نمایش سه تب،
  جدول فاکتورها (`INV-1405-...`)، دکمه‌ی چاپ و فرم هزینه بدون خطای کنسول.
- `tsc --noEmit` در `apps/web` بدون خطا؛ `apps/api` فقط خطای محیطی نبود
  `nodemailer` (در CI/داکر نصب می‌شود).
- `check_api_docs.py` (۳۴۰ مسیر) و `check_modules.py` → exit 0.

## ۱۴۰۵/۰۸/۱۸ — جلوگیری از شکست نصب با ارتقای TypeScript 7 — نسخه `v3.10.2`

**هدف:** رفع خطای `ERESOLVE` در PR دپندابات (`bump the development-dependencies
group`) که TypeScript را به `7.0.2` بالا می‌برد، در حالی که `typescript-eslint`
هنوز `typescript@">=4.8.4 <6.1.0"` را به‌عنوان peer می‌پذیرد.

**تغییرات:**
- `.github/dependabot.yml`: افزودن `ignore` برای `typescript` با بازه‌ی
  `>=7.0.0` در به‌روزرسانی‌های npm، تا گروه dev-dependencies دیگر TypeScript 7
  را پیشنهاد نکند و `npm install` در CI/داکر با ERESOLVE شکست نخورد.

**تأیید/تست:**
- بررسی دستی قاعده‌ی Dependabot (نسخه‌های `>=7.0.0` نادیده گرفته می‌شوند) و
  تطابق آن با peer range فعلی `typescript-eslint@8.72.1` (`<6.1.0`).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۸ — پنهان‌شدن فیدها در «افزایش بازدید» هنگام غیرفعال‌بودن فید — نسخه `v3.10.1`

**هدف:** وقتی مدیر ویژگی «پست کاربران (فید)» (`featureFeedPosts`) را خاموش می‌کند،
تب «فیدها» و ردیف‌های فید در صفحه‌ی `/dashboard/boost` هم نمایش داده نشوند.

**تغییرات:**
- `apps/api/src/boosts/boosts.service.ts`: خواندن `featureFeedPosts`؛ در حالت
  خاموش، پرس‌وجوی پست‌های فید انجام نمی‌شود و `feedTotal` صفر برمی‌گردد تا
  صفحه‌بندی/شمارش هم فید را حساب نکند.
- `apps/web/components/dashboard/BoostTable.tsx`: استفاده از `useFeatures` برای
  حذف تب «فیدها» و پنهان‌کردن درخواست‌های پله/تبلیغ از نوع `FEED` در تاریخچه
  هنگام خاموش‌بودن ویژگی؛ اگر تب فعلی فید باشد به «بیولینک‌ها» برمی‌گردد.

**تأیید/تست:**
- `npx tsc --noEmit` در `apps/web` و `apps/api` بدون خطا.
- `python3 scripts/check_api_docs.py` و `python3 scripts/check_modules.py` → exit 0.

## ۱۴۰۵/۰۸/۱۸ — ورود مدیران محدود با موبایل و کد یکبارمصرف — نسخه `v3.10.0`

**هدف:** در بخش «کاربران ادمین محدود» (`/admin?section=moderators`) امکان ثبت
شماره موبایل برای هر مدیر محدود فراهم شود تا علاوه بر ایمیل/رمز، با شماره موبایل
و کد یکبارمصرف هم بتواند از صفحه‌ی `/admin/login` وارد شود (مسیر موبایل ادمین‌ها
از قبل در API وجود داشت ولی حساب‌های ساخته‌شده شماره نداشتند).

**تغییرات:**
- `apps/api/src/admin/dto/manage-moderator.dto.ts`: افزودن فیلد اختیاری `phone` به
  DTOهای ساخت و ویرایش مدیر محدود با مستندات Swagger.
- `apps/api/src/admin/admin-users.service.ts`: نرمال‌سازی شماره با
  `OtpService.normalizePhone`، بررسی یکتایی شماره در ساخت/ویرایش و ذخیره‌ی آن روی
  کاربر؛ ویرایش می‌تواند شماره را حذف کند (`null`).
- `apps/api/src/admin/admin.controller.ts`: عبور `phone` از DTO به سرویس.
- `apps/web/components/admin/AdminModerators.tsx`: فیلد شماره موبایل در فرم ساخت،
  نمایش شماره در فهرست و ویرایش شماره در پنل ویرایش هر مدیر.

**تأیید/تست:**
- `npx tsc --noEmit` در `apps/web` و `apps/api` (پس از `prisma generate`) بدون خطا.
- `python3 scripts/check_api_docs.py` → exit 0 (۳۲۷ مسیر، همه با `@ApiOperation`).
- `python3 scripts/check_modules.py` → exit 0.

## ۱۴۰۵/۰۸/۱۸ — گاوصندوق اعتبارنامه‌ی شبکه‌های اجتماعی برند در پنل مدیر — نسخه `v3.9.0`

**هدف:** بخشی در پنل مدیر برای نگه‌داری اکانت/نام‌کاربری/رمز عبور حساب‌های برند
«شمالی کارت» روی اینستاگرام، بله، ایتا، آپارات (و شبکه‌های دیگر) به‌صورت **ایمن**.
رمزها رمزنگاری‌شده ذخیره می‌شوند، در هیچ پاسخ فهرستی برنمی‌گردند و فقط با یک
مسیر بازبینی‌شده و ثبت دلیل قابل مشاهده‌اند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `SocialAccount` (سکو، عنوان، نام کاربری،
  `passwordEnc`، ایمیل/تلفن بازیابی، نشانی، نکات، فعال/غیرفعال، `lastRotatedAt`،
  `createdById`) با یکتایی (platform, username) و ایندکس سکو.
- `apps/api/src/common/secret-box.ts` (جدید): رمزنگاری متقارن **AES-256-GCM** با
  قالب نسخه‌دار `v1.<iv>.<tag>.<ciphertext>`؛ کلید از `SOCIAL_CREDENTIALS_KEY`
  (۳۲ بایت) و در نبود آن با HKDF-SHA256 از `JWT_SECRET` مشتق می‌شود.
- `apps/api/src/social-accounts/` (ماژول تازه): `social-accounts.service.ts`
  (CRUD + `reveal` رمزگشا + ثبت فعالیت)، `social-accounts.controller.ts`
  (فقط `@Roles('ADMIN')` زیر `/admin/social-accounts`)،
  `social-accounts.constants.ts` (رجیستری `SOCIAL_PLATFORMS`)، DTOهای
  Create/Update/reveal و `social-accounts.module.ts`.
- `apps/api/src/app.module.ts`: ثبت `SocialAccountsModule` (قانون ۹ ساختار ماژولار).
- `apps/web/components/admin/AdminSocialAccounts.tsx` (جدید): فرم افزودن/ویرایش،
  فهرست گروه‌بندی‌شده بر پایه‌ی سکوی برند، فیلتر سکو، کپی نام کاربری، «نمایش رمز»
  با دلیلِ اجباری و پنهان‌شدن خودکار پس از ۳۰ ثانیه، فعال/غیرفعال‌کردن و حذف.
- `apps/web/components/admin/AdminShell.tsx`، `apps/web/app/admin/admin-console.ts`،
  `apps/web/app/admin/page.tsx`: افزودن بخش «شبکه‌های اجتماعی» به گروه
  «تنظیمات و سیستم» با تیتر/زیرتیتر و مسیریابی `?section=social-accounts`.
- `apps/web/lib/api/types/social.ts` + `apps/web/lib/api.ts`: نوع‌های `SocialAccount`
  و `SocialPlatformMeta` در barrel مشترک.
- `docker-compose.yml`، `docker-compose.prod.yml`، `.env.example`: عبور و مستندسازی
  `SOCIAL_CREDENTIALS_KEY` (اختیاری؛ بدون آن از `JWT_SECRET` مشتق می‌شود).
- `docs/API.md`: بخش تازه‌ی مسیرها + به‌روزرسانی شمارش (۲۸ کنترلر / ۲۷ برچسب).
  `docs/SECURITY.md`: توضیح رمزنگاری، منبع کلید و مسیر audited `reveal`.

**تأیید/تست:**
- `prisma db push` + `prisma generate` در کانتینر API → بدون خطا؛ جدول
  `social_accounts` ساخته شد.
- `docker exec alooshomal-api … tsc --noEmit` و `eslint src` → بدون خطا؛
  `docker exec alooshomal-web … tsc --noEmit` و `eslint .` → ۰ خطا.
- `python3 scripts/check_modules.py` (۳۱ پوشه) و `python3 scripts/check_api_docs.py`
  (۲۸ کنترلر/۳۲۷ مسیر، هر ۵ مسیر تازه `summary` دارند) → exit 0.
- فراخوانی واقعی با JWT ادمین: ساخت/فهرست (بدون رمز)/ویرایش (چرخش رمز)/حذف →
  موفق؛ تکرار (platform, username) → ۴۰۹؛ ورودی نامعتبر → ۴۰۰؛ شناسه‌ی ناموجود
  → ۴۰۴؛ `reveal` رمز درست را برگرداند. در دیتابیس مقادیر
  `v1.<iv>.<tag>.<ciphertext>` ذخیره شد و رشته‌ی خام رمز در هیچ ردیفی نبود.
- مسیرهای محافظت‌نشده → ۴۰۱؛ `GET /api/admin/social-accounts` بدون توکن ۴۰۱.
- بررسی UI با Playwright/Chrome و JWT واقعی: بخش در ناوبری «تنظیمات و سیستم»
  دیده می‌شود، سه گروه سکو (اینستاگرام/بله/آپارات) و سه حساب رندر شدند، برچسب
  «غیرفعال» درست بود، فیلتر سکو کار کرد، رمز در فهرست لو نرفت، «نمایش رمز» با
  دلیل، رمز را نشان داد و در موبایل سرریز افقی نداشت؛ بدون خطای کنسول. اکشن‌های
  `SOCIAL_ACCOUNT_CREATED/UPDATED/REVEALED/DELETED` در «گزارش‌های سیستم» ثبت شد.
- داده‌های تستی (حساب‌ها، نشست و لاگ‌های فعالیت) پس از آزمون از دیتابیس dev پاک شدند.
- `python3 scripts/sync_install.py` سپس `--check` → `patched: 0 / added: 0`.

**یادداشت:** این قابلیت ابزار داخلی مدیر است (نه ویژگی کاربران)، پس طبق قانون ۹
سوئیچ `FEATURE_FLAGS` نمی‌گیرد؛ دسترسی فقط با `@Roles('ADMIN')` محدود شده است.

## ۱۴۰۵/۰۸/۱۷ — ثبت کامپوننت‌های بی‌استفاده‌ی وب و سطح نمایش تبلیغ خانه در بک‌لاگ — نسخه `v3.8.27`

**هدف:** در بازبینی تمیزی پروژه، هفت کامپوننت وب بدون هیچ ارجاع زنده‌ای در درخت
شناسایی شد (باقی‌مانده از تک‌صفحه‌ای‌شدن عمدی صفحه‌ی خانه) و همچنین ناهم‌خوانی
«تبلیغ در صفحه‌ی اصلی» بین تنظیمات/جریان تأیید و نبود سطح نمایش. چون حذف یا
نگه‌داشتن آن‌ها تصمیم محصولی است، طبق قانون ۶ در بک‌لاگ ثبت شد.

**تغییرات:**
- `BACKLOG.md`: افزودن ورودی «کامپوننت‌های بی‌استفاده‌ی وب و سطح نمایش تبلیغ
  صفحه‌ی اصلی» (وضعیت: معوق) با فهرست فایل‌ها، نکته‌ی `publicSection.homeBox`/
  `adHomePrice`، و دو گزینه‌ی حذف یا علامت‌گذاری برای فعال‌سازی مجدد؛ به‌روزرسانی
  «فهرست وضعیت (سریع)».

**تأیید/تست:**
- `rg` برای `HomeAdBox`/`HomeItemSlider`/`BlogSection`/`PulseSection`/
  `CardStatsBar`/`InlineEdit`/`ThemePicker` روی `apps/web` → هیچ وارد‌کننده‌ای
  یافت نشد (تنها تعریف خود کامپوننت).
- نبود این ارجاع‌ها دوباره پس از افزودن ورودی بررسی شد؛ کدی تغییر نکرد.
- `python3 scripts/sync_install.py --check` → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۸/۱۷ — یکدست‌سازی ماسک پلن در یک هلپر مشترک — نسخه `v3.8.26`

**هدف:** منطق «پنهان‌کردن فیلدها بر اساس پلن کاربر» به‌صورت تکراری در چهار جا
تکرار شده بود: یک متد خصوصی تقریباً یکسان در `business-cards.service.ts` و
`biolinks.service.ts` و دو کپی درون‌خطی در سرویس‌های دایرکتوری. یک منبع یکتا
برای این قاعده ساخته شد تا همه‌ی سطوح عمومی دقیقاً یک فیلدها را پنهان کنند.

**تغییرات:**
- `apps/api/src/common/plans.ts`: افزودن `applyPlanMask(item, plan)` که همان
  ترکیب `applyContactFieldMask` + `hiddenFieldsFrom` را یک‌جا می‌کند.
- `apps/api/src/businesscards/business-cards.service.ts`: حذف متد خصوصی
  `applyPlanVisibility` و استفاده‌ی مستقیم از `applyPlanMask` در سه نقطه.
- `apps/api/src/biolinks/biolinks.service.ts`: همان تغییر در دو نقطه.
- `apps/api/src/businesscards/business-cards-directory.service.ts` و
  `apps/api/src/biolinks/biolinks-directory.service.ts`: جایگزینی فراخوانی
  درون‌خطی ماسک با `applyPlanMask`.

**تأیید/تست:**
- `rg` روی پوشه‌های `businesscards` و `biolinks` → هیچ ارجاع باقی‌مانده‌ای به
  `applyPlanVisibility`/`applyContactFieldMask`/`hiddenFieldsFrom` نماند.
- `docker exec alooshomal-api … tsc --noEmit` و `eslint src` → بدون خطا.
- رفتار معادل است: `applyPlanMask(x, p)` = `applyContactFieldMask(x,
  hiddenFieldsFrom(p))`. مسیرهای عمومی با API زنده: `business-cards/public`،
  `…/public/latest`، `…/public/phonebook`، `biolinks/public`،
  `…/public/latest` → همه ۲۰۰ و خروجی بدون `user` (نسبت به قبل یکسان).
- `python3 scripts/check_modules.py` و `python3 scripts/check_api_docs.py` →
  exit 0؛ `python3 scripts/sync_install.py --check` → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۸/۱۷ — همگام‌سازی `CHANGELOG.md` با بازه‌ی v3.8.5 تا v3.8.24 — نسخه `v3.8.25`

**هدف:** فایل `CHANGELOG.md` از `v3.8.4` به بعد عقب افتاده بود، در حالی که
نسخه‌ی پروژه به `v3.8.24` رسیده بود؛ این ناهم‌خوانی با ادعای «خلاصه‌ی
نسخه‌به‌نسخه» در ابتدای همان فایل در تناقض بود. همچنین اعداد «نتیجه» در
`BACKLOG.md` پس از شکستن‌های بیشتر به‌روز نبود.

**تغییرات:**
- `CHANGELOG.md`: افزودن یک بخش فشرده‌ی «v3.8.5 – v3.8.24 — شکستن فایل‌های بزرگ
  و ماژولاریزاسیون» (مطابق سبک بخش «نسخه‌های پیشین») با یک خط برای هر نسخه، و
  به‌روزرسانی خط توضیحی ابتدای فایل تا بازه‌ی فشرده‌ی جدید را هم ذکر کند.
- `BACKLOG.md`: به‌روزرسانی خط‌شمار نهایی فایل‌های شکسته‌شده در بخش «نتیجه»
  (مثلاً `feeds.service.ts` ۱۳۵۷→۴۸۶ و `business-cards.service.ts` ۱۲۱۶→۷۲۸)
  و بازه‌ی تاریخچه تا `v3.8.24`.

**تأیید/تست:**
- مقایسه‌ی فهرست عناوین `## ` در `History-Agent.md` با `CHANGELOG.md` → همه‌ی
  نسخه‌های `v3.5.0` تا `v3.8.24` اکنون پوشش داده شده‌اند (بازه‌ی `v3.8.5–v3.8.24`
  به‌صورت فشرده).
- `python3 scripts/sync_install.py` سپس `--check` → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۸/۱۷ — شکستن `feeds.service.ts`: جداسازی سمت مدیر (بازبینی، بسته‌ها، تاپیک‌ها) — نسخه `v3.8.24`

**هدف:** `apps/api/src/feeds/feeds.service.ts` پس از جداسازی دایرکتوری عمومی هنوز
ترکیبی از «بازبینی/مدیریت» و «سمت کاربر» بود؛ بلوک admin (بازبینی پست‌ها، حکم
برچسب‌های پرداختی، و کاتالوگ بسته/تاپیک همراه با seed اولیه) به سرویس مستقل
منتقل شد تا هر بخش مسئولیت واحد داشته باشد و `feeds.service.ts` سبک بماند.

**تغییرات:**
- `apps/api/src/feeds/feeds-admin.service.ts`: فایل تازه‌ی `FeedsAdminService`
  شامل `ensureDefaultPackages`، `listPackages`، `createPackage`، `updatePackage`،
  `removePackage`، `listSubscriptions`، `decideSubscription`، `createTopic`،
  `updateTopic`، `removeTopic`، `adminListPosts`، `moderatePost`،
  `adminRemovePost` و `decideTagPayment`.
- `apps/api/src/feeds/feeds.service.ts`: حذف همان متدها و واگذاری فراخوانی‌های
  داخلی به `this.admin` (از ۸۳۵ به حدود ۴۸۶ خط).
- `apps/api/src/feeds/feeds.module.ts`: تأمین و صادرکردن `FeedsAdminService`.
- `apps/api/src/feeds/feeds.controller.ts`: تزریق `feedsAdmin` در کنترلر مدیر.
- `apps/api/src/moderator/moderator.service.ts`: استفاده از `feedsAdmin.moderatePost`
  در مسیر تأیید/رد پست فید.

**تأیید/تست:**
- مقایسه‌ی متنی ۱۴ متد منتقل‌شده با نسخه‌ی قبل (`git show HEAD:...`) پس از
  نرمال‌سازی فاصله‌ها → همه یکسان (`OK`).
- `docker exec alooshomal-api ... tsc --noEmit` و `eslint src` → بدون خطا.
- `python3 scripts/check_modules.py` و `python3 scripts/check_api_docs.py` → exit 0.
- اجرای مجدد کانتینر API و بررسی مسیرها: `/api/health`، `/api/feeds/public` و
  `/api/feeds/public/topics` → ۲۰۰؛ `/api/admin/feeds/posts` → ۴۰۱ (محافظت‌شده).
- `python3 scripts/sync_install.py` سپس `--check` → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۸/۱۷ — شکستن `biolinks.service.ts`: جداسازی تعامل عمومی و دارایی‌های اشتراک‌گذاری — نسخه `v3.8.23`

**هدف:** `apps/api/src/biolinks/biolinks.service.ts` (۸۱۰ خط) هم‌شکل کارت ویزیت،
بلوک «تعامل عمومی + دارایی‌های اشتراک‌گذاری» را جدا کرد تا CRUD/بازبینی سبک بماند.

**تغییرات:**
- `apps/api/src/biolinks/biolinks-engagement.service.ts` (فایل تازه):
  `BiolinksEngagementService` با `recordScan`، `toggleLike`، `likeSummary`،
  `toggleSave`، `saveSummary`، `findMySaved`، `buildVCard`، `publicLink`،
  `qrDataUrl` و `publicBiolinkWithAssets` (۲۱۱ خط).
- `apps/api/src/biolinks/biolinks.service.ts`: حذف بلوک منتقل‌شده و کمکی‌های
  تکراری (`paginationMeta` و getter `appUrl`) و استفاده از
  `common/pagination-meta` و `common/app-url` (اکنون ۶۱۳ خط).
- `apps/api/src/biolinks/biolinks.module.ts` و
  `apps/api/src/biolinks/biolinks.controller.ts`: تأمین/تزریق
  `BiolinksEngagementService` برای مسیرهای تعامل عمومی.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` → exit 0.
- مقایسه‌ی نرمال‌شده‌ی هر ۱۰ متد منتقل‌شده با نسخه‌ی قبلی → یکسان.
- اجرای واقعی API: `GET /api/health`،
  `GET /api/biolinks/public?page=1` → ۲۰۰ و روی بیولینک واقعی
  `GET /api/biolinks/public/sample-full-biolink` (شامل QR و لینک)، `.../like` و
  `.../vcard` → ۲۰۰.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `business-cards.service.ts`: جداسازی تعامل عمومی و دارایی‌های اشتراک‌گذاری — نسخه `v3.8.22`

**هدف:** `apps/api/src/businesscards/business-cards.service.ts` (۷۱۲ خط پیش از این
تغییر) علاوه‌بر CRUD/بازبینی، بلوک «تعامل عمومی + دارایی‌های اشتراک‌گذاری» (شمارش
بازدید، لایک/ذخیره، لیست ذخیره‌شده‌ها، vCard و QR) را داشت؛ آن بلوک جدا شد و دو
کمکی تکراری هم به ماژول‌های مشترک رفتند.

**تغییرات:**
- `apps/api/src/businesscards/business-cards-engagement.service.ts` (فایل تازه):
  `BusinessCardsEngagementService` با `recordScan`، `toggleLike`، `likeSummary`،
  `toggleSave`، `saveSummary`، `findMySaved`، `buildVCard`، `publicLink`،
  `qrDataUrl` و `publicBusinessCardWithAssets` (۲۱۴ خط).
- `apps/api/src/common/pagination-meta.ts` (فایل تازه): نوع `PaginationMeta` و
  تابع مشترک `paginationMeta(page, limit, total)` (حذف پیاده‌سازی تکراری در
  سرویس کارت ویزیت و بیولینک).
- `apps/api/src/common/app-url.ts` (فایل تازه): تابع مشترک `appUrl()` برای ساخت
  لینک/QR به‌جای getter تکراری در دو سرویس.
- `apps/api/src/businesscards/business-cards.service.ts`: حذف بلوک منتقل‌شده و
  کمکی‌های تکراری (اکنون ۷۲۸ خط) و استفاده از ماژول‌های مشترک جدید.
- `apps/api/src/businesscards/business-cards.module.ts` و
  `apps/api/src/businesscards/business-cards.controller.ts`: تأمین/تزریق
  `BusinessCardsEngagementService` برای مسیرهای تعامل عمومی.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` → exit 0.
- مقایسه‌ی نرمال‌شده‌ی هر ۱۰ متد منتقل‌شده و تابع مشترک `paginationMeta` با
  نسخه‌ی قبلی → یکسان.
- اجرای واقعی API: `GET /api/health`، `GET /api/business-cards/public?page=1`،
  `GET /api/business-cards/public/phonebook?page=1` → ۲۰۰ و روی یک کارت واقعی
  `GET /api/business-cards/public/sample-full-card` (شامل تولید QR و لینک)،
  `.../like` و `.../vcard` → ۲۰۰.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `settings.service.ts`: جداسازی بذرپاشی پیش‌فرض‌ها — نسخه `v3.8.21`

**هدف:** `apps/api/src/settings/settings.service.ts` (۱۰۷۲ خط) در کنار
خواندن/نوشتن تنظیمات، تابع بلند `ensureDefaults` (حدود ۱۸۰ خط upsert) را هم داشت؛
این مسئولیت بذرپاشی به یک ماژول جدا منتقل شد تا سرویس تنظیمات روی سطح
دسترسی‌دهنده (getter/setter) متمرکز بماند.

**تغییرات:**
- `apps/api/src/settings/settings-defaults.ts` (فایل تازه):
  `ensureSettingsDefaults(prisma)` شامل همان upsertهای idempotent و پیشوند
  `notifyAdmin.` (۲۳۵ خط).
- `apps/api/src/settings/settings.service.ts`: حذف `ensureDefaults` و فراخوانی
  ماژول جدید در `onModuleInit` (اکنون ۸۹۲ خط).

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` → exit 0.
- مقایسه‌ی نرمال‌شده‌ی بدنه‌ی تابع منتقل‌شده با نسخه‌ی قبلی → یکسان (فقط امضای
  تابع از متد کلاس به تابع مستقل تغییر کرده است).
- اجرای واقعی API: بوت بدون خطا (یعنی `ensureSettingsDefaults` در
  `onModuleInit` اجرا شده)، `GET /api/health`، `GET /api/settings/public` و
  `GET /api/subscriptions/plans` → ۲۰۰.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `feeds.service.ts`: جداسازی مسیر خواندن عمومی دایرکتوری — نسخه `v3.8.20`

**هدف:** `apps/api/src/feeds/feeds.service.ts` (۱۱۱۶ خط) هم مسیر خواندنِ عمومی
دایرکتوری (فهرست کش‌شده، پست تکی، لایک/ذخیره، موضوع‌ها و رتبه‌ی دایرکتوری) و هم
جریان‌های نوشتن/بازبینی/پنل کاربر را با هم داشت؛ مسیر خواندن عمومی جدا شد و
پروژکتورهای مشترک به یک ماژول مشترک رفتند.

**تغییرات:**
- `apps/api/src/feeds/feeds-directory.service.ts` (فایل تازه):
  `FeedsDirectoryService` با `publicDirectory`، `loadDirectoryPage`، `publicPost`،
  `toggleLike`، `toggleSave`، `listTopics` و `directoryRank` (۲۳۲ خط).
- `apps/api/src/feeds/feeds.shared.ts` (فایل تازه): `feedPostInclude`،
  `feedTagInclude`، نوع `FeedTagTarget` و تابع خالص `projectFeedTag` (حذف
  تکرار میان مسیر دایرکتوری و پنل کاربر).
- `apps/api/src/feeds/feeds.service.ts`: فقط نوشتن/بازبینی/اشتراک/پنل کاربر
  می‌ماند (اکنون ۸۳۵ خط).
- `apps/api/src/feeds/feeds.module.ts` و `apps/api/src/feeds/feeds.controller.ts`:
  تأمین/تزریق `FeedsDirectoryService` برای مسیرهای عمومی و مدیریتی موضوع‌ها.
- `apps/api/src/moderator/moderator.service.ts` و `apps/api/src/boosts/boosts.service.ts`:
  استفاده از `FeedsDirectoryService` برای `listTopics` و `directoryRank`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` → exit 0.
- مقایسه‌ی نرمال‌شده‌ی هر ۷ متد منتقل‌شده با نسخه‌ی قبلی → یکسان (فقط
  `this.projectFeedTag` به تابع مشترک تبدیل شده است).
- اجرای واقعی API بدون خطای DI؛ `GET /api/health`، `GET /api/feeds/public?page=1`
  و `GET /api/feeds/public/topics` → ۲۰۰ و `GET /api/admin/feeds/topics` → ۴۰۱.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `admin.service.ts`: جداسازی مدیریت کاربران و ادمین‌ها — نسخه `v3.8.19`

**هدف:** `apps/api/src/admin/admin.service.ts` (۱۱۲۷ خط) دو مسئولیت جدا را با هم
داشت: «بازبینی محتوا + گزارش‌های پلتفرم» و «مدیریت حساب کاربران و ادمین‌های
محدود». بخش دوم به سرویس مستقل منتقل شد.

**تغییرات:**
- `apps/api/src/admin/admin-users.service.ts` (فایل تازه): `AdminUsersService` با
  `listUsers`، `setUserActive`، `listUserSessions`، `revokeUserSessions`،
  `setUserComment`، `setUserRole`، `listModerators`، `createModerator`،
  `updateModerator`، `deleteModerator`، `deleteUser` و کمکی‌های
  `assertNotLastAdmin`.
- `apps/api/src/admin/admin-notify.ts` (فایل تازه): کمکی مشترک `notifyUser` تا
  هر دو سرویس ادمین دقیقاً یک پیش‌فرض اطلاع‌رسانی داشته باشند (حذف کد تکراری).
- `apps/api/src/admin/admin.service.ts`: فقط بازبینی محتوا (بیولینک/کارت ویزیت)،
  آمار، فضای سرور، ایمیل‌های ارسالی و گزارش‌های اخیر می‌ماند (اکنون ۶۶۰ خط).
- `apps/api/src/admin/admin.module.ts` و `apps/api/src/admin/admin.controller.ts`:
  تأمین/تزریق `AdminUsersService` و هدایت مسیرهای کاربران و ادمین‌های محدود به آن.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/admin src/moderator` → exit 0.
- مقایسه‌ی نرمال‌شده‌ی متن هر ۱۲ متد منتقل‌شده با نسخه‌ی قبلی → یکسان (فقط
  فراخوانی `this.notifyUser(` به کمکی مشترک تغییر کرده است).
- اجرای واقعی API بدون خطای DI؛ `GET /api/health` → ۲۰۰ و
  `/api/admin/users`، `/api/admin/moderators`، `/api/admin/emails` → ۴۰۱
  (مسیرهای محافظت‌شده، نشانه‌ی بارگذاری درست تزریق وابستگی).
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `AdminFeeds.tsx` و بستن برنامه‌ی ماژولاریزاسیون — نسخه `v3.8.18`

**هدف:** آخرین فایل بزرگ باقی‌مانده‌ی وب یعنی `AdminFeeds.tsx` (۸۹۲ خط) به یک
پوسته‌ی تب‌دار به‌همراه یک فایل برای هر پنل شکسته شد و با این کار کل برنامه‌ی
«شکستن فایل‌های بزرگ» (API + وب) در `BACKLOG.md` به وضعیت «انجام‌شده» رسید.

**تغییرات:**
- `apps/web/components/admin/feeds/shared.ts` (فایل تازه): نوع `Tab`، برچسب‌ها و
  فیلترهای وضعیت مشترک (`STATUS_LABELS`، `STATUS_FILTERS`).
- `apps/web/components/admin/feeds/` (۶ فایل تازه): `PostsModeration`،
  `CommentsModeration`، `SubscriptionsPanel`، `PackagesPanel`، `TopicsPanel`،
  `FeedSettings` — هر پنل با واردکردن فقط همان وابستگی‌هایی که لازم دارد.
- `apps/web/components/admin/AdminFeeds.tsx`: فقط تب‌ها و نگاشت تب به پنل می‌ماند
  (اکنون ۵۹ خط)؛ مسیر واردکننده‌ی بیرونی (`@/components/admin/AdminFeeds`)
  بدون تغییر ماند.
- `BACKLOG.md`: ورودی «شکستن فایل‌های بزرگ باقی‌مانده» به «انجام‌شده» تغییر کرد و
  از فهرست معوق‌ها به فهرست انجام‌شده‌ها منتقل شد.

**تأیید/تست:**
- `tsc --noEmit` و `eslint components/admin/AdminFeeds.tsx components/admin/feeds`
  → exit 0 (فقط هشدارهای از قبل موجود `react-hooks/set-state-in-effect`).
- اثبات برابری مکانیکی: متن نرمال‌شده‌ی هر ۶ پنل با نسخه‌ی پیش از تغییر مقایسه شد
  (بدون فاصله‌ها) → همه دقیقاً یکسان.
- اجرای واقعی Next.js: `/admin?section=feeds` و `/feeds` → ۲۰۰ و کامپایل بدون
  خطا در لاگ کانتینر `alooshomal-web`.

## ۱۴۰۵/۰۸/۱۷ — شکستن `app/admin/page.tsx`: هوک کنسول + پنل‌های مستقل — نسخه `v3.8.17`

**هدف:** `apps/web/app/admin/page.tsx` (۹۲۴ خط) هم‌زمان «داده/state/اکشن‌ها» و
«JSX همه‌ی بخش‌ها» را در یک کامپوننت بزرگ داشت؛ به یک هوک متمرکز، یک ماژول
ثابت‌ها/انواع و پنل‌های جداگانه شکسته شد تا هر بخش مستقل و ماژولار شود.

**تغییرات:**
- `apps/web/app/admin/admin-console.ts` (فایل تازه): نوع‌های `AdminBiolink`،
  `AdminBusinessCard`، `OverviewPayload`، ثابت‌های `EMPTY_STATS`،
  `isAdminSection` و نگاشت سرصفحه‌ی هر بخش (`PAGE_HEAD`).
- `apps/web/app/admin/use-admin-console.tsx` (فایل تازه): هوک
  `useAdminConsole()` شامل محافظ ورود مدیر، خواندن بخش از URL، بارگذاری‌ها
  (نمای کلی/بیولینک/کارت/کاربران/تیکت) و اکشن‌ها (نقش/فعال‌سازی/کامنت/حذف/
  خروج اجباری) و ستون‌های جدول بیولینک و کارت.
- `apps/web/app/admin/sections.tsx` (فایل تازه): پنل‌های `OverviewSection`،
  `BiolinksSection`، `BusinessCardsSection`، `UsersSection`، `TicketsSection`،
  `SettingsSection` که JSX آن‌ها از صفحه‌ی قبلی منتقل شده است.
- `apps/web/app/admin/page.tsx`: فقط نقشه‌برداری `?section=` به پنل‌ها و پوسته‌ی
  `AdminShell` می‌ماند (اکنون ۹۸ خط).

**تأیید/تست:**
- `tsc --noEmit` و `eslint app/admin` → exit 0 (فقط هشدارهای از قبل موجود
  `react-hooks/set-state-in-effect`).
- اثبات برابری مکانیکی با نسخه‌ی قبلی: مقایسه‌ی نرمال‌شده‌ی (حذف `state.` و
  فاصله‌ها) JSX شش پنل و منطق درونی (۸۴۳۹ کاراکتر) با نسخه‌ی پیش از تغییر →
  دقیقاً یکسان.
- اجرای واقعی Next.js: `/admin`, `/admin?section=overview|business-cards|users|tickets|settings`
  → همه ۲۰۰ و کامپایل بدون خطا در لاگ کانتینر.

## ۱۴۰۵/۰۸/۱۷ — شکستن `lib/api.ts`: کلاینت و نوع‌های دامنه‌ای + barrel سازگار — نسخه `v3.8.16`

**هدف:** `apps/web/lib/api.ts` (۱۱۰۵ خط، مهم‌ترین ماژول وب با ۱۰۵ واردکننده) هم
کد اجرایی (fetch/refresh/errors) و هم ۷۴ نوع پاسخ را در یک فایل داشت؛ به یک
کلاینت جدا و نوع‌های گروه‌بندی‌شده بر اساس دامنه شکسته شد و مسیر قدیمی
`@/lib/api` با یک barrel دست‌نخورده باقی ماند تا هیچ واردکننده‌ای تغییر نکند.

**تغییرات:**
- `apps/web/lib/api/client.ts` (فایل تازه): `API_URL`، چرخش توکن (single-flight
  refresh)، `getVisitorId`، `ApiEnvelope`، `ApiError`، `request`/`send`/`parse`
  و آبجکت `api` (۱۹۴ خط).
- `apps/web/lib/api/types/` (۱۰ فایل تازه، هر دامنه یک فایل): `common`،
  `catalog`، `subscriptions`، `boosts`، `ads`، `notifications`، `moderation`،
  `points`، `feeds` با `import type` متقابل فقط برای ارجاع‌های لازم.
- `apps/web/lib/api.ts`: به barrel تبدیل شد و همه‌ی نام‌های پیشین (۷۴ نام)
  را بدون تغییر قرارداد دوباره صادر می‌کند؛ مسیر `@/lib/api` برای ۱۰۵
  واردکننده یکسان مانده است.

**تأیید/تست:**
- `tsc --noEmit` و `eslint lib` → exit 0 (فقط هشدارهای از قبل موجود).
- مقایسه‌ی مجموعه‌ی نام‌های صادرشده قبل/بعد (`export interface|type|class|const`)
  → ۷۴ نام، دقیقاً یکسان.
- اجرای واقعی Next.js: `/`, `/biolinks`, `/business-cards`, `/feeds`,
  `/dashboard`, `/dashboard/ads`, `/dashboard/boost`, `/admin?section=ads`,
  `/login` → همه ۲۰۰ و کامپایل بدون خطا در لاگ کانتینر.

## ۱۴۰۵/۰۸/۱۷ — شکستن پنل پی‌پینگ پنل مدیر به تب‌های مستقل — نسخه `v3.8.15`

**هدف:** `AdminPaypingPanel.tsx` (۱۸۵۵ خط) یک فایل غول‌آسا با ۱۱ تب مستقل داشت؛
هر تب به فایل خودش منتقل شد و بخش‌های مشترک (انواع، فرمت‌گرها و کامپوننت‌های
پایه) در یک ماژول مشترک نشستند تا پنل ماژولار و قابل نگه‌داری شود.

**تغییرات:**
- `apps/web/components/admin/payping/shared.tsx` (فایل تازه): نوع‌های `Row`،
  `PaypingStatus`، `OverviewPayload` و کمکی/پایه‌های `INPUT`، `toman`، `cell`،
  `errorText`، `Panel`، `Banner`، `DataTable`، `Field`.
- `apps/web/components/admin/payping/` (۱۱ فایل تازه): `OverviewTab`،
  `TransactionsTab`، `WithdrawalsTab`، `CustomersTab`، `CouponsTab`،
  `ProductsTab`، `InvoicesTab`، `BnplTab`، `PayTab`، `InquiryTab`، `UploadTab`.
- `apps/web/components/admin/AdminPaypingPanel.tsx`: فقط پوسته‌ی تب‌ها و
  بارگذاری وضعیت اتصال می‌ماند (اکنون ۱۴۹ خط) و تب‌ها از پوشه‌ی `payping`
  وارد می‌شوند؛ مسیر واردکننده‌ی بیرونی (`@/components/admin/AdminPaypingPanel`)
  بدون تغییر ماند.

**تأیید/تست:**
- `tsc --noEmit` و `eslint components/admin/AdminPaypingPanel.tsx components/admin/payping`
  → exit 0 (فقط هشدارهای از قبل موجود `react-hooks/set-state-in-effect`).
- اجرای واقعی Next.js؛ `GET /admin?section=payments` → ۲۰۰ و کامپایل بدون خطا
  در لاگ کانتینر `alooshomal-web`.

## ۱۴۰۵/۰۸/۱۷ — شکستن `boosts.service.ts`: جداسازی گردش‌کار بازبینی مدیر — نسخه `v3.8.14`

**هدف:** گردش‌کار بازبینی «پله» توسط مدیر (فهرست‌ها، شمارش‌ها، تأیید/رد و
برچسب‌گذاری هدف‌ها) بلوکی مستقل از `boosts.service.ts` (۷۰۸ خط) بود و از جریان
کاربر جدا شد؛ منطق تکراری برچسب‌گذاری هدف‌ها هم به یک کمکی مشترک منتقل شد.

**تغییرات:**
- `apps/api/src/boosts/boosts-review.service.ts` (فایل تازه): `BoostsReviewService`
  با `listRequests`، `listRequestQueue`، `requestQueueCounts`، `decide` و
  `attachTargets` (پین مجدد هدف و اطلاع‌رسانی/ثبت فعالیت).
- `apps/api/src/boosts/boosts-targets.ts` (فایل تازه): کمکی مشترک
  `resolveBoostTargetLabels` و نوع `BoostTargetLabel` برای برچسب‌گذاری دسته‌ای
  کارت/بیولینک/فید (حذف کد تکراری میان «نمای کاربر» و «بازبینی مدیر»).
- `apps/api/src/boosts/boosts.service.ts`: حذف گردش‌کار بازبینی و تابع تکراری
  برچسب‌گذاری (اکنون ۴۳۰ خط).
- `apps/api/src/boosts/boosts.module.ts`: تأمین و صادرکردن `BoostsReviewService`.
- `apps/api/src/admin/admin.controller.ts` و `apps/api/src/moderator/moderator.service.ts`:
  تزریق و استفاده از `BoostsReviewService`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` → exit 0.
- اجرای واقعی API بدون خطای DI؛ `GET /api/health` و
  `GET /api/biolinks/public?page=1` → ۲۰۰ و `GET /api/admin/boosts` → ۴۰۱
  (مسیر محافظت‌شده، تأیید بارگذاری صحیح تزریق وابستگی).
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `ads.service.ts`: جداسازی گردش‌کار بازبینی مدیر — نسخه `v3.8.13`

**هدف:** مسیر بازبینی/تصمیم مدیر روی درخواست‌های تبلیغ (فهرست‌ها، شمارش‌ها و
تأیید/رد) و کمکی‌های مشترک هدف‌ها بخشی مستقل از `ads.service.ts` (۸۲۱ خط) بودند
و به یک سرویس و یک ماژول کمکی جدا شدند تا جریان کاربر/عمومی سبک بماند.

**تغییرات:**
- `apps/api/src/ads/ads-review.service.ts` (فایل تازه): `AdsReviewService` با
  `listRequests`، `listRequestQueueByPlacement`، `requestQueueCounts` و `decide`
  (زمان‌بندی پنجره‌ی نمایش، اطلاع‌رسانی مالک و ثبت فعالیت).
- `apps/api/src/ads/ads-targets.ts` (فایل تازه): کمکی‌های مشترک و بدون وابستگی
  سرویس — `AdDisplayState`، `AdTargetLabel`، `reviewableWhere`، `displayStateOf`
  و `resolveAdTargetLabels` (برچسب‌گذاری دسته‌ای کارت/بیولینک/فید).
- `apps/api/src/ads/ads.service.ts`: حذف گردش‌کار بازبینی و تابع محلی برچسب‌گذاری
  (اکنون ۵۰۶ خط) و استفاده از کمکی‌های مشترک.
- `apps/api/src/ads/ads.module.ts`: تأمین و صادرکردن `AdsReviewService`.
- `apps/api/src/admin/admin.controller.ts` و `apps/api/src/moderator/moderator.service.ts`:
  تزریق و استفاده از `AdsReviewService`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/ads src/admin src/moderator` → exit 0.
- اجرای واقعی API بدون خطای DI؛ `GET /api/health`، `GET /api/ads/public/active`
  و `GET /api/biolinks/public?page=1` → ۲۰۰.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `subscriptions.service.ts`: جداسازی جریان پرداخت پی‌پینگ — نسخه `v3.8.12`

**هدف:** کل جریان پرداخت آنلاین اشتراک (ساخت محصول پی‌پینگ، `checkout`، کال‌بک و
فعال‌سازی پلن پرداخت‌شده) بخشی متمایز از `subscriptions.service.ts` (۹۹۷ خط) بود
و در یک سرویس مستقل جدا شد.

**تغییرات:**
- `apps/api/src/subscriptions/subscriptions-payment.service.ts` (فایل تازه):
  `SubscriptionsPaymentService` با `appUrl`، `requirePlan`، `ensurePlanProduct`،
  `syncPlanProductQuietly`، `syncPaypingProduct`، `checkout`،
  `handlePaymentCallback`، `callbackResult`، `markPaymentFailed` و
  `activatePaidSubscription` (۴۵۹ خط منتقل شد).
- `apps/api/src/subscriptions/subscriptions.service.ts`: حذف جریان پرداخت (اکنون
  ۵۳۷ خط)، حذف وابستگی‌های بی‌استفاده (`PaypingService`/`ConfigService`/`Logger`)
  و واگذاری `syncPlanProductQuietly` به سرویس پرداخت.
- `apps/api/src/subscriptions/subscriptions.controller.ts`: تزریق سرویس پرداخت
  برای `checkout` و `paymentCallback`.
- `apps/api/src/subscriptions/subscriptions.module.ts`: تأمین و صادرکردن
  `SubscriptionsPaymentService`.
- `apps/api/src/admin/admin.controller.ts`: استفاده از `SubscriptionsPaymentService`
  برای `syncPaypingProduct`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/subscriptions src/admin` → exit 0.
- اجرای واقعی API بدون خطای DI؛ `GET /api/health` → ۲۰۰ و
  `GET /api/subscriptions/plans` → ۲۰۰.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `biolinks.service.ts`: جداسازی دایرکتوری عمومی — نسخه `v3.8.11`

**هدف:** مانند کارت ویزیت، مسیر خواندنِ دایرکتوری عمومی بیولینک در
`biolinks.service.ts` (۱۱۰۰ خط) یک بلوک مستقل بود و به سرویس جداگانه منتقل شد.

**تغییرات:**
- `apps/api/src/biolinks/biolinks-directory.service.ts` (فایل تازه):
  `BiolinksDirectoryService` با `findPublicDirectory`، `loadDirectoryPage` و
  `getDirectoryFacets`، به‌همراه ثابت `DIRECTORY_CACHE_TTL_MS` و اینترفیس
  `DirectoryBiolinkItem` (۲۸۰ خط منتقل شد).
- `apps/api/src/biolinks/biolinks.service.ts`: حذف بلوک دایرکتوری (اکنون ۸۱۸
  خط) و ایمپورت‌های بی‌استفاده.
- `apps/api/src/biolinks/biolinks.controller.ts`: تزریق `BiolinksDirectoryService`
  و هدایت مسیر `GET /biolinks/public`.
- `apps/api/src/biolinks/biolinks.module.ts`: افزودن سرویس جدید به `providers`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/biolinks` → exit 0.
- اجرای واقعی API؛ `GET /api/health` → ۲۰۰ و `GET /api/biolinks/public?page=1`
  → ۲۰۰ با داده‌ی واقعی.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `business-cards.service.ts`: جداسازی دایرکتوری عمومی — نسخه `v3.8.10`

**هدف:** مسیر خواندنِ دایرکتوری عمومی (جستجو/فیلتر/وجه‌ها/صفحه‌بندی) در
`business-cards.service.ts` (۱۲۱۶ خط) یک بلوک مستقل و پرحجم بود. به سرویس
جداگانه منتقل شد تا مرز «دایرکتوری عمومی» در برابر «CRUD کاربر» روشن شود.

**تغییرات:**
- `apps/api/src/businesscards/business-cards-directory.service.ts` (فایل تازه):
  `BusinessCardsDirectoryService` با `findPublicDirectory`، `loadDirectoryPage`
  و `getDirectoryFacets`، به‌همراه ثابت `DIRECTORY_CACHE_TTL_MS` و اینترفیس
  `DirectoryBusinessCardItem` (۲۷۹ خط منتقل شد).
- `apps/api/src/businesscards/business-cards.service.ts`: حذف بلوک دایرکتوری
  (اکنون ۹۳۴ خط) و ایمپورت‌های بی‌استفاده.
- `apps/api/src/businesscards/business-cards.controller.ts`: تزریق
  `BusinessCardsDirectoryService` (با نام `directoryService` برای پرهیز از
  تداخل با متد روت `directory`) و هدایت مسیر `GET /business-cards/public`.
- `apps/api/src/businesscards/business-cards.module.ts`: افزودن سرویس جدید به
  `providers`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/businesscards` → exit 0.
- اجرای واقعی API؛ `GET /api/health` → ۲۰۰ و `GET /api/business-cards/public?page=1`
  → ۲۰۰ با داده‌ی واقعی دایرکتوری.
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `feeds.service.ts`: جداسازی سرویس کامنت‌ها — نسخه `v3.8.9`

**هدف:** `feeds.service.ts` (۱۳۵۷ خط) شامل یک بخش پیوسته و مستقل از کامنت‌های
فید بود (فهرست عمومی، ثبت/حذف توسط کاربر، صف بررسی و آمار مدیر). این بخش به
سرویس مستقل منتقل شد تا مرز کامنت‌ها در برابر پست/بسته روشن شود.

**تغییرات:**
- `apps/api/src/feeds/feed-comments.service.ts` (فایل تازه):
  `FeedCommentsService` با متدهای `listComments`، `listMyComments`،
  `createComment`، `removeComment`، `adminListComments`، `moderateComment`،
  `adminRemoveComment` و `commentCounts` (۲۳۶ خط منتقل شد).
- `apps/api/src/feeds/feeds.service.ts`: حذف بخش کامنت‌ها (اکنون ۱۰۹۰ خط) و
  حذف ایمپورت بی‌استفاده‌ی `CreateFeedCommentDto`.
- `apps/api/src/feeds/feeds.controller.ts`: تزریق `FeedCommentsService` در
  کنترلرهای عمومی و مدیر و هدایت مسیرهای کامنت به آن (نام پراپرتی
  `commentsService` برای جلوگیری از تداخل با متد روت `comments`).
- `apps/api/src/feeds/feeds.module.ts`: افزودن `FeedCommentsService` به `providers`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src/feeds` → exit 0.
- اجرای واقعی API بدون خطای DI؛ `GET /api/health` → ۲۰۰ و
  `GET /api/feeds/public/<idنامعتبر>/comments` → ۴۰۴ (رفتار درست).
- `python3 scripts/check_modules.py` و `check_api_docs.py` سبز.

## ۱۴۰۵/۰۸/۱۷ — ثبت نقشه‌ی شکستن فایل‌های بزرگ در بک‌لاگ — نسخه `v3.8.8`

**هدف:** کار شکستن فایل‌های بزرگ «کم‌کم» ادامه دارد؛ برای اینکه ترتیب و
اولویت‌بندی گم نشود، فهرست فایل‌های باقی‌مانده (API و Web با شمار خط) در
`BACKLOG.md` ثبت شد.

**تغییرات:**
- `BACKLOG.md`: ورودی «شکستن فایل‌های بزرگ باقی‌مانده» با وضعیت «در انتظار»،
  فهرست اولویت‌دار فایل‌ها و ارجاع به ورودی‌های تاریخچه‌ی `v3.8.6`/`v3.8.7`.

**تأیید/تست:**
- تغییر صرفاً مستندی است؛ `python3 scripts/sync_install.py` و `--check` تمیز.

## ۱۴۰۵/۰۸/۱۷ — شکستن `admin.service.ts`: جداسازی گزارش درآمد و توابع تقویم جلالی — نسخه `v3.8.7`

**هدف:** `admin.service.ts` پس از سرویس تنظیمات، بزرگ‌ترین فایل بک‌اند بود (۱۴۱۶
خط) و متد ~۲۵۰ خطیِ `revenueReport` به‌همراه توابع تقویم جلالی داخل آن قرار داشت.
گزارش درآمد به سرویس مستقل منتقل و توابع تقویم جلالی به `common/` منتقل شد تا
هم `signupSeries` و هم گزارش درآمد از یک منبع مشترک استفاده کنند.

**تغییرات:**
- `apps/api/src/admin/admin-revenue.service.ts` (فایل تازه): کلاس
  `AdminRevenueService` با متد `revenueReport` (و JSDoc مربوطه) از `AdminService`
  جدا شد.
- `apps/api/src/common/jalali.ts` (فایل تازه): توابع مشترک `jalaliParts` و
  `addJalaliMonths` از `admin.service.ts` استخراج و صادر شدند.
- `apps/api/src/admin/admin.service.ts`: حذف متد درآمد (اکنون ۱۱۲۷ خط) و
  توابع جلالی؛ ایمپورت enumهای بی‌استفاده حذف و از `common/jalali` استفاده شد.
- `apps/api/src/admin/admin.controller.ts`: تزریق `AdminRevenueService` و
  استفاده از آن در مسیر `GET /admin/revenue`.
- `apps/api/src/admin/admin.module.ts`: افزودن `AdminRevenueService` به
  `providers`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` در api → exit 0.
- راه‌اندازی مجدد واقعی API بدون خطای DI؛ `GET /api/health` → ۲۰۰ و
  `GET /api/admin/revenue` → ۴۰۱ (یعنی مسیر و وابستگی‌ها درست سیم‌کشی شده‌اند).
- `python3 scripts/check_modules.py`، `check_api_docs.py` (۳۲۲ مسیر) و
  `sync_install.py --check` سبز.

## ۱۴۰۵/۰۸/۱۷ — شکستن ماژول تنظیمات: جداسازی ثابت‌ها و رجیستری ویژگی‌ها — نسخه `v3.8.6`

**هدف:** `settings.service.ts` با ۱۴۲۰ خط بزرگ‌ترین فایل بک‌اند بود و ~۴۲۰ خط
ابتهای آن فقط ثابت/تایپ/رجیستری `FEATURE_FLAGS` بود (بدون هیچ منطقی). این بخش
به فایل جداگانه منتقل شد تا مرز ماژول (ثابت‌ها در برابر رفتار) روشن شود و سرویس
به ~۱۰۷۲ خط برسد. این نخستین گام از شکستن فایل‌های بزرگ به‌صورت مرحله‌به‌مرحله است.

**تغییرات:**
- `apps/api/src/settings/settings.constants.ts` (فایل تازه): تمام ثابت‌ها،
  تایپ‌ها، اینترفیس‌های ویژگی و آرایه‌ی `FEATURE_FLAGS` از سرویس منتقل شد.
- `apps/api/src/settings/settings.service.ts`: بخش ثابت‌ها حذف و با
  `export * from './settings.constants'` دوباره صادر شد؛ واردکننده‌های بیرونی
  (`settings.controller.ts`، `biolinks.service.ts`، `notifications.service.ts` و …)
  بدون تغییر کار می‌کنند.
- `scripts/check_modules.py`: بررسی `FEATURE_FLAGS` به‌جای یک فایل، کل پوشه‌ی
  `settings/` را جارو می‌کند تا با این انتقال هم‌گام بماند.
- `docs/ARCHITECTURE.md`: افزودن قرارداد «شکستن ماژول بزرگ در همان پوشه با
  re-export» و نام‌گذاری `*.constants.ts`/`*-<concern>.service.ts`.

**تأیید/تست:**
- `tsc --noEmit -p tsconfig.json` و `eslint src` در api → exit 0.
- راه‌اندازی مجدد واقعی API (watch) بدون خطا؛ `GET /api/health` → ۲۰۰ و
  `GET /api/settings/public` داده‌ی درست برگرداند (شامل `biolinkTemplatesEnabled`).
- `python3 scripts/check_modules.py` (۹ کلید فیچر)، `check_api_docs.py` (۳۲۲ مسیر)
  و `sync_install.py --check` همه سبز.

## ۱۴۰۵/۰۸/۱۷ — همگام‌سازی CHANGELOG با نسخه‌های v2.32.0 تا v3.8.4 — نسخه `v3.8.5`

**هدف:** فایل `CHANGELOG.md` خیلی عقب بود (آخرین ورودی `v2.31.1`) و تصویر
«رهاشده» می‌داد. با استخراج عنوان‌ها از `History-Agent.md`، ورودی‌های دوران
`v3.x` به‌تفصیل و بازه‌ی `v2.32.0` تا `v2.111.0` به‌صورت فهرست فشرده اضافه شد.

**تغییرات:**
- `CHANGELOG.md`: ۲۰ ورودی کاربرمحور برای `v3.0.0` تا `v3.8.4`، بخش «نسخه‌های
  پیشین (v2.32.0 – v2.111.0)» با ۱۶۷ عنوان، و به‌روزرسانی متن سربرگ.

**تأیید/تست:**
- عنوان‌ها با `grep` از `History-Agent.md` استخراج و ترتیب جدیدترین‌اول حفظ شد؛
  تعداد بخش‌های `##` بررسی شد (۳۱ بخش: ۲۰ ورودی `v3.x` + فهرست پیشین + ۱۰ ورودی قدیمی).
- صحت UTF-8 و ساختار فایل بازخوانی شد؛ `v2.31.1` بلافاصله پس از فهرست پیشین قرار دارد.
- `python3 scripts/sync_install.py` و سپس `--check` تمیز.

## ۱۴۰۵/۰۸/۱۷ — افزودن ورک‌فلو CI (قراردادها، تایپ و لینت) — نسخه `v3.8.4`

**هدف:** تا پیش از این فقط ورک‌فلوی استقرار (`deploy.yml`) وجود داشت و هیچ دروازه‌ی
کیفیتی پیش از استقرار نبود. یک ورک‌فلوی CI سبک اضافه شد که روی push به `main` و
روی pull requestها اجرا می‌شود.

**تغییرات:**
- `.github/workflows/ci.yml`: سه job مستقل — «قراردادهای مخزن»
  (`check_api_docs.py` + `check_modules.py`)، «تایپ/لینت API»
  (`tsc --noEmit` + `eslint src`) و «تایپ/لینت Web» (`tsc --noEmit` + `eslint .`)،
  به‌همراه `concurrency` برای لغو اجراهای قدیمی.
- نکته: `sync_install.py --check` در CI اجرا نمی‌شود، چون `install.sh` در
  `.gitignore` است و در checkout وجود ندارد؛ این بررسی لوکال باقی می‌ماند.

**تأیید/تست:**
- همان دستورهای ورک‌فلو به‌صورت دستی داخل کانتینرهای لوکال سبز شدند:
  `check_api_docs.py` و `check_modules.py` (exit 0) و `tsc --noEmit` و `eslint`
  در api (exit 0) و web (exit 0).
- صحت YAML با `yaml.safe_load` بررسی شد (سه job: conventions/api/web).

## ۱۴۰۵/۰۸/۱۷ — مستندسازی معماری ماژولار و افزودن بررسی خودکار ساختار ماژول‌ها — نسخه `v3.8.3`

**هدف:** با نزدیک‌شدن پروژه به آماده‌بودن برای کاربران، قاعده‌ی «هر ویژگی = یک
ماژول خودبسنده» نه مستند بود و نه راهی برای تضمین خودکارش وجود داشت. یک سند
معماری و یک اسکریپت بررسی اضافه شد تا افزودن ویژگی جدید استاندارد و قابل‌بازبینی شود.

**تغییرات:**
- `docs/ARCHITECTURE.md`: نقشه‌ی کامل مونوریپو، قرارداد پوشه‌ی هر ویژگی در API
  (یک `*.module.ts` + ثبت در `app.module.ts`)، چیدمان کامپوننت‌های وب، رجیستری
  `FEATURE_FLAGS` و دستور گام‌به‌گام افزودن ویژگی جدید.
- `scripts/check_modules.py`: بررسی خودکار — هر پوشه‌ی ویژگی دقیقاً یک ماژول با
  `@Module` دارد و در `app.module.ts` ثبت شده است؛ کلیدهای `FEATURE_FLAGS`
  یکتا هستند.
- `README.md`: ارجاع به `docs/ARCHITECTURE.md`.

**تأیید/تست:**
- `python3 scripts/check_modules.py` → ۳۰ پوشه‌ی ویژگی و ۹ کلید فیچر (exit 0).
- تست منفی: افزودن موقت پوشه‌ی ویژگیِ بدون ماژول → اسکریپت با exit 1 و پیام دقیق
  خطا را گزارش کرد؛ سپس پوشه حذف و دوباره سبز شد.
- `python3 scripts/sync_install.py` و سپس `--check` تمیز.

## ۱۴۰۵/۰۸/۱۷ — فعال‌سازی ESLint و Prettier در دو اپ (و رفع باگ قلاب شرطی) — نسخه `v3.8.2`

**هدف:** اسکریپت‌های `lint`/`format` در هر دو اپ شکسته بودند: در `apps/api` نه
بسته‌ی `eslint`/`prettier` نصب بود و نه در هیچ‌کدام فایل تنظیمات وجود داشت
(`next lint` هم در Next 16 حذف شده است). تنظیمات تخت (flat) اضافه شد تا این
ابزارها واقعاً کار کنند و اعتبارسنجی استاندارد ممکن شود.

**تغییرات:**
- `apps/api/eslint.config.mjs` و `apps/api/.prettierrc.json`: تنظیمات تخت
  ESLint + Prettier برپایه‌ی `typescript-eslint` (قواعدی مثل `no-explicit-any`
  با سطح warn تا گیت سبز بماند).
- `apps/api/package.json`: افزودن devDependencyهای `eslint`، `@eslint/js`،
  `typescript-eslint`، `eslint-config-prettier` و `prettier`.
- `apps/web/eslint.config.mjs`: تنظیمات تخت برپایه‌ی `eslint-config-next`؛
  اسکریپت `lint` از `next lint` (حذف‌شده در Next 16) به `eslint .` تغییر کرد.
- `apps/web/components/home/HomeItemSlider.tsx`: **رفع باگ واقعی** — `useRef`
  پس از `return` شرطی صدا زده می‌شد (نقض قوانین قلاب‌ها)؛ به بالای کامپوننت
  منتقل شد.
- حذف دستورهای `eslint-disable` کهنه در `apps/api/src/blog/blog.service.ts`،
  `apps/api/src/main.ts` و `apps/web/lib/use-form-autosave.ts`.
- پاک‌سازی متغیر/ایمپورت بی‌استفاده در `apps/api/src/biolinks/biolinks.service.ts`،
  `apps/api/src/businesscards/business-cards.service.ts` و
  `apps/api/src/sessions/sessions.service.ts`.

**تأیید/تست:**
- `eslint src` در api → ۰ error / ۰ warning (exit 0).
- `eslint .` در web → ۰ error (۱۱۸ warning که قواعد جدید `react-hooks` v7
  هستند و عمداً در سطح warn نگه داشته شدند؛ مهاجرت در `BACKLOG.md` ثبت شد) → exit 0.
- `tsc --noEmit` در هر دو اپ → exit 0.
- `python3 scripts/sync_install.py` → ۹ پچ و ۳ افزودن، سپس `--check` تمیز.
- `python3 scripts/check_api_docs.py` → بدون خطا (تغییری در روت‌های API نبود).

## ۱۴۰۵/۰۸/۱۷ — پاک‌سازی ریشه‌ی مخزن و یکدست‌سازی فایل‌های نادیده‌گرفتن — نسخه `v3.8.1`

**هدف:** ریشه‌ی مخزن چند اسکریپت موقتِ Probe (تست‌های یک‌بارمصرف Playwright) و
یک ابزار گزارش را قاطی کرده بود. همچنین `.gitignore` و `.dockerignore` هرکدام
دو نسخه‌ی چسبیده با خط نامعتبر `....................` داشتند و `.dockerignore`
ریشه اصلاً استفاده نمی‌شد (کانتکست بیلد `apps/api` و `apps/web` است). همه مرتب
و استاندارد شدند.

**تغییرات:**
- حذف هفت اسکریپت موقت و بی‌ارجاع در ریشه: `t3-tmp.mjs`، `t3b-tmp.mjs`،
  `t4-tmp.mjs`، `t4shot.mjs`، `t5-tmp.mjs`، `t5b-tmp.mjs`، `t5c-tmp.mjs`.
- انتقال `render-report.mjs` → `scripts/render-report.mjs` (ابزار واقعیِ ساخت
  PDF گزارش‌ها بود، نه موقت).
- بازنویسی `.gitignore`: حذف بلوک تکراری و خط نامعتبر `....................` و
  یکدست‌سازی در یک ساختار دسته‌بندی‌شده.
- حذف `.dockerignore` ریشه‌ی بی‌استفاده و سخت‌گیرانه‌ترکردن
  `apps/api/.dockerignore` و `apps/web/.dockerignore` (نادیده‌گرفتن `backups`،
  `uploads`، `public/uploads`، `*.tsbuildinfo` و `.env.*` با استثنای
  `.env.example`) تا کانتکست ایمیج کوچک و بدون داده‌ی محلی بماند.
- `apps/web/lib/version.ts`: اصلاح کاراکتر به‌هم‌ریخته‌ی کامنت.

**تأیید/تست:**
- `python3 scripts/sync_install.py` → ۳ پچ، ۱ افزودن (`scripts/render-report.mjs`)،
  ۱ حذف (`.dockerignore` ریشه) و سپس `python3 scripts/sync_install.py --check`
  تمیز (patched:0 / added:0).
- `git check-ignore` برای فایل‌های مهم ردیابی‌شده (`docs/reports/*.pdf`،
  `.env.example`) خالی است؛ یعنی هنوز نادیده گرفته نمی‌شوند.
- `python3 scripts/check_api_docs.py` → بدون خطا (تغییری در API نبود).

## ۱۴۰۵/۰۸/۱۷ — بازآرایی و دسته‌بندی پنل مدیر و داشبورد کاربر — نسخه `v3.8.0`

**هدف:** پنل مدیر ۲۴ آیتم و داشبورد کاربر ۱۰ آیتم را در یک فهرست تخت و بدون
دسته‌بندی نشان می‌دادند؛ پیدا کردن بخش‌ها سخت بود و بعضی موارد مهم کاربر
(مثل «امتیاز من») اصلاً در منو نبودند. منوها دسته‌بندی شدند، آیتم مهم به منو
اضافه شد و میان‌برهای کاربردی در «داشبورد» هر دو پنل قرار گرفت.

**تغییرات:**
- `apps/web/components/admin/AdminShell.tsx`: فهرست تخت ۲۴ آیتمی به
  «داشبورد» + چهار گروه تبدیل شد: بررسی محتوا (بیولینک‌ها، کارت‌های ویزیت،
  فیدها، شهروند خبرنگار، بلاگ)، درآمد و پرداخت (اشتراک‌ها، افزایش بازدید،
  تبلیغات، امتیازها، گزارش درآمد، درگاه پرداخت، OAuth)، کاربران و پشتیبانی
  (کاربران، تیکت‌ها، ایمیل‌های ارسالی، اعلانات، کاربران ادمین، سطوح دسترسی)،
  تنظیمات و سیستم (تنظیمات، پایش منابع، فضای سرور، گزارش‌های سیستم، ابزار
  تست). «گزارش‌ها» که در واقع لاگ رویدادهای سیستم است به نام درست تغییر کرد.
- `apps/web/components/admin/AdminOverviewWidgets.tsx`: کامپوننت `QuickActions`
  برای «دسترسی سریع» مدیر به صف‌های بررسی و بخش‌های پرکاربرد با نشانگر تعداد
  (بیولینک‌های در انتظار، تیکت‌های باز).
- `apps/web/app/admin/page.tsx`: نمایش «دسترسی سریع» در بالای داشبورد و
  اصلاح عنوان/توضیح بخش گزارش‌های سیستم.
- `apps/web/components/dashboard/UserShell.tsx`: منوی کاربر به «داشبورد» +
  سه گروه تبدیل شد: محتوا و علاقه‌مندی‌ها، رشد و اشتراک (اشتراک، افزایش بازدید
  و تبلیغات، امتیاز من، شهروند خبرنگار) و حساب و پشتیبانی؛ افزودن «امتیاز من»
  که قبلاً فقط از صفحه‌ی راهنما لینک می‌شد.
- `apps/web/app/dashboard/page.tsx`: «دسترسی سریع» کاربر با لینک‌های
  ویژگی‌محور گسترش یافت (ساخت بیولینک/کارت، دایرکتوری‌ها، افزایش بازدید،
  شهروند خبرنگار، اشتراک) تا موارد مهم/کاربرپسند در دسترس باشند.

**تأیید/تست:**
- `docker exec alooshomal-web tsc --noEmit` → exit 0.
- رندر واقعی صفحه‌ها با Playwright (Chrome، توکن واقعی): منوی مدیر و کاربر
  با تیترهای گروه‌ها و ترتیب درست رندر شدند؛ هر ۲۴ بخش مدیر دقیقاً یک‌بار در
  منو ظاهر می‌شوند.
- کلیک روی «دسترسی سریع» مدیر (تبلیغات) → `?section=ads` و تغییر محتوا؛
  کلیک روی «امتیاز من» کاربر → `/dashboard/points` با عنوان «امتیاز من».
- `python3 scripts/check_api_docs.py` → بدون خطا (تغییری در API نبود) و
  `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — پرداخت پیش‌از‌تأیید برای پله و تبلیغات (دایرکتوری/صفحه اصلی) — نسخه `v3.7.0`

**هدف:** با متصل‌بودن درگاه پی‌پینگ، درخواست‌های افزایش بازدید («پله»، «تبلیغ در
صفحه اصلی» و «تبلیغ در دایرکتوری») دیگر مستقیم به صف مدیر نروند؛ ابتدا مبلغ از
کاربر دریافت شود و سپس برای تأیید/رد به مدیر برسد. بدون درگاه (یا مبلغ کمتر از
۱۰۰۰ تومان) رفتار رایگان قبلی حفظ شد.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `RequestPayment` (هدف، مبلغ، وضعیت،
  `clientRefId`/`paymentCode`، لینک اختیاری به درخواست پله/تبلیغ) و enum
  `RequestPaymentTarget`؛ رابطه‌ی `payment` روی `BoostRequest`/`AdRequest` و
  `User`.
- `apps/api/src/request-payments/`: ماژول/سرویس/کنترلر تازه؛
  `RequestPaymentsService` ساخت/ادامه‌ی پرداخت پی‌پینگ، تأیید و علامت‌گذاری
  `PAID`، اعلان به مدیر پس از پرداخت و `GET /api/payments/request-callback`
  عمومی برای بازگشت از درگاه.
- `apps/api/src/boosts/boosts.service.ts`: `create` مبلغ `boostPrice` را دریافت
  و در صورت نیاز پرداخت می‌سازد؛ صف مدیر فقط درخواست‌های پرداخت‌شده/بدون‌پرداخت
  را می‌بیند؛ تأیید درخواستِ پرداخت‌نشده با ۴۰۰ رد می‌شود؛ `overview` وضعیت
  پرداخت را برمی‌گرداند.
- `apps/api/src/ads/ads.service.ts`: همان جریان برای تبلیغ صفحه اصلی
  (`adHomePrice`) و دایرکتوری (`adDirectoryPrice`) و فیلتر صف/گارد تأیید.
- `apps/api/src/{boosts,ads}/…module.ts`، `app.module.ts`: ثبت ماژول پرداخت.
- `apps/api/src/settings/settings.service.ts`: به‌روزرسانی توضیح قیمت‌ها (دیگر
  فقط برآورد درآمد نیست).
- `apps/web/lib/api.ts` و `apps/web/lib/request-payment.ts`: نوع
  `RequestPaymentInfo` و کمک‌تابع هدایت به درگاه.
- `apps/web/components/dashboard/{BoostTable,MyItemsTable,CardStatsBar}.tsx`:
  هدایت به درگاه وقتی `payment.url` برگردد و دکمه‌ی «پرداخت» برای ادامه‌ی
  پرداخت ناتمام.
- `apps/web/app/dashboard/boost/page.tsx`: نمایش پیام بازگشت از درگاه
  (`?payment=`) و بسته‌بندی در `Suspense` برای `useSearchParams`.
- `apps/web/components/admin/{AdminBoosts,AdminAds}.tsx`: ستون وضعیت پرداخت و
  غیرفعال‌کردن «تأیید» تا تکمیل پرداخت.
- `docs/API.md`: مستندسازی مسیر بازگشت و قرار جدید خروجی درخواست‌ها.
- `BACKLOG.md`: بستن مورد «اتصال درگاه پی‌پینگ به خرید کاربران» و ثبت مورد جدید
  بازگشت وجه.

**تأیید/تست:**
- `docker exec alooshomal-api tsc --noEmit` و `docker exec alooshomal-web tsc --noEmit`
  → هر دو exit 0.
- `prisma validate` و `prisma db push` روی دیتابیس dev → بدون خطا.
- `python3 scripts/check_api_docs.py` → ۲۷ کنترلر/۳۲۲ مسیر، بدون خطا؛
  `GET /api/docs-json` مسیر `payments/request-callback` را با summary دارد.
- فراخوانی واقعی با JWT معتبر: `POST /boosts/request` و
  `POST /ads/request` (DIRECTORY) رکورد `RequestPayment` با مبلغ/هدف درست
  ساختند؛ چون IP این میزبان در پی‌پینگ مجاز نیست، خطای شفاف «کد 166» برگشت
  و پرداخت `FAILED` ثبت شد.
- `GET /admin/boosts?status=PENDING` درخواست پرداخت‌نشده را نشان نداد، پس از
  `PAID` شدن نشان داد؛ `PATCH /admin/boosts/:id` روی درخواست پرداخت‌نشده با
  ۴۰۰ رد شد. سپس داده‌های تستی از دیتابیس dev پاک شد.
- `GET /api/payments/request-callback` بدون پارامتر → ریدایرکت ۳۰۲ به
  `/dashboard/boost?payment=failed`. سرویس وب صفحه‌ی `/dashboard/boost` را
  ۲۰۰ و بدون خطای کامپایل سرو کرد. `python3 scripts/sync_install.py --check`
  بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — نمایش درخواست‌های تبلیغ دایرکتوری با لینک اعلان — نسخه `v3.6.2`

**هدف:** لینک اعلان «درخواست تبلیغ در دایرکتوری» به
`/admin?section=ads&placement=directory` اشاره می‌کند، اما پنل تبلیغات همیشه
روی تبِ «تبلیغ در صفحه اصلی» باز می‌شد و درخواست‌های دایرکتوری برای
تأیید/رد دیده نمی‌شدند.

**تغییرات:**
- `apps/web/components/admin/AdminAds.tsx`: تبِ فعال حالا از `?placement=`
  در URL مشتق می‌شود (مثل `?section=` در پوسته‌ی پنل) و با کلیک روی تب‌ها،
  `placement=directory` در URL جایگزین می‌شود؛ تب «تنظیمات» محلی می‌ماند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- بررسی منطقی: با `?section=ads&placement=directory` تب دایرکتوری و درخواست
  `GET /admin/ads?status=PENDING&placement=DIRECTORY` بارگذاری می‌شود.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — پیام دقیق خطای پی‌پینگ و ریشه‌یابی خطای خرید اشتراک (کد ۱۶۶) — نسخه `v3.6.1`

**هدف:** هنگام خرید اشتراک، خطای درگاه به‌صورت `PolicyException` همراه با
آدرس RFC و `instance` نمایش داده می‌شد و علت واقعی دیده نمی‌شد. ریشه‌یابی شد
که پاسخ `/v3/pay` از پی‌پینگ کد `166` و پیام «آی‌پی درخواست در لیست آی‌پی‌های
مجاز شما قرار ندارد» داشته است.

**تغییرات:**
- `apps/api/src/payping/payping.service.ts`: `describeError` حالا پیام تودرتوی
  `metaData.errors[].message` را (به‌همراه `metaData.code`) استخراج می‌کند و
  دیگر `type`/`title`/`instance` را در متن خطا نمی‌ریزد؛ افزودن
  `describeTraceId` و ثبت `paypingTraceId` در لاگ برای پیگیری پشتیبانی.
- `docs/DEPLOY.md`: تصریح علت خطای کد `166` در `/v3/pay` و اینکه باید IP
  خروجی سرور در بخش «IPهای مجاز» پنل پی‌پینگ ثبت شود.
- `apps/web/lib/version.ts` و `History-Agent.md`: افزایش نسخه به `v3.6.1`.

**تأیید/تست:**
- بازتولید خطا با فراخوانی مستقیم `POST https://api.payping.ir/v3/pay` و توکن
  موجود در کانتینر: پاسخ `400` با `title=PolicyException` و
  `metaData.code=166` و پیام آی‌پی مجاز نبودن.
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
  → exit 0.
- اجرای `describeError` روی همان payload واقعی (با `ts-node`) →
  «آی‌پی درخواست در لیست آی‌پی‌های مجاز شما قرار ندارد (کد 166)»، و پیام‌های
  ساده/رشته‌ای/خالی هم درست برگشتند.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — پرداخت واقعی اشتراک‌ها با کال‌بک پی‌پینگ — نسخه `v3.6.0`

**هدف:** اشتراک‌های پولی به‌جای «درخواست در انتظار تأیید مدیر» با پرداخت
آنلاین واقعی فعال شوند. هر بسته‌ی اشتراک به یک «آیتم مالی» (محصول) در حساب
پذیرنده‌ی پی‌پینگ نگاشت می‌شود و فعال‌سازی فقط پس از تأیید موفق تراکنش انجام
می‌شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `PaymentStatus`، مدل
  `SubscriptionPayment` (وضعیت، `clientRefId` یکتا، `paymentCode`، `refId`،
  لینک به `UserSubscription`) و فیلد `paypingProductCode` روی
  `SubscriptionPlan`.
- `apps/api/src/common/plans.ts`: قیمت واقعی بسته‌ها؛ اکو ۹۹٬۰۰۰ تومان و
  بلاس ۱۹۹٬۰۰۰ تومان (رایگان صفر).
- `apps/api/src/subscriptions/subscriptions.service.ts`: بک‌فیل یک‌باره‌ی
  قیمت بسته‌های قدیمی (با نشانگر در `settings`)، ساخت/همگام‌سازی محصول
  پی‌پینگ، `checkout` برای ساخت پرداخت، `handlePaymentCallback` برای تأیید
  تراکنش، فعال‌سازی اتمیک اشتراک، بررسی مبلغ و `clientRefId`، و
  اعلان/لاگ.
- `apps/api/src/subscriptions/subscriptions.controller.ts`: مسیرهای
  `POST /subscriptions/:planId/checkout` و کال‌بک عمومی
  `GET /subscriptions/payments/callback` با هدایت به داشبورد.
- `apps/api/src/subscriptions/subscriptions.module.ts`: واردکردن
  `PaypingModule`.
- `apps/api/src/payping/payping.service.ts`: حفظ وضعیت HTTP واقعی پی‌پینگ
  روی خطا تا کال‌بک بتواند پاسخ ۴۰۹ («قبلاً تأیید شده») را موفق تلقی کند.
- `apps/api/src/admin/admin.controller.ts`: مسیر
  `POST /admin/plans/:id/payping-product` برای ساخت/همگام‌سازی محصول.
- `apps/web/lib/api.ts`: نوع‌های `SubscriptionPayment`،
  `SubscriptionCheckout` و فیلد `paypingProductCode`.
- `apps/web/app/dashboard/subscriptions/page.tsx`: نمایش قیمت، دکمه‌ی
  «پرداخت و فعال‌سازی» و هدایت به درگاه، پیام نتیجه‌ی کال‌بک و تاریخچه‌ی
  پرداخت‌ها.
- `apps/web/components/admin/AdminSubscriptions.tsx`: ستون محصول پی‌پینگ و
  دکمه‌ی همگام‌سازی.
- `docs/API.md`: مستندسازی مسیرهای اشتراک/پرداخت و آدرس بازگشت.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.6.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- `python3 scripts/check_api_docs.py` → ۳۲۱ مسیر، همه با `@ApiOperation`.
- `docker exec alooshomal-api npx prisma db push --skip-generate --accept-data-loss`
  روی دیتابیس توسعه → همگام شد.
- `GET /api/subscriptions/plans` → اکو ۹۹٬۰۰۰ و بلاس ۱۹۹٬۰۰۰.
- کال‌بک با کد ناموجود → `302` به `...?payment=failed`؛ `checkout` بدون
  توکن → `401`.

## ۱۴۰۵/۰۸/۱۷ — انتقال متغیرهای پی‌پینگ به compose پروداکشن — نسخه `v3.5.1`

**هدف:** پنل‌های «درگاه پرداخت» و «درگاه پرداخت (OAuth)» با وجود ثبت
`PAYPING_TOKEN` و `PAYPING_OAUTH_CLIENT_ID`/`SECRET` در `.env` سرور، همچنان
«تنظیم نشده» گزارش می‌کردند. علت این بود که استقرار روی سرور فقط
`docker-compose.prod.yml` را اجرا می‌کند و این فایل هیچ‌کدام از متغیرهای پی‌پینگ
را به کانتینر `api` منتقل نمی‌کرد (فقط `docker-compose.yml` توسعه آن‌ها را داشت).

**تغییرات:**
- `docker-compose.prod.yml`: افزودن `PAYPING_TOKEN`، `PAYPING_BASE_URL`،
  `PAYPING_OAUTH_CLIENT_ID`، `PAYPING_OAUTH_CLIENT_SECRET` و
  `PAYPING_OAUTH_REDIRECT_URI` به بخش `environment` سرویس `api` تا مقادیر
  `.env` سرور به کانتینر برسند.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.5.1`.

**تأیید/تست:**
- `docker compose -f docker-compose.prod.yml config` با مقادیر آزمایشی: هر پنج
  متغیر با مقدار درست در `environment` سرویس `api` رندر شدند.
- مقایسه‌ی کلیدهای محیطی `api` بین دو فایل compose: پیش از اصلاح فقط همین پنج
  کلید در پروداکشن غایب بودند؛ پس از اصلاح تفاوت باقی نمانده است.
- `python3 scripts/sync_install.py --check` → exit 0 (بدون تغییر معلق).

## ۱۴۰۵/۰۸/۱۷ — پنل جداگانه‌ی «درگاه پرداخت (OAuth)» با ClientId/ClientSecret — نسخه `v3.5.0`

**هدف:** با روش دوم توکن (اپلیکیشن OAuth پی‌پینگ با ClientId/ClientSecret) یک
پنل کاملاً مستقل ساخته شود (بدون ادغام با پنل توکن پذیرنده) تا مشخص شود این
کلاینت به چه چیزهایی دسترسی دارد. کلاینت `client_credentials` را نمی‌پذیرد و
فقط با authorization_code + PKCE کار می‌کند، پس جریان اتصال یک‌باره پیاده شد.

**تغییرات:**
- `apps/api/src/payping-oauth/payping-oauth.service.ts`: کلاینت OAuth2 (PKCE
  S256، ذخیره‌ی verifier در Redis/تنظیمات، تبدیل کد به توکن، refresh، ذخیره‌ی
  توکن در جدول `settings`، `probe` برای آزمایش دسترسی هر scope و فراخوانی خام).
- `apps/api/src/payping-oauth/payping-oauth.controller.ts` و
  `apps/api/src/payping-oauth/dto/payping-oauth.dto.ts`: مسیرهای
  `admin/payping-oauth` (status/scopes/start/callback/disconnect/userinfo/probe/request)
  فقط برای `ADMIN` و مستندشده برای Swagger.
- `apps/api/src/payping-oauth/payping-oauth.module.ts` و
  `apps/api/src/app.module.ts`: ثبت ماژول.
- `apps/api/src/main.ts`: برچسب Swagger `payping-oauth`.
- `apps/web/components/admin/AdminPaypingOAuthPanel.tsx`: پنل مستقل (وضعیت اتصال،
  ویرایش scope، اتصال/قطع، userinfo، جدول Probe و تستر درخواست خام).
- `apps/web/components/admin/PaypingOAuthCatcher.tsx` و `apps/web/app/layout.tsx`:
  دریافت کد بازگشتی در ریشه‌ی سایت (Redirect URI ثبت‌شده) و تکمیل اتصال.
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`:
  افزودن بخش `payping-oauth` («درگاه پرداخت (OAuth)»).
- `.env.example`، `docker-compose.yml` و `docs/DEPLOY.md`: متغیرهای
  `PAYPING_OAUTH_CLIENT_ID`/`SECRET`/`REDIRECT_URI`.
- `docs/API.md`: مستندسازی کامل گروه `payping-oauth` و فهرست scopeهای مجاز.
- `BACKLOG.md`: ثبت معوق‌شدن «اتصال درگاه به خرید کاربران» به درخواست کاربر.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.5.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` بدون خطا.
- `python3 scripts/check_api_docs.py` → exit 0.
- تست زنده با توکن ادمین: `GET /api/admin/payping-oauth/status` →
  `{configured:true, connected:false}`؛ `POST start` آدرس مجوزدهی با PKCE ساخت
  و با curl به صفحه‌ی ورود پی‌پینگ (نه خطا) رسید؛ `callback` با state نامعتبر
  ۴۰۰ منطقی داد؛ `probe/userinfo` پیش از اتصال ۴۰۰ راهنما دادند؛ بدون توکن ۴۰۱.
- با آزمون scope روی endpoint مجوزدهی مشخص شد scopeهای مجاز این کلاینت
  `openid`, `pay:read/write`, `report:read`, `product:read/write`,
  `coupon:read/write`, `customer:read/write`, `invoice:read/write`,
  `upload:write`, `bnpl:merchantread/write` هستند و `profile/email/phone/
  offline_access/inquiry:*` رد می‌شوند؛ پیش‌فرض scopeها همین فهرست مجاز شد.
- تست Playwright روی `/admin?section=payping-oauth`: عنوان، دکمه‌ی «اتصال به
  پی‌پینگ» و وضعیت «مجوز داده نشده» رندر شدند و خطای کنسول نبود.

## ۱۴۰۵/۰۸/۱۷ — پنل «درگاه پرداخت پی‌پینگ» در داشبورد مدیریت — نسخه `v3.4.0`

**هدف:** با توجه به توکن درگاه پرداخت پی‌پینگ و مستندات رسمی، همه‌ی
دسترسی‌های مجاز توکن (پرداخت، گزارش تراکنش/تسویه، تسویه‌حساب، مشتریان، کد
تخفیف، آیتم مالی و لینک ثابت، فاکتور، خرید اقساطی، استعلام و آپلود) در یک
بخش تازه‌ی داشبورد مدیریت («درگاه پرداخت») پیاده‌سازی شود. توکن فقط سمت سرور
استفاده می‌شود و هرگز به مرورگر نمی‌رود.

**تغییرات:**
- `apps/api/src/payping/payping.service.ts`: کلاینت REST پی‌پینگ با `fetch`
  (توکن از `PAYPING_TOKEN`)، مدیریت خطای problem+json و تایم‌اوت؛ متدهایی برای
  همه‌ی endpointهای مجاز توکن.
- `apps/api/src/payping/payping.controller.ts`: کنترلر `admin/payping` فقط برای
  نقش `ADMIN` با `@ApiTags`/`@ApiOperation`/`@ApiBearerAuth` روی همه‌ی مسیرها.
- `apps/api/src/payping/dto/*.dto.ts`: DTOهای مستندشده برای گزارش، پرداخت،
  مشتری، کد تخفیف، آیتم مالی/لینک ثابت، فاکتور و اقساطی.
- `apps/api/src/payping/payping.module.ts` و `apps/api/src/app.module.ts`:
  ثبت ماژول جدید.
- `apps/api/src/main.ts`: افزودن برچسب Swagger `payping`.
- `apps/web/components/admin/AdminPaypingPanel.tsx`: پنل کامل با ۱۱ تب
  (خلاصه/اتصال، تراکنش‌ها، تسویه‌ها، مشتریان، کد تخفیف، آیتم‌های مالی،
  فاکتورها، اقساطی، ساخت پرداخت، استعلام، آپلود).
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`:
  افزودن بخش `payments` («درگاه پرداخت») و اتصال پنل.
- `apps/web/lib/api.ts`: افزودن متد `api.put`.
- `.env.example`، `docker-compose.yml` و `docs/DEPLOY.md`: متغیرهای
  `PAYPING_TOKEN` و `PAYPING_BASE_URL`.
- `docs/API.md`: مستندسازی کامل گروه `payping`.
- `apps/web/lib/version.ts`: ارتقای نسخه به `v3.4.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` بدون خطا.
- `python3 scripts/check_api_docs.py` → «همه‌ی مسیرها @ApiOperation دارند» (exit 0).
- تست زنده‌ی API با توکن ادمین: `GET /api/admin/payping/status` →
  `{configured:true, reachable:true}`؛ `overview`، `customers`، `coupons`،
  `invoices`، `bnpl/options`، `bnpl/plans` و `reports/transactions` پاسخ ۲۰۰
  دادند؛ بدون توکن ۴۰۱.
- تست Playwright روی `/admin?section=payments`: عنوان «درگاه پرداخت پی‌پینگ»،
  پیام «اتصال برقرار است»، تب‌ها و فرم «ساخت پرداخت» رندر شدند و خطای کنسول
  نداشت.

## ۱۴۰۵/۰۸/۱۷ — زمان ماندگاری در پایش منابع و اصلاح کادر جستجوی موبایل — نسخه `v3.3.1`

**هدف:** در پایش منابع، علاوه بر درصد آستانه یک «مدت زمان» هم تنظیم شود تا فقط
اگر مصرف مثلاً یک دقیقه بالای آستانه ماند هشدار برود؛ و کادر جستجوی صفحه‌ی اصلی
در موبایل از حالت قرصی به مستطیل با گوشه‌ی کم‌گرد اصلاح شود.

**تغییرات:**
- `apps/api/src/monitoring/monitoring.service.ts`: افزودن `sustainMinutes` (کلید
  `monitoringSustainMinutes`)، ردیابی زمان اولین عبور هر منبع از آستانه و ارسال
  هشدار تنها پس از ماندگاری در بازه‌ی تنظیم‌شده.
- `apps/api/src/monitoring/dto/update-monitoring.dto.ts`: فیلد `sustainMinutes`
  (۰ تا ۱۲۰).
- `apps/web/components/admin/AdminMonitoringPanel.tsx`: فیلد «مدت ماندگاری بالای
  آستانه (دقیقه)» و به‌روزرسانی متن راهنما.
- `apps/web/app/globals.css`: افزودن بلوک موبایل (`max-width: 767px`) برای گوشه‌ی
  کادر جستجوی صفحه‌ی اصلی روی همه‌ی تم‌ها/اسکین‌ها (۱۰px) تا اسکین توییتر در
  موبایل قرصی نباشد.
- `docs/API.md`: افزودن `sustainMinutes` به مستندات `PATCH /admin/monitoring`.
- `apps/web/lib/version.ts`: نسخه به `v3.3.1`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` بدون خطا و
  `python3 scripts/check_api_docs.py` → «کنترلرها: ۲۴ | مسیرها: ۲۴۷».
- با توکن ادمین: `PATCH /admin/monitoring` با `sustainMinutes: 5` مقدار را ذخیره
  کرد؛ با آستانه‌ی رم ۱۰٪ و `sustainMinutes: 5` هشدار ارسال نشد (چون هنوز ۵ دقیقه
  نگذشته بود)، و با `sustainMinutes: 0` در اسکن بعدی هشدار
  (`Monitoring alert dispatched (ram=53.5%)`) ارسال شد؛ سپس تنظیمات به پیش‌فرض
  (رم ۸۰٪، ماندگاری ۱ دقیقه) بازگشت.
- Playwright: در موبایل (`390px`) شعاع کادر جستجوی صفحه‌ی اصلی روی تم `modern` و
  نیز اسکین `twitter` حالا `10px` است (قبلاً `9999px`)؛ در دسکتاپ (`900px`) مقدار
  تم/اسکین بدون تغییر می‌ماند.

## ۱۴۰۵/۰۸/۱۷ — جداسازی ورود کاربران و مدیران و فعال‌شدن ثبت‌نام ایمیلی — نسخه `v3.3.0`

**هدف:** صفحه‌ی `/login` فقط برای ورود و ثبت‌نام کاربران عادی باشد؛ ورود و
ثبت‌نام با ایمیل و رمز برای کاربران هم فعال شود و هر دو روش (موبایل و ایمیل) با
کد یکبارمصرف تأیید شوند. ورود ادمین و مدیران به یک صفحه‌ی مجزا منتقل شود که
ورود با ایمیل/رمز و موبایل/کد را با کد یکبارمصرف ارائه می‌دهد.

**تغییرات:**
- `apps/api/src/auth/auth.service.ts`: حذف محدودیت نقش از `login`/`verifyEmailLogin`
  (و رد حساب‌های مدیریتی در `/login`)، دو مرحله‌ای‌کردن `register` با
  `verifyRegister`، و افزودن `adminLogin`/`verifyAdminLogin`/
  `requestAdminPhoneCode`/`verifyAdminPhoneCode` با بررسی نقش.
- `apps/api/src/auth/auth.controller.ts`: مسیرهای `register/verify` و
  `admin/login`، `admin/login/verify`، `admin/phone/request-code`،
  `admin/phone/verify` با مستندات Swagger.
- `apps/api/src/auth/otp.service.ts`: تغییر کلید به `otp:email-login:user:<id>`،
  پشتیبانی از هدف `register` و بازگشت کد توسعه در صورت شکست SMTP در محیط لوکال.
- `apps/api/src/auth/mail.service.ts`: هدف/برچسب ایمیل `register`.
- `apps/api/src/auth/dto/verify-email-login.dto.ts`: DTO مشترک تأیید ایمیل
  (جایگزین `verify-admin-login.dto.ts`).
- `apps/api/src/common/rate-limit.service.ts`: سهمیه‌ی `registerVerify`.
- `apps/web/components/auth/UserEmailAuth.tsx`: فرم ورود/ثبت‌نام ایمیلی کاربران
  با مرحله‌ی کد یکبارمصرف.
- `apps/web/app/(auth)/login/page.tsx`: فقط ورود/ثبت‌نام کاربران (موبایل یا ایمیل)
  و لینک به صفحه‌ی مدیران.
- `apps/web/app/(auth)/admin/login/page.tsx`: صفحه‌ی مجزای `/admin/login` با دو
  روش ایمیل/رمز و موبایل/کد.
- `apps/web/components/auth/AuthForm.tsx`،
  `apps/web/components/admin/AdminAuthSettings.tsx`،
  `apps/web/components/admin/AdminShell.tsx`،
  `apps/web/components/moderator/ModeratorShell.tsx`،
  `apps/web/components/moderator/ModeratorPanel.tsx`،
  `apps/web/app/moderator/notifications/page.tsx`،
  `apps/web/app/admin/page.tsx`،
  `apps/web/components/ui/SessionWatcher.tsx` و
  `apps/web/components/layout/MobileNav.tsx`: به‌روزرسانی متن‌ها و هدایت خروج/انقضای
  نشست مدیران به `/admin/login`.
- `docs/API.md`: مستندسازی جریان جدید ورود/ثبت‌نام و مسیرهای مدیریتی.
- `apps/web/lib/version.ts`: نسخه به `v3.3.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` بدون خطا.
- `python3 scripts/check_api_docs.py` → «کنترلرها: ۲۴ | مسیرها: ۲۴۷».
- با curl: ثبت‌نام ایمیلی (`/auth/register` → `register/verify`) نشست USER داد؛
  ورود ایمیلی کاربر (`/auth/login` → `login/verify`) موفق شد؛ ورود ایمیلی مدیر
  (`/auth/admin/login` → `admin/login/verify`) نقش ADMIN داد؛ درخواست/تأیید کد
  موبایل مدیر (`/auth/admin/phone/*`) موفق شد؛ حساب USER در مسیر مدیران ۴۰۳ و
  حساب مدیر در `/login` هم ۴۰۳ گرفت؛ شماره‌ی غیرمدیر ۴۰۱.
- Playwright: تب‌های «موبایل و کد»/«ایمیل و رمز»، فرم ورود/ثبت‌نام ایمیلی و لینک
  «ورود مدیران و ادمین‌ها» در `/login`؛ صفحه‌ی `/admin/login` با دو روش و لینک
  «ورود کاربران عادی»؛ `/register` به `/login` هدایت شد.

## ۱۴۰۵/۰۸/۱۷ — عرض ثابت پنل جزئیات و آواتار مربعی یکسان در دایرکتوری‌ها — نسخه `v3.2.1`

**هدف:** در صفحه‌های دایرکتوری کارت ویزیت و بیولینک، با انتخاب کارت‌های مختلف
(دارای توضیحات/بدون توضیحات) عرض محتوا نباید تغییر کند، و عکس‌های مربعی در هر دو
پنل لیست و جزئیات در تبلت و دسکتاپ باید مانند موبایل مربعی و هم‌اندازه باشند.

**تغییرات:**
- `apps/web/components/ui/FitContent.tsx`: افزودن گزینه‌ی `noShrink` برای جلوگیری از
  کوچک‌شدن مقیاسی محتوا (که عرض را هم کم می‌کرد).
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkDetail.tsx`: استفاده از `noShrink`؛
  رکوردهای بلند به‌جای کوچک‌شدن، اسکرول می‌شوند و عرض ثابت می‌ماند.
- `apps/web/app/globals.css`: حذف تغییر پدینگ افقی در حالت compact، حذف کوچک‌شدن
  آواتار جزئیات در compact، افزودن `scrollbar-gutter: stable`، ثابت‌کردن اندازه‌ی
  مربعی آواتار ردیف‌ها (`6.5rem` در دسکتاپ/تبلت و رفتار قبلی در موبایل)، و
  `width: 100%` برای `.container-page` تا عرض کل صفحه به محتوای کارت انتخابی وابسته نباشد.
- `apps/web/lib/version.ts`: نسخه به `v3.2.1`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` بدون خطا.
- اندازه‌گیری Playwright در `900x900`، `900x600` و `1280x900` برای هر دو دایرکتوری:
  عرض محتوای پنل جزئیات برای کارت دارای توضیح و بدون توضیح یکسان شد
  (`325px` در تبلت و `363px` در دسکتاپ) و `transform` هیچ‌گاه اعمال نشد.
- آواتار ردیف‌ها در تبلت/دسکتاپ همه `104x104` و آواتار پنل جزئیات همه `64x64` شد
  (قبلاً ردیف بدون عکس به `11x102` جمع می‌شد و آواتار جزئیات در compact به `52x52` می‌رسید).
- در موبایل (`390x844`) آواتارها همچنان `138x138` و بدون سرریز افقی هستند.
- بررسی `/`، `/business-cards`، `/biolinks` و `/phonebook` در `1280px`: بدون
  سرریز افقی و عرض `main` حداکثر `1200px`.

## ۱۴۰۵/۰۸/۱۷ — سامانه‌ی پایش منابع سرور با هشدار ایمیل و پیامک — نسخه `v3.2.0`

**هدف:** راه‌اندازی سامانه‌ی پایش منابع سرور تا ادمین بتواند آستانه‌ی مصرف رم،
پردازنده و دیسک را (مثلاً رم ۸۰٪ و CPU ۹۰٪) از پنل تنظیم کند و در صورت عبور از
آستانه، هشدار به ایمیل و موبایل ادمین ارسال شود.

**تغییرات:**
- `apps/api/src/monitoring/monitoring.service.ts`: نمونه‌برداری دوره‌ای از رم/CPU/دیسک
  (`os` + `statfs`)، خواندن آستانه‌ها و گیرندگان از جدول `settings`، ارسال هشدار و
  «بازگشت به حالت عادی» با cooldown قابل تنظیم، و ثبت اعلان درون‌برنامه‌ای برای مدیران.
- `apps/api/src/monitoring/monitoring.controller.ts` و
  `apps/api/src/monitoring/monitoring.module.ts`: مسیرهای `GET/PATCH /admin/monitoring`
  و `POST /admin/monitoring/test` با محافظت `ADMIN` و مستندات Swagger.
- `apps/api/src/monitoring/dto/update-monitoring.dto.ts`: DTO اعتبارسنجی‌شده‌ی آستانه‌ها،
  بازه‌ی نمونه‌برداری، cooldown و ایمیل/موبایل گیرنده.
- `apps/api/src/auth/sms.service.ts`: افزودن `sendText` برای پیامک متنی ساده از مسیر
  `MELIPAYAMAK_SMS_PATH` (بدون پرتاب خطا؛ مناسب هشدار).
- `apps/api/src/auth/mail.service.ts`: افزودن `sendAlert` برای ایمیل هشدار متنی.
- `apps/api/src/auth/auth.module.ts` و `apps/api/src/app.module.ts`: صادرکردن
  `MailService`/`SmsService` و ثبت `MonitoringModule`.
- `apps/api/src/settings/settings.service.ts`: دسته‌ی اعلان `SYSTEM` برای هشدارهای منابع.
- `apps/web/components/admin/AdminMonitoringPanel.tsx`: پنل نمایش گیج‌های رم/CPU/دیسک،
  فرم آستانه‌ها و گیرندگان، وضعیت کانال‌ها و دکمه‌ی پیام آزمایشی.
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`: افزودن
  بخش «پایش منابع» به منوی پنل مدیر.
- `apps/web/components/admin/AdminNotificationSettings.tsx`: برچسب دسته‌ی `SYSTEM`.
- `docs/API.md`، `docs/DEPLOY.md` و `.env.example`: مستندسازی مسیرها و متغیرهای
  `MELIPAYAMAK_SMS_PATH`/`MONITORING_ALERT_*`.
- `apps/web/lib/version.ts`: نسخه به `v3.2.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` بدون خطا.
- `python3 scripts/check_api_docs.py` → «کنترلرها: ۲۴ | مسیرها: ۲۴۲» و همه‌ی مسیرها
  `@ApiOperation` دارند.
- با توکن ادمین: `GET /api/admin/monitoring` وضعیت لحظه‌ای (رم ۴۱٪، CPU ۱۵٪، دیسک ۳۸٪)
  را برگرداند؛ `PATCH` با `alertPhone: "123"` پاسخ ۴۰۰ داد و مقادیر معتبر ذخیره شدند؛
  `POST /api/admin/monitoring/test` پاسخ `{ email: false, sms: false }` داد (SMTP در
  محیط توسعه در دسترس نیست، ولی خطا مدیریت شد).
- با کاهش موقت آستانه‌ی رم به ۱۰٪، تیک بعدی هشدار را ارسال کرد
  (`Monitoring alert dispatched (ram=41.3%)`)، ایمیل با خطای «Greeting never received»
  به‌صورت مدیریت‌شده شکست خورد و ردیف اعلان `ADMIN` با عنوان
  «هشدار منابع سرور — حافظه (RAM)» ثبت شد؛ سپس تنظیمات به مقادیر پیش‌فرض بازگشت.
- Playwright روی `/admin?section=monitoring`: عنوان «پایش منابع سرور»، گیج‌های رم/CPU/دیسک،
  فرم آستانه‌ها و بخش گیرندگان هشدار رندر شدند.

## ۱۴۰۵/۰۸/۱۷ — ورود ایمیل/رمز فقط برای مدیران با تأیید کد یکبارمصرف — نسخه `v3.1.0`

**هدف:** مسیر ورود با ایمیل و رمز عبور در `/login` فقط برای ادمین و مدیران باشد و
حتی پس از رمز صحیح، ورود با کد یکبارمصرف (ایمیل و در صورت تنظیم پیامک) تأیید شود.

**تغییرات:**
- `apps/api/src/auth/auth.service.ts`: پس از اعتبارسنجی رمز، نقش‌های غیر از
  `ADMIN`/`MODERATOR` با ۴۰۳ رد می‌شوند؛ برای مدیران کد یکبارمصرف صادر و
  `{ requiresOtp: true, email, phone }` (بدون توکن) برگردانده می‌شود. متد
  `verifyAdminLogin` کد را بررسی و سپس نشست را صادر می‌کند.
- `apps/api/src/auth/otp.service.ts`: افزودن `issueAdminLogin`/`verifyAdminLogin`
  با کلید مستقل `otp:admin-login:user:<id>` (تحویل ایمیل + پیامک اختیاری).
- `apps/api/src/auth/mail.service.ts`: هدف `admin-login` برای متن/برچسب ایمیل.
- `apps/api/src/auth/dto/verify-admin-login.dto.ts`: DTO جدید `{ email, code }`.
- `apps/api/src/auth/auth.controller.ts`: مسیر `POST /api/auth/login/verify` با
  `@ApiOperation`؛ `POST /api/auth/login` فقط مرحله‌ی اول را انجام می‌دهد.
- `apps/api/src/common/rate-limit.service.ts`: سهمیه‌ی `adminLoginVerify`.
- `apps/web/app/(auth)/login/page.tsx`: مرحله‌ی کد تأیید پس از ورود مدیران،
  برچسب «ورود مدیران» و متن راهنما.
- `apps/web/components/auth/AuthForm.tsx` و
  `apps/web/components/admin/AdminAuthSettings.tsx`: به‌روزرسانی متن‌ها.
- `docs/API.md`: مستندسازی جریان دو مرحله‌ای ورود مدیران.
- `apps/web/lib/version.ts`: نسخه به `v3.1.0`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` و
  `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- `python3 scripts/check_api_docs.py` → ۲۳ کنترلر / ۲۳۹ مسیر، همه دارای
  `@ApiOperation`/`@ApiTags` (exit 0).
- `POST /api/auth/login` با کاربر عادی و رمز صحیح → ۴۰۳ با پیام «فقط برای
  مدیران». با ادمین → `requiresOtp: true` (بدون توکن).
- `POST /api/auth/login/verify` با کد نادرست → ۴۰۰، با کد صحیح → توکن ادمین، و
  با ایمیل کاربر عادی → ۴۰۱.
- Playwright با پاسخ شبیه‌سازی‌شده: پس از ارسال فرم مدیران، فیلد «کد تأیید» و
  ایمیل ماسک‌شده نمایش داده شد.

## ۱۴۰۵/۰۸/۱۷ — حذف فوتر در موبایل و کاهش گردی جستجوی صفحه‌ی اصلی — نسخه `v3.0.2`

**هدف:** در نسخه‌ی موبایل صفحه‌ی اصلی، فوتر نمایش داده نشود و گوشه‌های کادر جستجو
که بیش از حد گرد بود، اصلاح شود.

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: فوتر همیشه فقط در دسکتاپ
  (`hidden ... lg:block`) رندر می‌شود؛ در موبایل/تبلت (و مهر ای‌نماد آن) دیده نمی‌شود.
- `apps/web/components/home/HomeSearchBox.tsx`: `rounded-lg` → `rounded-md`.
- `apps/web/app/globals.css`: شعاع گوشه‌ی کادر جستجو در تم «نوین» از `16px` به
  `8px` و در تم «بازارچه» از `20px` به `10px` کاهش یافت.
- `apps/web/lib/version.ts`: نسخه به `v3.0.2`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- Playwright با عرض ۳۹۰px: `footer.site-footer` → `display: none`؛ شعاع کادر
  جستجو `8px`. با عرض ۱۲۸۰px: فوتر `display: block` و همان شعاع `8px`.

## ۱۴۰۵/۰۸/۱۷ — خوانا شدن اعلانات در حالت تاریک — نسخه `v3.0.1`

**هدف:** رفع ناخوانایی اعلانات (زنگوله‌ی پنل و صفحه‌ی تیکت‌ها) در حالت دارک‌مود؛
سطوح روشن `*-50` با متن روشن `text-ink` ترکیب می‌شدند و متن محو می‌شد.

**تغییرات:**
- `apps/web/components/ui/NotificationBell.tsx`: افزودن جفت‌های `dark:` به
  `typeStyles` (مثل `dark:bg-sky-950/50 dark:text-sky-200`) و `bg-white` ردیف‌های
  خوانده‌شده به `bg-white dark:bg-transparent`.
- `apps/web/components/ui/NotificationsInbox.tsx`: جفت `dark:` برای کادر خطا.
- `apps/web/components/ui/Alert.tsx`: جفت‌های `dark:` برای هر چهار تُن و دکمه‌ی
  اقدام (`dark:bg-white/10`).
- `apps/web/components/dashboard/UserTickets.tsx`: جفت `dark:` برای کادرهای خطا و
  حباب پیام پشتیبانی (`dark:bg-white/5`).
- `apps/web/lib/version.ts`: نسخه به `v3.0.1`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- با توکن نمونه و `theme=dark` در Playwright، ردیف اعلان خوانده‌نشده بررسی شد:
  پس‌زمینه‌ی تیره (`oklab(... / 0.5)`) و رنگ عنوان روشن (`rgb(230,236,247)`) →
  تضاد کافی و خوانا.

## ۱۴۰۵/۰۸/۱۷ — نمایش همیشگی و کلاسیک صفحه‌ی عمومی بیولینک — نسخه `v3.0.0`

**هدف:** صفحه‌ی عمومی بیولینک (`/biolinks/<slug>`) فقط به‌شکل کلاسیک و پیش‌فرض
نمایش داده شود و جمله/کلید «حالت نمایش» دیگر دیده نشود.

**تغییرات:**
- `apps/web/components/biolink/PublicBiolinkView.tsx`: حذف کامل کلید «حالت نمایش»،
  حالت‌های طراحی و ذخیره‌سازی `localStorage`؛ صفحه همیشه با
  `BiolinkTemplateStage` و `RECORD_TEMPLATE_KEY` (کلاسیک) رندر می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v3.0.0` (حذف قابلیت انتخاب حالت نمایش
  برای بازدیدکننده = تغییر MAJOR).

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- با تنظیم موقت `template='sunny'` روی یک بیولینک در دیتابیس dev، صفحه باز هم
  کلاسیک رندر شد: `hasSwitch=false`، `hasRecord=true`، `hasDesignPage=false`،
  و متن «حالت نمایش» در صفحه نبود؛ سپس مقدار به `classic` بازگردانده شد.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — فعال/غیرفعال‌کردن حالت‌های نمایش دایرکتوری توسط مدیر — نسخه `v2.111.0`

**هدف:** ادمین بتواند حالت‌های نمایش «لیست / کاشی / دفترچه» را برای کارت‌های
ویزیت و بیولینک‌ها جداگانه فعال یا غیرفعال کند و کلید «حالت نمایش» در دایرکتوری
عمومی فقط حالت‌های مجاز را نشان دهد.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: کلیدهای
  `businessCardDirectoryViews`/`biolinkDirectoryViews` با getter/setter و
  پیش‌فرض‌های `list,tiles,notebook` (کارت) و `list,tiles` (بیولینک).
- `apps/api/src/settings/settings.controller.ts`: افزودن فیلدهای DTO، نمایش در
  `GET /settings/public` و `GET /admin/settings`، و ذخیره در `PATCH /admin/settings`.
- `apps/web/lib/directory-view.ts`: هوک `useDirectoryViews(kind)` برای خواندن
  حالت‌های مجاز از تنظیمات عمومی و بازگشت خودکار به اولین حالت مجاز اگر حالت
  فعلی غیرفعال شود.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: استفاده از حالت‌های
  مجاز در کلید نمایش.
- `apps/web/components/admin/AdminDirectorySettings.tsx`: چک‌باکس‌های فعال/غیرفعال
  برای هر حالت و هر دایرکتوری.
- `apps/web/lib/version.ts`: نسخه به `v2.111.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- `PATCH /api/admin/settings` با `cards=[list,tiles]` و `biolinks=[tiles]` →
  `GET /api/settings/public` همان مقادیر را برگرداند.
- Playwright: `/business-cards` فقط «لیست/کاشی» و `/biolinks` فقط «کاشی» (و
  پیش‌فرض کاشی) را نشان داد. سپس تنظیمات به پیش‌فرض بازگردانده شد.
- `python3 scripts/check_api_docs.py` → exit 0؛
  `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — مربعی‌شدن عکس پنل جزئیات دایرکتوری‌ها — نسخه `v2.110.2`

**هدف:** در `/business-cards?card=…` و `/biolinks?biolink=…` عکس پنل سمت چپ
مانند کارت‌های سمت راست مربعی شود و در نبود عکس، حرف اول نام داخل همان کادر
مربعی نمایش داده شود.

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: کادر
  عکس از دایره (`rounded-full`) به مربع ۱۲px (`rounded-[12px]`) تغییر کرد؛
  حرف اول با `text-2xl` در همان کادر؛ اسکلت بارگذاری هم مربعی شد.
- `apps/web/components/biolink/DirectoryBiolinkDetail.tsx`: همان تغییر برای
  پنل جزئیات بیولینک.
- `apps/web/lib/version.ts`: نسخه به `v2.110.2`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- اندازه‌گیری با Playwright/Chrome: کادر عکس هر دو پنل `64×64` با
  `border-radius: 12px` و متن حرف اول («ع») در نبود عکس.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — بازتر و استانداردتر شدن لینک‌های هدر — نسخه `v2.110.1`

**هدف:** لینک‌های ناوبری هدر صفحه‌ی اصلی کمی بازتر و به‌شکل استاندارد (پیل
کلیک‌پذیر با هاور و حالت فعال) نمایش داده شوند، بدون سرریز در عرض‌های دسکتاپ.

**تغییرات:**
- `apps/web/components/layout/Header.tsx`: هر لینک به یک پیل با `py-1.5`،
  `rounded-lg`، هاور `bg-soft` و حالت فعال (`bg-brand-light`/`font-bold`) تبدیل
  شد؛ `usePathname` برای تشخیص صفحه‌ی جاری و `aria-current` افزوده شد. فاصله و
  اندازه‌ی قلم به‌گونه‌ای تنظیم شد که در ۱۰۲۴ تا ۱۵۳۶ پیکسل سرریز نکند.
- `apps/web/lib/version.ts`: نسخه به `v2.110.1`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- اندازه‌گیری با Playwright/Chrome در عرض‌های ۱۰۲۴، ۱۲۸۰، ۱۳۶۶، ۱۴۴۰ و ۱۵۳۶:
  `scrollWidth === clientWidth` برای `<nav>` (بدون سرریز).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — صفحه‌ی «ایمیل‌های ارسالی» در پنل مدیر — نسخه `v2.110.0`

**هدف:** در پنل مدیر بخش اختصاصی برای ایمیل‌های ارسالی به کاربران اضافه شود تا
گیرنده، موضوع، نوع و وضعیت هر ارسال دیده شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `SentEmail` (`to`، `subject`، `purpose`،
  `status`، `error`، `createdAt`) با ایندکس تاریخ/گیرنده.
- `apps/api/src/auth/mail.service.ts`: تزریق `PrismaService` و ثبت هر تلاش ارسال
  (موفق/ناموفق)؛ موضوع ذخیره‌شده فاقد کد یکبارمصرف است تا کد لو نرود.
- `apps/api/src/admin/dto/list-emails.dto.ts`: DTO صفحه‌بندی + جستجو + وضعیت.
- `apps/api/src/admin/admin.service.ts`: `listEmails` با صفحه‌بندی و جستجو.
- `apps/api/src/admin/admin.controller.ts`: `GET /admin/emails` با
  `@ApiOperation`.
- `apps/web/components/admin/AdminEmails.tsx`: صفحه‌ی اختصاصی جدول ایمیل‌ها با
  جستجو، فیلتر وضعیت و صفحه‌بندی.
- `apps/web/components/admin/AdminShell.tsx` و `apps/web/app/admin/page.tsx`:
  افزودن بخش `emails` («ایمیل‌های ارسالی») به منو و رندر صفحه.
- `apps/web/lib/version.ts`: نسخه به `v2.110.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx prisma db push --skip-generate` + `prisma generate`
  روی دیتابیس dev → جدول `sent_emails` ساخته شد.
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` و
  `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- ارسال واقعی یک ایمیل (تغییر ایمیل به `auth@shomalicard.ir`) → ردیف `SENT` در
  `sent_emails` ثبت شد و `GET /api/admin/emails` آن را با `meta` برگرداند.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۳ کنترلر، ۲۳۸ مسیر).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — اعمال فوری تغییر ایمیل بدون تأیید مدیر — نسخه `v2.109.2`

**هدف:** تغییر ایمیل کاربر پس از تأیید کد یکبارمصرف روی ایمیل جدید، بلافاصله
اعمال شود و نیازی به تأیید مدیر نداشته باشد (کد، مالکیت ایمیل را اثبات می‌کند).

**تغییرات:**
- `apps/api/src/profile/profile.service.ts`: `verifyEmailChange` پس از تأیید کد،
  ایمیل کاربر را مستقیماً در دیتابیس به‌روزرسانی می‌کند و دیگر
  `ProfileChangeRequest` یا اعلان مدیر نمی‌سازد؛ اعتبارسنجی ایمیل و بررسی
  «همان ایمیل فعلی» افزوده شد.
- `apps/api/src/profile/profile.controller.ts`: `summary` مسیر `email/verify`
  به «اعمال فوری تغییر ایمیل» اصلاح شد.
- `apps/web/components/dashboard/ContactChangePanel.tsx`: پیام موفقیت برای ایمیل
  «ایمیل شما با موفقیت تغییر کرد» شد (موبایل همچنان نیازمند تأیید مدیر است).
- `apps/web/components/dashboard/ProfilePanel.tsx`: پس از بارگذاری پروفایل،
  کاربر کش‌شده‌ی نشست (`useAuth.setUser`) هم به‌روز می‌شود تا ایمیل جدید فوراً
  در سربرگ دیده شود.
- `apps/web/lib/version.ts`: نسخه به `v2.109.2`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- جریان روی dev: `POST /api/profile/email/request-code` → `201`،
  `POST /api/profile/email/verify` → `201` با `applied: true`،
  `GET /api/profile/me` ایمیل جدید را نشان داد و ورود با ایمیل جدید → `200`.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — ارسال کد تغییر ایمیل به ایمیل جدید (نه موبایل) — نسخه `v2.109.1`

**هدف:** در `/dashboard/profile` هنگام تغییر ایمیل، کد تأیید به ایمیل جدید
ارسال شود؛ پیش‌تر کد به شماره موبایل فعلی می‌رفت و کاربر روی ایمیل جدید کدی
نمی‌دید.

**تغییرات:**
- `apps/api/src/auth/otp.service.ts`: افزودن `issueEmailChange` و
  `verifyEmailChange` با فضای کلید `otp:email-change:user:<id>` که کد را فقط با
  ایمیل به آدرس جدید می‌فرستد (بدون نیاز به موبایل تأییدشده).
- `apps/api/src/profile/profile.service.ts`: `requestEmailChange` و
  `verifyEmailChange` از جریان جدید استفاده می‌کنند، اعتبارسنجی ایمیل افزوده شد
  و الزام «داشتن موبایل» حذف شد.
- `apps/api/src/profile/profile.controller.ts`: به‌روزرسانی `summary` مسیر
  `email/request-code` («ارسال کد به ایمیل جدید»).
- `apps/web/components/dashboard/ContactChangePanel.tsx`: متن راهنما برای ارسال
  کد به ایمیل جدید و افزودن `emailSent` به نوع پاسخ.
- `apps/web/components/dashboard/ProfilePanel.tsx`: حذف غیرفعال‌بودن پنل تغییر
  ایمیل وابسته به وجود موبایل.
- `apps/web/lib/version.ts`: نسخه به `v2.109.1`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- جریان روی dev (با بایپس کد در حالت بدون SMTP):
  `POST /api/profile/email/request-code` → `201` با
  `sentTo: reset-new@example.com` و `devCode: 123456`؛
  `POST /api/profile/email/verify` با کد اشتباه → `400`، با کد درست → `201`
  (ثبت درخواست PENDING)، استفاده‌ی دوباره از کد → `400`.
- `python3 scripts/check_api_docs.py` → exit 0؛
  `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — تغییر رمز با کد یکبارمصرف و بهبود ناوبری ورود/پنل — نسخه `v2.109.0`

**هدف:** کاربر بتواند در `/dashboard/profile` بدون دانستن رمز قبلی، رمز را
تغییر دهد و صحت آن با کد یکبارمصرف تأیید شود؛ کد به ایمیل و (در صورت درخواست)
با پیامک ارسال شود. همچنین دکمه‌ی بازگشت به صفحه‌ی اصلی در `/login` و تغییر
دکمه‌ی «دایرکتوری» به «صفحه اصلی» در سربرگ پنل.

**تغییرات:**
- `apps/api/src/auth/otp.service.ts`: بازآرایی به کمکی‌های کلیدمحور
  (`readKey`/`writeKey`/`clearKey`/`recentlyIssuedKey`/`markIssuedKey`) و افزودن
  `issuePasswordReset` و `verifyPasswordReset` با فضای کلید
  `otp:password-reset:user:<id>` (کلید نشانگر `:issued` جدا از کلید کد تا هش
  بازنویسی نشود).
- `apps/api/src/auth/auth.service.ts`: `requestPasswordResetCode` و
  `resetPasswordWithOtp` (بدون نیاز به رمز فعلی، با ثبت فعالیت).
- `apps/api/src/auth/mail.service.ts`: برچسب هدف `password-reset`
  («تغییر رمز عبور»).
- `apps/api/src/auth/auth.controller.ts`: مسیرهای
  `POST /auth/password/request-code` و `POST /auth/password/reset` با
  `@ApiBearerAuth` و `@ApiOperation`.
- `apps/api/src/auth/dto/request-password-reset.dto.ts` و
  `apps/api/src/auth/dto/reset-password.dto.ts`: DTOهای مستند با `@ApiProperty`.
- `apps/api/src/common/rate-limit.service.ts`: سقف درخواست/تأیید تغییر رمز.
- `apps/web/components/dashboard/ProfilePanel.tsx`: جریان جدید ارسال کد، ورود
  کد و رمز جدید (به‌جای رمز فعلی)، با گزینه‌ی ارسال پیامک.
- `apps/web/app/(auth)/login/page.tsx`: دکمه‌ی «بازگشت به صفحه اصلی».
- `apps/web/components/dashboard/UserShell.tsx`: دکمه‌ی سربرگ «صفحه اصلی» با
  لینک `/`.
- `apps/web/lib/version.ts`: نسخه به `v2.109.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- جریان کامل روی dev: `POST /api/auth/password/request-code` → `200`
  (`devCode: 123456`)، `POST /api/auth/password/reset` → `200`، ورود با رمز
  جدید → `200`، ورود با رمز قدیمی → `401`، استفاده‌ی دوباره از همان کد → `400`.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۳ کنترلر، ۲۳۷ مسیر).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — ممنوعیت استقرار مستقیم ایجنت روی سرور — نسخه `v2.108.0`

**هدف:** کاربر خواست به‌صورت قانون دائمی ثبت شود که ایجنت هرگز خودش روی سرور
استقرار انجام ندهد؛ استقرار فقط از مسیر GitHub/GitLab (push کاربر) یا دستور
مستقیم کاربر انجام می‌شود.

**تغییرات:**
- `AGENTS.md`: افزودن «قانون ۱۰ — ممنوعیت استقرار مستقیم روی سرور» با شرح
  وظایف مجاز ایجنت (پیاده‌سازی، تست، `sync_install.py`، ثبت تاریخچه، کامیت) و
  تأکید بر اینکه استقرار فقط با push کاربر یا دستور مستقیم او انجام می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v2.108.0`.

**تأیید/تست:**
- بازبینی متن قانون و هم‌راستایی با قانون ۴ (ممنوعیت push توسط ایجنت).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۷ — ارسال همان کد OTP هم با پیامک و هم با ایمیل — نسخه `v2.107.0`

**هدف:** کاربر خواست کد یکبارمصرف هم پیامک شود و هم ایمیل، تا هر کدام راحت‌تر
بود دریافت کند.

**تغییرات:**
- `apps/api/src/auth/mail.service.ts`: سرویس SMTP با `nodemailer` (STARTTLS روی
  پورت ۵۸۷، قالب HTML راست‌به‌چپ و متن ساده، ماسک آدرس در لاگ).
- `apps/api/src/auth/otp.service.ts`: `issue()` گزینه‌ی `email` گرفت و همان کد
  پیامکی را با ایمیل هم می‌فرستد؛ خطای ایمیل باعث شکست پیامک نمی‌شود و
  `emailSent` در پاسخ برگردانده می‌شود.
- `apps/api/src/auth/auth.service.ts`: برای کاربر موجود ایمیل حساب و برای شماره‌ی
  جدید ایمیل اختیاری ورودی استفاده می‌شود.
- `apps/api/src/auth/dto/request-code.dto.ts`: فیلد اختیاری `email` با
  `@ApiPropertyOptional`.
- `apps/api/src/common/rate-limit.service.ts`: سقف ۵ ارسال ایمیل به هر آدرس در
  ۱۵ دقیقه (`otpRequestEmail`).
- `apps/api/src/auth/auth.module.ts`: ثبت `MailService`.
- `apps/web/components/auth/AuthForm.tsx`: فیلد اختیاری ایمیل در مرحله‌ی شماره و
  پیام «کد به موبایل و ایمیل ارسال شد».
- `docker-compose.yml`، `docker-compose.prod.yml`، `.env.example`،
  `apps/api/.env.example`: متغیرهای `MAIL_*`.
- `docs/API.md`: توضیح فیلد اختیاری `email` در `request-code`.
- `apps/web/lib/version.ts`: نسخه به `v2.107.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit -p tsconfig.json` → بدون خطا.
- ارسال واقعی SMTP از کانتینر به `auth@shomalicard.ir` → `OK` با `messageId`.
- `POST /api/auth/phone/request-code` با `{"phone":"09120000000","email":"auth@shomalicard.ir"}`
  → `200`، `emailSent: true` (در dev کد `123456`).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.
- **استقرار زنده:** ایمیج‌های api/web روی سرور جایگزین شدند و هر دو `healthy`اند؛
  ارسال واقعی SMTP از کانتینر api روی سرور به `auth@shomalicard.ir` → `OK`.
  نسخه‌ی سایت `v2.107.0` و فیلد «ایمیل (اختیاری)» در `/login` دیده می‌شود.
- **ریست رمز ادمین:** هش اولیه به‌خاطر expansion شدن `$` در شل خراب شده بود؛ با
  Prisma دوباره ست شد و `POST /api/auth/login` با `admin@alooshomal.ir` → `200`
  و نقش `ADMIN`. مقدار `ADMIN_PASSWORD` در `.env` سرور هم به‌روز شد.

## ۱۴۰۵/۰۸/۱۶ — نمایش اینماد روی موبایل در فوتر صفحه‌ی اول — نسخه `v2.106.2`

**هدف:** کاربر گفت لوگوی اینماد را روی سایت نمی‌بیند. ردیف پیوندهای فوتر طبق
طراحی فقط در دسکتاپ هست، پس نماد در موبایل/تبلت (که فوتر مخفی است) دیده نمی‌شد.
نماد باید «روی صفحه‌ی اصلی» و بدون ویرایش دیده شود.

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: نماد از ردیف دسکتاپ جدا شد و به یک
  ردیف مستقل (`py-3`) منتقل گردید که در همه‌ی بریک‌پوینت‌ها رندر می‌شود؛ ردیف
  پیوندها همچنان `hidden lg:flex` است. با `showEnamad` فوتر در موبایل هم
  (فقط برای صفحه‌ی اول) ظاهر می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v2.106.2`.

**تأیید/تست:**
- Playwright با شبیه‌سازی لوگوی ۸۰×۸۰:
  - موبایل `390×844` صفحه‌ی اول → فوتر `display:block` و نماد دیده می‌شود،
    `scrollHeight == innerHeight`.
  - موبایل `/guide` → فوتر `display:none` و بدون نماد (بدون تغییر رفتار).
  - دسکتاپ `1440×900` صفحه‌ی اول → نماد دیده می‌شود، بدون اسکرول؛
    `/guide` → فوتر بدون نماد.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- **بررسی سمت اینماد از سرور ایران:** خود `https://trustseal.enamad.ir/?id=8569817&Code=...`
  پاسخ `500` و صفحه‌ی «خطا» می‌دهد و `logo.aspx` هم `403` است؛ یعنی رکورد اینماد
  هنوز فعال نیست (طبق راهنما نیاز به تکمیل «رشته فعالیت»/قانون‌مندی و انتشار چندساعت‌ه).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.
- **استقرار زنده:** ایمیج جدید روی سرور جایگزین شد؛ در `https://shomalicard.ir/`
  نماد در موبایل (`390×844`) و دسکتاپ (`1440×900`) دیده می‌شود، نسخه `v2.106.2`
  است و صفحه‌ی اول بدون اسکرول اضافه ماند؛ در `/guide` موبایل فوتر و نماد مخفی‌اند.

## ۱۴۰۵/۰۸/۱۶ — انتقال نماد اینماد به فوتر صفحه‌ی اول — نسخه `v2.106.1`

**هدف:** به‌جای نمایش نماد اعتماد زیر دکمه‌های جست‌وجو در هیرو، در فوتر صفحه‌ی
اول قرار بگیرد (فقط همان صفحه).

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: پراپ اختیاری `showEnamad` اضافه شد که
  در صورت `true` نماد اینماد را در ردیف فوتر (کنار نسخه) رندر می‌کند.
- `apps/web/app/page.tsx`: نمایش نماد از هیرو حذف و `<Footer showEnamad />` شد.
- `apps/web/lib/version.ts`: نسخه به `v2.106.1`.

**تأیید/تست:**
- Playwright (۱۴۴۰×۹۰۰ و ۱۲۸۰×۸۰۰) با شبیه‌سازی بارگذاری لوگو در اندازه‌ی
  طبیعی ۸۰×۸۰: `footer.height = 104` و `scrollHeight == innerHeight` (صفحه
  همچنان تک‌صفحه‌ای؛ هیرو به ۷۲۳px جمع می‌شود).
- در موبایل (`390×844`) فوتر طبق طراحی مخفی است و نماد نمایش داده نمی‌شود.
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.
- **استقرار زنده:** ایمیج وب روی سرور جایگزین شد؛ در HTML `https://shomalicard.ir/`
  نماد داخل `<footer>` هست و هیرو دیگر آن را ندارد، فوتر سایر صفحات بدون نماد
  است، و `https://shomalicard.ir/55648695.txt` همچنان `200` است.

## ۱۴۰۵/۰۸/۱۶ — افزودن دامنه‌ی `shomalicard.ir` و نماد اعتماد (اینماد) — نسخه `v2.106.0`

**هدف:** دامنه‌ی تازه‌ی `shomalicard.ir` روی همین سرور و همان اپلیکیشن سرو شود و
مراحل اینماد (فایل تأیید مالکیت در ریشه‌ی سایت + کد رسمی نماد در صفحه‌ی اول) کامل شود.

**تغییرات:**
- `deploy/nginx/conf.d/01-alooshomal.conf`: افزودن `shomalicard.ir` و
  `www.shomalicard.ir` به `server_name` بلاک HTTP.
- `deploy/nginx/conf.d/02-alooshomal-ssl.conf.template`: همان دامنه‌ها به
  `server_name` بلاک HTTPS اضافه شدند (یک گواهی SAN برای همه).
- `deploy/nginx/enable-ssl.sh`: پشتیبانی از چند دامنه با `DOMAINS`، صدور/بزرگ‌کردن
  گواهی موجود با `--cert-name` + `--expand`، افزودن خودکار `www` فقط وقتی رزولو شود،
  بازتولید `02-alooshomal-ssl.conf` از تمپلیت و `nginx -s reload` پس از تست.
- `docs/DEPLOY.md`: بخش «افزودن دامنه‌ی جدید» شامل DNS، `server_name`، اجرای
  certbot و به‌روزرسانی `CORS_ORIGIN`.
- `.env.example`: توضیح قالب کاماپایین `CORS_ORIGIN` برای چند دامنه.
- `apps/web/public/55648695.txt`: فایل خالی تأیید مالکیت برای اینماد (سرو در
  `https://shomalicard.ir/55648695.txt`).
- `apps/web/components/layout/EnamadBadge.tsx`: کد رسمی اینماد به‌صورت
  دست‌نخورده با `dangerouslySetInnerHTML` (بدون بازنویسی به JSX).
- `apps/web/app/page.tsx`: نمایش نماد اینماد در صفحه‌ی اول زیر دکمه‌های جست‌وجو.
- `apps/web/lib/version.ts`: نسخه به `v2.106.0`.

**تأیید/تست:**
- `curl -I http://127.0.0.1:3000/55648695.txt` → `200`؛ خروجی HTML صفحه‌ی اول
  شامل `trustseal.enamad.ir/?id=8569817&Code=...` و تصویر لوگو شد.
- Playwright در `390×844`، `360×740` و `1440×900`: صفحه‌ی اول همچنان تک‌صفحه‌ای
  ماند (`scrollHeight == innerHeight`).
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- `nginx -t` در کانتینر موقت `nginx:1.27-alpine` با گواهی ساختگی → syntax ok.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.
- **استقرار زنده روی سرور (`95.38.186.227`):** گواهی با
  `DOMAINS="alooshomal.ir shomalicard.ir" deploy/nginx/enable-ssl.sh` تمدید/بزرگ شد؛
  SAN گواهی = `DNS:alooshomal.ir, DNS:shomalicard.ir`.
- `https://shomalicard.ir/55648695.txt` → `200`، صفر بایت، `text/plain`.
- کد `trustseal.enamad.ir/logo.aspx?id=8569817&Code=...` در HTML صفحه‌ی اول هر دو
  دامنه (`shomalicard.ir` و `alooshomal.ir`) دیده شد.
- `CORS_ORIGIN` سرور به هر دو دامنه به‌روزرسانی شد؛ preflight از
  `Origin: https://shomalicard.ir` → `access-control-allow-origin: https://shomalicard.ir`.
- ایمیج وب با تغییرات روی سرور جایگزین شد؛ `alooshomal-web` و `alooshomal-api`
  هر دو `healthy` و `nginx -t` موفق.

## ۱۴۰۵/۰۸/۱۶ — چسبیدن فوتر به انتهای صفحه در همه‌ی صفحات — نسخه `v2.105.12`

**هدف:** در صفحات کوتاه، فوتر دسکتاپ پایین‌ترین نقطه‌ی ویوپورت باشد و در
صفحات بلند بعد از محتوا بیاید (بدون فاصله‌ی خالی زیر فوتر).

**تغییرات:**
- `apps/web/app/globals.css`: `body` به ستون فلکس تمام‌ارتفاع (`display:flex;
  flex-direction:column; min-height:100dvh`) تبدیل شد؛ `body > main` با
  `flex:1 0 auto` فضای خالی را می‌گیرد و `body > footer` با `margin-top:auto`
  به انتها می‌چسبد. `body > .home-shell` هم `flex:1 0 auto` گرفت تا پوسته‌ی
  تک‌صفحه‌ای خانه کل ارتفاع بدنه را پر کند.

**تأیید/تست:**
- Playwright (۱۴۴۰×۹۰۰): `/services` و `/contact` → `footer.bottom = 900`
  و `document.scrollHeight = 900` (فوتر دقیقاً انتهای ویوپورت)؛ `/guide` و
  `/rules` (بلند) → فوتر بعد از محتوا (`footer.bottom = scrollHeight`)؛
  `/` → `footer.bottom = 900`، `scrollY = 0` (همچنان تک‌صفحه‌ای).
- `/login` و `/business-cards` (بدون فوتر) بدون تغییر: `scrollHeight = 900`.
- با فعال‌کردن موقت «توقف بلاگ»: نوار اعلان (ارتفاع ۴۲px) و
  `header.top = 42px` و `--feature-notice-h = 42px` درست کار کردند (فلکس‌شدن
  بدنه به sticky آسیب نزد).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — کادر مربعی عکس در دایرکتوری کارت و بیولینک — نسخه `v2.105.11`

**هدف:** در `/business-cards` و `/biolinks` عکس هر ردیف یک کادر مربعی با ردیوس
مناسب باشد؛ در دسکتاپ به ارتفاع ردیف کشیده شود و عرضش متناسب بماند.

**تغییرات:**
- `apps/web/app/globals.css`: قاعده‌ی پایه برای `.directory-card-avatar` و
  `.directory-biolink-avatar` (مربع با `aspect-ratio: 1/1`، `border-radius:12px`،
  `align-self:stretch` و `max-width:6.5rem` تا `aspect-ratio` ردیف را بزرگ نکند)؛
  در بریک‌پوینت موبایل `max-width:none` و `height:100%` تا مربع به ارتفاع کامل
  ردیف برسد. تصویر داخل کادر `width/height:100%`.
- `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx`: حذف
  `size-12 rounded-full` از کادر عکس و `size-12` از تصویر.
- `apps/web/components/biolink/DirectoryBiolinkItem.tsx`: همان تغییرها + تبدیل
  `items-start` به `items-stretch` تا کادر عکس به ارتفاع ردیف کشیده شود.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright: `/business-cards` و `/biolinks` در ۱۴۴۰ → کادر عکس ۱۰۴×۱۰۴ با
  `border-radius:12px` و ارتفاع کارت ۱۳۸px؛ در ۳۹۰ → کادر ۱۳۸×۱۳۸ (مربع و
  هم‌ارتفاع ردیف ۱۵۸px).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — صفحه‌ی «تماس با ما» و افزودن آن به هدر و فوتر — نسخه `v2.105.10`

**هدف:** یک صفحه‌ی عمومی تماس با ما ساخته شود و لینکش در هدر و فوتر قرار بگیرد.

**تغییرات:**
- `apps/web/app/contact/page.tsx` (جدید): صفحه‌ی سروری با متادیتا؛ سه کارت
  «تیکت پشتیبانی»، «راهنمای استفاده» و «قوانین و مقررات» به‌همراه بخش گزارش تخلف.
  کانال رسمی، تیکت پشتیبانی است (طبق AGENTS.md تماس/پشتیبانی از سوئیچ‌ها مستثناست).
- `apps/web/lib/nav.ts`: افزودن `{ href: '/contact', label: 'تماس با ما' }` به
  `PUBLIC_NAV` (هدر دسکتاپ).
- `apps/web/components/layout/Footer.tsx`: افزودن «تماس با ما» به لینک‌های فوتر.
- `apps/web/components/layout/TwitterRail.tsx`: آیکن `Mail` برای مسیر `/contact`.
- `apps/web/components/layout/Header.tsx`: با اضافه‌شدن لینک نهم، ناوبری در
  عرض‌های ≥۱۲۸۰ سرریز می‌کرد؛ فاصله‌ی `xl` به `gap-2` و اندازه‌ی قلم در `xl`
  روی `13px` ثابت شد تا همه‌ی لینک‌ها در قالب ۱۲۰۰px جا شوند.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright روی `/contact` در ۱۴۴۰ و ۳۹۰: وضعیت ۲۰۰، `title` = «تماس با ما |
  شمالی کارت»، `h1` درست، لینک `/contact` در هدر و فوتر، سه لینک تیکت.
- اندازه‌گیری هدر در ۱۰۲۴/۱۱۰۰/۱۲۷۹/۱۲۸۰/۱۴۴۰: `scrollWidth == width`
  (بدون سرریز) و فاصله‌ی مثبت تا دکمه‌ی تم.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — کلید مدیر برای خاموش‌کردن نوار اعلان «توقف موقت» — نسخه `v2.105.9`

**هدف:** مدیر بتواند بدون فعال‌کردن دوباره‌ی بخش‌ها، نوار زرد «نمایش … موقتاً توسط
مدیر متوقف شده است» را از همه‌ی صفحات بردارد (صفحه‌ی «موقتاً غیرفعال» باقی بماند).

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن کلید `featureNoticeEnabled`
  (پیش‌فرض `true`) به‌همراه `getFeatureNoticeEnabled`/`setFeatureNoticeEnabled`.
- `apps/api/src/settings/settings.controller.ts`: افزودن فیلد به DTO، پاسخ
  `GET /settings/public`، پاسخ `GET /admin/settings` و پردازش `PATCH /admin/settings`.
- `apps/web/lib/features-store.ts` و `apps/web/lib/features.ts`: افزودن
  `featureNoticeEnabled` به اسنپ‌شات و `useFeatures`.
- `apps/web/lib/sections-server.ts`: خواندن همان فیلد در اسنپ‌شات سروری.
- `apps/web/components/layout/FeatureNoticeBar.tsx`: نوار فقط وقتی نمایش داده
  می‌شود که `featureNoticeEnabled` روشن باشد.
- `apps/web/components/admin/AdminFeatureFlags.tsx`: ردیف «نوار اعلان توقف موقت»
  با سوئیچ در پنل «ویژگی‌ها و دسترسی‌ها».
- `docs/API.md`: به‌روزرسانی توضیح `GET /settings/public`.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` و `docker exec alooshomal-api npx tsc --noEmit` → بدون خطا.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۳ کنترلر / ۲۳۵ مسیر).
- با `featureBlog=false`: نوار «نمایش «بلاگ» موقتاً توسط مدیر متوقف شده است.»
  در Playwright دیده شد؛ با `featureNoticeEnabled=false` همان صفحه نوار را نشان
  نداد ولی لینک بلاگ همچنان از هدر پنهان بود. سپس هر دو به `true` بازگشتند.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — پنهان‌شدن کامل بخش‌های غیرفعال از هدر (بدون فلش) — نسخه `v2.105.8`

**هدف:** وقتی مدیر «پست کاربران»، «اخبار شهر» یا «بلاگ» را در پنل غیرفعال می‌کند،
لینکشان دیگر در هدر (و نوار پایین موبایل) دیده نشود — حتی در HTML اولیه‌ی سرور،
نه فقط بعد از بارگذاری تنظیمات در مرورگر.

**تغییرات:**
- `apps/web/lib/features-store.ts` (جدید): انواع `PublicFeatures`/`StoppedSection`
  و یک کش سبک برای حالت بدون Provider.
- `apps/web/components/layout/FeaturesProvider.tsx` (جدید): Context سمت کلاینت که
  اسنپ‌شات تنظیمات را از لایه‌ی ریشه به هدر/فوتر/نوار پایین/نوار اعلان می‌رساند؛
  چون Provider در رندر سرور هم با مقدار اولیه رندر می‌شود، `Header` از همان
  HTML اولیه لینک‌های غیرفعال را حذف می‌کند.
- `apps/web/lib/sections-server.ts`: افزودن `getPublicFeatureSnapshot()` (خواندن
  سروری `GET /settings/public` با `revalidate:10`).
- `apps/web/app/layout.tsx`: خواندن اسنپ‌شات در سرور و پیچیدن کل درخت در
  `FeaturesProvider`.
- `apps/web/lib/features.ts`: `useFeatures` اکنون از Context تغذیه می‌شود (با
  fallback به کش/فچ کلاینت).

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- با غیرفعال‌کردن `featureFeedPosts`/`featureNews`/`featureBlog` در DB:
  `curl /services` دیگر `href="/feeds|/pulse|/blog"` ندارد (SSR پاک)؛ Playwright
  (۱۴۴۰ و ۳۹۰) هدر و نوار پایین را بدون این سه لینک نشان داد و هیچ خطای
  hydration در کنسول نبود.
- پس از بازگرداندن به `true`، همان سه لینک دوباره در SSR و هدر ظاهر شدند.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — رفع رفتن «قوانین» زیر دکمه‌ی لایت/دارک در هدر — نسخه `v2.105.7`

**هدف:** در هدر دسکتاپ، لینک «قوانین» زیر دکمه‌ی تغییر تم (لایت/دارک) نمی‌رفت و
چیدمان اکشن‌ها/ناوبری در همه‌ی عرض‌ها تمیز بماند.

**تغییرات:**
- `apps/web/components/layout/Header.tsx`: ریشه‌ی مشکل دو چیز بود: (۱) دکمه‌ی
  ثانویه‌ی «ورود/ثبت‌نام» با `hidden xl:inline-flex` هرگز پنهان نمی‌شد چون قاعده‌ی
  بدون‌لایه‌ی `.indeed-btn { display:inline-flex }` بر `hidden` تیلویند غالب
  می‌شد؛ اکنون در یک `<div className="hidden xl:flex">` پیچیده شد. (۲) فاصله‌ی
  `xl:gap-6` ناوبری را ~۲۳px از جعبه‌اش پهن‌تر می‌کرد؛ به `xl:gap-4` کاهش یافت.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright روی `/services` در عرض‌های ۱۰۲۴/۱۱۰۰/۱۲۷۹/۱۲۸۰/۱۴۴۰: فاصله‌ی
  لبه‌ی چپ ناوبری تا لبه‌ی راست دکمه‌ی تم مثبت (۷۴/۱۱۲/۱۶۲/۲۹/۲۹px) و
  `scrollWidth === width` ناوبری (بدون سرریز)؛ دکمه‌ی ثانویه در `<xl`
  `display:none` و در `≥xl` `flex`.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — اصلاح هدر/فوتر دسکتاپ‌تابلت‌موبایل و تک‌صفحه‌ای‌کردن خانه — نسخه `v2.105.6`

**هدف:** در `/`، `/services`، `/guide` و `/rules` هدر و فوتر استاندارد و
یوزرفرندلی شود؛ در موبایل و تبلت فوتر نمایش داده نشود؛ صفحه‌ی خانه واقعاً تک‌صفحه‌ای
شود و کادر «شهروند خبرنگار شوید» از آن حذف شود.

**تغییرات:**
- `apps/web/components/layout/Header.tsx`: رفع سرریز افقی هدر دسکتاپ در عرض‌های
  ۱۰۲۴–۱۲۷۹px (قبلاً `scrollWidth` ≈۱۲۵۶ روی ویوپورت ۱۰۲۴ → اسکرول افقی و
  بریدگی دکمه‌های اکشن). در این بازه ناوبری جمع‌وجورتر (`gap-3`/`text-[13px]`)،
  برند کوچک‌تر، دکمه‌ی ثانویه‌ی «ورود/ثبت‌نام» پنهان و دکمه‌ی اصلی «شروع کنید»
  کوتاه می‌شود؛ از `xl` به بالا چیدمان کامل قبلی برمی‌گردد.
- `apps/web/components/layout/Footer.tsx`: فوتر فقط دسکتاپ (`hidden ... lg:block`)؛
  در موبایل/تبلت ناوبری پایین جایگزین آن است.
- `apps/web/components/layout/MobileNav.tsx`: برچسب‌های تک‌واژه‌ای
  («کارت‌ها/بیولینک/اخبار/پست‌ها») + `whitespace-nowrap` تا نوار پایین یک‌خطی
  بماند؛ پیش‌تر در موبایل دو خطی (۷۵px) می‌شد و با رزرو ۵۶px بدنه، انتهای صفحه
  زیر نوار پنهان می‌ماند.
- `apps/web/app/page.tsx`: حذف کادر «شهروند خبرنگار شوید» (و import بی‌استفاده)؛
  افزودن `var(--feature-notice-h)` به ارتفاع `home-shell` تا با نوار «توقف موقت»
  هم صفحه دقیقاً یک ویوپورت بماند.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright روی `{/, /services, /guide, /rules} × ۷ ویوپورت (1440، 1024، 1179،
  820، 768، 390، 360)`: سرریز افقی در همه‌جا ۰ (قبلاً در ۱۰۲۴px برابر ۲۳۲px بود)؛
  `footer` در `<lg` برابر `display:none` و در دسکتاپ `block`؛ نوار پایین ۵۷px
  یک‌خطی.
- صفحه‌ی خانه در ۱۴۴۰/۸۲۰/۳۹۰ (با نوار «توقف موقت» فعال): ارتفاع سند = ارتفاع
  ویوپورت، هیرو بریده‌نشده و کادر جستجو داخل ویوپورت.
- حذف CTA: سرچ `شهروند خبرنگار` در HTML خانه = ۰ و `ReporterCta` = ۰.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — رفع `Cannot POST /api/site-theme` در پروداکشن — نسخه `v2.105.5`

**هدف:** تغییر تم از «تنظیمات ← ظاهر سایت» در سایت مستقر با خطای
`Cannot POST /api/site-theme` شکست می‌خورد.

**علت:** هندلر Next.js روی `/api/site-theme` بود، اما nginx در پروداکشن فقط
مسیرهای `/api/proxy/*` را به کانتینر `web` می‌فرستد و بقیهٔ `/api/*` را به
NestJS. بنابراین درخواست به API می‌رسید و ۴۰۴ می‌گرفت (در لوکال چون فقط Next
پاسخ می‌داد، مشکل دیده نمی‌شد).

**تغییرات:**
- `apps/web/app/api/site-theme/route.ts` → `apps/web/app/api/proxy/site-theme/route.ts`
  (انتقال به قرارداد `/api/proxy/`).
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: تغییر آدرس fetch به
  `/api/proxy/site-theme` با توضیح دلیل.

**تأیید/تست:**
- `POST /api/proxy/site-theme` بدون توکن → ۴۰۱ با پیام «دسترسی غیرمجاز».
- `POST /api/site-theme` (مسیر قدیمی) → ۴۰۴.
- تست end-to-end با ورود ادمین لوکال و توکن معتبر → ۲۰۰ و
  `{"success":true,"data":{"siteTheme":"twitter"}}` (سپس تم به `modern`
  بازگردانده شد).
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — رفع خطای `server_tokens` تکراری در nginx — نسخه `v2.105.4`

**هدف:** دیپلوی پس از سالم‌شدن api/web در مرحله‌ی `nginx -t` شکست می‌خورد:
`"server_tokens" directive is duplicate in alooshomal-locations.inc:8`.

**تغییرات:**
- `deploy/nginx/conf.d/01-alooshomal.conf`: حذف `server_tokens off;` از بلوک
  HTTP؛ این دایرکتیو از قبل در فایل مشترک `alooshomal-locations.inc` (که داخل
  همان server بلاک include می‌شود) وجود دارد.
- `deploy/nginx/conf.d/02-alooshomal-ssl.conf.template`: حذف همان دایرکتیو
  تکراری از بلوک HTTPS؛ نسخه‌ی تک‌نسخه‌ای در فایل include باقی می‌ماند و هر دو
  بلوک را پوشش می‌دهد.

**تأیید/تست:**
- `docker run nginx:alpine nginx -t` با mount پوشه‌ی `deploy/nginx/conf.d`
  (بلوک HTTP) → `syntax is ok` و `test is successful`.
- همان تست با ساخت موقت بلوک HTTPS از تمپلیت و گواهی self-signed → موفق.
- `grep -rn server_tokens deploy/` → فقط یک مورد در `alooshomal-locations.inc`.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — رفع شکست دیپلوی با تولید خودکار secretهای گمشده — نسخه `v2.105.3`

**هدف:** دیپلوی روی سرور با خطای
`required variable MINIO_ROOT_PASSWORD is missing a value` شکست می‌خورد، چون
`.env` قدیمی سرور این کلید را نداشت و کامپوز پروداکشن عمداً پیش‌فرض ناامن ندارد.

**تغییرات:**
- `.github/workflows/deploy.yml`: پیش از `docker compose up`، تابع
  `ensure_secret` اگر `MINIO_ROOT_PASSWORD` یا `JWT_SECRET` خالی/غایب باشد یک
  مقدار تصادفی ۴۸ کاراکتری می‌سازد و در `.env` سرور ذخیره می‌کند؛ مقدار موجود
  هرگز بازنویسی نمی‌شود و خط خالی قبلی حذف می‌شود تا کلید تکراری نماند.
- `docs/DEPLOY.md`: توضیح رفتار bootstrap و اینکه `POSTGRES_PASSWORD`،
  `DATABASE_URL` و `ADMIN_PASSWORD` باید دستی تنظیم شوند (قابل چرخش امن نیستند).

**تأیید/تست:**
- بازتولید خطای CI در یک محیط موقت با `docker compose -f docker-compose.prod.yml
  config` و `.env` بدون `MINIO_ROOT_PASSWORD` → همان پیام خطا و exit 1.
- اجرای `ensure_secret` روی همان `.env` → تولید مقدار و سپس `compose config` →
  exit 0.
- تست واحد تابع: کلید غایب ساخته شد، `JWT_SECRET` موجود دست‌نخورده ماند، مقدار
  خالیِ `MINIO_ROOT_PASSWORD=""` جایگزین شد و اجرای دوباره کلید تکراری نساخت.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — جداکردن پورت میزبان MinIO از پورت داخلی — نسخه `v2.105.2`

**هدف:** رفع تصاویر شکسته در محیط توسعه. متغیر `MINIO_PORT` هم برای پورت
داخلی S3 API و هم برای پورت publish شده روی هاست استفاده می‌شد؛ چون پورت
۹۰۰۰ روی این ماشین توسط Portainer اشغال است و MinIO به ۹۰۱۰ منتقل شده بود،
آدرس‌های ذخیره‌شده (`http://localhost:9000/...`) به سرویس اشتباه می‌رفتند.

**تغییرات:**
- `docker-compose.yml`: افزودن `MINIO_HOST_PORT` و `MINIO_CONSOLE_HOST_PORT`
  برای publish روی هاست؛ `MINIO_PORT` فقط پورت داخلی شبکه باقی می‌ماند و
  پیش‌فرض `MINIO_PUBLIC_URL` از `MINIO_HOST_PORT` ساخته می‌شود.
- `.env.example`: مستندسازی تفاوت پورت داخلی و پورت هاست.
- `docs/STORAGE.md`: به‌روزرسانی جدول متغیرها و توضیح هم‌ترازی
  `MINIO_PUBLIC_URL` با `MINIO_HOST_PORT`.

**تأیید/تست:**
- `docker compose config` → `MINIO_PUBLIC_URL=http://localhost:9010` و
  publish شدن `127.0.0.1:9010->9000`.
- `curl http://localhost:3001/api/health` → ۲۰۰.
- یک URL تصویر واقعی از دیتابیس (`http://localhost:9010/...webp`) → ۲۰۰ با
  `content-type: image/webp`.
- رکوردهای موجود دیتابیس محلی که `localhost:9000` داشتند (۲ پست فید، ۳
  بیولینک و ۶ کارت ویزیت) به `localhost:9010` به‌روزرسانی شدند.
- Playwright روی `/feeds`، `/biolinks` و `/business-cards` → تعداد تصاویر
  ۲/۱/۳ و `broken=[]`.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۶ — ممیزی و سخت‌سازی امنیتی کد و معماری — نسخه `v2.105.1`

**هدف:** بازبینی امنیتی سراسری (XSS، open redirect، SSRF، path/header
injection، دور زدن rate-limit با جعل IP، افشای اطلاعات در پاسخ/لاگ،
اجرای پیش‌فرض‌های ناامن در production و سطح حمله‌ی سرویس‌های زیرساخت) و
اصلاح موارد قابل‌اثبات بدون تغییر رفتار کاربری.

**تغییرات:**
- `apps/web/lib/json-ld.ts` (جدید): تابع `jsonLdHtml()` برای escape کاراکترهای
  `<`/`>`/`&` و U+2028/2029 پیش از تزریق JSON-LD.
- `apps/web/app/blog/[slug]/page.tsx`، `apps/web/app/biolinks/[slug]/page.tsx`،
  `apps/web/app/business-cards/[slug]/page.tsx`: استفاده از `jsonLdHtml` به‌جای
  `JSON.stringify` خام (رفع stored XSS از طریق بستن تگ `<script>`).
- `apps/web/lib/safe-next.ts` (جدید): اعتبارسنجی مقصد `?next=` (رد `//`،
  بک‌اسلش، کاراکتر کنترلی و `/%2f`/`/%5c`) برای جلوگیری از open redirect.
- `apps/web/app/(auth)/login/page.tsx`، `apps/web/components/auth/AuthForm.tsx`:
  جایگزینی تابع محلی `safeNext` با `safeInternalPath` مشترک.
- `apps/web/next.config.ts`: جایگزینی `hostname:'**'` با allowlist دامنه‌ها و
  میزبان MinIO؛ غیرفعال‌کردن SVG در optimizer؛ فعال‌کردن
  `dangerouslyAllowLocalIP` فقط در توسعه (SSRF در `/_next/image`).
- `apps/web/app/api/proxy/biolinks/public/[slug]/vcard/route.ts` و
  `apps/web/app/api/proxy/business-cards/public/[slug]/vcard/route.ts`:
  `encodeURIComponent` روی slug و پاک‌سازی نام فایل `Content-Disposition`
  (path traversal و header injection).
- `apps/api/src/auth/jwt.config.ts`: رد `JWT_SECRET`های پیش‌فرض/کم‌آنتروپی در
  production.
- `apps/api/src/main.ts`: پشتیبانی `TRUST_PROXY` برای `req.ip` صحیح؛ ممنوعیت
  CORS wildcard در production و محدودسازی متدها/`maxAge`.
- `apps/api/src/sessions/request-context.ts`، `apps/api/src/common/visitor-key.ts`:
  حذف خواندن خام `X-Forwarded-For` و استفاده از `req.ip` (جلوگیری از دور زدن
  rate-limit با جعل IP).
- `apps/api/src/common/rate-limit.service.ts`: افزودن سطل‌های `loginEmail`،
  `refresh` و `upload`.
- `apps/api/src/auth/auth.service.ts`: rate-limit ورود بر اساس ایمیل (هش SHA-256)،
  rate-limit `refresh`، و حذف فیلد `registered` از پاسخ درخواست کد (جلوگیری از
  شمارش شماره‌ها).
- `apps/api/src/auth/refresh-cookie.ts`: try/catch روی `decodeURIComponent`
  (کوکی بدشکل دیگر ۵۰۰ نمی‌دهد).
- `apps/api/src/auth/sms.service.ts`: ماسک شماره تلفن در لاگ‌ها و حذف بدنه‌ی
  پاسخ سرویس پیامک از لاگ خطا.
- `apps/api/src/uploads/media-url.ts` (جدید): `assertOwnedMediaUrls` برای
  اجبار تصاویر به میزبان رسانه‌ی خودی (جلوگیری از pixel tracking/SSRF).
- `apps/api/src/feeds/feeds.service.ts`، `apps/api/src/biolinks/biolinks.service.ts`،
  `apps/api/src/businesscards/business-cards.service.ts`: اعتبارسنجی URL تصاویر
  در ساخت و ویرایش.
- `apps/api/src/uploads/uploads.service.ts`: rate-limit آپلود به‌ازای مالک.
- `apps/api/src/uploads/image.service.ts`: `limitInputPixels` در sharp
  (ضد decompression bomb).
- `apps/api/src/admin/admin.controller.ts`: سقف ۵ مگابایت برای ایمپورت اکسل/CSV.
- `apps/api/prisma/seed.ts`: الزام `ADMIN_PASSWORD` قوی در production، عدم
  بازنشانی رمز ادمین موجود در re-seed و حذف داده‌های دمو از production.
- `docker-compose.prod.yml`: الزام‌کردن `JWT_SECRET`، `ADMIN_PASSWORD`،
  `DATABASE_URL`، `POSTGRES_PASSWORD` و `MINIO_ROOT_PASSWORD` (بدون پیش‌فرض
  ناامن) و افزودن `TRUST_PROXY`.
- `docker-compose.yml`: محدودکردن پورت‌های Postgres/MinIO به `127.0.0.1`.
- `deploy/nginx/conf.d/01-alooshomal.conf` و
  `deploy/nginx/conf.d/02-alooshomal-ssl.conf.template`: `server_tokens off` و
  هدرهای HSTS/nosniff/X-Frame-Options/Referrer-Policy.
- `docs/DEPLOY.md`: مستندسازی `TRUST_PROXY`.
- `.gitignore`: لنگرکردن قاعده‌ی `uploads/` به ریشه تا فایل‌های جدید
  `apps/api/src/uploads/` نادیده گرفته نشوند.

**تأیید/تست:**
- `docker exec alooshomal-api npm run build` → بدون خطا.
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۳ کنترلر / ۲۳۵ مسیر).
- `/_next/image` با `169.254.169.254`، `minio:9000` و `localhost:9010` →
  رد شد؛ لاگ Next تأیید کرد hostname خصوصی بلاک می‌شود.
- `GET /api/proxy/biolinks/public/..%2F..%2Fadmin%2Fsettings/vcard` و slug
  حاوی `%22%0D%0ASet-Cookie` → هر دو ۴۰۴ بدون هدر/نشت داده.
- `POST /api/auth/phone/request-code` → پاسخ دیگر فیلد `registered` ندارد.
- Playwright روی `/`، `/feeds`، `/blog` و `/biolinks` → پاسخ ۲۰۰ بدون خطای
  JS و بدون ۵xx (تصاویر محلی به‌دلیل ناهم‌خوانی پورت `MINIO_PUBLIC_URL`
  شکسته‌اند که پیش‌موجود و نامرتبط با این تغییر است).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۵ — افزودن تم «توییتر» (روشن/تیره) — نسخه `v2.105.0`

**هدف:** افزودن چهارمین تم سراسری با ظاهر تخت و مینیمال توییتر/X (زمینه‌ی
سفید/مشکی، خطوط نازک و آبی `#1d9bf0`) که از پنل «تنظیمات ← ظاهر سایت» قابل
انتخاب باشد و حالت روشن/تیره‌ی هر بازدیدکننده را هم پشتیبانی کند.

**تغییرات:**
- `apps/web/lib/site-theme.ts`: افزودن `twitter` به `SITE_THEMES` و به گزینه‌های
  پنل، به‌همراه تابع `siteThemeDocumentAttrs` که این گزینه را به
  `data-theme="modern"` + `data-skin="twitter"` نگاشت می‌کند.
- `apps/api/src/settings/settings.service.ts`: افزودن `twitter` به `SITE_THEMES`
  و مستندسازی آن.
- `apps/api/src/settings/settings.controller.ts`: به‌روزرسانی توضیح DTO تم.
- `apps/web/app/layout.tsx`: نوشتن `data-skin` روی `<html>` و `themeColor`
  سفید برای تم توییتر.
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: پیش‌نمایش کارت تم
  توییتر، اعمال فوری `data-skin` پس از ذخیره و چیدمان دوستونه‌ی کارت‌ها برای
  چهار تم.
- `apps/web/app/globals.css`: بلوک پوسته‌ی `html[data-skin='twitter']` شامل پالت
  آبی X، زمینه‌ی `#f7f9f9`/سفید (روشن) و `#000`/`#16181c` (تیره)، هدر شیشه‌ای،
  فوتر مشکی با هاله‌ی آبی، دکمه‌های پیل، هیروی آبی و کارت‌های تخت بدون سایه.
- `docs/API.md`: افزودن `twitter` به قرارداد `siteTheme` و توضیح نگاشت
  `data-theme`/`data-skin`.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- `docker exec alooshomal-api npm run build` → بدون خطا.
- با تنظیم موقت `siteTheme=twitter` در دیتابیس، HTML دارای
  `data-theme="modern" data-skin="twitter"` شد (سپس به `modern` بازگردانده شد).
- Playwright روی `/`، `/feeds`، `/pulse` و `/blog` در روشن/تیره و عرض‌های
  ۱۴۴۰ و ۳۹۰: بدون خطای JS، `overflow=0`، accent=`#1d9bf0`، بدنه‌ی
  `#f7f9f9`/`#000`، پنل `#fff`/`#16181c`، هدر شیشه‌ای و فوتر/دکمه‌های آبی درست.
- `python3 scripts/check_api_docs.py` → exit 0.

## ۱۴۰۵/۰۸/۱۵ — بازطراحی `/pulse` و `/blog` با چیدمان توییتری — نسخه `v2.104.0`

**هدف:** دو صفحه‌ی عمومی «اخبار شهر» و «بلاگ» هم مثل `/feeds` به سبک توییتر/X
در بیایند: چیدمان سه‌ستونه، هدر چسبان با چیپ‌های فیلتر، ردیف‌های تخت در
خط‌زمانی، و ستون کناری جستجو/دسته‌بندی. برای اینکه این چیدمان سه‌جا کپی نشود،
پوسته‌ی مشترک استخراج شد.

**تغییرات:**
- `apps/web/components/layout/TwitterShell.tsx`: افزوده شد — پوسته‌ی مشترک
  سه‌ستونه (ریل ناوبری · خط‌زمانی · ستون کناری) که هر سه صفحه از آن استفاده
  می‌کنند.
- `apps/web/components/layout/TwitterRail.tsx` و
  `apps/web/components/layout/TwitterSearch.tsx`: از `components/feed/FeedRail.tsx`
  و `FeedSearch.tsx` منتقل و عمومی شدند؛ ریل حالا پراپ اختیاری `action` می‌گیرد
  تا هر صفحه دکمه‌ی CTA خودش را بگذارد. `apps/web/components/feed/FeedRail.tsx`
  و `FeedSearch.tsx` حذف شدند و `/feeds` هم به پوسته‌ی مشترک منتقل شد.
- `apps/web/lib/time.ts`: افزوده شد — `faRelativeTime`/`faDate`/`faDateTime`؛
  منطق «زمان نسبی فارسی» از `FeedCard` بیرون کشیده و در سه صفحه به اشتراک
  گذاشته شد.
- `apps/web/lib/utils.ts`: افزودن `accentColor`/`AVATAR_COLORS` برای آواتارهای
  حرف‌اول با رنگ ثابت (کاربر، دسته‌بندی)؛ `FeedCard` هم از همان استفاده می‌کند.
- `apps/web/app/pulse/page.tsx`: بازنویسی کامل — هدر چسبان با شمارش خبرها و
  چیپ‌های دسته‌بندی، جستجوی تاشو در موبایل، ردیف‌های خبر به سبک توییتر
  (انتشاردهنده · زمان نسبی · دسته · تیتر · خلاصه · «مشاهده خبر» + کپی لینک با
  Toast)، فیلترها/صفحه‌بندی/همگام‌سازی URL حفظ شد؛ ستون کناری شامل جستجو،
  «دسته‌بندی‌ها» و کادر «شهروند خبرنگار شوید».
- `apps/web/components/blog/BlogIndex.tsx`: بازنویسی به خط‌زمانی مطلب — هدر
  چسبان با چیپ دسته‌ها، مطلب شاخص پین‌شده، کارت‌های لینک مطلب با کاور
  `rounded-2xl` و اکشن‌های خواندن/بازدید/زمان مطالعه، و ستون کناری جستجو +
  دسته‌بندی‌ها + CTA فید/اخبار؛ صفحه‌بندی و جستجو/فیلتر قبلی حفظ شد.
- `apps/web/app/blog/page.tsx`: در حالت عادی دیگر `Header`/`Footer` جداگانه
  رندر نمی‌شود (پوسته‌ی توییتری جای آن‌ها را می‌گیرد)؛ صفحه‌ی «توقف موقت»
  همچنان با `Header` نمایش داده می‌شود.
- `apps/web/components/news/PulseFilters.tsx`: حذف شد (با حذف فیلتر جعبه‌ای،
  دیگر مصرفی نداشت).
- `apps/web/app/globals.css`: افزودن `.tw-rail-action`، `.tw-actions-start`،
  `.tw-more` و `.tw-media` به مجموعه‌ی استایل توییتری.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright روی `/feeds`، `/pulse` و `/blog` در ۱۴۴۰×۹۰۰ و ۳۹۰×۸۴۴: هر شش
  حالت HTTP ۲۰۰، بدون خطای JS، `scrollWidth - innerWidth = 0`؛ در دسکتاپ
  ریل ۲۷۵px + خط‌زمانی ۵۸۷px + کناری ۳۵۰px، در موبایل خط‌زمانی ۳۹۰px و فقط
  نوار پایین سایت.
- فقط یک `<header>` در هر صفحه (هدر چسبان) و هدر چسبان پس از اسکرول در
  `top: 0` باقی ماند.
- فیلترها: کلیک روی چیپ دسته در `/pulse` → `?categoryId=…` و لیست فیلتر شد؛
  جستجوی ستون کناری و جستجوی تاشوی موبایل در `/blog` (۳۹۰px) کار کرد و
  ارتفاع هدر تاشو ۱۵۹px شد؛ حالت خالی «خبری پیدا نشد» + دکمه‌ی پاک‌کردن در
  دسته‌ی بدون خبر درست نمایش داده شد.
- CTA ریل: `/feeds` دکمه‌ی «ثبت پست»، `/pulse` «درخواست شهروند خبرنگار»
  (`/login?next=/dashboard/reporter`) و `/blog` «اخبار شهر».
- تم‌ها: modern و bazaar در هر دو صفحه (چیپ فعال `#4f46e5` / `#15803d` با متن
  سفید) و حالت دارک (پس‌زمینه‌ها/متن/اکشن‌ها) بررسی شد؛ همه خوانا بودند.

## ۱۴۰۵/۰۸/۱۵ — بازطراحی صفحه‌ی `/feeds` با چیدمان توییترمانند — نسخه `v2.103.0`

**هدف:** صفحه‌ی فید عمومی به سبک توییتر/X بازطراحی شود: سه‌ستونه در دسکتاپ
(ریل ناوبری · خط‌زمانی ۶۰۰ پیکسلی · ستون کناری)، هدر چسبان با چیپ‌های موضوع،
کادر Composer، ردیف‌های تخت پست با نوار اکشن آیکونی، و در موبایل خط‌زمانی
تمام‌عرض با جستجوی تاشو در هدر (ناوبری پایین سایت حفظ می‌شود).

**تغییرات:**
- `apps/web/app/feeds/page.tsx`: بازنویسی کامل چیدمان؛ حذف هدر سایت و پوسته‌ی
  `directory-shell` در حالت عادی (هدر فقط در حالت «توقف موقت» رندر می‌شود)؛
  افزودن هدر چسبان با عنوان/شمارش، دکمه‌ی جستجوی موبایل، چیپ‌های موضوع
  (`برای شما` + موضوع‌ها) به‌عنوان فیلتر، کادر Composer، اسکلتون/خالی/پایان
  لیست به سبک توییتر؛ اسکرول به پنجره منتقل و موتور اسکرول بی‌نهایت و
  همگام‌سازی URL حفظ شد.
- `apps/web/components/feed/FeedCard.tsx`: تبدیل کارت جعبه‌ای به ردیف تخت
  توییتری (آواتار گرد، خط نویسنده با زمان نسبی فارسی، متن، شبکه‌ی تصاویر
  `rounded-2xl`، نوار اکشن آیکونی شامل پاسخ/لایک/ذخیره/کپی لینک با Toast).
- `apps/web/components/feed/FeedRail.tsx` و
  `apps/web/components/feed/FeedSidebar.tsx`: افزوده شدند — ریل ناوبری دسکتاپ
  (برند، لینک‌های اصلی با آیکون و حالت فعال، دکمه‌ی «ثبت پست»، ورود/پنل و
  کلید تم) و ستون کناری (جستجو، «موضوع‌های داغ»، CTA ثبت پست، لینک‌های
  راهنما/قوانین/پشتیبانی).
- `apps/web/components/feed/FeedSearch.tsx`: افزوده شد — فیلد جستجوی قرصی‌شکل
  با پیش‌نویس محلی، ارسال با Enter و دکمه‌ی پاک‌کردن؛ در دسکتاپ ستون کناری و
  در موبایل پنل تاشوی هدر از آن استفاده می‌کند.
- `apps/web/components/ui/LikeButton.tsx` و
  `apps/web/components/ui/SaveButton.tsx`: پراپ `variant: 'pill' | 'twitter'`
  افزوده شد؛ حالت `twitter` دکمه‌ی بی‌قاب با آیکون/شمارش و رنگ فعال قرمز
  (لایک) و کهربایی (ذخیره) است. حالت پیش‌فرض `pill` بدون تغییر ماند تا بقیه‌ی
  صفحات دست‌نخورده بمانند.
- `apps/web/app/globals.css`: افزودن بخش `Twitter/X-style public feed` با
  کلاس‌های `.tw-page/.tw-layout/.tw-rail/.tw-main/.tw-sidebar/.tw-header/
  .tw-topic-chip/.tw-composer/.tw-post/.tw-avatar/.tw-actions/.tw-action/
  .tw-search/.tw-card/.tw-trend` — همه بر پایه‌ی توکن‌های تم تا حالت‌های
  vintage/modern/bazaar و دارک بدون بازنویسی کار کنند.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright روی ۱۳ ویوپورت (۳۲۰، ۳۶۰، ۳۷۵، ۳۹۰، ۴۱۲، ۷۶۸، ۸۳۴، ۱۰۲۴، ۱۱۰۰،
  ۱۲۸۰، ۱۳۶۶، ۱۴۴۰، ۱۹۲۰): `scrollWidth - innerWidth = 0` در همه (بدون
  سرریز افقی)؛ عرض خط‌زمانی ۵۸۷–۶۰۰px، ریل ۸۸px (۱۰۲۴–۱۱۹۹) و ۲۷۵px
  (≥۱۲۰۰)، ستون کناری ۳۲۰–۳۵۰px؛ نوار پایین موبایل در همه‌ی عرض‌های <۱۰۲۴
  حاضر است.
- بررسی ابعاد در ۱۴۴۰×۹۰۰: ریل/خط‌زمانی/کناری سه ستون جدا و هدر چسبان پس از
  اسکرول در `top: 0` باقی ماند (`headerTop = 0`).
- فیلتر موضوع و جستجو: کلیک روی چیپ «اجتماعی» و جستجوی «تست» در موبایل →
  URL به `?q=…&topicId=…` به‌روز شد و لیست واقعاً فیلتر شد؛ جستجوی ستون کناری
  دسکتاپ هم نتیجه داد (۱ پست برای «ffff»).
- تم‌ها: مقدار محاسبه‌شده‌ی پس‌زمینه‌ها/رنگ متن در `modern`، `bazaar`،
  `vintage` و دارک بررسی شد (مثلاً چیپ فعال: `#4f46e5` / `#15803d` / `#8b3a1a`
  / سبز ۵۲،۲۱۱،۱۵۳) و متن چیپ فعال در همه سفید و خوانا بود.
- تنها خطای کنسول، مسدودشدن تصاویر نمونه‌ی مین‌آی‌او با CSP dev
  (`img-src … http://localhost:9010` در مقابل `http://localhost:9000`) بود که
  به این تغییر ربطی ندارد و از قبل وجود دارد.

## ۱۴۰۵/۰۸/۱۳ — صفحه‌ی خانه‌ی تک‌ویوپورتی، فوتر تک‌خطی و اصلاح دکمه‌ی جستجو — نسخه `v2.102.0`

**هدف:** صفحه‌ی خانه فقط هیرو (تیتر/شهرها/کادر جستجو/دو دکمه) و کادر «شهروند
خبرنگار شوید» باشد؛ کل صفحه در یک ویوپورت جا شود و اسکرول نخورد؛ فوتر خلوت و
تک‌خطی شود؛ «با شمالی کارت» هایلایت بگیرد و دکمه‌ی جستجو هم‌ارتفاع کادر جستجو شود.

**تغییرات:**
- `apps/web/app/page.tsx`: حذف بخش‌های «تبلیغات»، «آخرین کارت‌های ویزیت»،
  «آخرین بیولینک‌ها»، «اخبار شهر»، «بلاگ»، «چطور کار می‌کند؟» و کادرهای مربع
  راهنما؛ افزودن پوشش `home-shell` (یک ستون هم‌قد ویوپورت) با هیروی `flex-1`؛
  جمع‌کردن فاصله‌های موبایل و تمام‌عرض‌کردن کادر دعوت خبرنگار در موبایل.
- `apps/web/components/layout/Footer.tsx`: فوتر تک‌خطی و خلوت — برند، سه لینک
  زنده، کپی‌رایت و نشان نسخه؛ حذف CTA و لیست‌های تکراری.
- `apps/web/components/layout/FooterNav.tsx` و
  `apps/web/components/layout/FooterCta.tsx`: حذف شدند (دیگر استفاده نمی‌شدند).
- `apps/web/components/home/HomeHeadline.tsx`: کلاس `home-hero-prefix` روی بخش
  ثابت «با شمالی کارت».
- `apps/web/app/globals.css`: هیرو از `min-height: calc(100dvh - …)` به
  `flex: 1 0 auto` تغییر کرد (بدون بریدگی محتوا در صفحه‌های کوتاه)؛ استایل
  هایلایت «با شمالی کارت» برای هر سه تم؛ اصلاح ارتفاع دکمه‌ی جستجوی تم
  «بازارچه» با `align-self: stretch; height: auto` (قبلاً `height: calc(100% - 8px)`
  روی یک ردیف محتوا-محور حل می‌شد و دکمه ۱۶–۲۰px می‌شد).
- `apps/web/lib/nav.ts`: به‌روزرسانی توضیح (فوتر دیگر `PUBLIC_NAV` را نشان نمی‌دهد).

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- Playwright در ۱۲ ویوپورت (۱۹۲۰×۱۰۸۰، ۱۴۴۰×۹۰۰، ۱۳۶۶×۷۶۸، ۱۲۸۰×۸۰۰،
  ۱۰۲۴×۷۶۸، ۸۳۴×۱۱۱۲، ۷۶۸×۱۰۲۴، ۴۳۰×۹۳۲، ۴۱۲×۹۱۵، ۳۹۳×۸۵۲، ۳۹۰×۸۴۴،
  ۳۷۵×۸۱۲): ارتفاع سند دقیقاً برابر ارتفاع ویوپورت (بدون اسکرول عمودی)،
  `clip=false` (محتوای هیرو بریده نشده) و کادر جستجو داخل ویوپورت.
- فوتر در دسکتاپ یک خط (اختلاف عمودی چهار فرزند ≈۴px، ارتفاع ۴۸px) و بدون سرریز
  افقی؛ در موبایل دو خط خلوت.
- ارتفاع دکمه‌ی جستجو = ورودی = سلکت‌ها = ۴۸px (قبلاً در تم بازارچه ۱۶–۲۰px بود).
- هایلایت «با شمالی کارت» در سه تم بررسی شد: بازارچه (کهربایی با متن سبز تیره)،
  نوین و وینتیج (شفاف سفید با متن سفید) — همه خوانا.
- لینک‌های فوتر (`/guide`، `/rules`، `/dashboard/tickets`) → همه ۲۰۰؛ لینک‌های
  قبلی (`/privacy`، `/terms`، `/contact`) در این پروژه صفحه ندارند و ۴۰۴ می‌دادند.
- صفحات دیگر با فوتر جدید: `/blog`، `/pulse`، `/guide`، `/services`، `/rules` →
  ۲۰۰ و بدون سرریز افقی.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

**نکته‌ی باقی‌مانده (از قبل، خارج از این تغییر):** هدر دسکتاپ در عرض ۱۰۲۴px
سرریز افقی دارد (دکمه‌های اکشن بیرون از ویوپورت می‌افتند).

## ۱۴۰۵/۰۸/۱۲ — تم سوم «بازارچه» بر اساس پروژه‌ی bazarekodak — نسخه `v2.101.0`

**هدف:** ساخت تم سوم سایت با الهام از زبان بصری پروژه‌ی `~/Desktop/bazarekodak`
(جوانه‌بازار): بوم کرم با نقطه‌های ریز، سبز جنگلی/نعنایی، زرد آفتابی، کارت‌های
گرد با سایه‌ی پختی و دکمه‌های برجسته؛ با پشتیبانی روشن/تیره، موبایل و تبلت و
قابل انتخاب در «تنظیمات ← ظاهر سایت» در کنار وینتیج و نوین.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن `bazaar` به `SITE_THEMES`
  و توضیح آن در مستند کلید `siteTheme`.
- `apps/web/lib/site-theme.ts`: افزودن `bazaar` به نوع/گزینه‌ها و گارد
  `isSiteTheme`.
- `apps/web/app/layout.tsx`: `themeColor` مخصوص بازارچه (`#FFFAF0`).
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: پیش‌نمایش سوم، گرید
  سه‌ستونه در دسکتاپ و پیام موفقیت مخصوص بازارچه.
- `apps/web/app/globals.css`: `@font-face` وزیرمتن متغیر و لایه‌ی کامل تم
  «بازارچه» (توکن‌های سبز/کرم، هدر و ناوبری، فوتر جنگلی، دکمه‌های پختی، فرم‌ها،
  پنل‌های ۲۸px با سایه‌ی آفست، هیرو با نقطه‌چین و لکه‌های محو، کارت رکورد با
  سر نعنایی و خط تأکید کهربایی، کارت ویزیت، بنر تبلیغ، دفترچه تلفن، جدول‌ها و
  حالت تیره).
- `apps/web/public/fonts/Vazirmatn-Variable.woff2`: نسخه‌ی تمیز فونت متغیر
  وزیرمتن برای تم بازارچه (فایل اصلی `Vazirmatn[wght].woff2` دست‌نخورده ماند).
- `docs/API.md`: به‌روزرسانی مقادیر مجاز `siteTheme` به
  `vintage | modern | bazaar`.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- `docker exec alooshomal-api npx tsc --noEmit` → بدون خطا.
- `python3 scripts/check_api_docs.py` → همه‌ی مسیرها مستند (۲۳ کنترلر/۲۳۵ مسیر).
- سوئیچ واقعی از پنل ادمین: هر سه کاشی دیده شد، `vintage → bazaar` اعمال و
  پیام «تم بازارچه … فعال شد» نمایش داده شد؛ `data-theme="bazaar"` و
  `font-family` برابر Vazirmatn شد.
- Playwright: ۶۶ بارگذاری از صفحات عمومی (خانه، دایرکتوری‌ها، کارت ویزیت عمومی،
  بیولینک عمومی، ورود، راهنما، خدمات، نبض شهر، بلاگ، دفترچه تلفن) در عرض‌های
  ۳۹۰/۷۶۸/۱۴۴۰ و هر دو حالت، و ۱۸ بارگذاری `/dashboard`، `/dashboard/profile`
  و `/admin` → همه ۲۰۰، بدون سرریز افقی، تم و فونت درست.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۱۲ — تم نوین سراسری + سوئیچ ظاهر در پنل مدیر — نسخه `v2.100.0`

**هدف:** افزودن یک تم مدرن و استاندارد در کنار تم وینتیج فعلی، با امکان انتخاب
سراسری از «تنظیمات ← ظاهر سایت»؛ اعمال روی همه‌ی صفحات عمومی، دایرکتوری‌ها،
کارت ویزیت، بیولینک، داشبورد و پنل مدیر، با پشتیبانی کامل از حالت روشن/تیره و
نمایش موبایل و تبلت.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن ثابت‌های `SITE_THEME_KEY`،
  `SITE_THEMES` و متدهای `getSiteTheme`/`setSiteTheme` (پیش‌فرض `vintage`).
- `apps/api/src/settings/settings.controller.ts`: افزودن `siteTheme` به DTO با
  `@ApiPropertyOptional`، خروجی عمومی `GET /settings/public`، خروجی مدیر و
  `PATCH /admin/settings`.
- `apps/web/lib/site-theme.ts`: نوع/گزینه‌های تم و خواندن سروری تم با
  `revalidate` و tag.
- `apps/web/app/layout.tsx`: نوشتن `data-theme` روی `<html>` از تنظیم سراسری و
  `generateViewport` برای هم‌رنگ‌کردن نوار مرورگر.
- `apps/web/components/admin/AdminAppearanceSettings.tsx`: کارت «ظاهر سایت» با
  پیش‌نمایش دو تم و اعمال فوری.
- `apps/web/app/admin/page.tsx`: قراردادن کارت ظاهر در تب «تنظیمات».
- `apps/web/app/api/site-theme/route.ts`: پروکسی مدیر برای PATCH تم و باطل‌کردن
  کش لایه‌ی ریشه (`revalidatePath`) تا تغییر فوری دیده شود.
- `apps/web/app/globals.css`: لایه‌ی کامل تم «نوین» (توکن‌های نیلی، کارت‌های
  سفید با گوشه‌ی نرم و سایه‌ی ملایم، هدر/فوتر/ناوبری موبایل، دکمه‌ها، فرم‌ها،
  هیرو، اسلایدرها، کارت رکورد، کارت ویزیت، بنر تبلیغ، دفترچه تلفن، جدول‌ها و
  حالت تیره)؛ همه با پیشوند `html[data-theme='modern']` تا تم وینتیج دست‌نخورده
  بماند.
- `apps/web/components/layout/Header.tsx`، `apps/web/components/layout/MobileNav.tsx`
  و ۹ فایل دیگر دارای رنگ ثابت `#fbf3e9`: جایگزینی با `var(--vintage-surface)`
  تا هر دو تم پوشش بگیرند.
- `apps/web/components/ui/SocialInput.tsx`: پس‌زمینه‌ی ثابت ورودی شبکه‌های
  اجتماعی به توکن تم تبدیل شد.
- `docs/API.md`: مستندسازی `siteTheme` در قرارداد عمومی و مدیر.

**تأیید/تست:**
- `docker exec alooshomal-web npm run typecheck` → بدون خطا.
- `docker exec alooshomal-api npx tsc --noEmit` → بدون خطا.
- `python3 scripts/check_api_docs.py` → «همه‌ی مسیرها summary دارند» (۲۳ کنترلر،
  ۲۳۵ مسیر).
- سوئیچ واقعی: ورود مدیر، `PATCH /admin/settings` با `{"siteTheme":"modern"}`،
  سپس `GET /settings/public` و `GET /` هر دو `modern` را نشان دادند؛ بازگشت به
  `vintage` هم بلافاصله در رندر سروری اعمال شد (بدون رگرسیون: پس‌زمینه‌ی کرم و
  قاب‌های خط‌چین وینتیج حفظ شدند).
- Playwright با `/usr/bin/google-chrome`: ۶۰ بارگذاری از ۱۰ صفحه‌ی کلیدی در
  عرض‌های ۳۹۰/۷۶۸/۱۴۴۰ و هر دو حالت روشن/تیره → همه ۲۰۰، بدون سرریز افقی،
  `data-theme="modern"`، قاب‌های solid؛ همچنین `/dashboard`، `/dashboard/profile`
  و `/admin` در همان سه عرض و دو حالت → همه پاس.
- جابه‌جایی تم از داخل پنل ادمین با Playwright: پیام موفقیت و تغییر فوری
  `data-theme` به `modern`/`vintage` تأیید شد.
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق (`patched: 0`,
  `added: 0`).

## ۱۴۰۵/۰۸/۰۳ — دو ستونه‌کردن کاشی‌های کارت ویزیت در موبایل — نسخه `v2.99.4`

**هدف:** در `/business-cards?view=tiles` روی موبایل، کارت‌ها دقیقاً دو ستونه شوند
تا محتوای هر کارت (نام کسب‌وکار، به مدیریت، شرکت و هر دو شماره) کامل و بدون بریده‌شدن
نمایش داده شود. تبلت و دسکتاپ دست‌نخورده بمانند.

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx`: افزودن کلاس
  `directory-tiles-grid-cards` به گرید کاشی‌های کارت ویزیت (هر دو حالت اسکلتون و
  واقعی).
- `apps/web/app/globals.css`: در بلوک موبایل، گرید `directory-tiles-grid-cards`
  روی `repeat(2, minmax(0, 1fr))` قفل شد، کارت‌ها `flex`/`min-height` گرفتند و
  متن‌ها به‌جای «…» می‌شکنند (`white-space: normal` + `overflow-wrap: anywhere`)؛
  در نتیجه کاشی از `216px` پایه فقط در صورت نیاز بلندتر می‌شود و هیچ محتوایی بریده
  نمی‌شود.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.99.4`.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit --incremental false` → ۰.
- `python3 scripts/check_api_docs.py` → ۰؛ `python3 scripts/sync_install.py` و سپس
  `--check` → بدون تغییر معلق (۰).
- Playwright (Chrome سیستمی) در عرض‌های ۳۲۰/۳۶۰/۳۹۰/۴۱۴/۴۳۰/۴۸۰/۵۴۰/۶۰۰/۷۶۷:
  تعداد ستون‌ها همه‌جا دقیقاً `2` شد و شمارش عناصر بریده‌شده (name/line/phone) از
  ۳ تا ۲۵ به `0` رسید؛ هم‌ارتفاعی کارت‌های هر ردیف برقرار است و هیچ هم‌پوشانی با
  دکمه‌های اکشن وجود ندارد (کمترین فاصله ۱۲px). بدون سرریز افقی در موبایل.
- تبلت/دسکتاپ (۷۶۸/۱۲۸۰): کاشی همان `dashed` و ابعاد قبلی (`355×200` / `375×200`)؛
  کاشی‌های بیولینک هم دست‌نخورده (`168px`، دو ستون، `text-align: center`).

## ۱۴۰۵/۰۸/۰۳ — بهبود نمایش موبایل دایرکتوری بیولینک‌ها و جزئیات کارت ویزیت — نسخه `v2.99.3`

**هدف:** فقط در نسخه‌ی موبایل (≤۷۶۷px): (۱) در `/biolinks` حالت لیست حس‌وحال
بیولینک بگیرد (حاشیه از رنگ تم انتخابی، متون و ترتیب خوانا مانند کارت ویزیت)، و
حالت کاشی کاملاً شبیه بیولینک شود (متون وسط‌چین، هر اطلاعات در دکمه‌ای جدا و زیر هم
با رنگ‌بندی تم، متون بزرگ و خوانا)؛ (۲) در `/business-cards` با کلیک روی هر کارت،
ترتیب متون بالای پنل جزئیات مانند کارت شود و شماره‌ی موبایل هم نمایش داده شود.
تبلت و دسکتاپ دست‌نخورده بمانند.

**تغییرات:**
- `apps/web/components/biolink/DirectoryBiolinkItem.tsx`: کارت لیست کلاس‌های مشترک
  `directory-card*` را گرفت (ترتیب «نام کسب‌وکار → به مدیریت → شرکت»، شماره‌ها زیر
  متن در موبایل و ستون کنار در دسکتاپ)؛ رنگ تم با `--card-accent` و `data-selected`.
- `apps/web/components/biolink/DirectoryBiolinkTile.tsx`: ارسال `mobileOrder="role"`
  برای ترتیب موبایلی کاشی بیولینک.
- `apps/web/components/ui/DirectoryContactTile.tsx`: افزودن `data-kind` به رَپِر کاشی
  و کلاس `directory-tile-place` به خط مکان (برای هدف‌گیری دقیق CSS موبایلی).
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: هدر پنل جزئیات
  با کلاس‌های `dir-detail-*` و ترتیب موبایلی (نقش → نام → شرکت)؛ افزودن ردیف
  «همراه» فقط در موبایل.
- `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: افزودن کلاس
  `directory-tiles-grid-biolinks` به گرید کاشی‌ها.
- `apps/web/app/globals.css`: قواعد پایه‌ی `dir-detail-*` (ترتیب دسکتاپ و پنهان‌بودن
  ردیف موبایل) و بلوک موبایلی بیولینک‌ها (کارت لیست با حاشیه‌ی رنگی تم و حلقه‌ی
  آواتار، کاشی وسط‌چین با دکمه‌های رنگی هر فیلد، هم‌ارتفاع‌شدن کاشی‌ها در هر ردیف).
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.99.3`.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit --incremental false` → ۰.
- `python3 scripts/check_api_docs.py` → ۰؛ `python3 scripts/sync_install.py` و سپس
  `--check` → بدون تغییر معلق (۰).
- Playwright (Chrome سیستمی) در عرض‌های ۳۲۰/۳۶۰/۳۹۰/۴۱۴/۷۶۷/۷۶۸/۱۰۲۴:
  - بیولینک لیست موبایل: کارت `158px`، حاشیه‌ی `2px` از `--card-accent`، حلقه‌ی
    آواتار به رنگ تم، و ترتیب خطوط «نقش(y≈11) → نام(y≈33) → شرکت(y≈54) → شماره‌ها →
    اکشن‌ها».
  - بیولینک کاشی موبایل: `text-align: center`، دکمه‌ی هر شماره با پس‌زمینه‌ی رنگ تم و
    متن سفید، و هم‌ارتفاعی کاشی‌های هر ردیف (مثلاً `344/344` و `299/299`).
  - جزئیات کارت ویزیت موبایل: ترتیب هدر «نقش → نام → شرکت» و ردیف «همراه ۰۹۱۲…»
    نمایش داده شد؛ در تبلت/دسکتاپ ردیف «همراه» پنهان و ترتیب کلاسیک «نام → نقش →
    شرکت» دست‌نخورده ماند.
  - `document.documentElement.scrollWidth == clientWidth` در همه‌ی عرض‌های موبایل؛
    سرریز ۱۰۲۴px پیش‌از‌این هم وجود داشت (در `main` پایه بازتولید شد) و به این تغییر
    مربوط نیست.

## ۱۴۰۵/۰۸/۰۳ — بهبود نمایش دایرکتوری کارت‌های ویزیت در موبایل — نسخه `v2.99.2`

**هدف:** فقط در نسخه‌ی موبایل (≤۷۶۷px) صفحه‌ی `/business-cards` بهتر شود؛ تبلت و
دسکتاپ دست‌نخورده بمانند. خواسته‌ها: (۱) سوییچ حالت‌های نمایش کنار متن
«دایرکتوری کارت‌ها» و سمت چپ آن، (۲) در حالت لیست عکس پروفایل مربع با گوشه‌های
گرد و هم‌قد کادر با کمی فاصله، شماره‌ها بزرگ‌تر و خواناتر، ترتیب «نام کسب‌وکار →
به مدیریت → نام شرکت» و ارتفاع ثابت همه‌ی کارت‌ها، (۳) در حالت کاشی همان ترتیب،
متون بزرگ‌تر، ارتفاع ثابت و مستطیلی (بلندتر از عرض) با حاشیه‌ی رنگی ارث‌برده از تم،
و (۴) در حالت دفترچه همان ترتیب و متون بزرگ‌تر، کشیده‌شدن دفترچه تا پایین صفحه و
المان‌های تزئینی بیشتر (بانج/سوراخ و سیم دفترچه‌ای).

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx`: افزودن
  کلاس‌های `directory-head`/`directory-head-text`/`directory-head-title`/
  `directory-head-sub` به سرصفحه و `min-w-0` به ستون لیست (جلوگیری از سرریز افقی).
- `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx`: اعداد تماس به
  یک بلوک مشترک (`numbers`) تبدیل و هم در ستون کنار (دسکتاپ) و هم زیر متن (موبایل)
  رندر می‌شوند؛ نشان «تبلیغات/پله» داخل `directory-card-badge`؛ افزودن کلاس‌های
  `directory-card*` برای استایل موبایلی.
- `apps/web/components/ui/DirectoryContactTile.tsx`: پراپ `mobileOrder` و ترتیب
  موبایلی «نام کسب‌وکار → به مدیریت → شرکت» با خطوط جداگانه (`directory-tile-role`
  و `directory-tile-company`)؛ `data-kind`/`data-mobile-order` روی کارت.
- `apps/web/components/businesscard/DirectoryBusinessCardTile.tsx`: ارسال
  `mobileOrder="role"`.
- `apps/web/components/businesscard/DirectoryBusinessCardNotebook.tsx`: تفکیک
  «نقش» و «شرکت» به دو خط موبایلی (`notebook-role`/`notebook-company`) در کنار خط
  کلاسیک دسکتاپ (`notebook-meta-line`).
- `apps/web/app/globals.css`: بلوک کامل `@media (max-width: 767px)` برای دایرکتوری
  کارت‌ها (سرصفحه و سوییچ کنار هم، کارت لیست با ارتفاع ثابت و آواتار مربعِ گردگوشه،
  بزرگ‌ترشدن شماره‌ها، کاشی مستطیلی/ثابت با حاشیه‌ی رنگی تم، دفترچه‌ی کشیده‌شده تا
  پایین با سوراخ و سیم تزئینی)؛ پنهان‌سازی پیش‌فرض خطوط موبایلی در دسکتاپ.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.99.2`.

**تأیید/تست:**
- `apps/web`: `tsc --noEmit --incremental false` → خروجی ۰.
- `python3 scripts/check_api_docs.py` → ۰؛ `python3 scripts/sync_install.py` و
  سپس `--check` → بدون تغییر معلق (۰).
- Playwright (Chrome سیستمی) در عرض‌های ۳۲۰/۳۶۰/۳۹۰/۴۱۴/۷۶۷/۷۶۸/۱۰۲۴/۱۲۸۰:
  - موبایل: سوییچ در همان ردیف و سمت چپ متن (`switchX=16 < titleX=220`)، کارت‌های
    لیست هم‌ارتفاع `158px` و بدون کلیپ، آواتار مربع `136×136` با فاصله‌ی ۹px،
    ترتیب خطوط «نقش(y≈11) → نام(y≈33) → شرکت(y≈54) → شماره‌ها → اکشن‌ها» یکسان در
    همه‌ی ردیف‌ها؛ کاشی‌ها `216×133..180` (مستطیلی) با `border-style: solid` و
    `border-color` مشتق از `--tile-accent`؛ دفترچه تا پایین اسکرول‌ریجن کشیده شد
    (`paperBottom == scrollBottom`) و شبه‌عنصرهای `::before/::after` (سیم/سوراخ)
    فعال شدند.
  - `document.documentElement.scrollWidth == clientWidth` در همه‌ی عرض‌ها (بدون
    سرریز افقی) و هیچ عنصری بیرون ویوپورت نبود.
  - تبلت/دسکتاپ (۷۶۸/۱۰۲۴/۱۲۸۰): ارتفاع کارت لیست همان `138px`، آواتار `48×48`
    دایره‌ای، اعداد در ستون کنار، کاشی `375×200` با حاشیه‌ی `dashed` و خط کلاسیک
    «نقش · شرکت» — یعنی ظاهر قبلی دست‌نخورده.

## ۱۴۰۵/۰۸/۰۴ — تم دوم پیش‌فرض + فول‌اسکرین و نمایش آیکنی در موبایل/تبلت — نسخه `v2.99.1`

**هدف:** در حالت موبایل و تبلت، (۱) همیشه یک «تم دوم» پیش‌فرض برای بیولینک‌هایی که
مالک تمی انتخاب نکرده در نظر گرفته شود، (۲) حالت تم جدید (غیر از کلاسیک) کادر
بیولینک فول‌اسکرین شود، و (۳) اطلاعات الزامی و شبکه‌های اجتماعی به‌صورت آیکن نمایش
داده شوند.

**تغییرات:**
- `apps/web/lib/biolink-templates.ts`: افزودن `DEFAULT_DESIGN_KEY = 'sunny'`؛
  `biolinkViewModes` حالا همیشه دو حالت می‌دهد (کلاسیک + تم انتخابی مالک یا پیش‌فرض).
- `apps/web/components/biolink/BiolinkTemplateCard.tsx`: ردیف‌های اطلاعات با آیکن
  (`blt-row-ico`) و شبکه‌های اجتماعی به‌صورت آیکن (`blt-icon`) رندر می‌شوند.
- `apps/web/components/biolink/BiolinkTemplateStage.tsx`: انتقال `Icon` ردیف‌ها به کارت.
- `apps/web/components/biolink/PublicBiolinkView.tsx`: حالت تم جدید دیگر از
  `CardFit` استفاده نمی‌کند؛ یک ناحیه‌ی اسکرول (`.blt-page-scroll`) که در
  موبایل/تبلت فول‌اسکرین است.
- `apps/web/app/globals.css`: قواعد فول‌اسکرین `.blt-page`/`.blt-page-scroll` برای
  `max-width: 1023px`، سوییچ شناور، و استایل آیکن‌های ردیف/شبکه‌های اجتماعی.

**تأیید/تست:**
- `tsc --noEmit` وب: `TSC=0`؛ `check_api_docs.py` خروجی ۰؛ `sync_install.py --check` برابر ۰.
- Playwright: در موبایل (۳۹۰×۸۴۴) و تبلت (۸۲۰×۱۱۸۰) کادر تم جدید دقیقاً فول‌اسکرین
  (`{w:390,h:788}` و `{w:820,h:1124}`) و بدون اسکرول؛ در دسکتاپ همچنان مرکزی
  (`420×744`). نمایش آیکن شبکه‌های اجتماعی و آیکن ردیف‌ها تأیید شد.
- تم کلاسیک در موبایل بدون تغییر (کروم کامل + `record-row-icon`) باقی ماند؛ بیولینک
  بدون تم انتخابی، سوییچ دو حالته «کلاسیک/سانی ساید» را نشان داد.

## ۱۴۰۵/۰۸/۰۴ — بازطراحی «حالت نمایش» بیولینک: کلاسیک پایدار + یک طرح انتخابی — نسخه `v2.99.0`

**هدف:** صفحه‌ی بیولینک قبلاً ظاهر «رکورد» کلاسیک را داشت. کاربر خواست آن ظاهر
به‌عنوان تم شماره ۱ حفظ شود و در کنارش فقط یک تم جدید که سازنده هنگام ساخت انتخاب
می‌کند قرار بگیرد (بیولینک حداکثر دو تم)، بازدیدکننده بین همان دو سوییچ کند، حالت
کلاسیک دقیقاً همان سبک قبلی بماند، حالت جدید فقط کادر بیولینک را روی پس‌زمینه‌ی
هم‌رنگ تم نشان دهد، و انتخاب پیش‌فرض ادمین و تفکیک روشن/تاریک در فرم حذف شود.

**تغییرات:**
- `apps/web/lib/biolink-templates.ts`: افزودن تم `record` (سبک کلاسیک، همیشه فعال)،
  نگاشت کلیدهای قدیمی («classic»/«vintage»/…) به `record`، حذف مفهوم پیش‌فرض
  روشن/تاریک، و `biolinkViewModes` (حداکثر دو حالت: کلاسیک + طرح انتخابی).
- `apps/web/components/biolink/BiolinkTemplateStage.tsx`: رندر حالت کلاسیک با
  `RecordCard` و حالت طرح با `BiolinkTemplateCard`؛ استخراج هلپرهای
  `biolinkModesFor`/`initialModeFor`؛ حذف propهای پیش‌فرض/فعال ادمین.
- `apps/web/components/biolink/PublicBiolinkView.tsx`: مالکیت حالت فعال و سوییچ
  بازدیدکننده؛ در حالت طرح فقط کادر روی پس‌زمینه‌ی متناسب با پالت تم (`.blt-page`)
  و در حالت کلاسیک همان کروم کامل قبلی.
- `apps/web/app/globals.css`: استایل `.blt-page`/`.blt-page-inner`؛ حذف `.blt-stage`.
- `apps/web/components/biolink/BiolinkTemplatePicker.tsx`: انتخاب تک‌حالته (کلاسیک +
  طرح‌های فعال)، حذف دو بخش روشن/تاریک.
- `apps/web/components/biolink/BiolinkForm.tsx` و `LiveBiolinkPreview.tsx`: حذف
  `templateDark` و تفکیک دارک/لایت؛ پیش‌نمایش کلاسیک با `RecordCard`.
- `apps/web/components/admin/AdminBiolinkTemplates.tsx`: حذف انتخاب پیش‌فرض روشن/تاریک؛
  فقط فعال/غیرفعال‌سازی طرح‌ها می‌ماند.
- `apps/api/src/settings/settings.service.ts`/`settings.controller.ts`: حذف کلیدها و
  اندپوینت‌های پیش‌فرض تم؛ افزودن `LEGACY_TEMPLATE_KEYS`.
- `apps/api/src/biolinks/biolinks.service.ts` + DTOها + `apps/api/prisma/schema.prisma`:
  حذف ستون `templateDark`، پیش‌فرض `template` به `record`، و نرمال‌سازی کلیدهای قدیمی
  به `record` در `sanitizeTemplateFields`.
- `apps/web/lib/api.ts`/`use-form-autosave.ts`/صفحات `new` و `edit`/`BiolinkLiveEditor.tsx`:
  هم‌گام‌سازی با حذف `templateDark`.

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`؛ `check_api_docs.py` خروجی ۰ (۲۳ کنترلر/۲۳۵ مسیر).
- `prisma db push`: ستون `templateDark` حذف و پیش‌فرض `template` روی `record` تنظیم شد.
- Playwright: بیولینک با طرح «موج اقیانوس» → سوییچ دو حالته «کلاسیک (رکورد)/موج
  اقیانوس»؛ حالت طرح فقط `.blt-page` (بدون QR/اشتراک) و حالت کلاسیک همان
  `.card-public-share` قدیمی را نشان داد؛ مقدار قدیمی `vintage` بدون سوییچ و در سبک
  کلاسیک رندر شد. صفحه‌ی `/admin?section=settings` بدون انتخاب پیش‌فرض و صفحه‌ی
  ویرایش بدون تفکیک روشن/تاریک بارگذاری شدند.
- رکورد نمونه پس از تست به مقدار اولیه بازگردانده شد.

## ۱۴۰۵/۰۸/۰۴ — حالت‌های نمایش بیولینک (۱۴ طرح + کنترل ادمین + سوییچ بازدیدکننده) — نسخه `v2.98.0`

**هدف:** کاربر خواست صفحه‌ی بیولینک امکان انتخاب «حالت نمایش» داشته باشد: ادمین
طرح‌ها را فعال/غیرفعال کند و پیش‌فرض را تعیین کند، بازدیدکننده بتواند بین حالت‌ها
جابه‌جا شود، و کاربر هنگام ساخت هم تم روشن و هم تم تاریک خود را انتخاب کند (با
پیش‌فرض جدا برای هر تم). منبع طرح‌ها فایل ارسالی `biolinks.html` است.

**تغییرات:**
- `apps/web/lib/biolink-templates.ts` (جدید): رجیستری ۱۴ طرح (کلید ثابت، نام فارسی،
  پرچم تاریک/روشن، سواچ پیش‌نمایش) + هلپرهای `biolinkTemplate`/`enabledTemplates`.
- `apps/api/prisma/schema.prisma`: ستون جدید `Biolink.templateDark` (پیش‌فرض
  `template` به `sunny` تغییر کرد)؛ با `prisma db push` اعمال شد.
- `apps/api/src/settings/settings.service.ts`: کلیدهای تنظیمات
  `biolinkTemplatesEnabled`/`biolinkTemplateDefaultLight`/`biolinkTemplateDefaultDark`
  و رجیستری `BIOLINK_TEMPLATE_KEYS`/`BIOLINK_DARK_TEMPLATE_KEYS` + متدهای خواندن/نوشتن.
- `apps/api/src/settings/settings.controller.ts`: افزودن این تنظیمات به payload
  عمومی و ادمین و DTO/handler ویرایش.
- `apps/api/src/biolinks/biolinks.service.ts`: `sanitizeTemplateFields` برای حذف
  کلید ناشناخته و اجازه‌ی پاک‌کردن `templateDark`؛ `apps/api/src/biolinks/dto/create-biolink.dto.ts`
  و `apps/api/src/moderator/dto/moderator-content.dto.ts`: فیلد `templateDark`.
- `apps/web/components/biolink/BiolinkTemplateCard.tsx` (جدید): رندر بیولینک در یکی از
  ۱۴ طرح؛ `apps/web/app/globals.css`: بلوک‌های `.blt-*` برای هر طرح + سوییچ بازدیدکننده.
- `apps/web/components/biolink/BiolinkTemplateStage.tsx` (جدید): سوییچ زنده‌ی
  بازدیدکننده بین طرح‌های فعال (حافظه‌ی `localStorage`) و انتخاب طرح اولیه بر اساس تم
  روشن/تاریک و انتخاب مالک/پیش‌فرض ادمین.
- `apps/web/components/biolink/BiolinkTemplatePicker.tsx` (جدید): انتخاب طرح روشن و
  تاریک در فرم ساخت/ویرایش؛ `BiolinkForm`/`LiveBiolinkPreview` به آن وصل شدند.
- `apps/web/components/biolink/PublicBiolinkView.tsx` + `apps/web/app/biolinks/[slug]/page.tsx`:
  نمایش کارت طرح‌محور و خواندن تنظیمات عمومی طرح‌ها.
- `apps/web/components/admin/AdminBiolinkTemplates.tsx` (جدید): پنل ادمین برای
  فعال/غیرفعال‌کردن طرح‌ها و تعیین پیش‌فرض روشن/تاریک، متصل در `apps/web/app/admin/page.tsx`.
- `apps/web/lib/api.ts`/`use-form-autosave.ts`/صفحات `dashboard/biolinks/new` و `edit`
  و `components/admin/BiolinkLiveEditor.tsx`: هم‌گام‌سازی با `templateDark`.

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`؛ `check_api_docs.py` خروجی ۰ (۲۳ کنترلر/۲۳۵ مسیر).
- API زنده: `PATCH /admin/settings` با سه طرح فعال + پیش‌فرض‌ها ذخیره شد و
  `GET /settings/public` همان را برگرداند؛ `PATCH /biolinks/:id` کلید ناشناخته را
  دور انداخت و `templateDark` معتبر را ذخیره/پاک کرد.
- Playwright (کروم هدلس): `/biolinks/sample-full-biolink` → کارت `blt-sunny` با ۳
  چیپ سوییچ؛ کلیک روی «موج اقیانوس» → `blt-ocean`، و پس از reload همان ماند؛ در حالت
  تم تاریک (`theme=dark`) کارت پیش‌فرض ادمین `blt-ocean` نمایش داده شد.
- تنظیمات ادمین پس از تست به حالت کامل (هر ۱۴ طرح) بازگردانده شد.

## ۱۴۰۵/۰۸/۰۴ — بخش بلاگ با ویدیوی مستقیم آپارات — نسخه `v2.97.0`

**هدف:** کاربر خواست یک بخش بلاگ اختصاصی با قابلیت قراردادن ویدیوی مستقیم از
آپارات، با طراحی جذاب و کاربرپسند، اضافه شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل‌های `BlogPost` (نامک یکتا، متن، جلد، دسته،
  برچسب‌ها، ارائه‌دهنده/شناسه‌ی ویدیو، وضعیت `NewsStatus`، انتشار، شاخص، بازدید) و
  `BlogCategory`؛ relationها روی `User`. با `prisma db push` اعمال شد.
- `apps/api/src/blog/dto/blog.dto.ts` (جدید): DTOها و `normalizeAparatId` (تجزیه‌ی
  `aparat.com/v/<id>`، `?v=` یا شناسه‌ی خام) و `slugifyTitle`.
- `apps/api/src/blog/blog.service.ts` (جدید): `publicList`/`publicBySlug`/
  `publicCategories`/`publicLatest` و CRUD مدیریتی مطلب و دسته‌بندی، نامک خودکار یکتا.
- `apps/api/src/blog/blog.controller.ts` (جدید): `BlogPublicController`
  (`GET /blog/public`, `/public/latest`, `/public/categories`, `/public/:slug`) و
  `AdminBlogController` (`GET/POST/PATCH/DELETE /admin/blog...`).
- `apps/api/src/blog/blog.module.ts` (جدید) و ثبت در `app.module.ts`.
- `apps/api/src/settings/settings.service.ts`: ویژگی `featureBlog` با
  `publicSection` (مسیر `/blog`).
- `apps/web/lib/blog.ts` (جدید): `aparatEmbedUrl`/`aparatWatchUrl`/`blogAccent`/
  `blogReadMinutes`.
- `apps/web/lib/api.ts`: تایپ‌های بلاگ.
- `apps/web/components/blog/BlogVideoPlayer.tsx` (جدید): پخش‌کننده‌ی کلیک‌به‌بارگذاری
  آپارات (iframe امبد) + `AparatLink`.
- `apps/web/components/blog/BlogIndex.tsx` / `BlogPostView.tsx` / `BlogSection.tsx`
  (جدید): فهرست با جست‌وجو/دسته/صفحه‌بندی و مطلب شاخص، صفحه‌ی جزئیات با هیرو/ویدیو/
  متن، و نوار بلاگ در صفحه‌ی اصلی.
- `apps/web/app/blog/page.tsx` و `apps/web/app/blog/[slug]/page.tsx` (جدید): صفحات
  سرور با متادیتای SEO + JSON-LD + گارد بخش متوقف‌شده.
- `apps/web/components/admin/AdminBlogPanel.tsx` (جدید): CRUD مطالب، تغییر وضعیت
  انتشار، و مدیریت دسته‌بندی‌ها.
- اتصال‌ها: `apps/web/lib/nav.ts` (لینک «بلاگ»)، `apps/web/app/page.tsx`
  (`showBlog` + `<BlogSection/>`)، `apps/web/components/admin/AdminShell.tsx`
  (سکشن و آیکن)، `apps/web/app/admin/page.tsx`، و استایل `.blog-rich` در
  `apps/web/app/globals.css`.
- `apps/web/lib/site.ts`: هلپر `decodeSlugParam` و استفاده در صفحات جزئیات
  `blog`/`biolinks`/`business-cards` برای رفع باگ ۴۰۴ نامک‌های فارسی (Next گاهی
  سگمنت را از پیش percent-encoded تحویل می‌دهد و `encodeURIComponent` دوباره آن را
  کد می‌کرد).

**تأیید/تست:**
- `tsc --noEmit` وب: `TSC=0`؛ `check_api_docs.py`: خروجی ۰ (۲۳ کنترلر، ۲۳۵ مسیر).
- API زنده: ساخت مطلب آزمایشی با نامک فارسی و `videoId` آپارات → `GET /blog/public`
  داده را برگرداند؛ سپس مطلب آزمایشی حذف شد.
- Playwright (کروم هدلس): `/blog` → ۲۰۰، صفحه‌ی جزئیات `/blog/<slug>` → ۲۰۰ با
  نمایش «پخش از آپارات»، صفحه‌ی اصلی → ۲۰۰؛ پنل `/admin?section=blog` → ۲۰۰ با فرم
  و بخش دسته‌بندی‌ها. (پیش از اصلاح، جزئیات نامک فارسی ۴۰۴ می‌داد.)

## ۱۴۰۵/۰۸/۰۴ — سیستم کامنت کاربران روی پست‌های فید با تأیید مدیر — نسخه `v2.96.0`

**هدف:** کاربر خواست `/feeds` قابلیت کامنت کاربران داشته باشد و کامنت‌ها پیش از
انتشار توسط ادمین تأیید شوند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `FeedComment` (متن، نویسنده، وضعیت
  `PENDING/APPROVED/REJECTED`، علت رد، تصمیم‌گیرنده) + relationها روی `FeedPost` و
  `User`. با `prisma db push` روی دیتابیس اعمال شد.
- `apps/api/src/settings/settings.service.ts`: ویژگی جدید `featureFeedComments`
  (کلید فعال/نمایش خودکار در پنل ادمین) و دسته‌ی اعلان `FEED_COMMENT`.
- `apps/api/src/feeds/dto/feed.dto.ts`: `CreateFeedCommentDto` و
  `ListFeedCommentsQueryDto`.
- `apps/api/src/feeds/feeds.service.ts`: `listComments` (عمومی، فقط تأییدشده)،
  `listMyComments` (کامنت‌های تأییدشده + کامنت‌های در انتظار/ردشده خود کاربر)،
  `createComment` (PENDING + اعلان به ادمین و به نویسنده‌ی پست)، `removeComment`،
  `adminListComments`، `moderateComment`، `adminRemoveComment`، `commentCounts`؛
  گارد `assertFeatureEnabled('featureFeedComments')`.
- `apps/api/src/feeds/feeds.controller.ts`: مسیرهای عمومی
  `GET/POST /feeds/public/:id/comments` و `DELETE /feeds/public/comments/:id` و
  مسیرهای ادمین `GET /admin/feeds/comments`، `.../comments/stats`،
  `PATCH .../comments/:id/moderate`، `DELETE .../comments/:id`.
- `apps/web/lib/api.ts`: تایپ‌های `FeedComment`/`FeedCommentsResponse`/
  `MyFeedCommentsResponse`.
- `apps/web/components/feed/FeedComments.tsx` (جدید): بخش کامنت در صفحه‌ی پست فید؛
  فرم ثبت برای کاربر وارد‌شده، نشان «در انتظار تأیید» برای کامنت خود کاربر،
  حذف کامنت خودی، و پیام راهنما درباره‌ی تأیید مدیر.
- `apps/web/app/feeds/[id]/page.tsx`: افزودن `<FeedComments/>`.
- `apps/web/components/admin/AdminFeeds.tsx`: تب «کامنت‌ها» با صف بررسی
  (تأیید/رد با علت/حذف) و فیلتر وضعیت.
- `apps/web/components/admin/AdminNotificationSettings.tsx`: برچسب دسته‌ی
  «کامنت‌های فید».

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`؛ `check_api_docs.py` خروجی ۰ (۲۲۱ مسیر).
- API زنده: ثبت کامنت با کاربر demo → وضعیت `PENDING`؛ لیست عمومی پیش از تأیید
  خالی (`total:0`)؛ لیست ادمین `PENDING` یک مورد؛ تأیید → `APPROVED` و سپس لیست
  عمومی `total:1`.
- Playwright: در `/feeds/<id>` با کاربر وارد‌شده بخش «کامنت‌ها» و فرم ثبت دیده شد،
  ارسال کامنت پیام «پس از تأیید مدیر…» و نشان «در انتظار تأیید» را نشان داد؛ در
  `/admin?section=feeds` تب «کامنت‌ها» و دکمه‌های «تأیید و انتشار»/«رد»/«حذف»
  کار کردند. کامنت‌های تستی پس از بررسی حذف شدند.

## ۱۴۰۵/۰۸/۰۴ — تفکیک درآمد برآوردی و تراکنش‌ها بر اساس ماه/سال + شاخص‌های مدیریتی — نسخه `v2.95.0`

**هدف:** کاربر خواست در `/admin?section=revenue` دو کارت «درآمد برآوردی کل» و
«مجموع تراکنش‌های تأییدشده» بر حسب ماه و سال به تفکیک باشند، همراه با موارد
موردنیاز مدیریتی.

**تغییرات:**
- `apps/api/src/admin/admin.service.ts`: `revenueReport` بازنویسی شد؛ به‌جای
  `count` ساده، رکوردهای تأییدشده (پله، تبلیغ HOME/DIRECTORY، تگ فید با مبلغ
  واقعی، اشتراک پلن/فید) با تاریخ تصمیم/تسویه خوانده و روی تقویم شمسی در دو سری
  `monthly` (۱۲ ماه آخر) و `yearly` (همه‌ی سال‌ها، نزولی) تجمیع می‌شوند. یک بلوک
  `summary` هم اضافه شد: درآمد ماه جاری/قبل، درآمد سال جاری، میانگین ماهانه،
  تعداد درخواست‌های در انتظار (پله/تبلیغ/اشتراک) و اشتراک‌های فید فعال.
- `apps/web/components/admin/RevenueBreakdown.tsx` (جدید): کارت «تفکیک درآمد بر
  اساس ماه و سال» با دو تب «ماهانه/سالانه»، چهار کارت شاخص مدیریتی، مجموع بازه و
  جدول با نوار سهم.
- `apps/web/components/admin/AdminRevenue.tsx`: نمایش `RevenueBreakdown` و
  به‌روزرسانی نوع `RevenueReport`.
- `apps/web/lib/jalali.ts` (جدید): توابع مشترک تقویم شمسی (`fa`، `jalaliMonthName`،
  `jalaliMonthLabel`، `JALALI_MONTHS`) برای ویجت‌های ادمین.

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`.
- API زنده: `GET /admin/revenue` سری `monthly` (۱۲ ماه شمسی)، `yearly` و `summary`
  را درست برگرداند؛ مجموع ماهانه با `totalRevenue` هم‌خوان است (۱٬۴۴۰٬۰۰۰ تومان).
- Playwright روی `/admin?section=revenue`: کارت تفکیک با تب‌های «ماهانه/سالانه»
  رندر شد؛ جدول ماهانه برچسب‌های شمسی («آذر ۱٬۴۰۴»…) و سهم درصدی را نشان داد و
  تب سالانه ردیف «سال ۱٬۴۰۵» با ۱۰۰٪ را آورد.

## ۱۴۰۵/۰۸/۰۴ — اصلاح رنگ‌بندی اعلانات ادمین در حالت دارک — نسخه `v2.94.2`

**هدف:** کاربر گفت در `/admin?section=notifications` در حالت دارک، رنگ‌بندی خیلی بد
است و متن‌ها ناخوانا هستند.

**تغییرات:**
- `apps/web/components/ui/NotificationsInbox.tsx`: ردیف‌های خوانده‌نشده از رنگ‌های
  روشن `bg-sky-50/emerald-50/amber-50/red-50` استفاده می‌کردند و متن تیره/روشن
  `text-ink` روی آن‌ها ناخوانا می‌شد. برای هر تیپ، گونه‌ی `dark:` با سطح تیره‌ی
  کم‌اشباع (`bg-*-950/50`) و متن روشن (`text-*-200`) اضافه شد و ردیف‌های خوانده‌شده
  در دارک شفاف شدند.

**تأیید/تست:**
- `tsc --noEmit` وب: `TSC=0`.
- Playwright در دارک روی `/admin?section=notifications`: نسبت کنتراست متن/پس‌زمینه
  برای همه‌ی متن‌ها ≥ ۴.۵ شد (قبلاً روی ردیف‌های رنگی بسیار پایین بود) و پس‌زمینه‌ی
  ردیف‌های خوانده‌نشده تیره و متن روشن است.

## ۱۴۰۵/۰۸/۰۳ — حذف «دفترچه» از نوبار پایین در موبایل و تبلت — نسخه `v2.94.1`

**هدف:** کاربر خواست در حالت موبایل و تبلت، آیتم «دفترچه» از نوبار پایین (فوتر
موبایل) حذف شود.

**تغییرات:**
- `apps/web/components/layout/MobileNav.tsx`: حذف آیتم ناوبری
  `/business-cards?view=notebook&sort=alpha` («دفترچه») و ایمپورت بی‌استفادهٔ
  `NotebookTabs`. عرض ستون‌های نوبار به‌صورت خودکار بر اساس تعداد آیتم باقی‌مانده
  تنظیم می‌شود.

**تأیید/تست:**
- `tsc --noEmit` وب: `TSC=0`.
- Playwright در دو ویوپورت موبایل (۳۹۰×۸۴۴) و تبلت (۸۲۰×۱۱۸۰): آیتم «دفترچه»
  در نوبار پایین وجود ندارد (`دفترچه=0`) و آیتم‌های باقی‌مانده «خانه، کارت
  ویزیت‌ها، بیولینک‌ها، اخبار شهر، پست کاربران، ورود» درست چیده شده‌اند.

## ۱۴۰۵/۰۸/۰۳ — افزودن تب «۱۲ ماه / روزانه» به نمودار ثبت‌نام ادمین و اصلاح تقویم شمسی — نسخه `v2.94.0`

**هدف:** کاربر خواست کارت «آمار ثبت‌نام کاربران ← تعداد ثبت‌نام در ۱۲ ماه گذشته» در
`/admin` دو تب داشته باشد (۱۲ ماه سال / روزانه در ماه جاری) و صحت نمودار در هر دو
حالت تست شود.

**تغییرات:**
- `apps/api/src/admin/admin.service.ts`: بازنویسی `signupSeries`؛ اکنون با تقویم
  **شمسی** (`Intl` با `Asia/Tehran`) دو سری برمی‌گرداند: `monthly` (۱۲ ماه شمسی
  آخر با شماره‌ی ماه و سال شمسی) و `daily` (روزهای ماه شمسی جاری تا امروز).
  توابع کمکی `jalaliParts`/`addJalaliMonths` اضافه شد. باگ قبلی که ماه‌های میلادی را
  با نام ماه‌های شمسی برچسب می‌زد برطرف شد.
- `apps/api/src/admin/admin.controller.ts`: خروجی `GET /admin/overview` از
  `signups` به `signupSeries` تغییر کرد.
- `apps/web/components/admin/AdminOverviewWidgets.tsx`: `SignupChart` بازنویسی شد؛
  دو تب `role="tablist"`، برچسب ماه شمسی درست (نام ماه + سال هنگام تغییر سال)،
  نمایش مجموع/بیشینه، عرض میله‌ی تطبیقی برای ۳۱ روز، و `<title>` روی هر میله
  (نمایش دقیق تعداد و امکان تست خودکار).
- `apps/web/app/admin/page.tsx`: نوع `OverviewPayload` به `signupSeries` و پاس‌دادن
  `EMPTY_SIGNUP_SERIES` هنگام نبود داده.

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`؛ `check_api_docs.py` خروجی ۰.
- API زنده: `GET /admin/overview` سری `monthly` (۱۲ ماه شمسی، ۱۴۰۴/۰۹ → ۱۴۰۵/۰۸) و
  `daily` (روزهای ۱ تا ۳ آبان) را درست برگرداند.
- صحت داده با درج موقت چند کاربر آزمایشی در روزهای مختلف ماه شمسی جاری و ماه‌های
  قبل بررسی شد؛ شمارش `daily` (۱ در هر روز) و `monthly` (۹ در ماه ۷ و ۳ در ماه ۸)
  دقیقاً مطابق انتظار بود و سپس کاربران آزمایشی حذف شدند.
- Playwright روی `/admin`: تب «۱۲ ماه سال» ۱۲ میله با برچسب‌های «آذر ۴»…«آبان»
  و تب «روزانه در ماه جاری» ۳ میله با برچسب «۱،۲،۳ آبان» نمایش داد؛ جابه‌جایی بین
  تب‌ها بدون خطا کار کرد.

## ۱۴۰۵/۰۸/۰۳ — تغییر نام «نبض شهر» به «شهروند خبرنگار» و حذف دو دکمه‌ی بی‌کار ادمین — نسخه `v2.93.1`

**هدف:** کاربر خواست در بخش اخبار پنل ادمین و بنل ادمین، عنوان «نبض شهر» به
«شهروند خبرنگار» تغییر کند؛ و دو دکمه‌ی بی‌کار «دانلود گزارش» و «کاربر جدید» از
بالای صفحه‌ی `/admin` حذف شوند.

**تغییرات:**
- `apps/web/components/admin/AdminShell.tsx`: برچسب آیتم منو به «شهروند خبرنگار».
- `apps/web/app/admin/page.tsx`: عنوان بخش `news` به «شهروند خبرنگار»؛ حذف دکمه‌های
  «دانلود گزارش» و «کاربر جدید» (و ایمپورت‌های بی‌استفادهٔ `Download`/`Plus`).
- `apps/web/components/admin/AdminNewsSettings.tsx`: عنوان کارت و پیام ذخیره.
- `apps/web/components/moderator/ModeratorPanel.tsx`: برچسب دامنه‌ی خبر.
- `apps/web/components/admin/AdminPoints.tsx`: متن راهنمای امتیاز خبر.

**تأیید/تست:**
- `tsc --noEmit` وب: `TSC=0`.
- Playwright با ورود ادمین به `/admin`: دکمه‌های «دانلود گزارش» و «کاربر جدید»
  دیگر وجود ندارند؛ منو و عنوان بخش خبر «شهروند خبرنگار» را نشان می‌دهد و متن
  «نبض شهر» در پنل ادمین باقی نمانده است.

## ۱۴۰۵/۰۸/۰۳ — توقف نمایش بخش‌های عمومی از پنل ادمین + نوار هشدار سراسری — نسخه `v2.93.0`

**هدف:** کاربر خواست ادمین بتواند نمایش کارت‌ویزیت‌ها، بیولینک‌ها، پست‌های کاربران،
اخبار شهر و تبلیغات صفحه‌ی اصلی را متوقف کند؛ صفحه‌های مربوطه (`/biolinks`،
`/business-cards`، `/pulse`، `/feeds` و صفحه‌های جزئیات) «موقتاً غیرفعال» شوند،
جعبه‌ی تبلیغات صفحه‌ی اصلی پنهان شود و یک اخطار دائمی بالای هدر در همه‌ی صفحه‌ها
نمایش داده شود تا زمان عادی‌شدن. این رفتار باید برای هر ویژگی آینده‌ای که بخش
عمومی دارد خودکار باشد.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن `FeaturePublicSection` و
  `publicSection` به رجیستری `FEATURE_FLAGS` (برای چهار بخش + تبلیغات صفحه‌ی اصلی
  با `homeBox`). `getHiddenNavHrefs` بازنویسی شد و `getStoppedSections` اضافه شد؛
  `FEATURE_NAV_ITEMS` حذف و مسیرها از `publicSection` گرفته می‌شوند.
- `apps/api/src/settings/settings.controller.ts`: افزودن `stoppedSections` به
  `GET /settings/public` و `GET /admin/settings`.
- `apps/web/lib/features.ts`: افزودن `stoppedSections` و `isSectionStopped` و
  بازنویسی `showNav` تا واریانت‌های مسیر (مثل `?view=notebook`) را نیز پنهان کند.
- `apps/web/lib/sections-server.ts` (جدید): خواندن سرور-side فهرست بخش‌های متوقف.
- `apps/web/components/layout/FeatureNoticeBar.tsx` (جدید): نوار هشدار سراسری؛
  ارتفاع اندازه‌گیری‌شده را در `--feature-notice-h` می‌گذارد.
- `apps/web/components/layout/StoppedSectionScreen.tsx` (جدید): صفحه‌ی «موقتاً
  متوقف شده» با پوسته‌ی سایت.
- `apps/web/app/(biolinks|business-cards|pulse|feeds)/**` و `[slug]`/`[id]`:
  نمایش صفحه‌ی توقف به‌جای محتوا وقتی بخش متوقف است.
- `apps/web/app/page.tsx`: پنهان‌کردن اسلایدرها، دکمه‌های hero، جعبه‌ی تبلیغات و
  بخش اخبار صفحه‌ی اصلی وقتی بخش مربوطه متوقف است.
- `apps/web/components/layout/FooterCta.tsx` (جدید) و `Footer.tsx`: دکمه‌ی
  «ساخت بیولینک رایگان» هم سوئیچ نمایش را رعایت می‌کند.
- `apps/web/app/layout.tsx`، `globals.css` و هدرهای sticky (Header/UserShell/
  AdminShell/ModeratorShell/…): جای‌گیری نوار هشدار و ارتفاع دایرکتوری.
- `AGENTS.md` (قانون ۹): مستندسازی `publicSection` برای ویژگی‌های آینده.

**تأیید/تست:**
- `tsc --noEmit` وب و API: هر دو `TSC=0`.
- API زنده: با `PATCH /admin/settings` خاموش‌کردن «نمایش» چهار بخش + تبلیغات،
  `GET /settings/public` مقدار `stoppedSections` و `hiddenNavHrefs` درست برگرداند.
- Playwright: `/feeds`، `/pulse`، `/feeds/<id>`، `/pulse/<id>`، `/biolinks`،
  `/business-cards` و صفحه‌های `[slug]` صفحه‌ی توقف را نشان دادند؛ نوار هشدار در
  همه‌ی صفحه‌ها دیده شد؛ در صفحه‌ی اصلی اسلایدر/دکمه/تبلیغ/جدول خبر مربوطه حذف
  شد. پس از بازگردانی، همه‌چیز به حالت عادی برگشت و هیچ نوار هشداری نماند.
- بررسی ارتفاع: در `/business-cards` با نوار هشدار، `document.scrollHeight ==
  innerHeight` (بدون اسکرول صفحه) و `--feature-notice-h=43px` مطابق ارتفاع نوار.

## ۱۴۰۵/۰۸/۰۲ — افزودن کلید «عدم نمایش» برای هر ویژگی در پنل ادمین — نسخه `v2.92.0`

**هدف:** کاربر خواست در «تنظیمات ← ویژگی‌ها و دسترسی‌ها» برای هر ویژگی، علاوه بر
فعال/غیرفعال، گزینه‌ی «عدم نمایش» هم باشد تا وقتی ویژگی فعال است ولی مدیر نمی‌خواهد
در سایت دیده شود، رابط آن را پنهان کند؛ و این قابلیت برای هر ویژگی آینده هم خودکار
باشد.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: هر `FeatureFlag` یک کلید جفت‌شده‌ی
  `…Visible` گرفت (به‌همراه `visibleDefault`). متدهای `getFeatureVisibility`،
  `setFeatureVisibility`، `isFeatureVisible` (فعال و نمایش هر دو) و
  `getHiddenNavHrefs` افزوده شد؛ نگاشت ویژگی→آیتم ناوبری در `FEATURE_NAV_ITEMS`.
  seed خودکار برای هر دو کلید انجام می‌شود و `isFeatureVisible` برای ویژگی غیرفعال
  همیشه false برمی‌گرداند.
- `apps/api/src/settings/settings.controller.ts`: افزودن `featureVisibility` به
  `GET /admin/settings` و `GET /settings/public`، افزودن `hiddenNavHrefs` به payload
  عمومی، و پذیرش `featureVisibility` در `PATCH /admin/settings`.
- `apps/web/lib/features.ts` (فایل نو): هوک مشترک `useFeatures` (کش‌شده) با
  `isFeatureVisible` و `showNav` بر پایه‌ی payload عمومی.
- `apps/web/components/admin/AdminFeatureFlags.tsx`: هر ویژگی اکنون دو سوئیچ
  «فعال» و «نمایش» دارد (پنل خودکار از رجیستری پر می‌شود).
- `apps/web/components/layout/Header.tsx`، `MobileNav.tsx` و
  `apps/web/components/layout/FooterNav.tsx` (فایل نو; فوتر سرور-کامپوننت ماند):
  پنهان‌کردن آیتم‌های ناوبری غیرقابل‌نمایش. `MobileNav` هم‌زمان ستون‌ها را با تعداد
  آیتم‌ها هماهنگ می‌کند.
- `apps/web/components/dashboard/UserShell.tsx` و `apps/web/app/dashboard/page.tsx`:
  پنهان‌کردن آیتم‌های سایدبار و دکمه‌های «ساخت بیولینک/کارت ویزیت» وقتی ویژگی نمایش
  ندارد.
- `AGENTS.md` (قانون ۹): مستندسازی دو کلید «فعال» و «نمایش» و الزام ثبت آیتم‌های
  ناوبری در `FEATURE_NAV_ITEMS` برای هر ویژگی جدید.

**تأیید/تست:**
- تایپ‌چک API و وب → `TSC=0` هر دو؛ `check_api_docs.py` → exit 0.
- `GET /api/settings/public` → هر دو بـag `features` و `featureVisibility` (۷ کلید هر
  کدام).
- `PATCH /api/admin/settings {featureVisibility:{featureFeedPosts:false,featureNews:false}}`
  → در پاسخ و در payload عمومی منعکس شد؛ `hiddenNavHrefs` برابر `['/feeds','/pulse']`
  شد در حالی که `features.featureFeedPosts` هنوز `true` بود (یعنی فعال ولی نامرئی).
- Playwright روی `/`: هدر، فوتر و نوار موبایل هر سه لینک «پست کاربران» و «اخبار شهر»
  را حذف کردند (بقیه‌ی لینک‌ها سالم). سپس مقادیر به `true` بازگردانده شد و
  `hiddenNavHrefs` خالی شد.
- Playwright روی `/admin?section=settings`: پنل ۱۴ سوئیچ (۲ در ۷ ویژگی) با برچسب‌های
  «فعال»/«نمایش» نشان داد؛ کلیک روی «نمایش» مقدار را ذخیره کرد و پیام تأیید آمد.

## ۱۴۰۵/۰۸/۰۲ — حذف کادر جستجوی بی‌کار در هدر داشبورد و ادمین — نسخه `v2.91.2`

**هدف:** کادر «جستجو در داشبورد...» در هدر `/dashboard` و `/admin` هیچ کاری انجام
نمی‌داد (input بدون هندلر و بدون جستجوی واقعی). کاربر خواست اگر کاربردی نیست حذف شود.

**تغییرات:**
- `apps/web/components/dashboard/UserShell.tsx`: حذف کادر جستجوی بی‌کار و جایگزینی با
  یک `div` فاصله‌انداز (`flex-1`) تا اکشن‌های هدر در انتهای ردیف بمانند.
- `apps/web/components/admin/AdminShell.tsx`: همان تغییر برای هدر بنل ادمین.

**تأیید/تست:**
- تایپ‌چک وب → `TSC=0`.
- Playwright روی `/admin` و `/dashboard` با توکن ادمین: هیچ `input` با
  placeholder «جستجو در داشبورد...» نمانده؛ دکمه‌های هدر («منو»، «حالت تیره»، «اعلانات»)
  و لینک‌های «مشاهده سایت»/«دایرکتوری» سالم و چیدمان درست است. جستجوی واقعی فهرست‌ها
  از قبل داخل خود صفحات (مثل `/admin` بخش بیولینک/کارت) موجود است.

## ۱۴۰۵/۰۸/۰۲ — اصلاح دکمه‌های فرم بیولینک + ترتیب سرصفحه‌ی رکورد — نسخه `v2.91.1`

**هدف:** در صفحه‌ی ویرایش بیولینک (`/dashboard/biolinks/<id>/edit`) دکمه‌های «ذخیره
تغییرات» و «ذخیره به‌عنوان پیش‌نویس» در حالت روشن رنگ‌بندی مناسبی نداشتند (دکمه‌ی
ثانویه پس‌زمینه‌ی تقریباً هم‌رنگ پنل داشت و شبیه کادر خالی بود؛ حالت disabled هم رنگ
برند را گل‌آلود می‌کرد). همچنین سرصفحه‌ی بیولینک باید مانند کارت ویزیت به این ترتیب
خوانده شود: نام کسب‌وکار (عنوان شغل) ← «به مدیریت …» ← شرکت.

**تغییرات:**
- `apps/web/app/globals.css`: پس‌زمینه‌ی `.indeed-btn-secondary` از `#fffaf2` (هم‌رنگ
  پنل) به توکن برند `var(--indeed-blue-light)` تغییر کرد؛ حالت `:disabled` برای دکمه‌های
  اصلی/ثانویه سبک آرام و خوانا گرفت (به‌جای شفافیت گل‌آلود)؛ رنگ‌های دارک هم هم‌سو شد.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: حذف `disabled:opacity-60` تا
  استایل disabled جدید اعمال شود.
- `apps/web/components/biolink/PublicBiolinkView.tsx` و
  `apps/web/components/biolink/LiveBiolinkPreview.tsx`: سرصفحه اکنون
  headline = عنوان شغلی، subline = «به مدیریت <نام>» و شرکت به‌صورت چیپ (`companyName`)
  بعد از آن نمایش داده می‌شود.

**تأیید/تست:**
- تایپ‌چک وب → `TSC=0`.
- Playwright روی صفحه‌ی ویرایش (لایت+دارک): دکمه‌ی اصلی روشن `rgb(139,58,26)` با متن
  کرم؛ دکمه‌ی ثانویه روشن `rgb(243,227,211)` (متمایز از پنل `rgb(251,243,233)`) با متن
  `rgb(139,58,26)`؛ حالت disabled هر دو آرام و خوانا. سرصفحه: نام «مدیر محصول»، زیرنویس
  «به مدیریت سارا محمدی» و چیپ‌های «آلوشمال/تهران/فناوری اطلاعات».

## ۱۴۰۵/۰۸/۰۲ — بازطراحی تبلیغات صفحه اصلی به سبک بنر تبلیغاتی — نسخه `v2.91.0`

**هدف:** در بخش «تبلیغات» صفحه‌ی اصلی، هر کارت تبلیغ‌شده عیناً با همان قالب کامل
کارت ویزیت/رکورد نمایش داده می‌شد (سنگین و شبیه لیست). کاربر خواست به‌صورت یک بنر
تبلیغاتی و کاربرفرندلی دیده شود.

**تغییرات:**
- `apps/web/components/home/HomeAdBox.tsx`: جایگزینی `BusinessCardFace`/`RecordCard` با
  کامپوننت بنر اختصاصی `AdBanner` — نشان حامی (لوگو/تصویر و در نبود آن حرف اول)، نام،
  زیرعنوان (`سمت · شرکت`)، متن کوتاه دو‌خطی با ellipsis، چیپ‌های شهر/کسب‌وکار/تلفن و
  دکمه‌ی واضح «مشاهده»؛ کل بنر یک لینک واحد. رنگ اختصاصی صاحب کارت با `readableAccent`
  به‌عنوان اکسنت بنر (`--ad-accent`) استفاده می‌شود.
- `apps/web/app/globals.css`: افزودن سبک‌های `.ad-banner*` (بنر پهن، نوار رنگی کناری،
  برچسب «تبلیغ»، چیپ‌ها، CTA، چیدمان ریسپانسیو موبایل) و به‌روزرسانی بلوک دارک برای
  پس‌زمینه‌ی گرم تیره به‌جای قواعد قدیمی `#ads a[class*="bg-[#fbf6ea]"]`.

**تأیید/تست:**
- تایپ‌چک وب → `TSC=0`.
- Playwright روی `/` (لایت+دارک، دسکتاپ ۱۲۰۰ و موبایل ۳۹۰): بنر رندر شد؛
  لایت `bg=rgb(251,243,233)`، دارک `bg=rgb(36,20,16)`؛ حاشیه/CTA هم‌رنگ اکسنت
  `rgb(139,58,26)`؛ چیپ‌های «مشهد» و «حسابداری» و نام «مریم شریفی» درست؛ ارتفاع ۱۲۳px
  در دسکتاپ و ۱۷۶px در موبایل (بدون سرریز).
- `GET /api/ads/public/active` داده‌ی تبلیغ فعال را برگرداند و همان در بنر نمایش یافت.

## ۱۴۰۵/۰۸/۰۲ — افزودن دکمه سوییچ دارک/لایت به پنل کاربری و ادمین — نسخه `v2.90.2`

**هدف:** در `/dashboard` و `/admin` دکمه‌ی تغییر تم (دارک/لایت) وجود نداشت؛ در
حالی‌که صفحات عمومی از طریق هدر و نوار پایین این دکمه را دارند.

**تغییرات:**
- `apps/web/components/dashboard/UserShell.tsx`: افزودن `ThemeToggle` به هدر پنل
  کاربری، کنار زنگ اعلانات.
- `apps/web/components/admin/AdminShell.tsx`: افزودن `ThemeToggle` به هدر بنل ادمین،
  کنار زنگ اعلانات.

**تأیید/تست:**
- تایپ‌چک وب → `TSC=0`.
- Playwright روی `/admin` و `/dashboard` (حالت روشن): کلیک دکمه‌ی «حالت تیره» کلاس
  `dark` را روی `html` فعال کرد و `localStorage.theme` برابر `dark` شد (قبل=false،
  بعد=true). روی دسکتاپ فقط یک دکمه‌ی قابل‌مشاهده وجود دارد (دکمه‌ی دوم نوار پایین
  موبایل است که در دسکتاپ پنهان است).

## ۱۴۰۵/۰۸/۰۲ — اصلاح رنگ نوار کناری بنل ادمین در حالت دارک + اسکرول مستقل — نسخه `v2.90.1`

**هدف:** در `/admin` پنل/نوار کناری سمت راست در حالت دارک پس‌زمینه‌ی روشن (کِرِم) داشت
و رنگ‌بندی‌اش با تم هم‌خوان نبود؛ همچنین روی نمایشگرهای کم‌ارتفاع به آیتم‌های پایین
(مثل «خروج») نمی‌شد رسید.

**تغییرات:**
- `apps/web/components/admin/AdminShell.tsx`: جایگزینی رنگ ثابت `bg-[#fbf3e9]` نوار
  کناری با توکن تم `bg-[var(--vintage-surface)]` و هدر بالا با
  `bg-[color-mix(in_srgb,var(--vintage-surface)_95%,transparent)]`؛ هاور آیتم‌ها از
  `hover:bg-white` به `hover:bg-[var(--indeed-blue-light)]` تا در دارک هم درست بماند.
- `apps/web/components/admin/AdminShell.tsx`: افزودن `overflow-y-auto overscroll-contain`
  و کلاس `admin-sidebar` به `<aside>` تا فقط نوار کناری اسکرول شود و به پایین‌ترین
  آیتم‌ها دسترسی باشد.
- `apps/web/app/globals.css`: سبک `.admin-sidebar` با نوار اسکرول نازک و هم‌رنگ تم.

**تأیید/تست:**
- تایپ‌چک وب → `TSC=0`.
- Playwright (دارک، ۱۴۰۰×۹۰۰): `aside` پس‌زمینه `rgb(36,25,20)` و متن `rgb(243,230,214)`؛
  آیتم فعال `rgb(58,37,25)` با متن `rgb(224,138,92)`.
- Playwright (لایت): `aside` پس‌زمینه `rgb(251,243,233)` و متن `rgb(58,40,28)` — بدون
  تغییر نسبت به قبل.
- Playwright (دارک، ارتفاع ۵۰۰px): `overflowY=auto`، `scrollHeight=1057` در برابر
  `clientHeight=500` و پس از اسکرول، آخرین آیتم «خروج» دیده شد.

## ۱۴۰۵/۰۸/۰۲ — پنل یکتای فعال/غیرفعال‌سازی ویژگی‌ها در بنل ادمین — نسخه `v2.90.0`

**هدف:** کاربر خواست همه‌ی قابلیت‌های کاربران — فعلی و آینده — از یک بخش واحد در بنل
ادمین فعال/غیرفعال شوند (پست کاربران، اخبار، ساخت کارت ویزیت، ساخت بیولینک، درخواست
پله، درخواست تبلیغ، تبلیغ صدر دایرکتوری و هر ویژگی بعدی)، به‌جز تیکت و راه‌های تماس با
پشتیبان که همیشه فعال می‌مانند. سازوکار قبلی پراکنده بود (قفل ساخت فقط داخل «ابزار تست»).

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: رجیستری یکتای `FEATURE_FLAGS`
  (کلید/برچسب/گروه/توضیح/پیش‌فرض) + `getFeatureFlags`/`isFeatureEnabled`/
  `setFeatureFlags`/`assertFeatureEnabled`؛ seed خودکار پیش‌فرض‌ها در `ensureDefaults`.
- `apps/api/src/settings/settings.controller.ts`: افزودن `features` به `GET /settings/public`
  و `GET/PATCH /admin/settings`، افزودن `featureFlags` (رجیستری) به پاسخ ادمین برای
  ساختن پنل، و فیلد `features` در `UpdateSettingsDto`.
- `apps/api/src/feeds/feeds.service.ts`: گیت `featureFeedPosts` در `createPost`.
- `apps/api/src/news/news.service.ts`: گیت `featureNews` در `assertCanPublish`.
- `apps/api/src/boosts/boosts.service.ts`: گیت `featureBoostRequests` در `create`.
- `apps/api/src/ads/ads.service.ts`: گیت `featureAdRequests`/`featureAdDirectoryRequests`
  بر اساس `placement` در `create`.
- `apps/web/components/admin/AdminFeatureFlags.tsx` (فایل نو): پنل «ویژگی‌ها و دسترسی‌ها»
  که از رجیستری پر می‌شود؛ سوئیچ هر ویژگی با ذخیره‌ی آنی و rollback در خطا.
- `apps/web/app/admin/page.tsx`: افزودن پنل به بخش «تنظیمات» و به‌روزرسانی زیرعنوان.
- `apps/web/components/admin/AdminBulkTools.tsx`: حذف پنل تکراری «قفل ساخت» و ارجاع به
  بخش متمرکز ویژگی‌ها (کد و ایمپورت‌های بی‌استفاده پاک شد).
- `AGENTS.md`: افزودن «قانون ۹» — پس از افزودن هر ویژگی کاربری جدید، همان لحظه باید
  سوئیچ فعال/غیرفعال آن به `FEATURE_FLAGS` و پنل ادمین اضافه شود (با استثنای تیکت/پشتیبان).

**تأیید/تست:**
- `python3 scripts/check_api_docs.py` → exit 0 (۲۲ کنترلر، ۲۱۴ مسیر، همه با `@ApiOperation`).
- تایپ‌چک API و وب → `TSC=0` هر دو.
- `GET /api/settings/public` → `features` شامل هر ۷ سوئیچ.
- `GET /api/admin/settings` (با توکن ادمین) → `features` + `featureFlags` با دو گروه.
- `PATCH /api/admin/settings {features:{featureBoostRequests:false}}` → مقدار در پاسخ،
  در `/settings/public` و در پاسخ ادمین منعکس شد.
- اجرای گیت سمت سرور: `POST /api/biolinks` با قفل → ۴۰۳؛ `POST /api/boosts/request` →
  ۴۰۳؛ `POST /api/ads/request` با `placement=DIRECTORY` → ۴۰۳ و با `HOME` → رد شدن در
  مرحله‌ی هدف (یعنی گیت درست عمل می‌کند). سپس همه‌ی سوئیچ‌ها به `true` بازگردانده شدند.
- Playwright روی `/admin?section=settings`: پنل با ۷ سوئیچ دیده شد، toggle مقدار را
  ذخیره کرد و پیام «وضعیت ویژگی ذخیره شد.» نمایش داده شد؛ بخش «ابزار تست» به پنل
  متمرکز ارجاع می‌دهد.

## ۱۴۰۵/۰۸/۰۲ — هم‌سان‌سازی اطلاعات حالت «کاشی» با «دفترچه تلفن» + کارت‌های با اندازه‌ی ثابت — نسخه `v2.89.16`

**هدف:** در `/business-cards?view=tiles` و `/biolinks` حالت «کاشی» فقط نام و شرح
کوتاه را نشان می‌داد. کاربر خواست همان اطلاعات حالت دفترچه تلفن (نام، سمت · شرکت،
شهر · کسب‌وکار و «همراه + ثابت» با هم) در کاشی‌ها هم دیده شود، کاشی‌ها اندازه‌ی
ثابت داشته باشند و متن اضافه با «…» کوتاه شود.

**تغییرات:**
- `apps/web/components/ui/DirectoryContactTile.tsx` (فایل نو): کاشی ثابت و مشترک
  هر دو دایرکتوری؛ همان اطلاعات ردیف دفترچه (حرف اول نام به‌جای لوگو، سمت · شرکت،
  شهر · کسب‌وکار، شماره‌ی همراه و ثابت با برچسب)، دکمه‌های اشتراکی لایک/ذخیره،
  بج تبلیغ/پله و لینک تمام‌کاشی. همه‌ی خطوط تک‌خطی‌اند و با `text-overflow: ellipsis`
  کوتاه می‌شوند.
- `apps/web/components/businesscard/DirectoryBusinessCardTile.tsx`: استفاده از
  `DirectoryContactTile` به‌جای `BusinessCardFace` (حذف شد).
- `apps/web/components/biolink/DirectoryBiolinkTile.tsx`: استفاده از
  `DirectoryContactTile` به‌جای `RecordCard` (حذف شد).
- `apps/web/app/globals.css`: سبک‌های `.directory-tile-card` و اجزای آن
  (ارتفاع ثابت `200px`، سرصفحه‌ی حرف اول، خطوط کوتاه‌شونده، شماره‌ها و بج در جریان
  عادی). بج از حالت absolute به جریان داخل کارت منتقل شد تا با نام تداخل نکند.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: ارتفاع اسکلتون‌های
  بارگذاری به `200px` هم‌اندازه‌ی کاشی واقعی شد تا پرش چیدمان نباشد.

**تأیید/تست:**
- تایپ‌چک وب: `docker exec alooshomal-web sh -lc "cd /usr/src/app && ./node_modules/.bin/tsc --noEmit --incremental false"` → `TSC=0`.
- Playwright روی `/business-cards?view=tiles` و `/biolinks` (کلیک دکمه‌ی «کاشی»):
  هر کاشی ارتفاع دقیق `200px`، نام، خط `سمت · شرکت`، خط `شهر · کسب‌وکار` و شماره‌های
  «همراه`09121234567`» و «ثابت`02188776655`» را نشان داد؛ هیچ کاشی سرریز عمودی
  (`scrollHeight > clientHeight`) نداشت.

## ۱۴۰۵/۰۸/۰۲ — حفظ لایک/ذخیره هنگام جابه‌جایی بین حالت‌های نمایش دایرکتوری — نسخه `v2.89.15`

**هدف:** رفع باگ گزارش‌شده: در `/business-cards?card=...` (و مشابهش در بیولینک‌ها)
پس از لایک یا ذخیره، با جابه‌جایی بین حالت‌های نمایش (لیست/کاشی/دفترچه) وضعیت
لایک/ذخیره «حذف» می‌شد و فقط با رفرش کامل برمی‌گشت.

**ریشه‌ی مشکل:** `LikeButton`/`SaveButton` وضعیت را داخلی نگه می‌داشتند و آن را از
propهای همان ردیف seed می‌کردند. با سوییچ نما، ردیف‌ها unmount/remount می‌شدند و از
propهای کهنه‌ی SSR (`liked:false`) دوباره پر می‌شدند؛ به‌علاوه دو منبع prop با تازگی
متفاوت (snapshot سرور + re-fetch سمت کلاینت صفحه‌ی ۱) می‌توانستند مقدار تازه را
پاک کنند.

**تغییرات:**
- `apps/web/lib/interactions.ts` (فایل نو): استور zustand مشترک برای وضعیت
  لایک/ذخیره به‌کلید `kind:slug`، بیرون از React. هر نما همان مقدار را می‌خواند، پس
  toggle از سوییچ نما جان سالم به‌در می‌برد. پس از اولین toggle، مقدار محلی برای
  بقیه‌ی نشست معتبر است (`dirty`) و propهای کهنه آن را بازنویسی نمی‌کنند؛ رفرش کامل
  استور را ریست و حقیقت پایدارشده را دوباره می‌خواند.
- `apps/web/components/ui/LikeButton.tsx` و `.../SaveButton.tsx`: وضعیت محلی
  (`useState`) با استور مشترک جایگزین شد (خواندن از استور + `syncFromProps` +
  `apply`)، و منطق reconcile/optimistic/rollback روی همان استور نوشته می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v2.89.15`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright (کاربر دمو) روی `/business-cards` و `/biolinks`: پس از لایک+ذخیره، در
  هر سه حالت (لیست/کاشی/دفترچه) و در بازگشت به لیست، دکمه‌ها وضعیت درست را نشان
  می‌دهند و تعداد لایک هم‌خوان می‌ماند؛ رفرش کامل نیز مقدار پایدارشده را حفظ می‌کند.
- سناریوی دقیق گزارش (`/business-cards?card=sample-full-card`): پس از لایک، در
  کاشی و دفترچه «برداشتن لایک» باقی می‌ماند (قبلاً به «لایک» برمی‌گشت).
- `python3 scripts/sync_install.py`/`--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — حذف دکمه‌ی «دفترچه تلفن» از هدر — نسخه `v2.89.14`

**هدف:** به‌درخواست کاربر، گزینه‌ی «دفترچه تلفن» از نوار ناوبری هدر حذف شود
(این نما حالا از سوییچ نمایش صفحه‌ی کارت‌ویزیت و از فوتر در دسترس است).

**تغییرات:**
- `apps/web/lib/nav.ts`: `PUBLIC_NAV` دست‌نخورده ماند (فوتر و مبنای اشتراک)، اما
  `HEADER_NAV` اضافه شد که همان فهرست منهای آیتم «دفترچه تلفن» است، به‌همراه
  ثابت `NOTEBOOK_NAV_HREF` برای نگه‌داشتن یک منبع حقیقت.
- `apps/web/components/layout/Header.tsx`: از `HEADER_NAV` استفاده می‌کند.
- `apps/web/lib/version.ts`: نسخه به `v2.89.14`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright روی `/`: لینک‌های هدر ⇒ `["لیست کارت ویزیت‌ها","لیست بیولینک‌ها",
  "پست کاربران","اخبار شهر","لیست خدمات","راهنما","قوانین"]` (بدون «دفترچه تلفن»)؛
  فوتر همچنان شامل «دفترچه تلفن» است.
- `python3 scripts/sync_install.py`/`--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — مرتب‌سازی بک‌لاگ و افزودن فهرست وضعیت — نسخه `v2.89.13`

**هدف:** مرتب‌کردن `BACKLOG.md` پس از بستن چند بند در همین نشست، تا وضعیت‌ها
یک‌دست و قابل‌مرور باشند (به‌درخواست کاربر: «همه انجام بده و مرتب کن»).

**تغییرات:**
- `BACKLOG.md`: یک بخش «فهرست وضعیت (سریع)» در بالای فایل اضافه شد که بندهای
  «انجام‌شده» و «معوق» را یک‌جا فهرست می‌کند؛ جداکننده‌ی `---` بین همه‌ی ورودی‌ها
  یکدست شد و فاصله‌های خالی نرمال شدند.
- `apps/web/lib/version.ts`: نسخه به `v2.89.13`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- بررسی اسکریپتی ساختار `BACKLOG.md`: همه‌ی ۱۲ ورودی «وضعیت» جداکننده‌ی معتبر
  دارند و فهرست وضعیت در ابتدای فایل قرار گرفته است.
- `python3 scripts/sync_install.py`/`--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — کاهش قطعی ۵۰۲ هنگام دیپلوی با healthcheck و resolver سریع — نسخه `v2.89.12`

**هدف:** بستن بند «رفع قطعی کوتاه (۵۰۲) در زمان دیپلوی» در `BACKLOG.md`: پس از هر
دیپلوی، بین استارت کانتینر و آماده‌شدن سرویس، درخواست‌های ورودی موقتاً `502` می‌گرفتند.

**تغییرات:**
- `docker-compose.prod.yml`: برای `api` یک `healthcheck` بر پایه‌ی `GET /api/health`
  (که اتصال DB را هم اثبات می‌کند) و برای `web` یک `healthcheck` بر پایه‌ی
  `/robots.txt` اضافه شد؛ `depends_on` سرویس `nginx` به
  `condition: service_healthy` برای هر دو تغییر کرد تا nginx تا سبز شدن آن‌ها
  پراکسی نکند.
- `deploy/nginx/conf.d/00-alooshomal-http.conf`: کش DNS داخلی از `valid=10s` به
  `valid=2s` کاهش یافت تا nginx پس از ساخت مجدد کانتینرها سریع‌تر IP تازه را
  بردارد و به آدرس مرده پراکسی نکند.
- `.github/workflows/deploy.yml`: پس از `up -d`، حلقه‌ای منتظر `healthy` شدن
  `api`/`web` می‌ماند و در صورت اتمام مهلت، دیپلوی را ناموفق اعلام می‌کند (به‌جای
  سبز شدن کاذب در حالی که سایت هنوز ۵۰۲ می‌دهد).
- `docs/DEPLOY.md`: توضیح کوتاه این بهبود اضافه شد. `apps/web/lib/version.ts`:
  نسخه به `v2.89.12`. `install.sh`: همگام‌سازی. `BACKLOG.md`: وضعیت بند → «انجام‌شده».

**تأیید/تست:**
- `docker compose -f docker-compose.prod.yml config -q` → بدون خطا (سینتکس و
  ارجاعات `depends_on` معتبر).
- `nginx -t` داخل ایمیج `nginx:1.27-alpine` با mount همین `conf.d` → موفق.
- صحت خود healthcheckها روی کانتینرهای زنده: `wget` در هر دو ایمیج موجود است و
  `GET /api/health` و `/robots.txt` پاسخ ۲۰۰ می‌دهند.
- سینتکس YAML ورک‌فلوی `deploy.yml` با `yaml.safe_load` → بدون خطا.
- `python3 scripts/sync_install.py`/`--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — حذف CSS بی‌استفاده‌ی تم‌های بیولینک/کارت‌ویزیت (بند بک‌لاگ) — نسخه `v2.89.11`

**هدف:** بستن بند «پاک‌سازی CSS بی‌استفاده‌ی تم‌های بیولینک/کارت‌ویزیت» در
`BACKLOG.md`: پس از حذف `ThemedBiolink`/`ThemedBusinessCard` (نسخه‌ی `v2.87.0`)،
دیگر هیچ کامپوننتی کلاس‌های `.theme-*` و `.bc-*`/`.bc-theme-*`/`.bcard-theme`/
`.biolink-theme` را رندر نمی‌کرد، اما حدود ۱۳۰۰ خط CSS مرتبط در
`apps/web/app/globals.css` باقی مانده بود.

**تغییرات:**
- `apps/web/app/globals.css`: تمام قواعد مرده‌ی تم‌های قدیمی حذف شد (۲۰۲ قاعده،
  حدود ۱۳۵۹ خط؛ فایل از ۳۹۰۰ به ~۲۰۴۰ خط رسید). قاعده‌های ترکیبی به‌صورت دقیق
  هرس شدند (`.directory-tile .bc-card/.theme-body` حذف و `.directory-tile
  .bizcard` نگه داشته شد؛ `.biolink-theme` از قاعده‌ی
  `data-fill` حذف شد). ارجاع‌های مرده به متغیرهای `--bc-*`/`--biolink-*`
  (`inline-edit`, مکانیزم اسکرول‌بار) به توکن‌های زنده‌ی `--vintage-*` تغییر کرد.
- `apps/web/lib/themes.ts`: کامنت‌های راهنما که به بلوک‌های `.theme-<key>`/
  `.bc-theme-<key>` در `globals.css` اشاره می‌کردند به‌روز شد؛ کلیدها برای
  رکوردهای موجود حفظ شده و رندر از طریق `RecordCard`/`BusinessCardFace` است.
- `apps/web/lib/version.ts`: نسخه به `v2.89.11`. `install.sh`: همگام‌سازی.
- `BACKLOG.md`: وضعیت بند مرتبط به «انجام‌شده» تغییر کرد.

**تأیید/تست:**
- اسکن runtime با Playwright روی ۱۹ مسیر (عمومی + پنل + جزئیات + سازنده) در هر
  دو تم: هیچ کلاس `theme-*`/`bc-*`/`bc-theme-*`/`bcard-theme`/`biolink-theme`
  روی هیچ عنصری رندر نمی‌شود (خروجی `[]`).
- `postcss.parse('app/globals.css')` → بدون خطا (براکت‌ها متوازن، کامنت‌ها سالم).
- تطابق بصری قبل/بعد: پس‌زمینه‌ی body، رنگ دکمه‌ی اصلی و کارت‌های `record-card`
  در ۸ مسیر و هر دو تم یکسان ماند؛ صفحه‌ی بیولینک/کارت‌ویزیت و حالت
  `view=tiles` سالم (`cursor: pointer`، `pointer-events: none` روی کارت داخلی).
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0؛
  بیلد پروداکشن `npm run build` → موفق (exit 0).
- `python3 scripts/check_api_docs.py` → exit 0؛ `sync_install.py`/`--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — یکسان‌سازی بلوک‌های تکراری حالت تیره در `globals.css` (پاک‌سازی قانون ۶/بک‌لاگ) — نسخه `v2.89.10`

**هدف:** رفع ریشه‌ی ناهماهنگی رنگ‌ها در حالت تیره که کاربر درباره‌ی آن پرسیده بود:
بلوک‌های حالت تیره در `globals.css` چهار بار به‌صورت کامل و تکراری کپی شده بودند
(متغیرها + «Dark fixes round 2/3/4») و شش نسخه‌ی `@custom-variant dark` وجود داشت.
این تکرار هم نگه‌داشت‌پذیری را خراب می‌کرد و هم باعث می‌شد برخی رفع‌ها فقط در برخی
کپی‌ها اعمال شوند؛ به همین دلیل رنگ‌ها در صفحه‌های مختلف ناهمخوان به نظر می‌رسید.

**تغییرات:**
- `apps/web/app/globals.css`: چهار کپی تکراری بلوک حالت تیره با **یک نسخه‌ی
  کانونی** جایگزین شد؛ شش `@custom-variant dark` به **یک مورد** در کنار
  `@import 'tailwindcss'` کاهش یافت؛ همه‌ی قواعد (متغیرها، فرم/دکمه‌ها، فوتر،
  جعبه‌ی تبلیغ، نوار پایین موبایل، تگ تیره‌ی دفترچه تلفن) بدون تغییر نگه داشته
  و در یک `html.dark` و بلوک‌های دنباله‌اش تجمیع شدند. خروجی بصری دست‌نخورده
  ماند ولی ۳۸۱ خط CSS تکراری حذف شد (۷۳+/۳۸۱−).
- `apps/web/lib/version.ts`: نسخه به `v2.89.10`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- بیلد پروداکشن (`npm run build` در کانتینر `alooshomal-web`) → موفق (exit 0).
- Playwright روی `/`، `/business-cards`، `/business-cards?sort=alpha&view=notebook`،
  `/biolinks`، `/pulse`، `/feeds` و `/dashboard/feeds` در هر دو تم: پس‌زمینه‌ی
  body و دکمه‌ی اصلی **کاملاً یکسان با قبل از تغییر** (روشن `rgb(242,232,217)` و
  دکمه `rgb(139,58,26)`؛ تیره `rgb(26,18,13)` و دکمه `rgb(154,74,34)`)؛ فوتر
  `rgb(74,36,20)` با گرادیان، هیرو `rgb(42,26,18)`، نوار پایین موبایل
  `rgba(26,18,13,0.95)`، رنگ متن ورودی‌ها `rgb(243,230,214)` و دفترچه‌ی تیره
  `rgb(36,25,20)` — همه بدون خطای صفحه.
- `python3 scripts/sync_install.py` و `--check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — بازطراحی پنل «پست‌های من» و نمایش کامل‌تر تگ پست — نسخه `v2.89.9`

**هدف:** مطابق درخواست کاربر در `/dashboard/feeds`: تغییر نام «فید من» به
«پست‌های من»، حذف بخش اشتراک فید (اختیاری) و دو کادر درخواست اشتراک، حذف متن
«اشتراک فید اختیاری است…»، رفع ناخوانایی متن کادر «پست جدید» در حالت تیره
(در کامیت `39fa840` رفع شد) و نمایش تگ پست به‌صورت کادر کامل با جزئیات بیشتر.

**تغییرات:**
- `apps/web/app/dashboard/feeds/page.tsx`: عنوان به «پست‌های من» تغییر کرد؛ بخش
  «اشتراک فید (اختیاری)» و دو کادر درخواست اشتراک و متن مربوط به اشتراک حذف
  شدند؛ کد بی‌استفاده (`requestPackage`، `FeedPackage`، `Crown`، `active`،
  `pendingSub`) پاک شد؛ و تگ تأییدشده‌ی هر پست در فهرست، با کامپوننت کامل تگ
  نمایش داده می‌شود.
- `apps/web/components/feed/FeedTagCard.tsx` (فایل نو): کادر مشترک تگ پست با
  آواتار/حرف اول، نوع (بیولینک/کارت ویزیت)، عنوان شغلی، شرکت/کسب‌وکار، شهر و
  بیو — یک کامپوننت واحد برای همه‌ی نقاط نمایش تگ.
- `apps/web/app/feeds/[id]/page.tsx` و `apps/web/components/feed/FeedCard.tsx`:
  تگ یک‌خطی با کادر کامل `FeedTagCard` جایگزین شد.
- `apps/api/src/feeds/feeds.service.ts`: `feedTagInclude` و `projectFeedTag`
  گسترش یافت تا `jobTitle`, `bio`, `avatarUrl`, `cityName` و `businessName` نیز
  در پاسخ تگ بیایند (با تایپ `FeedTagTarget`).
- `apps/web/lib/api.ts`: فیلدهای اختیاری جدید به `FeedTag` اضافه شد.
- `apps/web/components/dashboard/UserShell.tsx` و `apps/web/app/guide/page.tsx`:
  برچسب منو/راهنما از «فید من» به «پست‌های من» تغییر کرد.
- `apps/web/lib/version.ts`: نسخه به `v2.89.9`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json` → exit 0.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `python3 scripts/check_api_docs.py` → بدون خطا.
- Playwright روی `/dashboard/feeds` (کاربر دمو، هر دو تم): عنوان «پست‌های من»،
  عدم وجود متن/بخش اشتراک، و رنگ متن کادر پست در تیره `rgb(243,230,214)`.
- `GET /feeds/public` فیلدهای غنی تگ را برگرداند؛ Playwright روی `/feeds` و
  `/feeds/<id>` کادر تگ کامل («بیولینک معرفی‌شده · مدیر شبکه · شرکت … · شهر …»)
  را رندر کرد.

## ۱۴۰۵/۰۸/۰۲ — اصلاح چیدمان کادر جستجو و دکمه‌های صفحه‌ی اخبار — نسخه `v2.89.8`

**هدف:** در `/pulse` کادر جستجو/دسته‌بندی و دکمه‌های «جستجو» و «پاک‌کردن» از
نظر ابعاد و فاصله نامرتب بودند (به‌ویژه در موبایل دکمه‌ها به‌شکل نامتناسبی
کشیده می‌شدند).

**تغییرات:**
- `apps/web/components/news/PulseFilters.tsx`: چیدمان به الگوی اثبات‌شده‌ی
  فیلترهای دایرکتوری یکسان شد — در دسکتاپ یک ردیف (`md:flex-row`) و در موبایل
  سه ردیف تمام‌عرض (`flex-col`)، ارتفاع همه‌ی اجزا `h-12`، جستجو/دسته‌بندی با
  جداکننده‌ی درست، و دکمه‌ها در یک گروه تراز با `rounded-none` (بدون شکاف).
- `apps/web/lib/version.ts`: نسخه به `v2.89.8`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright روی `/pulse`: در عرض ۱۴۴۰ کل فرم یک ردیف ۵۰px با سه ستون
  (۷۶۹/۲۰۸/۱۸۹px) و دکمه‌های ۴۸px؛ در عرض ۳۹۰ سه ردیف تمام‌عرض ۳۵۶px با
  دکمه‌های مساوی ۱۷۸px و بدون سرریز افقی.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — رفع همپوشانی نشان «پله/تبلیغات» با شماره‌ها در حالت لیست — نسخه `v2.89.7`

**هدف:** در حالت لیست `/business-cards` و `/biolinks`، آیکن/نشان «پله» یا
«تبلیغات» روی شماره‌های تماس (لبه‌ی چپ ردیف) می‌افتاد و جای‌گذاری‌اش خراب بود.

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkItem.tsx`: نشان از حالت
  `absolute end-3 top-3` (لبه‌ی چپ ردیف، دقیقاً روی ستون شماره‌ها) به حالت
  درون‌خطی بالای نام (`mb-1` در ابتدای ستون اطلاعات) تغییر کرد، پس هیچ‌گاه با
  شماره‌ها تلاقی نمی‌کند.
- `apps/web/lib/version.ts`: نسخه به `v2.89.7`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright روی `/business-cards?view=list`: تعداد نشان‌های absolute در ردیف
  صفر شد؛ ستون نام `[696..1216]` و ستون شماره‌ها `[590..684]` بدون همپوشانی،
  و نشان اکنون فرزندِ جریان عادی ستون اطلاعات است.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — یکسان‌سازی دکمه‌ی «جستجو»ی دایرکتوری‌ها با کامپوننت مشترک (رفع رنگ در حالت تیره) — نسخه `v2.89.6`

**هدف:** دکمه‌ی «جستجو» در `/business-cards` و `/biolinks` (و حالت دفترچه) در
حالت تیره رنگ متناسبی نداشت؛ چون این دو صفحه از کلاس‌های یوتیلیتی
`bg-brand text-white` استفاده می‌کردند (بدون قاعده‌ی دارک)، ولی `/pulse` از
کامپوننت مشترک `.indeed-btn.indeed-btn-primary` (با قاعده‌ی دارک) بهره می‌برد.

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardFilters.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkFilters.tsx`: دکمه‌ی جستجو به
  `indeed-btn indeed-btn-primary h-12 rounded-none` تغییر کرد تا از همان استایل
  مشترک و قاعده‌ی تیره‌ی `html.dark button[type="submit"].indeed-btn-primary`
  استفاده کند (الگوی `/pulse`).
- `apps/web/app/globals.css`: سوییچ نمایش دایرکتوری
  (`.directory-view-switch`) از متغیرهای بی‌تعریف `--ink-soft`/`--brand` و
  پس‌زمینه‌ی سفیدِ هارد‌کد به توکن‌های واقعی تم
  (`--vintage-ink-soft`/`--vintage-accent`/`--vintage-surface`) تغییر کرد.
- `apps/web/lib/version.ts`: نسخه به `v2.89.6`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright در حالت تیره روی `/business-cards?view=list`، `/biolinks`،
  `/business-cards?sort=alpha&view=notebook` و `/pulse`: هر چهار دکمه‌ی جستجو
  اکنون یکسان‌اند — پس‌زمینه‌ی `rgb(154,74,34)` با متن `rgb(255,243,230)`
  (کنتراست ۵٫۷:۱) و ارتفاع ۴۸px.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — رفع متغیرهای CSS تعریف‌نشده (ناخوانایی متن در حالت تیره) — نسخه `v2.89.5`

**هدف:** ناخوانایی متن‌ها در حالت تیره (مثلاً متن کادر «پست جدید» در
`/dashboard/feeds` و سوییچ نمایش دایرکتوری) ریشه‌یابی و رفع شود.

**تغییرات:**
- `apps/web/app/globals.css`: چند قاعده از متغیرهای **تعریف‌نشده‌ی** `--ink`،
  `--muted` و `--ink-soft` با fallback روشن استفاده می‌کردند؛ چون این متغیرها هرگز
  تعریف نشده‌اند، مقدار روشنِ fallback در حالت تیره هم باقی می‌ماند و متن روی
  پس‌زمینه‌ی تیره ناخوانا می‌شد (کنتراست ۱٫۲:۱ در `.rich-editor-surface`).
  جایگزینی با توکن‌های واقعی تم: `--vintage-ink` / `--vintage-ink-soft` در
  `.rich-editor-surface`، `.rich-editor-surface::before`، `blockquote`،
  `.feed-rich` و `.dash-table td[data-label]::before`. همچنین
  `.directory-view-switch` از `--ink-soft`/`--brand` (بی‌تعریف) و پس‌زمینه‌ی
  سفیدِ هارد‌کد به `--vintage-ink-soft`/`--vintage-accent`/`--vintage-surface`
  تغییر کرد تا در حالت تیره هم درست بخواند.
- `apps/web/lib/version.ts`: نسخه به `v2.89.5`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright روی `/dashboard/feeds` (ورود با کاربر دمو): رنگ متن
  `.rich-editor-surface` در حالت تیره `rgb(243,230,214)` روی پس‌زمینه‌ی تیره
  (کنتراست ۱۳٫۹:۱؛ پیش‌تر ۱٫۲:۱) و در حالت روشن `rgb(58,40,28)`.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — بازطراحی کادر تبلیغات صفحه‌ی اصلی با کارت ویزیت واقعی — نسخه `v2.89.4`

**هدف:** پایان‌دادن و کامیت‌کردن تغییر معلق `HomeAdBox` که از پیش در درخت کار
باقی مانده بود: کادر «تبلیغات» صفحه‌ی اصلی به‌جای کارت سفارشی قبلی، از همان
کامپوننت‌های کارت ویزیت/رکورد خودِ سایت استفاده کند و در هر دو تم سالم باشد.

**تغییرات:**
- `apps/web/components/home/HomeAdBox.tsx`: هر آگهی با `RecordCard`
  (برای بیولینک) یا `BusinessCardFace` (برای کارت ویزیت) رندر می‌شود —
  دقیقاً همان نمایشی که در صفحات عمومی سایت استفاده می‌شود؛ شهر و تلفن همراه
  به‌صورت ردیف‌های برچسب‌دار اضافه شدند و دکمه‌ی «مشاهده» به سبک دکمه‌های سایت
  درآمد. کلاس بی‌تعریف `neon-btn` (که هیچ CSS‌ای نداشت و دکمه را بی‌استایل
  می‌گذاشت) حذف شد.
- `apps/web/lib/version.ts`: نسخه به `v2.89.4`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright روی `/` در هر دو تم: کادر `#ads` با کارت واقعی
  (`.record-card`) رندر شد؛ در حالت روشن پس‌زمینه‌ی کارت روشن با متن تیره و در
  حالت تیره پس‌زمینه‌ی تیره با متن روشن (`rgb(243,230,214)`) — هیچ عنصر
  `.neon-btn` باقی نمانده. بدون خطای کنسول.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — محدودکردن حالت «دفترچه» به دایرکتوری کارت ویزیت‌ها — نسخه `v2.89.3`

**هدف:** حالت نمایش «دفترچه» فقط برای کارت ویزیت‌ها معنا دارد؛ چون سلیقه‌ی نمایش
در `localStorage` مشترک است، اگر کاربر حالت دفترچه را در `/business-cards`
انتخاب می‌کرد و سپس به `/biolinks` می‌رفت، سوئیچ آن صفحه ناسازگار می‌شد.

**تغییرات:**
- `apps/web/lib/directory-view.ts`: `useDirectoryView` اکنون `{ preferred, allowed }`
  می‌گیرد و فقط مقادیر مجاز را می‌پذیرد؛ ثابت‌های `DIRECTORY_VIEWS_ALL` و
  `DIRECTORY_VIEWS_NO_NOTEBOOK` اضافه شد.
- `apps/web/components/ui/DirectoryViewSwitch.tsx`: پراپ `views` اضافه شد تا
  دکمه‌ها بر اساس حالت‌های مجاز رندر شوند.
- `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: با
  `DIRECTORY_VIEWS_NO_NOTEBOOK` و نوع `sort` گسترش‌یافته صدا زده می‌شود.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx`:
  فراخوانی hook به شکل شیئی جدید به‌روزرسانی شد.
- `apps/web/lib/version.ts`: نسخه به `v2.89.3`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright: پس از بازدید `/business-cards?view=notebook` (ثبت در
  `localStorage`) و رفتن به `/biolinks`، سوئیچ فقط «لیست/کاشی» نشان داد و حالت
  فعال «لیست» بود؛ `.notebook-scroll` صفر و `.directory-list` یک بار رندر شد.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — اصلاح رنگ‌بندی منوی پنل کاربری در حالت تیره — نسخه `v2.89.2`

**هدف:** در `/dashboard` و حالت **تیره**، منوی کناری پنل کاربری رنگ‌بندی
نامناسبی داشت (پس‌زمینه و آیتم‌ها با رنگ‌های روشنِ هارد‌کد‌شده روی تم تیره قرار
می‌گرفتند).

**تغییرات:**
- `apps/web/components/dashboard/UserShell.tsx`: رنگ‌های هارد‌کد روشن
  (`bg-[#fbf3e9]`، `bg-white`) با توکن‌های تم (`var(--vintage-surface)`،
  `var(--vintage-paper)`) جایگزین شد — نوار کناری، هدر چسبان، فیلد جستجو و حالت
  hover آیتم‌ها. همچنین رفع ریشه‌ای رنگ آیکن/متن منو در کامیت قبلی
  (`a` داخل `@layer base`) اعمال شده بود.
- `apps/web/lib/version.ts`: نسخه به `v2.89.2`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright با ورود `demo@alooshomal.local` و `theme=dark` روی `/dashboard`:
  پس‌زمینه‌ی کناری `rgb(36,25,20)`، آیتم فعال `rgb(58,37,25)` با متن
  `rgb(224,138,92)`، آیتم غیرفعال `rgb(205,184,163)`، هدر `rgba(26,18,13,.95)`،
  جستجو `rgb(26,18,13)` — همه هم‌رنگ توکن‌های تیره. بدون خطای کنسول.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — نیم‌کردن ارتفاع فوتر + رفع ناخوانایی دکمه در حالت روشن — نسخه `v2.89.1`

**هدف:** ارتفاع فوتر به نصف کاهش یابد و متن دکمه‌ی «ساخت بیولینک رایگان» در
حالت **روشن** خوانا شود (پیش‌تر سفید روی سفید بود و دیده نمی‌شد).

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: پدینگ‌ها و فاصله‌های عمودی
  (`py-14/16`→`py-5/6`، `pb-10`→`pb-4`، `py-10`→`py-3`، `pt-6`→`pt-3`، حاشیه‌ی
  بالای فوتر `mt-16/24`→`mt-8/12`) و ستون لینک‌ها دوستونه شد؛ ارتفاع کل از
  ~۷۳۱px به ~۳۷۷px رسید (≈نصف).
- `apps/web/app/globals.css`: قاعده‌ی سراسری `a { color: inherit }` به
  `@layer base` منتقل شد. این قاعده‌ی بی‌لایه بر همه‌ی یوتیلیتی‌های لایه‌ای
  Tailwind (مثل `text-brand`) اولویت داشت و باعث می‌شد متن دکمه‌ی فوتر سفید
  (هم‌رنگ فوتر) شود و روی قرص سفید خودش ناپدید شود؛ همچنین رنگ‌بندی منوی
  داشبورد را خراب می‌کرد. در لایه‌ی base، یوتیلیتی‌ها برنده می‌شوند.
- `apps/web/lib/version.ts`: نسخه به `v2.89.1`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- Playwright روی `/guide`: ارتفاع فوتر ۳۷۷px (قبلاً ۷۳۱px)؛ رنگ متن دکمه در
  حالت روشن `rgb(139,58,26)` روی پس‌زمینه‌ی سفید (کنتراست ۱۰٫۱۲:۱) و در حالت
  تیره `rgb(74,36,20)` روی `rgb(243,217,191)` (کنتراست ۹٫۹۷:۱).
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0 و
  `npm run build` سبز.

## ۱۴۰۵/۰۸/۰۲ — ادغام «دفترچه تلفن» در دایرکتوری کارت ویزیت‌ها + مرتب‌سازی الفبا + نمایش تلفن همراه — نسخه `v2.89.0`

**هدف:** `/phonebook` حذف و به‌عنوان مدل نمایش سوم («دفترچه») داخل
`/business-cards` ادغام شود؛ حس دفترچه‌ی کاغذی واقعی‌تر شود؛ ذخیره/لایک با خودِ
صفحه‌ی کارت ویزیت‌ها یکی شود؛ گزینه‌ی مرتب‌سازی «الفبا» به همه‌ی حالت‌های نمایش
اضافه شود؛ و «تلفن همراه» در حالت لیست صفحات دایرکتوری نمایش داده شود.

**تغییرات:**
- `apps/api/src/common/directory-sort.ts`: نوع `DirectorySort` به `'alpha'` گسترش
  یافت و تابع/ثابت مشترک `orderedByAlpha` (مرتب‌سازی فینگلیش‌درست فارسی با
  `Intl.Collator('fa')`) + سقف `DIRECTORY_ALPHA_MAX_ROWS` اضافه شد.
- `apps/api/src/common/plans.ts`: `applyContactFieldMask` اضافه شد تا پلنی که فیلد
  «تلفن همراه / ثابت» را پنهان می‌کند، هم‌زمان `phone` و `mobile` را ماسک کند.
- `apps/api/src/businesscards/business-cards.service.ts` و
  `apps/api/src/biolinks/biolinks.service.ts`: `phone`/`mobile` (و `user.plan`) به
  select دایرکتوری اضافه شد، ماسک پلن روی ردیف‌ها اعمال شد، پروجکشن ردیف در تابع
  مشترک `project` یکپارچه شد، و مسیر `sort=alpha` (مرتب‌سازی فارسی + صفحه‌بندی)
  پیاده شد. دفترچه تلفن نیز از `orderedByAlpha` مشترک استفاده می‌کند.
- `apps/api/src/businesscards/dto/public-business-card-query.dto.ts` و
  `apps/api/src/biolinks/dto/public-biolink-query.dto.ts`: `'alpha'` به `@IsIn`
  و به `@ApiPropertyOptional` (enum + توضیح فارسی) اضافه شد.
- `apps/api/src/seo/seo.service.ts`: ورودی `/phonebook` از سایت‌مپ حذف شد
  (اکنون بخشی از `/business-cards` است).
- `apps/web/lib/directory-view.ts`: `DirectoryView` سه‌حالته شد
  (`list | tiles | notebook`) و مقدار اولیه‌ی `preferred` (deep-link `?view=`)
  پشتیبانی می‌شود.
- `apps/web/components/ui/DirectoryViewSwitch.tsx`: دکمه‌ی «دفترچه» اضافه شد.
- `apps/web/components/businesscard/DirectoryBusinessCardNotebook.tsx` (فایل نو):
  مدل نمایش دفترچه — حرف اول نام (بدون لوگو)، هردو شماره، دکمه‌های **مشترک**
  `LikeButton`/`SaveButton` (همان رکورد حساب کاربری، نه localStorage)، تب‌های
  چسبان الفبایی در حالت «الفبا» و اسکرول بی‌نهایت.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx`: شاخه‌ی
  `notebook` رندر شد، `?view=` به URL همگام شد و نوع `sort` گسترش یافت.
- `apps/web/components/businesscard/DirectoryBusinessCardFilters.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkFilters.tsx`: گزینه‌ی «الفبا» به
  مرتب‌سازی (در همه‌ی حالت‌های نمایش) اضافه شد.
- `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkItem.tsx`: در حالت لیست، شماره‌ی
  تلفن همراه/ثابت در لبه‌ی چپ (انتهای ردیف) با آیکون نمایش داده می‌شود.
- `apps/web/lib/api.ts`: `phone`/`mobile` به تایپ‌های `DirectoryBiolink` و
  `DirectoryBusinessCard` اضافه شد.
- `apps/web/lib/nav.ts` و `apps/web/components/layout/MobileNav.tsx`: ورودی
  «دفترچه تلفن» به `?view=notebook&sort=alpha` تغییر یافت.
- `apps/web/app/globals.css`: استایل `.notebook-*` (کاغذ خط‌دار، شیرازه‌ی دوخته،
  تب الفبا، ردیف تماس) اضافه شد.
- `apps/web/app/phonebook/page.tsx`: به ریدایرکت دائمی به
  `/business-cards?view=notebook&sort=alpha` تبدیل شد؛
  `PhonebookNotebook.tsx` و `phonebook.css` حذف شدند. `fetchPhonebook` از
  `apps/web/lib/directory-server.ts` برداشته شد. `apps/web/lib/version.ts` → `v2.89.0`.

**تأیید/تست:**
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json` → exit 0.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `python3 scripts/check_api_docs.py` → 22 کنترلر / 214 مسیر، بدون خطا (exit 0).
- `GET /business-cards/public?sort=alpha` ترتیب فارسی درست داد
  (`آرش نیک‌پور، سارا محمدی، علی فروتن، محسن، محمد فروتن…`) و `phone`/`mobile`
  در پاسخ آمد؛ همین برای `/biolinks/public?sort=alpha` و
  `/business-cards/public/phonebook` بررسی شد.
- Playwright روی `/business-cards?view=notebook&sort=alpha`: سه دکمه‌ی نمایش
  (لیست/کاشی/دفترچه) با «دفترچه» فعال، تب‌های الفبایی، فقط حرف اول به‌جای لوگو،
  هردو شماره («همراه»/«ثابت»)، دکمه‌های لایک/ذخیره، و `bodyScrolls:false` با
  اسکرول فقط در `.notebook-scroll`؛ بدون خطای کنسول.
- `/phonebook` → ریدایرکت به `/business-cards?sort=alpha&view=notebook` و
  نمایش حالت دفترچه.
- حالت لیست: شماره‌ها در عنصر آخر ردیف با `direction: rtl` درست رندر شد (هم
  کارت ویزیت هم بیولینک).
- `npm run build` (بیت تولیدی در `/tmp/pbenvtest`) → exit 0 و `/phonebook`
  استاتیک رندر شد.

## ۱۴۰۵/۰۸/۰۲ — بازطراحی «پست‌های کاربران» و «اخبار شهر» — نسخه `v2.88.6`

**هدف:** بازطراحی دو صفحه‌ی عمومی مطابق درخواست کاربر: `/pulse` به‌صورت جدول
تیترمحور + صفحه‌بندی، و `/feeds` به سبک پست‌های شبکه‌های اجتماعی با تمرکز بر
محتوای متنی — هر دو هم‌سبک با تم سایت و کاربرپسند.

**تغییرات:**
- `apps/web/app/pulse/page.tsx`: بازنویسی لیست خبرها به‌صورت جدول (`.dash-table`)
  با ستون‌های «تیتر خبر (+خلاصه یک‌خطی) / دسته‌بندی / منتشرکننده / تاریخ / مشاهده»
  و صفحه‌بندی کلاسیک (قبلی/بعدی + شماره‌ی صفحه). ستون‌های فرعی در موبایل به چیپ‌های
  برچسب‌دار تبدیل می‌شوند (الگوی ریسپانسیو موجود `.dash-table`).
- `apps/web/app/feeds/page.tsx`: پوسته‌ی تمیزتر و متنسنتر — عنوان «پست‌های کاربران»،
  فیلترهای جمع‌وجمع، و جریان مرکزی عرض‌محدود (`max-w-2xl`) که فقط خودش اسکرول
  می‌شود (اسکرول بی‌نهایت روی مکانیزم مشترک دایرکتوری).
- `apps/web/components/feed/FeedCard.tsx`: کارت پست به سبک شبکه‌ی اجتماعی —
  هدر نویسنده (آواتار حرف اول + نام + تاریخ + آیکون Globe)، متن پست در صدر کارت،
  تصاویر به‌صورت گرید ساده (حداکثر ۴ + «+n»)، چیپ موضوع/برچسب، و نوار اقدام
  (لایک + ذخیره + «مشاهدهٔ پست»).
- `apps/web/components/ui/LikeButton.tsx` و `SaveButton.tsx`: نوع `feeds` به
  `kind` اضافه شد تا دکمه‌ها روی پست فید هم کار کنند (اندپوینت‌های
  `/feeds/public/:id/like` و `/save`).
- `apps/web/lib/directory.ts`: پاسخ‌های بدون `filters` (مثل `/news/public`) دیگر
  ناحیه‌ی فیلترها را پاک نمی‌کنند.
- `apps/web/lib/version.ts`: نسخه به `v2.88.6`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `/pulse`: جدول با ۵ ستون رندر می‌شود؛ در موبایل `thead` پنهان و ستون‌های فرعی به
  چیپ‌های `data-label` تبدیل می‌شوند. با پاسخ ماک‌شده‌ی سه‌صفحه‌ای، دکمه‌های
  قبلی/بعدی، «صفحه ۲ از ۳» و `?page=2` درست کار کردند.
- `/feeds`: صفحه اسکرول ندارد و فقط `.directory-list` اسکرول می‌شود؛ با پاسخ
  ماک‌شده‌ی سه‌صفحه‌ای، صفحه‌های ۲ و ۳ خودکار واکشی و «همهٔ پست‌ها نمایش داده شد»
  ظاهر شد. هر کارت هدر/متن/تصویر/لایک/ذخیره/لینک را دارد.
- لایک ناشناس → هدایت به `/login?next=/feeds`؛ اندپوینت لایک مستقیم با
  `x-visitor-id` هم `liked:true`/`false` درست برگرداند.
- دارک‌مود روی هر دو صفحه سالم (`panelBg` تیره)؛ `/pulse` موبایل صفر سرریز افقی.
- بیلد پروداکشن جداسازی‌شده: «Compiled successfully» و prerender موفق `/feeds` و
  `/pulse`.

## ۱۴۰۵/۰۸/۰۲ — رفع نمایش «vv» در نسخه‌ی فوتر — نسخه `v2.88.5`

**هدف:** رفع باگ نمایش دو «v» در برچسب نسخه‌ی فوتر (مثلاً «vv2.88.4»).

**ریشه‌ی باگ:** در `apps/web/components/layout/Footer.tsx` حرف `v` به‌صورت هاردکد
پیش از مقدار رندر می‌شد، در حالی که خودِ `APP_VERSION` هم با `v` شروع می‌شود
(`v2.88.4`)؛ نتیجه «vv2.88.4» می‌شد.

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: حذف `v` هاردکد و رندر مستقیم
  `{APP_VERSION}`.
- `apps/web/lib/version.ts`: نسخه به `v2.88.5`.
- `install.sh`: همگام‌سازی خودکار.

**تأیید/تست:**
- `curl -s http://localhost:3000/services` → برچسب نسخه حالا `v2.88.4` (تک‌v) است
  و دیگر «vv» ندارد.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۸/۰۲ — بازطراحی رفتار دفترچه تلفن: صفحه‌بندی/اسکرول بی‌نهایت، مرتب‌سازی، دو شماره و تب ذخیره‌ها — نسخه `v2.88.4`

**هدف:** اعمال بازخورد کاربر روی `/phonebook`: حذف لوگو (فقط حرف اول نام)،
مرتب‌سازی پیش‌فرض الفبایی + جدیدترین، آیکون ذخیره (Bookmark) به‌جای ستاره، نمایش
هم‌زمان همراه و ثابت، حذف عنوان/متن‌های اضافه، صفحه‌ی بدون اسکرول با دفترچه‌ی
اسکرول بی‌نهایت ۱۰تایی، و بازطراحی تب «ذخیره‌های من» با نمایش کامل مخاطب.

**تغییرات:**
- `apps/api/src/businesscards/dto/public-phonebook-query.dto.ts` (جدید): DTO با
  `page`/`limit` (از `PaginationDto`) + `sort` (`alpha` پیش‌فرض / `recent`) + `q`.
- `apps/api/src/businesscards/business-cards.service.ts`: `findPublicPhonebook` از
  «همه در یک درخواست» به صفحه‌بندی‌شده تغییر کرد؛ فیلتر جستجو و مرتب‌سازی الفبایی با
  `Intl.Collator('fa')` (چون collation دیتابیس `en_US.utf8` است و ترتیب فارسی را
  درست نمی‌دهد) و `recent` بر اساس `pinnedAt`. صفحه‌بندی با `getDirectoryPageSize`
  (پیش‌فرض ۱۰) و خروجی `{ items, meta }`.
- `apps/api/src/businesscards/business-cards.controller.ts`: مسیر
  `GET /business-cards/public/phonebook` حالا `PublicPhonebookQueryDto` می‌گیرد و
  `@ApiOperation` آن به‌روز شد.
- `apps/web/lib/directory-server.ts`: `fetchPhonebook()` به
  `fetchDirectory(...)` صفحه‌بندی‌شده تغییر کرد (صفحه‌ی اول SSR).
- `apps/web/app/phonebook/page.tsx`: `initialData` صفحه‌بندی‌شده به کلاینت؛ حذف
  `Footer` تا پوسته دقیقاً viewport را پر کند.
- `apps/web/app/phonebook/PhonebookNotebook.tsx`: بازنویسی روی
  `useDirectoryResults` + `useInfiniteScroll` (مثل سایر دایرکتوری‌ها)؛ حذف کامل
  `<img>` لوگو (فقط حرف اول)، نمایش هم‌زمان «همراه» و «ثابت»، دو سوییچ pill برای
  نما و ترتیب، آیکون `Bookmark` به‌جای ستاره، و تب «ذخیره‌های من» که کل ردیف را در
  `localStorage` نگه می‌دارد و کامل نمایش می‌دهد (به‌همراه «پاک‌کردن همه»).
- `apps/web/app/phonebook/phonebook.css`: بازنویسی استایل روی الگوی full-height
  `.directory-shell`؛ بدنه‌ی دفترچه تنها ناحیه‌ی اسکرول است؛ حذف متن hero.
- `docs/API.md`: به‌روزرسانی قرارداد مسیر دفترچه تلفن (صفحه‌بندی/`sort`/`q`).
- `apps/web/lib/version.ts`: نسخه به `v2.88.4`. `install.sh`: همگام‌سازی.

**تأیید/تست:**
- `tsc --noEmit` روی وب و API → هر دو exit 0.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۲ کنترلر / ۲۱۴ مسیر) و `docs-json`
  مسیر `/business-cards/public/phonebook` را با پارامترهای `page`/`limit`/`q`/`sort`
  نشان می‌دهد.
- تست curl: `sort=alpha` ترتیب فارسی درست (آرش، سارا، علی، محسن، محمد…)؛
  `sort=recent` بر اساس `publishedAt` نزولی؛ `q=محمد` → ۳ نتیجه؛ `q=۰۹۱۲` با ارقام
  فارسی → ۲ نتیجه.
- تست Playwright روی `/phonebook`: بدون `<img>` لوگو؛ صفحه اسکرول ندارد
  (`pageScroll=0`) و فقط `.pb-list` اسکرول دارد؛ ردیف‌ها هر دو شماره را نشان می‌دهند؛
  آیکون `lucide-bookmark`؛ سوییچ مرتب‌سازی ترتیب را عوض می‌کند؛ ذخیره‌ی ۳ مخاطب در
  تب «ذخیره‌های من» کامل رندر می‌شود و پس از reload می‌ماند؛ صفر خطای کنسول.
- تست اسکرول بی‌نهایت با تنظیم موقت `directoryPageSize=3` روی ۷ مخاطب: صفحه‌های ۲ و
  ۳ خودکار واکشی شدند (`?sort=alpha&page=2` و `page=3`) و «همه نتایج نمایش داده شد»
  نمایش داده شد؛ سپس تنظیم به پیش‌فرض (۱۰) بازگردانده شد.
- ریسپانسیو ۳۹۰/۷۶۸ + دارک‌مود: صفر سرریز افقی و صفر عنصر بیرون‌زده.
- بیلد پروداکشن جداسازی‌شده: «Compiled successfully» و prerender موفق `/phonebook`.

## ۱۴۰۵/۰۸/۰۲ — بازطراحی رابط کاربری صفحه‌ی «دفترچه تلفن» — نسخه `v2.88.3`

**هدف:** بازطراحی صفحه‌ی عمومی `/phonebook` مطابق اصول و زبان طراحی سایت، درحالی‌که
هویت «دفترچه‌ی کاغذی/جلد سیمی» نمونه‌ی ارسالی کاربر حفظ شود.

**زمینه:** پیاده‌سازی قبلی از پالت چوبی-کاغذ آبی و فونت Courier جدا از سیستم طراحی
سایت استفاده می‌کرد؛ نه با صفحات عمومی دیگر (خانه/خدمات/دایرکتوری) هم‌خوان بود و نه
حالت تیره را پشتیبانی می‌کرد.

**تغییرات:**
- `apps/web/app/phonebook/phonebook.css`: بازنویسی کامل استایل با توکن‌های طراحی سایت
  (`--vintage-paper/-surface/-accent/...`)؛ سرصفحه‌ی hero هم‌سبک صفحات دیگر
  (`pb-hero`/`pb-badge`/`pb-title`/`pb-sub`)، کارت دفترچه با `indeed-panel`-مانند
  کادر خط‌چین، نوار جستجوی استاندارد (`indeed-input`-مانند)، سوییچ تب‌ها به سبک
  `directory-view-switch`، ردیف‌های رنگ‌بندی‌شده، و بلوک دارک‌مود.
- `apps/web/app/phonebook/PhonebookNotebook.tsx`: مارک‌آپ جدید (hero، آیکون‌های
  Lucide به‌جای گلیف متنی، اطلاعات شغل/شرکت در ردیف، دکمه‌ی تماس pill)، حفظ کامل
  منطق جستجو (نرمال‌سازی ارقام/هایلایت)، ذخیره در `localStorage` و ورق‌زدن.
- سرریز ردیف‌های برگه‌ی ذخیره‌ها روی نوار صفحه‌بندی اصلاح شد (ردیف‌ها در نمای برگه
  تک‌خطی و کوتاه‌تر؛ ارتفاع برگه با `PER_PAGE` هماهنگ) تا کلیک دکمه‌های «قبلی/بعدی»
  بی‌مانع شود.
- `apps/web/lib/version.ts`: نسخه به `v2.88.3`.
- `install.sh`: همگام‌سازی خودکار بلوک‌های تغییریافته.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- تست Playwright روی `http://localhost:3000/phonebook`:
  جستجو (`۰۹۱۲` → ۲ نتیجه، عبارت بی‌نتیجه → «مخاطبی پیدا نشد»)، ذخیره‌ی ۷ مخاطب و
  تب «ذخیره‌های من (۷)»، ورق‌زدن صفحه ۱→۲، و ماندگاری ذخیره‌ها پس از reload — همه
  درست؛ `scrollHeight == height` برگه (بدون سرریز) و صفر خطای کنسول/صفحه.
- بررسی ریسپانسیو در عرض‌های ۳۹۰/۷۶۸/۱۲۸۰: صفر ردیف سرریز، صفر عنصر بیرون‌زده از
  کارت، اِلپسیس نام‌ها فعال. دارک‌مود: سطح/تاکید/رنگ متن‌ها از توکن‌های `html.dark`.
- بیلد پروداکشن جداسازی‌شده (`npm run build` با `NODE_ENV=development` برای اطمینان
  از اصلاح قبلی): «Compiled successfully» و prerender موفق `/phonebook`.

## ۱۴۰۵/۰۸/۰۲ — رفع شکست `next build` ناشی از نشت `NODE_ENV=development` — نسخه `v2.88.2`

**هدف:** رفع باگ پیش‌موجودِ شکست بیلد پروداکشن هنگام prerender صفحات `/feeds` و
`/_global-error` با خطای `TypeError: Cannot read properties of null (reading
'useState'/'useContext')` که عملاً استقرار (`.github/workflows/deploy.yml`) را
می‌شکست.

**ریشه‌ی باگ:** هنگام اجرای `next build`، متغیر `NODE_ENV=development` از محیط/`.env`
به پروسه‌ی بیلد نشت می‌کرد. Next.js بیلد پروداکشن را باید با `NODE_ENV=production`
اجرا کند؛ در غیر این صورت موتور prerender نسخه‌ی dev از React را بار می‌کند و
هوک‌ها `null` می‌شوند. با تست جداسازی‌شده تأیید شد: با `NODE_ENV=development` بیلد
می‌شکند، ولی با `NODE_ENV=production` یا `NODE_ENV` خالی موفق است.

**تغییرات:**
- `apps/web/package.json`: اسکریپت `build` از `next build` به
  `NODE_ENV=production next build` تغییر کرد تا بیلد همیشه مستقل از محیط با
  production اجرا شود.
- `apps/web/Dockerfile`: در مرحله‌ی `build` مقدار `ENV NODE_ENV=production` اضافه شد
  (دفاع لایه‌ای برای تصویر استقرار).
- `apps/web/lib/version.ts`: نسخه به `v2.88.2`.
- `install.sh`: همگام‌سازی خودکار بلوک‌های تغییریافته.

**تأیید/تست:**
- بازتولید باگ در یک volume نصب‌شده‌ی تازه: `NODE_ENV=development npm run build`
  (قبل از اصلاح) با خطای `useState` روی `OfflineBanner.tsx` شکست خورد.
- پس از اصلاح، همان دستور با `NODE_ENV=development` در محیط → `exit 0` و
  «Compiled successfully» و تولید کامل صفحات ایستا.
- `docker build --build-arg NEXT_PUBLIC_API_URL=... --build-arg
  NEXT_PUBLIC_APP_URL=... ./apps/web` → بیلد کامل تصویر پروداکشن موفق (exit 0).
- `python3 scripts/sync_install.py --check` → بدون تغییر معلق.

## ۱۴۰۵/۰۸/۰۲ — ارتقای امنیتی Next.js به 16.4.3 — نسخه `v2.88.1`

**هدف:** پاسخ به هشدار امنیتی درباره‌ی `next@16.4.0` و ارتقا به نسخه‌ی امن.

**تغییرات:**
- `apps/web/package.json`: `next` از `^16.4.0` به `^16.4.3` و `eslint-config-next` از
  `^16.4.0` به `^16.4.3` (آخرین انتشار پایدار؛ نسخه‌ی آسیب‌پذیر `16.4.0` بود).

**تأیید/تست:**
- `docker exec alooshomal-web npm install next@16.4.3` → نسخه‌ی نصب‌شده در
  `node_modules/next/package.json` حالا `16.4.3` است.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- سرور توسعه با Next 16.4.3 بالا آمد و صفحات `/`، `/phonebook`، `/business-cards`،
  `/biolinks` و `/feeds` همه کد ۲۰۰ برگرداندند.
- **نکته‌ی مهم (پیش‌موجود، نامرتبط با این تغییر):** `next build` پروداکشن در این
  محیط هنگام prerender صفحات `/feeds` و `/_global-error` با خطای
  `Cannot read properties of null (reading 'useState')` شکست می‌خورد. این خطا روی
  کدِ دست‌نخورده‌ی `HEAD` (بدون هیچ‌یک از تغییرات اخیر) و با نسخه‌های مختلف
  React در یک volume و نصب تازه هم بازتولید شد؛ پس باگ ابزار/وابستگی مستقل از این
  تسک است. برای پیگیری جداگانه در `BACKLOG.md` ثبت شد.

## ۱۴۰۵/۰۸/۰۲ — صفحه‌ی «دفترچه تلفن» با استایل دفترچه‌ی کاغذی — نسخه `v2.88.0`

**هدف:** ساخت یک صفحه‌ی عمومی جدید `/phonebook` («دفترچه تلفن») که شماره‌ی تماس
کارت ویزیت‌های منتشرشده را در قالب نمونه‌ی ارسالی کاربر
(`phonebook-classic-v3.html`) نشان دهد: دفترچه‌ی کاغذی با خط‌کشی، جلد چرمی،
صفحه‌زنی و «ذخیره‌های من».

**تغییرات:**
- `apps/api/src/businesscards/business-cards.service.ts`: متد جدید
  `findPublicPhonebook()` — فهرست تخت تماسِ کارت‌های ویزیت منتشرشده‌ای که شماره
  دارند (`OR: phone/mobile not null`)، با انتخاب حداقلی فیلدها، ماسک پلن
  (`applyPlanVisibility`) و سقف `PHONEBOOK_MAX_ROWS = 2000`.
- `apps/api/src/businesscards/business-cards.controller.ts`: مسیر عمومی جدید
  `GET /business-cards/public/phonebook` با `@Public()` و `@ApiOperation` (قبل از
  `public/:slug` ثبت شد تا با آن تعارض نکند).
- `apps/api/src/seo/seo.service.ts`: افزودن `/phonebook` به صفحات ثابتِ سایت‌مپ
  (daily، priority ۰.۸).
- `apps/web/lib/api.ts`: اینترفیس `PhonebookEntry`.
- `apps/web/lib/directory-server.ts`: فچر SSR `fetchPhonebook()`.
- `apps/web/app/phonebook/page.tsx`: صفحه‌ی سرور با متادیتای SEO، `Header`/`Footer`
  و رندر SSR فهرست مخاطبین.
- `apps/web/app/phonebook/PhonebookNotebook.tsx`: کامپوننت کلاینت (جستجو با
  نرمال‌سازی ارقام فارسی/عربی، هایلایت، ذخیره در `localStorage`، تب «ذخیره‌های من»
  و انیمیشن ورق‌زدن با React state).
- `apps/web/app/phonebook/phonebook.css`: استایل دفترچه‌ی کاغذی (اسکرول/خط‌کشی/جلد
  چرمی) با پیشوند `.pb-` و اسکوپ‌شده زیر `.pb-page`.
- `apps/web/lib/nav.ts` و `apps/web/components/layout/MobileNav.tsx`: افزودن
  «دفترچه تلفن»/«دفترچه» به ناوبری دسکتاپ و موبایل (grid موبایل ۷→۸ ستون).
- `install.sh`: همگام‌سازی خودکار بلوک‌های جدید/تغییریافته.

**تأیید/تست:**
- `python3 scripts/check_api_docs.py` → exit 0 (۲۲ کنترلر / ۲۱۴ مسیر) و
  `docs-json` مسیر جدید را با `summary` نشان می‌دهد.
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` و
  `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit` → هر دو exit 0.
- `python3 scripts/sync_install.py` و سپس `--check` → «تغییر معلق» صفر (exit 0).
- Playwright (`/usr/bin/google-chrome`) روی `http://localhost:3000/phonebook`:
  ۷ ردیف مخاطب، جستجوی «آرش» → ۱ ردیف با `<mark>`، ذخیره‌ی چند مخاطب و تب
  «ذخیره‌های من (۷)»، ورق‌زدن ۲ صفحه‌ای (صفحه ۱↔۲ با `.pb-leaf`)، حذف ذخیره،
  و پایداری ذخیره‌ها پس از reload؛ بدون خطای کنسول. ناوبری موبایل در ۳۲۰px و
  ۳۹۰px تک‌ردیفه و بدون اسکرول افقی ماند.

## ۱۴۰۵/۰۷/۲۸ — صورتی‌کردن رنگ فوتر — نسخه `v2.87.1`

**هدف:** تغییر رنگ پس‌زمینه، متن و لینک‌های فوتر به پالت صورتی.

**تغییرات:**
- `apps/web/components/layout/Footer.tsx`: پس‌زمینه‌ی فوتر به `bg-pink-100` با
  حاشیه‌ی `border-pink-200`، متن‌ها به `text-pink-900` و لینک‌ها به
  `text-pink-800` با هاور `pink-950` تغییر کردند تا کنتراست خوانایی حفظ شود.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.87.1`.

**تأیید/تست:**
- `python3 scripts/sync_install.py` و سپس `--check` → بدون «تغییر معلق» (exit 0).
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.

## ۱۴۰۵/۰۷/۲۸ — مرتب‌سازی و یکسان‌سازی کامپوننت‌های بیولینک + حذف کد مرده — نسخه `v2.87.0`

**هدف:** «انجام بده» — کامپوننت‌های بیولینک مثل کارت‌ویزیت مرتب/آینه‌ای شوند،
نمایش دایرکتوری با صفحه‌ی عمومی یکسان شود، و کدهای مرده/نیمه‌مرده حذف شوند.

**تغییرات:**
- `apps/web/components/biolink/DirectoryBiolinkTile.tsx`: به‌جای `ThemedBiolink`
  حالا همان `RecordCard` رندر می‌شود که صفحه‌ی عمومی بیولینک استفاده می‌کند
  (منطق `headline`/`subline` هم مثل `PublicBiolinkView`)، پس کاشی‌های
  دایرکتوری دقیقاً همان چیزی را نشان می‌دهند که صفحه‌ی عمومی نشان می‌دهد.
- `apps/web/components/biolink/ThemedBiolink.tsx` و
  `apps/web/components/businesscard/ThemedBusinessCard.tsx`: حذف (کد مرده؛
  هیچ‌جا import نمی‌شدند و مسیر `editable` بی‌استفاده بود).
- `apps/web/components/biolink/DirectoryDetail.tsx` →
  `DirectoryBiolinkDetail.tsx` و `DirectoryFilters.tsx` →
  `DirectoryBiolinkFilters.tsx` (هم‌نام‌سازی با همتای businesscard)؛
  اکسپورت‌ها به `DirectoryBiolinkDetail` / `DirectoryBiolinkFilters` تغییر نام
  دادند و اکسپورت محتوای هر دو دایرکتوری به `DirectoryBiolinkContent` /
  `DirectoryBusinessCardContent` هم‌نام فایل شد.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`:
  به‌روزرسانی import/usages اکسپورت‌های تغییرنام‌یافته.
- `apps/web/lib/themes.ts`: حذف هلپرهای مرده‌ی `getTheme`/`themeClassName`/
  `getBusinessCardTheme`/`businessCardThemeClassName` که فقط کامپوننت‌های حذف‌شده
  استفاده می‌کردند.
- `apps/web/lib/card-spectrum.ts`: حذف `spectrumStyleVars` که فقط برای همان
  کامپوننت‌های حذف‌شده بود.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `python3 scripts/sync_install.py` و سپس `--check` → بدون «تغییر معلق» (exit 0)؛
  ۴ بلوک حذف‌شده و ۲ بلوک جدید در `install.sh` به‌درستی همگام شدند.
- Playwright (۱۴۴۰px و ۱۰۲۴px): در نمای کاشی `/biolinks` هر ۲۰ کاشی حالا
  `.record-card` هستند و هیچ `.theme-body`/`.bc-card` قدیمی رندر نمی‌شود؛
  در `/business-cards` هر ۸ کاشی `.bizcard` هستند. صفحه‌های `/`، `/biolinks`،
  `/business-cards` و `/biolinks/sample-full-biolink` بدون خطای کنسول/runtime
  لود شدند.

## ۱۴۰۵/۰۷/۲۸ — بزرگ‌تر و خواناتر شدن فونت/استایل بیولینک‌های پر-فیلد (چیدمان فشرده) — نسخه `v2.86.2`

**هدف:** بیولینک‌هایی که همه‌ی فیلدها را دارند (مثل `/biolinks/9020101`) در
حالت چیدمان فشرده (`data-compact`) با فونت و استایلِ کوچک‌تر از بیولینک‌های
سبک‌تر (مثل `/biolinks/9049798`) رندر می‌شدند؛ کاربر خواست فونت‌سایز و استایل
این کارت‌ها کمی بزرگ‌تر و خواناتر شود تا با حالت عادی هم‌سان باشد.

**علت:** `CardFit` وقتی محتوای کارت از فضای موجود بلندتر می‌شود، حالت
`data-compact` را فعال می‌کند و آن حالت در `globals.css` مقادیر تایپ را
به‌شدت کوچک می‌کرد (عنوان ۱۸px، ردیف‌ها ۱۲px، چیپ ۱۱px)؛ در حالی که کارت‌های
سبک‌تر با اندازه‌ی کامل (عنوان ‎≈۲۰px، ردیف ۱۴px) دیده می‌شوند.

**تغییرات:**
- `apps/web/app/globals.css`: بزرگ‌ترکردن مقادیر حالت فشرده‌ی `.record-card`
  (`.record-name` → ۲۰px، `.record-row` → ۱۳px، `.record-row-label` → ۱۱.۵px،
  `.record-chip` → ۱۱.۵px، `.record-bio` → ۱۲.۵px با line-height ۱.۸۵،
  `.record-subline` → ۱۲.۵px، `.record-social` → ۱۲.۵px با min-height ۳۷px،
  آواتار → ۵۶px) و کمی بازترکردن فاصله/padding کارت، تا در همان یک صفحه‌ی
  بدون‌اسکرول هم جا شود.
- `install.sh`: همگام‌سازی خودکار بلوک جاسازی‌شده‌ی `apps/web/app/globals.css`.

**تأیید/تست:**
- `python3 scripts/sync_install.py --check` → «تغییر معلق» صفر (exit 0).
- Playwright روی نمونه‌های محلی (`/biolinks/sample-full-biolink` که حالت
  فشرده را فعال می‌کند و `/biolinks/test-bl-mv50yfqd-hzab1v` که فشرده
  نیست) در چند viewport: حالت فشرده حالا در اندازه‌های رایج موبایل
  (۳۹۰×۸۴۴، ۴۱۲×۹۱۵، ۴۳۰×۹۳۲) با `scale≈1` و بدون اسکرول رندر می‌شود و
  اندازه‌ی مؤثر عنوان از ۱۸px به ۲۰px، ردیف‌ها از ۱۲px به ۱۳px و چیپ‌ها از
  ۱۱px به ۱۱.۵px رسید؛ در ارتفاع‌های کوتاه‌تر هم اندازه‌ی مؤثر از قبل بزرگ‌تر
  (نه کوچک‌تر) است و رگرسیونی در جا شدن کارت دیده نشد.

## ۱۴۰۵/۰۷/۲۸ — رنگ‌بندی کارت‌های اسلایدر صفحه‌ی اصلی مطابق رنگ انتخابی کاربر — نسخه `v2.86.1`

**هدف:** «درخواست جدید» — در صفحه‌ی اصلی، بخش «آخرین کارت‌های ویزیت»، رنگ‌بندی
هر کارت باید مطابق رنگی باشد که کاربر خودش انتخاب کرده است.

**علت باگ:** پروجکشن `public/latest` برای اسلایدر، فیلد `primaryColor` را
انتخاب نمی‌کرد؛ پس کارت‌ها همیشه با رنگ پیش‌فرض (تراکوتا) رندر می‌شدند.

**تغییرات:**
- `apps/api/src/businesscards/business-cards.service.ts`: افزودن
  `primaryColor: true` به `select` متد `findLatestPublished`.
- `apps/api/src/biolinks/biolinks.service.ts`: همان افزودن برای یکدستیِ
  اسلایدر بیولینک‌ها.
- `apps/web/components/home/HomeItemSlider.tsx`: فیلد `primaryColor` به
  `HomeSliderItem` اضافه شد و به‌عنوان `accent` به `BusinessCardFace` و
  `RecordCard` پاس داده می‌شود (رنگ از طریق `readableAccent` برای خوانایی
  روی کاغذ تیره می‌شود).

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0؛
  `.../alooshomal-api ... tsc --noEmit -p tsconfig.json` → exit 0.
- `curl /api/business-cards/public/latest` → هر آیتم حالا `primaryColor` دارد
  (`#0F766E`, `#e3c301`, `#8B3A1A`, …).
- Playwright روی `/` (با بایپس کش ISR): متغیر `--bizcard-accent` هر کاشی متفاوت
  است (`#0f766e`، `#ad9401`، `#8b3a1a`، …) و مطابق رنگ مالکِ همان کارت؛ اسلایدر
  بیولینک هم `--record-accent` را از رنگ مالک می‌گیرد.

## ۱۴۰۵/۰۷/۲۸ — هم‌سان‌سازی کارت ویزیت در نمای کاشی دایرکتوری و اسلایدر صفحه‌ی اصلی — نسخه `v2.86.0`

**هدف:** «اعمال کن» — همان کارت ویزیت افقی جدید (سینگل‌پیج) در نمای کاشی
دایرکتوری و اسلایدر «آخرین کارت‌ویزیت‌ها»ی صفحه‌ی اصلی هم استفاده شود.

**تغییرات:**
- `apps/web/components/businesscard/DirectoryBusinessCardTile.tsx`: به‌جای
  `ThemedBusinessCard` حالا `BusinessCardFace` رندر می‌شود (کارت افقی دوپنلی
  هم‌شکل صفحه‌ی عمومی).
- `apps/web/components/home/HomeItemSlider.tsx`: برای `kind === 'business-cards'`
  کارت `BusinessCardFace` و برای بیولینک‌ها همان `RecordCard` قدیمی رندر می‌شود
  (ردیف‌ها بدون `href` تا لینک تودرتو نشود).
- `apps/web/app/globals.css`: قاعده‌ی نمای افقی فقط برای کارت غیرِ `compact`
  اعمال می‌شود تا کارت‌های کوچک (کاشی/اسلایدر) یک‌ستونی و جمع‌وجور بمانند؛
  هایلایت هاور `.spectrum-pair` و `pointer-events` کاشی برای `.bizcard` هم اضافه شد.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0؛
  `.../alooshomal-api ... tsc --noEmit -p tsconfig.json` → exit 0؛
  `check_api_docs.py` → exit 0.
- Playwright صفحه‌ی اصلی (۳۹۰/۱۴۴۰): اسلایدر کارت‌ویزیت ۶ اسلاید با `.bizcard`
  (یک‌ستونی، ارتفاع ۳۰۵px) و اسلایدر بیولینک ۶ اسلاید با `.record-card`؛ بدون overflow.
- نمای کاشی `/business-cards`: هر ۸ کاشی `.bizcard` (کوچک، ۳۷۵×۲۷۵) و هیچ
  `.bc-card` قدیمی؛ نمای کاشی `/biolinks` دست‌نخورده (۲۰ کاشی themed، بدون `.bizcard`).

## ۱۴۰۵/۰۷/۲۸ — بازطراحی کارت ویزیت سینگل‌پیج به شکل کارت ویزیت افقی متمایز از بیولینک — نسخه `v2.85.0`

**هدف:** «درخواست جدید» — در `/business-cards/<slug>` حالت نمایش و استایل کارت
ویزیت شبیه‌تر به یک کارت ویزیت واقعی و **متفاوت** از حالت نمایش بیولینک باشد؛
استاندارد و یوزرفرندلی.

**تغییرات:**
- `apps/web/components/businesscard/BusinessCardFace.tsx` [جدید]: کارت ویزیت
  افقی دوپنلی — پنل هویت رنگی (آواتار دایره‌ای، نام، عنوان شغلی، چیپ‌های شهر و
  کسب‌وکار) کنار پنل تماس کاغذی (ردیف‌های برچسب‌دار تماس، بیو و آیکن‌های
  دایره‌ای شبکه‌های اجتماعی). در موبایل به یک ستون تبدیل می‌شود.
- `apps/web/app/globals.css`: استایل کامل `.bizcard*` (چیدمان گرید دوستونه در
  ≥۵۶۰px، پنل رنگی با گرادیان از رنگ مالک، ردیف‌های خط‌چین، دایره‌های اجتماعی،
  حالت `compact`).
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: به‌جای
  `RecordCard` (همان کارت بیولینک) حالا `BusinessCardFace` رندر می‌شود؛ ساختار
  ردیف‌ها/شبکه‌ها به `BizCardRow`/`BizCardSocial` منتقل شد و عنوان اصلی صفحه
  نام مالک است (نقش در پنل هویت).
- `apps/web/components/businesscard/LiveBusinessCardPreview.tsx`: پیش‌نمایش
  زنده‌ی فرم ساخت/ویرایش هم دقیقاً همین کارت افقی را نشان می‌دهد تا با صفحه‌ی
  عمومی یکسان بماند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json` → exit 0.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۲ کنترلر / ۲۱۳ مسیر).
- Playwright: در `/business-cards/sample-full-card` دیگر هیچ `.record-card` رندر
  نمی‌شود (`recordCard:0`, `bizcard:1`)؛ در دسکتاپ/تبلت پنل هویت کنار پنل تماس
  (`sideBySide:true`, عرض کل ۵۲۰px) و در موبایل یک‌ستونی؛ ۵ آیکن دایره‌ای
  اجتماعی (۴۰×۴۰ دسکتاپ/۳۲×۳۲ موبایل)؛ بدون overflow افقی در ۳۹۰/۸۳۴/۱۴۴۰.
- صفحه‌ی بیولینک دست‌نخورده: `/biolinks/sample-full-biolink` همچنان
  `record-card:1` و `bizcard:0` است.
- پیش‌نمایش زنده‌ی `/dashboard/business-cards/new` با نشست ادمین:
  `bizcard:1`, `recordCard:0`.

## ۱۴۰۵/۰۷/۲۷ — کادر تم‌دار دور اسلایدرهای صفحه‌ی اصلی و جابه‌جایی کادر شهروند خبرنگار — نسخه `v2.84.0`

**هدف:** «درخواست جدید» — دور «آخرین کارت ویزیت‌ها» و «آخرین بیولینک‌ها» یک
کادر با استایل تم صفحه‌ی اصلی کشیده شود (جلوه‌ی استاندارد و زیبا)، و کادر
«شهروند خبرنگار شوید» به بالای کادر «اخبار شهر» منتقل شود.

**تغییرات:**
- `apps/web/app/globals.css`: کلاس جدید `.home-section-frame` (کادر خط‌چین
  وینتیج با پس‌زمینه‌ی کاغذی و سایه‌ی ملایم + یک خط داخلی ظریف) برای قاب‌بندی
  بخش‌های اسلایدر صفحه‌ی اصلی.
- `apps/web/components/home/HomeItemSlider.tsx`: محتوای هر اسلایدر داخل
  `.home-section-frame` قرار گرفت.
- `apps/web/app/page.tsx`: بخش «شهروند خبرنگار شوید» از پایین صفحه به
  بلافاصله بالای `PulseSection` («اخبار شهر») منتقل شد.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright در سه ویوپورت: `frames=2`، هر دو کادر با `border-style:dashed` و
  عرض ۱۱۶۸px؛ ترتیب سکشن‌ها: «آخرین کارت‌های ویزیت» → «آخرین بیولینک‌ها» →
  «شهروند خبرنگار شوید» (y≈۲۰۹۶) → «اخبار شهر» (y≈۲۳۰۶)؛ بدون overflow افقی.

## ۱۴۰۵/۰۷/۲۷ — شبکه‌های اجتماعی با پیشوند ثابت در فرم‌های ساخت بیولینک/کارت ویزیت — نسخه `v2.83.0`

**هدف:** «درخواست جدید» — در `/dashboard/business-cards/new` و
`/dashboard/biolinks/new` همه‌ی شبکه‌های اجتماعی باید قسمت ثابت و اولیه
(پیشوند) را از قبل داشته باشند و کاربر فقط یوزرنیم/آیدی خود را وارد کند.

**تغییرات:**
- `apps/web/lib/social-fields.ts` [جدید]: تعریف پیشوند/پایه‌ی ثابت هر شبکه
  (`wa.me/`، `linkedin.com/in/`، `instagram.com/`، `t.me/`، `x.com/`) به‌همراه
  توابع `socialValueToInput` (حذف پیشوند از مقدار ذخیره‌شده برای نمایش در
  ورودی)، `socialInputToValue` (تبدیل یوزرنیم به URL کامل برای ذخیره) و
  `socialHref` (نرمال‌سازی مقادیر قدیمیِ فقط‌یوزرنیم به لینک کامل).
- `apps/web/components/ui/SocialInput.tsx` [جدید]: ورودی شبکه‌ی اجتماعی با
  پیشوند غیرقابل‌ویرایش + یک کادر برای یوزرنیم/آیدی.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: شش فیلد متنی
  اجتماعی با `SocialInput` جایگزین شدند (در هر دو حالت `inline` و کلاسیک).
- `apps/web/components/biolink/PublicBiolinkView.tsx`،
  `apps/web/components/businesscard/PublicBusinessCardView.tsx`،
  `apps/web/components/biolink/LiveBiolinkPreview.tsx` و
  `apps/web/components/businesscard/LiveBusinessCardPreview.tsx`: لینک‌های
  اجتماعی با `socialHref` نرمال می‌شوند تا رکوردهای قدیمی (یوزرنیم خالی از
  URL) هم درست لینک شوند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright با نشست ادمین روی هر دو صفحه‌ی `new`: هر پنج شبکه با پیشوند درست
  رندر شد (`wa.me/`, `linkedin.com/in/`, `instagram.com/`, `t.me/`, `x.com/`)
  و پلیس‌هولدر `username`/`989121234567`؛ بدون overflow افقی.
- مقادیر ذخیره‌شده‌ی نمونه (`sample-full-biolink`) که URL کامل بودند، هنگام
  نمایش فقط یوزرنیم را در کادر نشان می‌دهند و در رندر عمومی به لینک کامل
  تبدیل می‌شوند.

## ۱۴۰۵/۰۷/۲۷ — حذف نمایش «شرکت» به‌صورت تگ در کارت ویزیت — نسخه `v2.82.1`

**هدف:** «درخواست جدید» — در صفحه‌ی کارت ویزیت، فیلد «شرکت» که به‌شکل تگ
(چیپ) نمایش داده می‌شد حذف شود.

**تغییرات:**
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: پراپ
  `companyName` از `RecordCard` برداشته شد تا چیپ «شرکت» دیگر رندر نشود.
- `apps/web/components/businesscard/LiveBusinessCardPreview.tsx`: همین حذف در
  پیش‌نمایش زنده‌ی ساخت/ویرایش کارت ویزیت، تا پیش‌نمایش با صفحه‌ی عمومی
  یکسان بماند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright روی `/business-cards/sample-full-card`: چیپ‌های رندرشده فقط
  «تهران» و «فناوری اطلاعات» بودند و چیپ «شرکت» وجود ندارد.

## ۱۴۰۵/۰۷/۲۷ — افزودن دکمه‌های اشتراک‌گذاری و ذخیره به صفحات عمومی بیولینک/کارت ویزیت — نسخه `v2.82.0`

**هدف:** «درخواست جدید» — در صفحات عمومی
`/business-cards/<slug>` و `/biolinks/<slug>`، کنار دکمه‌ی لایک دو دکمه‌ی
جدید اضافه شود: دکمه‌ی **اشتراک‌گذاری** (فقط آیکن) و دکمه‌ی **ذخیره** (فقط
آیکن).

**تغییرات:**
- `apps/web/components/ui/ShareButton.tsx` [جدید]: دکمه‌ی اشتراک‌گذاری که
  ابتدا از Web Share API (شیت اشتراک‌گذاری موبایل) استفاده می‌کند و در غیر آن
  لینک را در کلیپ‌بورد کپی کرده و توست تأیید نشان می‌دهد؛ حالت `iconOnly`
  فقط آیکن رندر می‌کند.
- `apps/web/components/ui/SaveButton.tsx`: پراپ‌های `iconOnly` و `reconcile`
  اضافه شدند؛ در حالت `reconcile` وضعیت واقعی «ذخیره»ی کاربرِ واردشده با
  `GET .../public/<slug>/save` هم‌گام می‌شود (چون صفحات عمومی سمت سرور رندر
  می‌شوند و بازدیدکننده را نمی‌شناسند) و در حالت `iconOnly` فقط آیکن نمایش
  داده می‌شود.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: متد `saveSummary`
  برای گزارش وضعیت ذخیره‌ی کاربر جاری (ناشناس → `saved:false`).
- `apps/api/src/biolinks/biolinks.controller.ts` و
  `apps/api/src/businesscards/business-cards.controller.ts`: مسیر جدید
  `@OptionalAuth() GET public/:slug/save` با `@ApiOperation`.
- `apps/web/components/biolink/PublicBiolinkView.tsx` و
  `apps/web/components/businesscard/PublicBusinessCardView.tsx`: دو دکمه‌ی
  آیکن‌محور اشتراک و ذخیره کنار لایک در نوار پایین کارت.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json` → exit 0.
- `python3 scripts/check_api_docs.py` → exit 0 (۲۲ کنترلر / ۲۱۳ مسیر).
- `curl GET /api/biolinks/public/sample-full-biolink/save` (ناشناس) → `saved:false`؛
  با توکن ادمین → `POST .../save` = `saved:true` سپس `GET .../save` = `saved:true`
  و با toggle دوم به `saved:false` برگشت.
- Playwright در سه ویوپورت (۳۹۰/۸۳۴/۱۴۴۰): در هر دو صفحه‌ی عمومی
  `shareIcon=1`، `saveIcon=1`، `like=1`، بدون overflow افقی؛ دکمه‌های آیکن‌محور
  کنار لایک ۴۰×۴۰ رندر شدند.

## ۱۴۰۵/۰۷/۲۷ — نمایش شبکه‌های اجتماعی بیولینک به‌صورت دکمه‌های کشیده افقی — نسخه `v2.81.0`

**هدف:** «درخواست جدید» — در نمایش بیولینک، شبکه‌های اجتماعی از حالت آیکن کوچک
به دکمه‌های کشیده افقی تبدیل شوند.

**تغییرات:**
- `apps/web/components/ui/RecordCard.tsx`: لینک‌های اجتماعی حالا داخل یک `nav`
  با برچسب فارسی («واتساپ»، «اینستاگرام»، «تلگرام»، «لینکدین»، «ایکس») رندر
  می‌شوند؛ آیکن + متن در یک دکمه‌ی کشیده (به‌جای آیکن دایره‌ای تک).
- `apps/web/app/globals.css`: `.record-socials` به شبکه‌ی دوستونه‌ی تمام‌عرض
  تبدیل شد؛ `.record-social` دکمه‌ی افقی با `min-height`، پدینگ و برچسب
  (`.record-social-label`) شد و شعاع آن با گردی خود کارت (`--vintage-radius`)
  هم‌اندازه است؛ حالت‌های `compact` (اسلایدر خانه) و `data-compact` هم تنظیم شدند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright روی `/biolinks/sample-full-biolink` در عرض‌های ۳۹۰/۸۳۴/۱۴۴۰:
  ۵ دکمه‌ی اجتماعی با برچسب، چیدمان `grid` دوستونه (۲ ستون مساوی)، ارتفاع
  ۳۴–۴۲px، بدون سرریز افقی و بدون اسکرول سند.
- صفحه‌های `business-cards/sample-full-card`، `/`، `/login` و
  `/admin?section=settings` در همان عرض‌ها `200` و بدون سرریز افقی.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — فعال/غیرفعال کردن ورود با ایمیل و رمز عبور در تنظیمات مدیر — نسخه `v2.80.0`

**هدف:** «درخواست جدید» — در `https://alooshomal.ir/admin?section=settings` مانند
فعال/غیرفعال کردن ورود با موبایل و کد یکبار مصرف، برای ایمیل و رمز عبور هم
گزینه اضافه شود.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: کلید `authEmailLoginEnabled` با
  پیش‌فرض روشن و متدهای `getEmailLoginEnabled`/`setEmailLoginEnabled`.
- `apps/api/src/settings/settings.controller.ts`: افزودن `emailLoginEnabled` به
  DTO، به پاسخ `GET /settings/public` و `GET /admin/settings` و به
  `PATCH /admin/settings`.
- `apps/api/src/auth/auth.service.ts`: افزودن `assertEmailLoginEnabled` و
  فراخوانی آن در `login` و `register` (خطای ۴۰۳ هنگام خاموش بودن).
- `apps/web/components/admin/AdminAuthSettings.tsx`: توگل دوم برای «ورود و
  ثبت‌نام با ایمیل و رمز عبور» و به‌روزرسانی متن راهنما.
- `apps/web/lib/auth-settings.ts` (فایل جدید): هوک `useAuthMethods` برای خواندن
  وضعیت دو روش ورود از `/settings/public`.
- `apps/web/app/(auth)/login/page.tsx`: پنهان‌کردن روش‌های غیرفعال، انتخاب
  خودکار روش فعال، پنهان‌کردن دکمه‌ی جابه‌جایی به روش خاموش، و نمایش پیام
  راهنما وقتی هر دو روش خاموش‌اند.

**تأیید/تست:**
- `tsc --noEmit` روی هر دو اپ (`apps/api` و `apps/web`) → exit 0.
- با توکن مدیر: `PATCH /admin/settings {"emailLoginEnabled":false}` →
  `emailLoginEnabled: false`؛ سپس `POST /auth/login` → **403** با پیام
  «ورود با ایمیل و رمز عبور در حال حاضر غیرفعال است»؛ پس از بازگرداندن به
  `true` → **200**.
- Playwright روی `/login`: با «فقط ایمیل» تب‌ها پنهان و فرم ایمیل مستقیم بدون
  دکمه‌ی موبایل؛ با «فقط موبایل» فرم OTP مستقیم؛ با «هر دو خاموش» پیام
  «هیچ روش ورودی فعال نیست» و صفر فیلد. سپس هر دو به حالت فعال برگردانده شد.
- پنل مدیر: هر دو توگل رندر شدند (`checkbox: 2`).
- `python3 scripts/check_api_docs.py` → exit 0 (بدون مسیر بدون `@ApiOperation`).

## ۱۴۰۵/۰۷/۲۷ — ورود/ثبت‌نام: نمایش فقط فیلد کد یکبار مصرف پس از شماره موبایل — نسخه `v2.79.1`

**هدف:** «درخواست جدید» — در `/login` برای کاربر جدید، پس از وارد کردن شماره
موبایل فقط فیلد ورود کد OTP نمایش داده شود.

**تغییرات:**
- `apps/web/components/auth/AuthForm.tsx`: مرحله‌ی `code` فقط فیلد کد را نشان
  می‌دهد؛ فیلدهای نام و ایمیل به مرحله‌ی جدید `profile` منتقل شدند. پس از
  تأیید کد برای شماره‌ی جدید، API کد `FULLNAME_REQUIRED` می‌دهد (کد OTP مصرف
  نمی‌شود)، بنابراین فرم به مرحله‌ی `profile` می‌رود و کاربر با همان کد، نام و
  ایمیل را وارد و حساب را می‌سازد. شماره‌های قبلی مستقیم وارد می‌شوند.
  ارسال فیلدهای نام/ایمیل فقط وقتی پر باشند انجام می‌شود و پیام‌های
  `FULLNAME_REQUIRED`/`EMAIL_REQUIRED`/`EMAIL_TAKEN` دیگر به‌صورت خطای قرمز
  نمایش داده نمی‌شوند (فقط هدایت به مرحله‌ی پروفایل).

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright روی `/login` با شماره‌ی جدید: مرحله‌ی کد فقط یک فیلد
  (`placeholder="------"`) دارد؛ پس از تأیید کد، فیلدهای «نام و نام خانوادگی»
  و «ایمیل» در مرحله‌ی جدا نمایش داده می‌شوند.
- با شماره‌ی موجود: پس از تأیید کد مستقیماً به `/dashboard` هدایت شد.

## ۱۴۰۵/۰۷/۲۷ — بازطراحی صفحه‌های عمومی بیولینک/کارت و اسلایدرهای خانه با طرح پنل جزئیات دایرکتوری — نسخه `v2.79.0`

**هدف:** «درخواست جدید» — بازطراحی سه سطح در موبایل/تبلت/دسکتاپ بر اساس طرح و
رنگ‌بندی پنل سمت چپ صفحه‌ی `http://localhost:3000/biolinks?biolink=sample-full-biolink`،
با رعایت کامل کاربرپسندی: ۱) صفحه‌ی `http://localhost:3000/biolinks/sample-full-biolink`،
۲) صفحه‌ی `http://localhost:3000/business-cards/sample-full-card`، ۳) بخش‌های
«آخرین کارت‌های ویزیت» و «آخرین بیولینک‌ها» در `http://localhost:3000/`.

**تغییرات:**
- `apps/web/components/ui/RecordCard.tsx` (فایل جدید): کامپوننت مشترک «رکورد» با
  زبان بصری پنل جزئیات (سطح کرم داخل قاب خط‌چین رنگی، آواتار مربعِ گوشه‌گرد،
  عنوان درشت، چیپ‌های شهر/کسب‌وکار، ردیف‌های برچسب‌دار آیکن‌دار و آیکن‌های
  تماس دایره‌ای). گزینه‌های `compact` (برای اسلایدرها)، `headingLevel` (صفحات
  عمومی `h1` برای SEO و اسلایدرها `p` برای جلوگیری از شلوغی outline) و `footer`.
- `apps/web/lib/card-spectrum.ts`: افزودن `readableAccent` — تیره‌کردن گام‌به‌گام
  رنگ انتخابی صاحب کارت تا خوانا شدن روی کاغذ کرم، با حفظ همان فام؛ بنابراین
  تم «طیفی» همچنان هویت رنگی خود را دارد ولی متن/آیکن‌ها خوانا می‌مانند.
- `apps/web/components/biolink/PublicBiolinkView.tsx`: بازنویسی کامل با `RecordCard`؛
  حذف تم تمام‌صفحه‌ی کارت و جایگزینی با پس‌زمینه‌ی کاغذی خود سایت، هدر شبیه پنل
  (پیل‌های بازگشت/اشتراک/صفحه اصلی)، بلوک اشتراک/QR هم‌سبک پنل و دکمه‌ی لینک
  کارت ویزیت در فوتر رکورد.
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: همان بازطراحی
  برای کارت ویزیت (عنوان = عنوان شغلی، زیرعنوان = «به مدیریت …»).
- `apps/web/components/home/HomeItemSlider.tsx`: کارت‌های هر اسلاید از طرح دو-روی
  spectrum به `RecordCard` فشرده تغییر کردند (همان ردیف‌های آیکن‌دار و چیپ‌ها)،
  با حفظ کامل سوایپ لمسی، درگ ماوس، فلش‌ها و نقطه‌ها؛ حذف تلفن از `href` داخل
  کارتِ لینک‌شده تا تودرتویی anchor رخ ندهد.
- `apps/web/components/biolink/LiveBiolinkPreview.tsx` و
  `apps/web/components/businesscard/LiveBusinessCardPreview.tsx`: پیش‌نمایش زنده‌ی
  فرم‌های ساخت، همین `RecordCard` را رندر می‌کند تا بیلدر دقیقاً همان چیزی را
  نشان دهد که بازدیدکننده می‌بیند.
- `apps/web/components/ui/OwnerEditButton.tsx`: استفاده از کلاس مشترک `record-pill`
  و حذف prop قدیمی `variant` (کلاس‌های `theme-panel`/`bc-panel` بی‌استفاده شده بودند).
- `apps/web/app/globals.css`: افزودن بلوک‌های `.record-card*` (سطح، هدر، آواتار،
  چیپ، ردیف‌ها، آیکن‌های اجتماعی، حالت `compact`)، `.record-page*`/`.record-pill`/
  `.record-panel` (پوسته‌ی صفحات عمومی و پیله‌های هدر/اشتراک)، چیدمان فشرده‌ی
  `data-compact` برای رکورد، و حذف استایل‌های بی‌استفاده‌ی `.spectrum-face`/
  `-lbl`/`-title`/`-manager`/`-rows`/`-logo`/`-mg`؛ فلش‌ها و نقطه‌های اسلایدر
  هم به پالت وینتیج (تراکوتا روی کاغذ) منتقل شدند.
- `apps/web/lib/version.ts`: بردن نسخه به `v2.79.0`.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- Playwright (playwright-core + `/usr/bin/google-chrome`) روی سه صفحه در عرض‌های
  ۳۶۰/۳۹۰/۸۳۴/۱۴۴۰: هر سه `200`، سرریز افقی صفر، ارتفاع سند دقیقاً برابر ویوپورت
  (بدون اسکرول کل صفحه). در هر دو صفحه‌ی عمومی: ۵ ردیف آیکن‌دار، ۵ آیکن اجتماعی،
  ۱ QR، ۳ پیل هدر، چیپ‌های درست، و وجود `h1` برای SEO؛ در ۳۹۰px حالت
  `data-compact` فعال و همه‌چیز در یک صفحه جا می‌شود.
- صفحه‌ی اصلی در عرض‌های مذکور: ۱۲ اسلاید (۶ کارت + ۶ بیولینک)، ۱۲ `record-card`
  داخل ریل، ۱۲ نقطه و ۴ فلش؛ سرریز افقی صفحه صفر و outline صفحه فقط شامل
  عناوین بخش‌ها (کارت‌های اسلایدر `h2` تولید نمی‌کنند). رنگ اکسنت کارت نمونه‌ی
  بیولینک `#8b3a1a` (وینتیج) و کارت نمونه `#0f766e` (طیفی، خوانا شده) تأیید شد.
- دایرکتوری `/biolinks?biolink=sample-full-biolink` دست‌نخورده و سالم (`200`،
  پنل جزئیات موجود).
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق»
  (`patched: 0 / added: 0`).
- `python3 scripts/check_api_docs.py` → «کنترلرها: ۲۲ | مسیرها: ۲۱۱» (exit 0)؛
  این تغییر API نبود.

## ۱۴۰۵/۰۷/۲۷ — نصب/تکمیل Swagger و مستندسازی کامل API + وظیفه دائمی به‌روزرسانی — نسخه `v2.78.0`

**هدف:** «درخواست جدید» — نصب Swagger و داکیومنتیشن کامل، و افزودن «به‌روزرسانی
مستندات پس از افزودن API جدید» به‌عنوان وظیفه‌ی دائمی ایجنت.

**تغییرات:**
- `apps/api/src/main.ts`: غنی‌سازی پیکربندی Swagger — توضیح فارسی قرارداد پاسخ
  (`{ success, data }`) و نحوه‌ی احراز هویت، `setVersion` از متغیر `APP_VERSION`،
  طرح امنیتی bearer با نام `bearer`، `addServer`، و ۲۱ برچسب با توضیح فارسی
  (`auth`، `biolinks`، `business-cards`، `feeds`، `news`، `boost`، `ads`، …)؛
  فعال‌سازی `persistAuthorization` و `displayRequestDuration` و تعیین صریح مسیر
  `api/docs-json`.
- `apps/api/src/health/health.controller.ts` و `apps/api/src/users/users.controller.ts`:
  افزودن `@ApiOperation` به دو مسیری که `summary` نداشتند.
- `apps/api/src/common/dto/pagination.dto.ts`: افزودن `@ApiPropertyOptional` به
  فیلدهای `page`/`limit`.
- `docs/API.md` (فایل جدید): راهنمای کامل Swagger — آدرس‌ها، `ENABLE_SWAGGER`،
  احراز هویت، قرارداد پاسخ، بررسی کامل‌بودن و وظیفه‌ی دائمی (قانون ۸).
- `AGENTS.md`: افزودن **قانون ۸ — به‌روز نگه‌داشتن مستندات API (Swagger)**.
- `scripts/check_api_docs.py` (فایل جدید): بررسی خودکار اینکه هر مسیر
  `@ApiOperation` و هر کنترلر `@ApiTags` دارد (برای CI/پیش‌کامیت).
- `README.md` و `docs/DEVELOPMENT.md`: افزودن آدرس `api/docs-json` و ارجاع به
  `docs/API.md`.

**تأیید/تست:**
- پیش از این کار Swagger از قبل نصب بود؛ پس از ری‌استارت API: `GET /api/docs`
  و `GET /api/docs-json` هر دو `200`.
- بررسی `docs-json`: ۱۷۶ مسیر، ۲۱ برچسب همه با `description`، **صفر مسیر بدون
  `summary`**، و طرح امنیتی `bearer` (http/JWT).
- `python3 scripts/check_api_docs.py` → «کنترلرها: ۲۲ | مسیرها: ۲۱۱ — همه‌ی
  مسیرها مستندند» (exit 0)؛ صحت اسکریپت با حذف موقت یک `@ApiOperation` بررسی شد
  (خروجی خطا و exit 1) و سپس بازگردانده شد.
- `docker exec alooshomal-api ... tsc --noEmit` بدون خطا.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — بازطراحی چیدمان کارت ویزیت و بیولینک (ترتیب فیلدها، آیکن‌ها، پرکردن ارتفاع) — نسخه `v2.77.0`

**هدف:** دو درخواست مرتبط با چیدمان صفحات عمومی که فایل‌های مشترک
(`globals.css`، `FitContent`/`CardFit`) دارند:
۱) کارت ویزیت: حذف نمایش لوگو، طبقه‌بندی بالا/پایین طبق فهرست خواسته‌شده و
نمایش لینک‌ها فقط به‌صورت آیکن.
۲) بیولینک: کشیده‌شدن تا تمام ارتفاع صفحه، دوستونه‌بودن لینک‌ها با جاستیفای
از سمت آیکن‌ها و حذف لوگوها.

**تغییرات:**
- `apps/web/components/businesscard/ThemedBusinessCard.tsx`: حذف لوگو از هر دو
  حالت (عمومی و قابل‌ویرایش)؛ بازچینش بالای کارت به‌ترتیب «نام کسب‌وکار
  (عنوان شغلی) ← به مدیریت ‹نام› ← شرکت»؛ پایین کارت به‌ترتیب ردیف‌های برچسب‌دار
  «تلفن همراه، تلفن ثابت، آدرس»؛ و ادغام ایمیل/وب‌سایت/واتساپ/شبکه‌های اجتماعی
  در یک نوار آیکن‌محور (`bc-iconbar`) — همه‌ی لینک‌ها فقط آیکن.
- `apps/web/components/biolink/ThemedBiolink.tsx`: حذف لوگو از هر دو حالت؛ تبدیل
  نوار لینک‌ها به شبکه‌ی دوستونه با `justify-content: flex-start` (آیکن چسبیده به
  ابتدای هر پیل) و حذف فلش انتهایی.
- `apps/web/app/globals.css`: قواعد `.bc-manager`/`.bc-contact-value`، قواعد
  فشرده‌ی جدید برای `bc-rows`/`bc-iconbar`، `.theme-links-2col` (دو ستون و
  جاستیفای از سمت آیکن) و بلوک `.card-public-scroll[data-fill]` که بدنه‌ی کارت را
  تمام‌ارتفاع کرده و فضای اضافی را بین ردیف‌های شبکه‌ی لینک پخش می‌کند.
- `apps/web/components/ui/FitContent.tsx` و `apps/web/components/ui/CardFit.tsx`:
  افزودن گزینه‌ی `fill` — وقتی محتوا از فضای آزاد کوتاه‌تر است، ناحیه به کل ارتفاع
  موجود کشیده می‌شود (`data-fill`) و به فرزند `height: 100%` می‌دهد.
- `apps/web/components/biolink/PublicBiolinkView.tsx`: استفاده از `<CardFit fill>`.

**تأیید/تست:**
- `docker exec alooshomal-web ... tsc --noEmit` بدون خطا.
- با `playwright-core` روی کارت نمونه: ترتیب بالا «مدیر فنی و مشاور… ← به مدیریت
  آرش نیک‌پور ← گروه فناوری شمالی کارت» و ردیف‌های پایین دقیقاً «تلفن همراه، تلفن
  ثابت، آدرس»؛ ۷ آیکن لینک؛ صفر تصویر لوگو.
- بیولینک نمونه: `data-fill` فعال، `theme-links` دوستونه (`222.5px 222.5px` و در
  موبایل `161.5px 161.5px`)، لینک‌ها `justify-content: flex-start` و آیکن چسبیده
  به ابتدای پیل؛ بدنه‌ی کارت تمام‌ارتفاع بدون اسکرول سند؛ صفر لوگو.
- صفحات `biolink-full`/`biolink-low`/`card-full`/`card-low` و نمای «کاشی» هر دو
  دایرکتوری در عرض‌های ۱۴۴۰/۱۲۸۰/۷۶۸/۳۹۰: همه ۲۰۰، بدون سرریز افقی، بدون لوگو.
  پنل جزئیات دایرکتوری هم همچنان بدون اسکرول داخلی است.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — حذف اسکرول پنل جزئیات دایرکتوری — نسخه `v2.76.2`

**هدف:** در `http://localhost:3000/business-cards?card=sample-full-card` و
`http://localhost:3000/biolinks?biolink=sample-full-biolink` پنل جزئیات سمت چپ
به‌هیچ‌وجه اسکرول نخورد و همه‌ی رکورد در همان یک صفحه جا شود.

**تغییرات:**
- `apps/web/components/ui/FitContent.tsx` (فایل جدید): منطق «جا‌شدن در یک صفحه»
  از `CardFit` استخراج شد به یک کامپوننت مشترک — اندازه‌گیری ارتفاع طبیعی محتوا
  در برابر فضای آزاد والد منهای ارتفاع siblingها، فعال‌سازی چیدمان فشرده
  (`data-compact`) و سپس مقیاس‌کردن با `transform: scale`؛ اکنون پدینگ/بوردر خودِ
  ناحیه هم از فضای آزاد کم می‌شود و ارتفاع رزرو‌شده شامل همان پدینگ است تا مرز
  دوباره اسکرول نخورد.
- `apps/web/components/ui/CardFit.tsx`: بازنویسی به‌صورت پوسته‌ای نازک روی
  `FitContent` (همان API قبلی برای صفحات عمومی؛ کلاس `card-public-scroll` و
  آینه‌کردن `data-compact` روی والد).
- `apps/web/components/biolink/DirectoryDetail.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: ناحیه‌ی
  محتوای پنل داخل `FitContent` با کلاس `dir-detail-scroll` و `minScale=0.7`.
- `apps/web/app/globals.css`: قواعد فشرده‌سازی `.dir-detail-scroll[data-compact]`
  (پدینگ، اندازه‌ی آواتار/آیکن‌ها/دکمه‌ها، فاصله‌های عمودی) و
  `.dir-detail-scroll[data-fits] { overflow: hidden }`.

**تأیید/تست:**
- `docker exec alooshomal-web ... tsc --noEmit` بدون خطا.
- با `playwright-core` روی رکوردهای پرفیلد در عرض‌های ۱۴۴۰/۱۲۸۰/۱۰۲۴/۹۰۰/۷۶۸:
  `overflowY` ناحیه‌ی جزئیات `hidden` است، آخرین عنصر کاملاً داخل کادر پنل
  (`clippedBottom` منفی) و رکورد «کم‌فیلد» بدون فعال‌شدن چیدمان فشرده سالم است.
  در موبایل (۳۹۰px) جزئیات در bottom-sheet بدون اسکرول داخلی رندر می‌شود.
- پس از ریفکتور، صفحات عمومی (`/biolinks/sample-full-biolink` و
  `/business-cards/sample-full-card`) در عرض‌های ۳۲۰/۳۹۰/۷۶۸/۱۲۸۰ بدون تغییر و
  بدون اسکرول سند باقی ماندند.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — حذف دکمه‌های دایرکتوری از صفحه‌ی «ذخیره‌شده‌های من» — نسخه `v2.76.1`

**هدف:** در `/dashboard/saved` دو دکمه‌ی «دایرکتوری بیولینک» و «دایرکتوری کارت
ویزیت» به‌طور کامل حذف شوند.

**تغییرات:**
- `apps/web/app/dashboard/saved/page.tsx`: حذف بلوک پایانی که دو لینک دایرکتوری
  را کنار هم نمایش می‌داد.

**تأیید/تست:**
- با `playwright-core` روی `http://localhost:3000/dashboard/saved` (کاربر نمونه):
  شمارش متن «دایرکتوری بیولینک» و «دایرکتوری کارت ویزیت» صفر شد.
- `docker exec alooshomal-web ... tsc --noEmit` بدون خطا.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — ادیتور مینیمال HTML در فید و حذف نمایش «بسته فعال» — نسخه `v2.76.0`

**هدف:** در `/dashboard/feeds` ۱) خط «بسته فعال: اشتراک یک‌ماهه ۵ پست» حذف شود،
۲) یک ادیتور مینیمال متنی/HTML برای نوشتن پست اضافه شود.

**تغییرات:**
- `apps/web/lib/rich-text.ts` (فایل جدید): کمک‌تابع‌های متن غنی — `sanitizeHtml`
  با allow-list کوچک (b/strong/i/em/u/s/br/p/div/span/ul/ol/li/a/blockquote/code/
  pre/h2/h3)، حذف کامل تگ‌های خطرناک (script/style/iframe/... )، پاک‌سازی
  `javascript:` و پراپرتی‌های رویداد، `bodyToHtml` برای ارتقای پست‌های متن ساده‌ی
  قدیمی (تبدیل خط جدید به `<br>`)، `isRichTextEmpty` و `richTextPreview`.
- `apps/web/components/ui/RichTextEditor.tsx` (فایل جدید): ادیتور `contentEditable`
  بدون وابستگی با نوار ابزار درشت/کج/زیرخط/خط‌خورده، فهرست نقطه‌ای و شماره‌دار و
  درج لینک؛ هندلر `onPaste` محتوای چسبانده‌شده را از allow-list عبور می‌دهد تا
  `onerror`/اسکریپت اجرا نشود.
- `apps/web/app/dashboard/feeds/page.tsx`: جایگزینی `textarea` با `RichTextEditor`،
  پاک‌سازی بدنه پیش از ارسال، استفاده از `richTextPreview` در کارت‌های «پست‌های
  من» و حذف بلوک «بسته فعال» از نوار وضعیت.
- `apps/web/app/globals.css`: استایل `.rich-editor` (نوار ابزار، سطح ویرایش،
  placeholder) و `.feed-rich` (نمایش ایمن پست).
- `apps/web/components/feed/FeedCard.tsx` و `apps/web/app/feeds/[id]/page.tsx`:
  رندر بدنه با `dangerouslySetInnerHTML` از روی `bodyToHtml` (پاک‌سازی‌شده) به‌جای
  متن خام.
- `apps/web/components/admin/AdminFeeds.tsx`: نمایش پیش‌نمایش متن ساده با
  `richTextPreview`.
- `apps/api/src/feeds/dto/feed.dto.ts`: افزایش سقف `body` از ۲۰۰۰ به ۸۰۰۰ کاراکتر
  تا مارک‌آپ HTML هم جا شود.

**تأیید/تست:**
- `docker exec alooshomal-web ... tsc --noEmit` بدون خطا.
- با `playwright-core` روی `/dashboard/feeds`: ادیتور و هر هفت ابزار آن رندر
  می‌شوند، متن «بسته فعال» دیگر وجود ندارد و اعمال «درشت» خروجی `<b>…</b>` می‌دهد.
- ثبت یک پست آزمایشی با محتوای مخرب (`<script>`، `<img onerror>` و
  `href="javascript:"`): بدنه‌ی ذخیره‌شده فقط شامل `<b>`، `<ul>` و لینک بی‌خطر بود؛
  اسکریپت/تصویر حذف و آدرس جاوااسکریپت پاک شد. چسباندن محتوای مخرب هم فقط `<b>ok</b>`
  را درج کرد و هندلر اجرا نشد. سپس پست آزمایشی حذف شد.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — انتقال دکمه‌های عملیات جدول به زیر سطر اول در موبایل و تبلت — نسخه `v2.75.2`

**هدف:** در `/dashboard/business-cards`، `/dashboard/boost` و
`/dashboard/biolinks` در حالت موبایل و تبلت، شش دکمه‌ی ستون «عملیات» که در سمت
چپ قرار دارند به زیر سطر اول (زیر عنوان و متادیتای همان رکورد) منتقل شوند تا
پیمایش افقی لازم نباشد.

**تغییرات:**
- `apps/web/app/globals.css`: قواعد جدید زیر پیشوند `.dash-table` در
  `max-width: 1023px` — جدول `display:block` می‌شود (بدون `min-width`)، تیتر
  مخفی، هر رکورد به یک کارت تبدیل می‌شود، سلول‌های متادیتا با برچسب
  (`data-label`) به‌صورت چیپ‌های درون‌خطی و سلول `dash-actions` به‌صورت یک ردیف
  تمام‌عرض با خط جداکننده‌ی بالایی نمایش داده می‌شود.
- `apps/web/components/dashboard/MyItemsTable.tsx`: افزودن کلاس `dash-table` به
  جدول، کلاس `dash-actions` به سلول عملیات و `data-label` به سلول‌های وضعیت،
  جایگاه، بازدید و لایک/ذخیره.
- `apps/web/components/dashboard/BoostTable.tsx`: همان تغییرات روی جدول
  «افزایش بازدید» (وضعیت، جایگاه، بازدید، لایک، آخرین پله + سلول عملیات).

**تأیید/تست:**
- با `playwright-core` و `/usr/bin/google-chrome` روی سه صفحه در عرض‌های ۳۹۰ و
  ۷۶۸ پیکسل: `docOverflow=false`، عرض جدول برابر عرض والد (۳۵۴/۷۱۶) و سلول
  عملیات تمام‌عرض با `display:block`. هیچ سرریز افقی یا اسکرول جانبی وجود ندارد.
- در ۳۹۰px بررسی شد که شش دکمه‌ی عملیات داخل سلول (۳۲۸px) می‌پیچند و از لبه
  بیرون نمی‌زنند (`overflowInside=false`).
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — هم‌رنگ‌کردن دکمه‌های «ساخت» داشبورد با تم — نسخه `v2.75.1`

**هدف:** در `/dashboard` دکمه‌های «ساخت بیولینک» و «ساخت کارت ویزیت» رنگ
پس‌زمینه‌ی تم (accent) را بگیرند تا به‌عنوان اقدام اصلی برجسته شوند.

**تغییرات:**
- `apps/web/app/dashboard/page.tsx`: تغییر کلاس دو دکمه‌ی «ساخت بیولینک» و
  «ساخت کارت ویزیت» از `indeed-btn-secondary` به `indeed-btn-primary` (رنگ
  `--vintage-accent`).

**تأیید/تست:**
- با `playwright-core` و `/usr/bin/google-chrome` روی `http://localhost:3000/dashboard`
  (ورود با کاربر نمونه): پس‌زمینه‌ی رنگ محاسبه‌شده‌ی دکمه‌های «ساخت بیولینک» و
  «ساخت کارت ویزیت» از `rgb(255, 250, 242)` به `rgb(139, 58, 26)` (نارنجی آجری تم)
  تغییر کرد و دو دکمه‌ی دایرکتوری همچنان `secondary` ماندند.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — نمایش تمام فیلدهای بیولینک و جا‌شدن کارت‌های پرفیلد در یک صفحه — نسخه `v2.75.0`

**هدف:** «درخواست جدید» — ۱) یک بیولینک و کارت ویزیت نمونه با تمامی فیلدها ساخته
شود، ۲) محتوای داخل بیولینک و کارت آن‌قدر کوچک و متناسب شود که نیاز به اسکرول
نداشته باشد.

**تغییرات:**
- `apps/web/components/biolink/ThemedBiolink.tsx`: نمایش سه فیلد جاافتاده در حالت
  عمومی — `jobTitle` هنگامی که `company` هم هست، `bio` و `address` — تا همه‌ی
  فیلدهای رکورد روی بیولینک دیده شوند (پیش‌تر فقط در فرم قابل‌ویرایش بودند).
- `apps/web/components/ui/CardFit.tsx` (فایل جدید): ناحیه‌ی اسکرول صفحه‌ی عمومی را
  اندازه‌گیری می‌کند (ارتفاع طبیعی محتوا در برابر فضای آزاد زیر نوار بالا و بلوک
  اشتراک‌گذاری که از siblingها خوانده می‌شود تا بازخورد/نوسان رخ ندهد)؛ در صورت
  سرریز، چیدمان فشرده را فعال و در صورت نیاز با `transform: scale` کوچک می‌کند؛
  چیدمان فشرده latch می‌شود و با تغییر عرض از نو ارزیابی می‌گردد.
- `apps/web/app/globals.css`: حذف حاشیه‌ی عمودی فرزندان `card-public-scroll`،
  قواعد چیدمان فشرده با انتخاب‌گر `.card-public-scroll[data-compact]` (فشرده‌سازی
  پدینگ/آواتار/تایتل، چیپ‌ها، شبکه‌ی دوستونی لینک‌های بیولینک، فوتر مخفی) و قواعد
  فشرده‌سازی نوار بالا و بلوک اشتراک‌گذاری با `[data-compact] > .card-public-*`.
- `apps/web/components/biolink/PublicBiolinkView.tsx` و
  `apps/web/components/businesscard/PublicBusinessCardView.tsx`: استفاده از
  `CardFit` به‌جای `div.card-public-scroll` و افزودن کلاس‌های `card-public-top` و
  `card-public-share` به نوار بالا و بلوک اشتراک‌گذاری.

**داده‌ی نمونه:** نمونه‌سازی فقط در دیتابیس محلی (بدون فایل کامیت‌شده)؛ یک کاربر
نمونه (`sample@alooshomal.local`، پلن «بلاس») با بیولینک `sample-full-biolink`
(تم `vintage`) و کارت ویزیت `sample-full-card` (تم `spectrum`) که هر دو تمام
فیلدها (نام، عنوان، شرکت، بیو، تلفن ثابت/همراه، ایمیل، وب‌سایت، آدرس، آواتار،
لوگو، شهر، کسب‌وکار و هر پنج شبکه‌ی اجتماعی) را دارند، از طریق API ساخته شد.

**تأیید/تست:**
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  بدون خطا.
- با `playwright-core` و `/usr/bin/google-chrome` روی صفحات نمونه: در عرض‌های
  ۳۶۰، ۳۷۵، ۳۹۰، ۴۱۴، ۷۶۸ و ۱۲۸۰ پیکسل هیچ سرریزِ عمودیِ سند و هیچ اسکرول داخلی
  ندارند (`doc=0`، کارت مقیاس‌شده کاملاً در کادر دیده می‌شود)؛ در ۳۲۰px (پایین‌تر
  از پهنای معتبر موبایل) به‌خاطر کفِ خوانایی `minScale=0.75` کارت به‌جای کوچک‌شدن
  بیش‌ازحد، اسکرول عادی می‌گیرد.
- صفحات کم‌فیلد موجود (`/biolinks/9032072`، `/business-cards/9095769`) بدون
  `data-compact` و بدون تغییر رندر می‌شوند؛ نمای کاشی دایرکتوری (۱۰ و ۸ کاشی) و
  بدون سرریز افقی سالم است.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — دکمه‌ی «ویرایش» مالک روی صفحات عمومی کارت ویزیت و بیولینک — نسخه `v2.74.0`

**هدف:** «درخواست جدید» — وقتی صاحب یک بیولینک/کارت ویزیت صفحه‌ی عمومی آن را
تماشا می‌کند، یک دکمه‌ی «ویرایش» برایش نمایش داده شود تا سریع به فرم ویرایش برود.

**تغییرات:**
- `apps/web/components/ui/OwnerEditButton.tsx` (فایل جدید): دکمه‌ی کلاینتی که فقط
  وقتی کاربر وارد‌شده و `user.id === ownerUserId` باشد رندر می‌شود (پس از
  hydration، هم‌الگو با `PlanUpgradeNotice` تا اختلاف SSR/CSR رخ ندهد) و به مسیر
  ویرایش داشبورد لینک می‌دهد؛ کلاس پیل بر اساس `variant` (`biolink`/`card`).
- `apps/web/components/biolink/PublicBiolinkView.tsx`: افزودن `OwnerEditButton`
  کنار نشان اشتراک در ردیف بالای صفحه با `href=/dashboard/biolinks/<id>/edit`.
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: همان دکمه با
  `variant="card"` و `href=/dashboard/business-cards/<id>/edit`.

**تأیید/تست:**
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  بدون خطا.
- با `playwright-core` و `/usr/bin/google-chrome`: وارد‌شده با حساب مالک
  (`admin@alooshomal.local`) روی `/business-cards/9095769` دکمه با aria-label
  «ویرایش این کارت ویزیت» و href `/dashboard/business-cards/cmvexrb.../edit` و روی
  `/biolinks/test-bl-mv50yfqu-2ptfu8` دکمه با href `/dashboard/biolinks/cmv50y.../edit`
  دیده شد؛ برای کاربر مهمان و برای کاربر غیرمالک (`demo@alooshomal.local`) روی هر
  دو صفحه دکمه رندر نشد.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — فشرده‌سازی سکشن‌های صفحه‌ی عمومی، انتقال اخطار ارتقا به بالا و مخفی‌کردن ایمیل در پلن رایگان — نسخه `v2.73.4`

**هدف:** «درخواست جدید» — در `/business-cards/<slug>` و `/biolinks/<slug>`:
۱) فاصله‌ی بین سکشن‌ها کم و فشرده شود، ۲) اخطار محدودیت نمایش/ارتقا (پلن رایگان)
در بالاترین سکشن نمایش داده شود، ۳) در اشتراک رایگان ایمیل هم نمایش داده نشود.

**تغییرات:**
- `apps/web/app/globals.css`: ناحیه‌ی `.card-public-scroll` از `flex: 1 1 auto` به
  `flex: 0 1 auto` تغییر کرد و `margin-block: auto` فرزندان به `0` رفت، تا
  کارت‌های کوتاه به‌جای پخش‌شدن در ارتفاع صفحه، سکشن‌ها را فشرده و کنار هم نگه
  دارند (کارت بلند همچنان درون همین ناحیه اسکرول می‌شود).
- `apps/web/components/businesscard/PublicBusinessCardView.tsx` و
  `apps/web/components/biolink/PublicBiolinkView.tsx`: بلوک `PlanUpgradeNotice`
  از میان صفحه به اولین فرزند `card-public-inner` منتقل شد تا بالاترین سکشن باشد.
- `apps/api/src/common/plans.ts`: افزودن `'email'` به `DEFAULT_HIDDEN_LINK_FIELDS`
  و به‌روزرسانی متن ویژگی پلن رایگان («عدم نمایش لینک‌ها، شبکه‌های اجتماعی،
  وب‌سایت و ایمیل»).
- `apps/api/src/subscriptions/subscriptions.service.ts`: افزودن
  `backfillFreeEmailHidden()` که در `onModuleInit` اجرا می‌شود و به پلن‌های بدون
  `showSocialLinks` که فهرست فیلدهای مخفی دارند ولی `email` در آن‌ها نیست،
  «ایمیل» را اضافه می‌کند (بدون دست‌زدن به فهرست‌های دست‌سازِ بدون لینک).

**تأیید/تست:**
- `docker exec alooshomal-api ... tsc --noEmit -p tsconfig.json` و همان برای web →
  هر دو بدون خطا.
- پس از `docker restart alooshomal-api`، مهاجرت اجرا و در `subscription_plans`
  مقدار پلن «رایگان» به `{website,linkedin,instagram,telegram,twitter,whatsapp,email}`
  به‌روز شد (اکو/بلاس دست‌نخورده).
- با `playwright-core` و `/usr/bin/google-chrome` روی
  `/business-cards/9095769` و `/biolinks/test-bl-mv50yfqd-hzab1v`: فاصله‌ی بین
  سکشن‌ها `[12,16,12]` پیکسل (فشرده)، `emailShown === false`، و با ورود به‌عنوان
  مالک کارت (پلن رایگان) اخطار «جهت نمایش کامل…» نخستین فرزند `card-public-inner`
  بود و در بالاترین سکشن رندر شد. در موبایل (۳۹۰px) هم بدون سرریز افقی و بدون
  اسکرولِ اضافه‌ی پوسته.

## ۱۴۰۵/۰۷/۲۷ — اصلاح فرم‌های ساخت کارت ویزیت/بیولینک — نسخه `v2.73.3`

**هدف:** «درخواست جدید» — در `/dashboard/business-cards/new` و
`/dashboard/biolinks/new`: اختیاری‌شدن تلفن ثابت، تغییر برچسب «نام و نام
خانوادگی» به «به مدیریت»، حذف آپلود لوگو، مربعی‌کردن آواتار با گردی گوشه‌ی خودِ
کارت، و عریض‌ترشدن ستون پیش‌نمایش در دسکتاپ.

**تغییرات:**
- `apps/web/components/businesscard/BusinessCardForm.tsx` و
  `apps/web/components/biolink/BiolinkForm.tsx`: حذف `values.phone.trim()` از
  `requiredOk` و برداشتن `required` از فیلد «تلفن ثابت» (برچسب بدون ستاره)؛
  تغییر برچسب «نام و نام خانوادگی *» به «به مدیریت *» در هر دو شاخه‌ی `inline`
  و غیر آن؛ حذف کامل بلوک `ImageUpload` مربوط به لوگو (فقط آپلود پروفایل ماند)؛
  برداشتن prop `round` از آپلود پروفایل؛ عرض ستون پیش‌نمایش از
  `lg:grid-cols-[1fr_400px]`/`lg:grid-cols-[420px_1fr]` به `...480px` افزایش یافت.
- `apps/web/components/businesscard/ThemedBusinessCard.tsx` و
  `apps/web/components/biolink/ThemedBiolink.tsx`: آواتار از `rounded-full` به
  مربعِ با گوشه‌ی گرد تغییر کرد و شعاع آن به متغیر تم (`--bc-radius` /
  `--biolink-radius`) گره خورد تا با گردی گوشه‌ی خود کارت هم‌اندازه باشد (در هر
  دو حالت نمایش/ویرایش).

**تأیید/تست:**
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  بدون خطا.
- با `playwright-core` و `/usr/bin/google-chrome` پس از ورود با حساب دمو روی هر
  دو صفحه‌ی `new`: کلاس شبکه `lg:grid-cols-[1fr_480px]`، برچسب «به مدیریت *»
  موجود و «نام و نام خانوادگی» حذف‌شده، فیلد «تلفن ثابت» بدون `required`، تنها
  یک `input[type=file]` (پروفایل) و بدون آپلود لوگو، و شعاع آواتار `14px`
  (هم‌اندازه‌ی `--vintage-radius` کارت) گزارش شد.

## ۱۴۰۵/۰۷/۲۷ — هیرو صفحه‌ی اصلی: حذف هاله‌ی نور و بازگرداندن کادر جستجوی روشن — نسخه `v2.73.2`

**هدف:** «درخواست جدید» — پس‌زمینه‌ی هیرو صفحه‌ی اصلی بدون هاله/افکت نور باشد و
پس‌زمینه‌ی کادر جستجو (به‌جز خود دکمه) همچون قبل روشن شود.

**تغییرات:**
- `apps/web/app/globals.css`: حذف کامل شبه‌عنصرهای `.home-hero::before` و
  `.home-hero::after` (هاله‌های محو بنفش/آبی پشت محتوای هیرو).
- `apps/web/components/home/HomeSearchBox.tsx`: بازگرداندن پس‌زمینه‌ی فرم به
  `bg-white` و رنگ متن/آیکون/placeholder به توکن‌های قبلی؛ دکمه‌ی «جستجو» با
  `bg-brand` و رنگ سفید دست‌نخورده ماند.

**تأیید/تست:**
- با `playwright-core` و `/usr/bin/google-chrome` روی `http://localhost:3000/`:
  `getComputedStyle(hero, '::before'/'::after').content === 'none'`، پس‌زمینه‌ی
  هیرو `rgb(139, 58, 26)`، پس‌زمینه‌ی فرم `rgb(255, 255, 255)` و دکمه
  `rgb(139, 58, 26)`.
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  بدون خطا.

## ۱۴۰۵/۰۷/۲۷ — تغییر پس‌زمینه‌ی کادر جستجوی صفحه‌ی اصلی به رنگ دکمه‌ی جستجو — نسخه `v2.73.1`

**هدف:** «درخواست جدید» — در `http://localhost:3000/` فقط رنگ پس‌زمینه‌ی کادر
جستجو دقیقاً به رنگ دکمه‌ی «جستجو» تغییر کند، بدون هیچ افکت اضافه.

**تغییرات:**
- `apps/web/components/home/HomeSearchBox.tsx`: پس‌زمینه‌ی `bg-white` فرم به
  `bg-brand` (رنگ دکمه) تغییر کرد؛ رنگ متن/آیکون فیلدها به `text-white` و متن
  placeholder به `text-white` رفت تا روی زمینه‌ی تیره خوانا بماند؛ گزینه‌های
  `<option>` فهرست بازشو `text-ink` ماندند. بدون افزودن حاشیه، سایه، شفافیت یا
  گرادیان تازه.

**تأیید/تست:**
- با `playwright-core` و `/usr/bin/google-chrome` روی `http://localhost:3000/`:
  `getComputedStyle` نشان داد پس‌زمینه‌ی فرم و دکمه هر دو `rgb(139, 58, 26)`
  (`same: true`) و رنگ ورودی `rgb(255, 255, 255)` است.
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  بدون خطا.

## ۱۴۰۵/۰۷/۲۷ — تم «طیفی» کارت ویزیت/بیولینک، انتخاب رنگ سازنده و نمای کاشی دایرکتوری — نسخه `v2.73.0`

**هدف:** «درخواست جدید» — بر پایه‌ی دو فایل نمونه‌ی `/home/mohammad/Downloads/spectrum-v8.html`
(کارت ویزیت) و `biolink-single-v2.html` (بیولینک) یک تم رنگی مشترک به نام «طیفی» ساخته
شود؛ سازنده هنگام ساخت کارت/بیولینک بتواند تم و رنگ خود را انتخاب کند؛ و در صفحات
`/business-cards` و `/biolinks` دو سبک نمایش فراهم شود: (۱) سبک فعلی (لیست/جزئیات) و
(۲) نمای کاشی‌کاری که همه‌ی کارت‌ها را با تم انتخاب‌شده‌ی سازنده کنار هم می‌چیند.

**تغییرات:**
- `apps/web/lib/card-spectrum.ts` (فایل جدید): پالت ۱۴رنگه‌ی spectrum (جفت bg/fg) مطابق
  هر دو فایل نمونه، به‌همراه `SPECTRUM_THEME_KEY`، `hashString`، `spectrumColorAt`،
  `spectrumColorByBg`، `contrastText`، `cardPalette` و `spectrumStyleVars` که متغیرهای
  `--spectrum-bg/--spectrum-fg` را تولید می‌کند.
- `apps/web/components/ui/SpectrumColorPicker.tsx` (فایل جدید): پیکر ۱۴رنگه با `title`
  فارسی هر رنگ و `aria-pressed`.
- `apps/web/lib/themes.ts`: افزودن تم «طیفی (انتخاب رنگ)» به `BIOLINK_THEMES` و
  `BUSINESS_CARD_THEMES`؛ جایگزینی `THEME_SELECTION_LOCKED` با `ENABLED_THEME_KEYS`
  (`vintage` + `spectrum`) و فیلتر کردن فهرست تم‌های قابل‌انتخاب.
- `apps/web/components/biolink/ThemedBiolink.tsx` و
  `apps/web/components/businesscard/ThemedBusinessCard.tsx`: اعمال `spectrumStyleVars`
  روی ریشه‌ی هر دو حالت نمایش/ویرایش.
- `apps/web/components/biolink/PublicBiolinkView.tsx` و
  `apps/web/components/businesscard/PublicBusinessCardView.tsx`: اعمال همان متغیرها روی
  پوشش صفحه‌ی عمومی.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: افزودن `selectTheme`، شبکه‌ی
  دکمه‌های انتخاب تم و `SpectrumColorPicker` (برای طیفی) یا ورودی رنگ (برای وینتیج) در
  هر دو شاخه‌ی فرم (`inline` و غیر آن).
- `apps/web/app/globals.css`: افزودن `.theme-spectrum` و `.bc-theme-spectrum`
  (قاب خط‌چین، اسکن‌لاین، رنگ آواتار/دکمه/شبکه‌های اجتماعی و پس‌زمینه‌ی تیره‌ی رنگ‌آمیخته)
  و استایل‌های نمای کاشی (`.directory-view-switch`, `.directory-tiles`, `.directory-tiles-grid`
  با `repeat(auto-fill,minmax(280px,1fr))`, `.directory-tile`).
- `apps/web/lib/directory-view.ts` (فایل جدید): هوک `useDirectoryView` با ذخیره‌ی
  `alooshomal:directory-view` در localStorage (پیش‌فرض `list`).
- `apps/web/components/ui/DirectoryViewSwitch.tsx` (فایل جدید): سوییچ «لیست/کاشی».
- `apps/web/components/businesscard/DirectoryBusinessCardTile.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkTile.tsx` (فایل‌های جدید): کاشی‌های
  دایرکتوری که `ThemedBusinessCard`/`ThemedBiolink` را با تم ذخیره‌شده‌ی صاحب کارت
  رندر می‌کنند و کل کاشی لینک به صفحه‌ی عمومی است.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: افزودن `DirectoryViewSwitch`
  به سربرگ و شاخه‌ی نمای کاشی در کنار نمای فعلی.
- `apps/web/lib/api.ts`: افزودن فیلدهای اختیاری `city`/`business` به تایپ‌های دایرکتوری.
- `apps/api/src/businesscards/business-cards.service.ts` و
  `apps/api/src/biolinks/biolinks.service.ts`: افزودن `city`/`business` به selectهای
  `loadDirectoryPage` و اینترفیس‌های آیتم دایرکتوری.

**تأیید/تست:**
- `docker exec alooshomal-web sh -lc 'cd /usr/src/app && ./node_modules/.bin/tsc --noEmit'`
  و همان برای `alooshomal-api` → هر دو بدون خطا.
- API: `city`/`business` در پاسخ‌های `/business-cards/public` و `/biolinks/public`
  برگردانده می‌شود.
- با `playwright-core` و `/usr/bin/google-chrome`: صفحه‌ی عمومی کارت نمونه کلاس
  `bc-theme-spectrum` و متغیرهای درون‌خطی رنگ را گرفت؛ بیولینک عمومی نیز
  `theme-spectrum` با لینک اول پرشده رندر شد.
- نمای کاشی: ۷ کاشی کارت و ۲۰ کاشی بیولینک، در عرض‌های ۳۹۰/۷۶۸/۱۴۴۰ به‌ترتیب
  ۱/۲/۳ ستون و بدون سرریز افقی؛ کلیک روی کاشی به صفحه‌ی عمومی همان کارت می‌رود.
- فرم سازنده: دکمه‌ی `button[title="طیفی (انتخاب رنگ)"]` در
  `/dashboard/business-cards/new` و `/dashboard/biolinks/new` موجود است و با کلیک روی
  `button[title="سبز"]` رنگ پیش‌نمایش بلافاصله از `rgb(250,223,163)` به `rgb(2,180,77)`
  تغییر می‌کند.
- `python3 scripts/sync_install.py` و سپس `--check` بدون «تغییر معلق».

## ۱۴۰۵/۰۷/۲۷ — نمایش کنار‌هم کارت‌های «آخرین کارت‌های ویزیت» و «آخرین بیولینک‌ها» (ریل افقی) — نسخه `v2.72.0`

**هدف:** «درخواست جدید» — در صفحه‌ی اصلی `http://localhost:3000/` بخش‌های «آخرین
کارت‌های ویزیت» و «آخرین بیولینک‌ها» دیگر تک‌کارتی نباشند؛ اسلایدر ۶تایی به‌صورت
ریل افقی نمایش داده شود و کارت‌ها **کنار هم** (چند کارت در یک ردیف) دیده شوند.

**تغییرات:**
- `apps/web/components/home/HomeItemSlider.tsx`: بازنویسی از حالت «تک‌اسلاید
  translateX» به یک ریل افقی scroll-snap که همه‌ی ۶ کارت را کنار هم می‌چیند؛
  فلش‌های قبلی/بعدی به هدر منتقل شدند و اکنون یک کارت جابه‌جا می‌کنند، نقطه‌ها
  با `scrollIntoView` به همان کارت می‌روند و اندیس فعال با پیمایش ریل (scroll)
  محاسبه می‌شود. سوایپ لمسی بومی (pan افقی) و درگ موس حفظ شد؛
  `prefers-reduced-motion` رعایت می‌شود.
- `apps/web/app/globals.css`: `.spectrum-shell` از یک کارت تکی به ریل افقی
  (`display:flex` + `overflow-x:auto` + `scroll-snap-type: x mandatory`)
  تبدیل شد؛ عرض کارت‌ها با `--spectrum-card: clamp(240px, 24vw, 320px)`
  تعیین می‌شود (تقریباً ۲ کارت در موبایل، ۳ در تبلت، ۴ در دسکتاپ)، فونت/اندازه‌ی
  عناصر کارت متناسب کوچک شد، فلش‌ها inline و کم‌حجم شدند و یک spacer پایانی
  (`::after`) اضافه شد تا آخرین کارت‌ها هم قابل پیمایش/اسنپ باشند. کلاس‌های
  بی‌استفاده‌ی `.spectrum-track`/`.spectrum-viewport` حذف شدند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- تست مرورگری با `playwright-core` روی `http://localhost:3000/` در عرض‌های
  ۳۹۰/۷۶۸/۱۴۴۰: هر ۶ کارت در یک ردیف (`allSameRow=true`) و به‌ترتیب ۲/۳/۴ کارت
  هم‌زمان قابل‌مشاهده بودند؛ ریل قابل‌اسکرول (`scrollWidth>clientWidth`) و سرریز
  افقی صفحه صفر بود. فلش «بعدی» یک کارت جلو و نقطه‌ی پنجم/ششم به همان کارت‌ها
  اسنپ کردند (اندیس نقطه‌ی فعال هم‌گام شد)، و کلیک روی کارت به
  `/business-cards/<slug>` رفت.
- `python3 scripts/sync_install.py --check` بدون «تغییر معلق» (patched: 0) برگشت.

## ۱۴۰۵/۰۷/۲۷ — بازطراحی کارت‌های «آخرین کارت‌های ویزیت» و «آخرین بیولینک‌ها» با طرح کارت نمونه — نسخه `v2.71.0`

**هدف:** «درخواست جدید» — بخش‌های «آخرین کارت‌های ویزیت» و «آخرین بیولینک‌ها» در
صفحه‌ی اصلی `http://localhost:3000/` باید مانند فایل نمونه
`/home/mohammad/Downloads/spectrum-v8.html` نمایش داده شوند: کارت مستطیلی
افقی (aspect ۱.۷۵) با دو رو («رو» و «پشت»)، خط حاشیه‌ی داخلی، بافت خط‌اسکن،
عنوان کسب‌وکار/شرکت، نام مدیر و ردیف‌های تماس. رنگ‌بندی فعلاً «رندم» (از میان ۱۴
رنگ طیفی نمونه) باشد.

**تغییرات:**
- `apps/web/lib/card-spectrum.ts` (فایل جدید): پالت ۱۴رنگه‌ی spectrum (bg/fg) طبق
  فایل نمونه، به‌همراه `hashString` و `spectrumColorAt(seed, index)` که رنگ را
  به‌صورت تصادفی‌نما ولی قطعی (deterministic) انتخاب می‌کند تا رندر سرور و کلاینت
  یکی بماند و hydration mismatch رنگ رخ ندهد.
- `apps/web/components/home/HomeItemSlider.tsx`: بازنویسی کارت‌ها به طرح نمونه —
  دو رو (`spectrum-front`/`spectrum-back`) با `aspect-ratio: 1.75`، عنوان
  («شرکت» در اولویت، سپس «کسب‌وکار»، سپس عنوان شغلی)، نام مدیر، ردیف‌های
  کسب‌وکار/شهر/تلفن همراه/آدرس و روی پشت لوگویی «به مدیریت …». رنگ هر کارت با
  custom propertyهای `--card-bg`/`--card-fg` تزریق می‌شود. درگ موسیروی window
  منتقل شد تا کلیک روی کارت (لینک به صفحه‌ی عمومی) همچنان کار کند؛ سوایپ لمسی،
  فلش‌ها (چرخشی) و نقطه‌ها مثل قبل حفظ شدند.
- `apps/web/app/globals.css`: حذف بلوک `.liquid-*` و افزودن مجموعه‌ی `.spectrum-*`
  (shell/viewport/track/slide/face با `::before` حاشیه‌ی داخلی و `::after` بافت
  خط‌اسکن، فلش‌ها و نقطه‌ها).
- `apps/api/src/businesscards/business-cards.service.ts` و
  `apps/api/src/biolinks/biolinks.service.ts`: `findLatestPublished` حالا
  `mobile`، `phone`، `address` و `user.plan` را هم برمی‌گرداند و طبق قوانین پلن
  (`applyPlanVisibility`) فیلدهای مخفی‌شده را ماسک می‌کند و `user` را از پاسخ
  عمومی حذف می‌کند؛ بنابراین کارت‌های صفحه‌ی اصلی می‌توانند ردیف تلفن/آدرس را
  نشان دهند.

**تأیید/تست:**
- `docker exec alooshomal-web ./node_modules/.bin/tsc --noEmit` → exit 0.
- `docker exec alooshomal-api ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
  → exit 0.
- `curl http://localhost:3001/api/business-cards/public/latest?limit=3` و
  `.../biolinks/public/latest?limit=3` فیلدهای `mobile/phone/address` را برگرداندند.
- تست مرورگری با `playwright-core` روی `http://localhost:3000/` در عرض‌های
  ۳۹۰/۷۶۸/۱۴۴۰: هر دو بخش رندر شدند (۶ اسلاید، ۲ فلش، ۶ نقطه، ۱۲ وجه کارت)،
  `aspect-ratio: 1.75`، حاشیه‌ی داخلی `::before` و بافت `::after` تأیید شد، سرریز
  افقی صفر بود، رنگ کارت‌های هر بخش متمایز و قطعی بود (کارت‌ها: سبز روشن→سبز→…،
  بیولینک‌ها: نارنجی→زرد روشن→…). فلش «بعدی» به اسلاید دوم، نقطه‌ی چهارم به اسلاید
  چهارم و فلش «قبلی» یک اسلاید به عقب رفتند؛ سوایپ لمسی یک اسلاید جابه‌جا کرد و
  کلیک روی کارت به `/business-cards/<slug>` رفت.
- `python3 scripts/sync_install.py --check` بدون «تغییر معلق» (patched: 0) برگشت.

## ۱۴۰۵/۰۷/۲۷ — صفحه اصلی: هیرو تمام‌صفحه، عبارت شهرها و اسلایدر Liquid Glass — نسخه `v2.70.0`

**هدف:** «درخواست جدید» — در صفحه اصلی: (۱) در دید اولِ همه‌ی دستگاه‌ها فقط
پس‌زمینه‌ی رنگی + کادر جستجو + دو دکمه‌ی زیر آن دیده شود و بقیه‌ی صفحه کاملاً
پایین‌تر باشد؛ (۲) عبارت درشت «در شهرهای تنکابن، شیرود و رامسر» به هیرو اضافه شود؛
(۳) بخش‌های «آخرین کارت‌های ویزیت» و «آخرین بیولینک‌ها» با طرح Liquid Glass
(کارت شیشه‌ای روشن + حاشیه‌ی نئونی چرخان + فلش‌ها و نقطه‌ها) بازطراحی شوند.

**تغییرات:**
- `apps/web/app/page.tsx`: هیرو به `home-hero` تبدیل شد و کل ارتفاع اولین
  ویوپورت را می‌گیرد؛ متن تبلیغاتی قبلی با خط درشت «در شهرهای تنکابن، شیرود و
  رامسر» جایگزین شد. جستجو و دو دکمه داخل هیرو ماندند و بقیه‌ی بخش‌ها بعد از آن.
- `apps/web/app/globals.css`: استایل‌های `.home-hero` (ارتفاع
  `calc(100dvh - chrome)` و لکه‌های رنگی) و مجموعه‌ی `.liquid-*` (ویوپورت،
  کارت شیشه‌ای، حاشیه‌ی conic چرخان، فلش‌ها، نقطه‌ها)؛ `touch-action: pan-y` و
  `overscroll-behavior-x: contain` برای اینکه سوایپ افقی باعث back مرورگر نشود.
- `apps/web/components/home/HomeItemSlider.tsx`: بازنویسی به کروسل تک‌کارتی
  Liquid Glass با فلش‌های قبلی/بعدی (چرخشی)، نقطه‌های قابل‌کلیک، سوایپ لمسی
  (یک کارت در هر سوایپ) و درگ موس؛ جلوگیری از ناوبری ناخواسته بعد از سوایپ/درگ.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` بدون خطا (exit 0).
- تست مرورگری با `playwright-core` در عرض‌های ۳۹۰/۷۶۸/۱۴۴۰: پایین هیرو
  (`788/968/900`) از ارتفاع ویوپورت (`844/1024/900`) کمتر یا مساوی است، کادر
  جستجو و هر دو دکمه در دید اول‌اند، اولین بخش بعدی (`852/1032/964`) کاملاً
  پایین‌تر از دید اول است و سرریز افقی صفر بود.
- عملکرد کروسل: دکمه‌ی «بعدی» به اسلاید دوم و نقطه‌ی چهارم به اسلاید چهارم رفت؛
  سوایپ لمسی و درگ موس هر دو یک اسلاید جابه‌جا کردند و صفحه از `/` خارج نشد.
- عبارت هر سه شهر (تنکابن، شیرود، رامسر) در متن صفحه حاضر است.

## ۱۴۰۵/۰۷/۲۷ — بازطراحی فرم ساخت کارت ویزیت/بیولینک با فیلدهای اجباری — نسخه `v2.69.0`

**هدف:** «درخواست جدید» — در `/dashboard/biolinks/new` و
`/dashboard/business-cards/new`: (۱) همه‌ی تم‌ها بجز «وینتیج» موقتاً غیرفعال و
مخفی شوند؛ (۲) چیدمان به حالت قبلی برگردد — پیش‌نمایش ثابت سمت چپ، فرم سمت راست
و با پر کردن هر فیلد پیش‌نمایش به‌روز شود؛ (۳) در موبایل/تبلت ریسپانسیو باشد؛
(۴) فیلدهای اجباری (نام کسب‌وکار، نام و نام خانوادگی، شهر، کسب‌وکار، تلفن همراه،
تلفن ثابت، آدرس یک‌خطی) اول فرم و اجباری باشند؛ (۵) بقیه فیلدها اختیاری.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن فیلد `mobile` (تلفن همراه، جدا از
  `phone` که تلفن ثابت است) به `Biolink` و `BusinessCard` (اعمال با `prisma db push`).
- `apps/api/src/biolinks/dto/create-biolink.dto.ts` و
  `apps/api/src/businesscards/dto/create-business-card.dto.ts`: افزودن `mobile`.
- `apps/web/lib/themes.ts`: افزودن `THEME_SELECTION_LOCKED`،
  `SELECTABLE_BIOLINK_THEMES`، `SELECTABLE_BUSINESS_CARD_THEMES` و تم «وینتیج»
  برای کارت ویزیت؛ پیش‌فرض کارت ویزیت به `vintage` تغییر کرد.
- `apps/web/app/globals.css`: افزودن بلوک استایل `.bc-theme-vintage`.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: حذف مرحله‌ی انتخاب تم؛
  فرم بازچینی‌شده به «اطلاعات اصلی (اجباری) ← اطلاعات اختیاری ← تصویر و تم ←
  اتصال»؛ پیش‌نمایش ثابت سمت چپ و فرم سمت راست؛ افزودن `mobile`؛ دکمه‌ی ذخیره تا
  تکمیل فیلدهای اجباری غیرفعال می‌ماند.
- `apps/web/components/biolink/ThemedBiolink.tsx` و
  `apps/web/components/businesscard/ThemedBusinessCard.tsx`: نمایش `mobile`.
- `apps/web/lib/api.ts` و صفحات new/edit و LiveEditorهای ادمین: افزودن `mobile`.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا (exit 0).
- `prisma db push` موفق؛ `PATCH /biolinks/:id` با `mobile` ذخیره و بازخوانی شد.
- تست مرورگری با `playwright-core` روی هر دو صفحه‌ی ساخت: هیچ مرحله‌ی انتخاب تم
  نمایش داده نشد («وینتیج» یک‌بار)، ۷ فیلد اجباری‌اند، برچسب‌ها به ترتیب درست‌اند،
  پیش‌نمایش سمت چپ فرم است (`x=42` در مقابل `x=474`) و در عرض موبایل ۳۹۰ بدون
  سرریز افقی رندر شد.

## ۱۴۰۵/۰۷/۲۷ — اسلایدر دستی صفحه اصلی و کارت‌های متنی بدون عکس — نسخه `v2.68.3`

**هدف:** «درخواست جدید» — در صفحه اصلی، اسلایدرهای «آخرین کارت‌های ویزیت» و
«آخرین بیولینک‌ها» الف) با لمس دست و کشیدن موس حرکت کنند؛ ب) طراحی هر کارت
متنی و خوانا و بدون عکس باشد (ابعاد خوب، تمرکز روی متن).

**تغییرات:**
- `apps/web/components/home/HomeItemSlider.tsx`: بازنویسی — حذف کامل تصویر و
  طراحی کارت متنی (حرف اول نام در دایره، نام شرکت/کسب‌وکار، تگ دسته‌ی کسب‌وکار،
  عنوان شغلی و شهر)، ارتفاع هم‌تراز کارت‌ها؛ افزودن درگ موس با pointer capture
  (`onPointerDown/Move/Up`) که در انتهای درگ، کلیک را می‌بلعد تا ناخواسته
  ناوبری نشود؛ منطق RTL برای جهت اسکرول و غیرفعال‌کردن دکمه‌ها در ابتدا/انتها.
- `apps/web/app/globals.css`: حالت `cursor: grab/grabbing` برای اسلایدر در
  دسکتاپ.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` بدون خطا (exit 0).
- تست مرورگری با `playwright-core`: با درگ موس `scrollLeft` از ۰ به ‑۲۸۱ رفت و
  دکمه‌های بعدی/قبلی نیز به ‑۵۰۳ و ۰ رسیدند؛ هر دو اسلایدر بدون هیچ `<img>`
  رندر شدند.
- بررسی ریسپانسیو در عرض‌های ۳۹۰/۸۲۰/۱۲۸۰: هر ۶ کارت با ارتفاع یکسان ۲۰۸px،
  عرض مناسب هر بریک‌پوینت و بدون سرریز افقی.

## ۱۴۰۵/۰۷/۲۷ — تضمین پایداری داده‌های پنل ادمین در برابر push و ری‌استارت — نسخه `v2.68.2`

**هدف:** «درخواست جدید (مهم)» — بررسی اینکه داده‌های همه‌ی بخش‌های پنل ادمین
(بیولینک‌ها، کارت‌های ویزیت، اشتراک‌ها، پله، تبلیغات + تنظیمات، فیدها، کاربران،
تیکت‌ها، اخبار، دسترسی‌ها، کاربران ادمین) واقعاً در دیتابیس ذخیره و از آن خوانده
می‌شوند تا در تغییر کد و pushهای بعدی از بین نروند.

**یافته‌های بررسی (audit):**
- همه‌ی پنل‌های ادمین (`apps/web/components/admin/*.tsx`) صرفاً از طریق API
  (`api.get/post/patch/delete`) کار می‌کنند؛ هیچ داده‌ی هاردکد/`localStorage`/
  mock در فرانت وجود ندارد.
- همه‌ی اندپوینت‌های `/api/admin/*` روی جداول Prisma نوشته و می‌خوانند؛ جدول‌های
  پشت هر بخش تأیید شد: `biolinks`, `business_cards`, `user_subscriptions`+
  `subscription_plans`, `boost_requests`, `ad_requests`+`settings`,
  `feed_posts`, `users`+`content_decisions`, `tickets`, `news_items`,
  `settings` (ماتریس دسترسی)، `users` (نقش MODERATOR + `moderatorScopes`).
- تنها ریسک واقعی: `prisma/seed.ts` قبلاً با `deleteMany` روی `tickets`،
  `reports`، `news_items` و `news_categories` داده‌ها را پاک می‌کرد. این اسکریپت
  در بوت خودکار اجرا نمی‌شود (فقط دستی با `npm run prisma:seed`)، ولی برای
  اطمینان اصلاح شد.

**تغییرات:**
- `apps/api/prisma/seed.ts`: حذف تمام `deleteMany`ها و تبدیل به `upsert`
  (تیکت‌ها و گزارش‌ها با id ثابت)، `upsert` دسته‌های خبری بر اساس `name`، و
  ساخت شرطی خبرهای نمونه فقط در صورت نبودن. حالا اجرای مجدد seed کاملاً
  بی‌خطر و idempotent است.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/api` (شامل `prisma/**`) بدون خطا.
- با `psql` چهار رکورد «واقعی» در `tickets`/`reports`/`news_categories`/
  `news_items` درج شد؛ سپس seed دو بار اجرا شد: هر چهار رکورد باقی ماندند و هیچ
  رکورد seed تکراری ساخته نشد (تعداد کل از ۶/۵/۶/۶ به همان ۶/۵/۶/۶ ماند).
- پس از تست، رکوردهای آزمایشی حذف و دیتابیس به وضع اول بازگردانده شد
  (تیکت ۵، گزارش ۴، خبر ۵، دسته ۵).

## ۱۴۰۵/۰۷/۲۷ — نمایش نام ادمین تأییدکننده در پنل تبلیغات — نسخه `v2.68.1`

**هدف:** «درخواست جدید» — در `/admin?section=ads` نام ادمین تأییدکننده نمایش
داده شود.

**تغییرات:**
- `apps/web/lib/api.ts`: افزودن فیلد `decidedBy` به تایپ `AdRequest`.
- `apps/web/components/admin/AdminAds.tsx`: افزودن ستون «تأییدکننده» به جدول
  درخواست‌های تبلیغ (صفحه اصلی و دایرکتوری). سرویس `ads` از قبل `decidedBy`
  را در پاسخ برمی‌گرداند، پس فقط نمایش لازم بود.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` بدون خطا (exit 0).
- `GET /admin/ads?status=APPROVED&placement=HOME` برای ۵ رکورد، `decidedBy`
  با نام «مدیر سامانه» برگرداند.
- تست مرورگری با `playwright-core`: هدر «تأییدکننده» در جدول تبلیغات دیده شد.

## ۱۴۰۵/۰۷/۲۷ — نمایش تأییدکننده و جستجو در پنل ادمین بیولینک/کارت ویزیت — نسخه `v2.68.0`

**هدف:** «درخواست جدید» — در `/admin?section=biolinks` و
`/admin?section=business-cards` الف) نام ادمین تأییدکننده نمایش داده شود؛
ب) امکان جستجو بین کارت‌ها فراهم شود.

**تغییرات:**
- `apps/api/src/admin/dto/list-biolinks.dto.ts` و
  `apps/api/src/admin/dto/list-business-cards.dto.ts`: افزودن پارامتر `search`.
- `apps/api/src/admin/admin.service.ts`: فیلتر جستجو (نام، عنوان شغلی، شرکت،
  اسلاگ، تلفن، ایمیل/نام کاربر) در `listBiolinks`/`listBusinessCards`؛ افزودن
  `decidedBy` به هر آیتم از `content_decisions` (و fallback به `ModerationLog`
  برای بیولینک)؛ ثبت تصمیم مدیر کل در `content_decisions` هنگام
  `moderate`/`moderateBusinessCard` تا تأییدکننده‌ی همه‌ی تصمیم‌ها ثبت شود.
- `apps/api/src/admin/admin.controller.ts`: پاس‌دادن `search` به سرویس.
- `apps/web/app/admin/page.tsx`: ستون «تأییدکننده» در هر دو جدول + نوار جستجو
  (ارسال با فرم/دکمه و دکمه‌ی پاک‌کردن) در هر دو بخش.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا (exit 0).
- `GET /admin/biolinks?status=APPROVED&search=علی` → ۶۸ نتیجه با نام تأییدکننده
  («مدیر سامانه») برای موارد تأییدشده؛ `GET /admin/business-cards?search=تست`
  بدون خطا.
- ثبت یک تصمیم روی بیولینک تستی: ردیف `content_decisions` ساخته شد و آیتم در
  لیست با `decidedBy` درست برگشت.
- تست مرورگری با `playwright-core`: هدر «تأییدکننده» در هر دو جدول، ورودی
  جستجو در هر دو بخش، و نتیجه‌ی جستجو (۱ ردیف برای «علی») کار کرد.

## ۱۴۰۵/۰۷/۲۷ — بازطراحی پنل اشتراک‌ها: دو تب، ویرایش بسته و فیلدهای نمایشی — نسخه `v2.67.0`

**هدف:** «درخواست جدید» — در `/admin?section=subscriptions` الف) اشتراک‌ها و
مدیریت بسته + تأیید درخواست‌ها در دو تب مجزا باشند؛ ب) بسته‌های ساخته‌شده
قابلیت ویرایش داشته باشند؛ ج) هنگام ساخت/ویرایش بسته، تمامی فیلدهای قابل‌ورود در
کارت ویزیت و بیولینک به‌صورت آبشن‌های فعال/غیرفعال بیایند و دو عبارت «ویژگی‌ها هر
خط یک مورد» و «تیک نمایش لینک‌ها و…» حذف شوند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن ستون `hiddenFields String[]` به
  `SubscriptionPlan` (اعمال با `prisma db push`).
- `apps/api/src/common/plans.ts`: افزودن `PLAN_FIELDS` (فهرست مشترک فیلدها)،
  `DEFAULT_HIDDEN_LINK_FIELDS` و توابع `hiddenFieldsFrom`/`applyHiddenFields`؛
  `PlanLimits` حالا `hiddenFields` را هم برمی‌گرداند.
- `apps/api/src/subscriptions/dto/create-plan.dto.ts`: افزودن `hiddenFields`.
- `apps/api/src/subscriptions/subscriptions.service.ts`: ذخیره‌ی `hiddenFields`
  در ساخت/ویرایش بسته، همگام‌سازی `showSocialLinks` با فیلد `website`، و
  `backfillHiddenFields()` یک‌باره در بوت برای بسته‌های قدیمی.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: ماسک‌کردن فیلدها بر
  اساس `hiddenFields` بسته (به‌جای فقط لینک‌های شبکه‌های اجتماعی) و
  `planHidesFields` بر پایه‌ی وجود فیلد مخفی.
- `apps/api/src/admin/admin.controller.ts`: اندپوینت `GET /admin/plan-fields`.
- `apps/web/lib/api.ts`: افزودن `hiddenFields` به تایپ `SubscriptionPlan`.
- `apps/web/components/admin/AdminSubscriptions.tsx`: بازنویسی کامل — دو تب
  «درخواست‌ها» و «مدیریت بسته‌ها»، فرم ویرایش بسته، و گرید سوییچ‌های
  فعال/غیرفعال برای همه‌ی فیلدهای کارت/بیولینک؛ حذف فیلد «ویژگی‌ها» و تیک
  «نمایش لینک‌ها».

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا (exit 0).
- `python3 scripts/sync_install.py --check` → `patched: 0 / added: 0`.
- `prisma db push` موفق؛ `GET /admin/plan-fields` فهرست ۱۵ فیلد را برگرداند؛
  ساخت/ویرایش/حذف بسته با `hiddenFields` درست کار کرد و `showSocialLinks`
  هم‌گام شد؛ بک‌فیل بسته‌ی «رایگان» فیلدهای لینک قدیمی را گرفت.
- تست مرورگری با `playwright-core`: تب «مدیریت بسته‌ها»، دکمه‌های ویرایش، و پس
  از باز کردن فرم ویرایش «رایگان» ۱۵ سوییچ نمایش داده شد (۹ فعال / ۶ غیرفعال).
- ماسک عمومی: بیولینک‌های کاربران بسته‌ی «رایگان» بدون `website`/شبکه‌های
  اجتماعی و بیولینک کاربر بسته‌ی «بلاس» کامل برگشتند.

## ۱۴۰۵/۰۷/۲۷ — بازطراحی نمایش فیدها: متن‌محور با اسکرول بی‌نهایت و صفحه‌ی ثابت — نسخه `v2.66.0`

**هدف:** «درخواست جدید» — در `/feeds` نمایش به‌جای عکس‌محور، متن‌محور شود. کل
صفحه ثابت بماند و تنها لیست فیدها اسکرول بخورد، با اسکرول بی‌نهایت مطابق
`/business-cards`.

**تغییرات:**
- `apps/web/app/feeds/page.tsx`: صفحه به پوسته‌ی ثابت `directory-shell` تبدیل شد
  (سربرگ + فیلترها ثابت، فقط `.directory-list` اسکرول می‌خورد). حالت نمایش به‌صورت
  همیشگی `INFINITE` شد و صفحه‌بندی حذف گردید؛ فوتر نیز مثل دایرکتوری‌های دیگر
  حذف شد تا پوسته دقیقاً `100dvh` را پر کند. شمارنده‌ی «تعداد کل / نمایش‌داده‌شده»
  به سربرگ اضافه شد.
- `apps/web/components/feed/FeedCard.tsx`: بازطراحی به کارت متن‌محور — متن پست،
  تگ موضوع، نویسنده، تاریخ، شمارش پسند/تصویر و چیپ تگ کارت/بیولینک در اولویت
  هستند و تصویر فقط به‌صورت یک بندانگشتی کوچک کنار متن نمایش داده می‌شود.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` بدون خطا (exit 0).
- تست مرورگری با `playwright-core` روی موبایل/تبلت/دسکتاپ: ارتفاع سند با ویوپورت
  برابر بود (`pageScrolls=false`) و `window.scrollY` صفر ماند؛ تنها
  `.directory-list` اسکرول گرفت. با رسیدن به انتهای لیست، موارد از ۱۰ به ۱۳ رسید
  و پیام «همه نتایج نمایش داده شد» ظاهر شد. فوتر وجود نداشت و سرریز افقی صفر بود.
- بررسی ساختار کارت: متن پست با `line-clamp` رندر شد و تصویر به بندانگشتی ۹۶px
  کاهش یافت (سربرگ `تصویر` و شمارش تصاویر در متادیتا).

## ۱۴۰۵/۰۷/۲۷ — رایگان‌سازی انتشار فید و تگ پرداختی کارت/بیولینک با تأیید مدیر — نسخه `v2.65.0`

**هدف:** «درخواست جدید» — اصلاح مدل درآمدی فیدها: انتشار همه‌ی پست‌های فید
رایگان شود. نویسنده بتواند کارت ویزیت یا بیولینک خودش را روی پست تگ کند و در
این صورت مبلغی بپردازد. چون درگاه پرداخت راه‌اندازی نشده، پرداخت با تأیید مدیر
(شبیه‌سازی) نهایی شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `enum FeedTagKind` و فیلدهای
  `tagKind/tagBiolinkId/tagBusinessCardId/tagPaid/tagPrice/tagDecidedAt/tagDecidedById`
  به `FeedPost` همراه روابط و ایندکس‌ها (اعمال با `prisma db push`).
- `apps/api/src/settings/settings.{service,controller}.ts`: افزودن تنظیم
  `feedTagPrice` (پیش‌فرض ۲۰٬۰۰۰ تومان) با متدهای `getFeedTagPrice`/
  `setFeedTagPrice` و پشتیبانی در GET/PATCH پنل مدیر.
- `apps/api/src/feeds/dto/feed.dto.ts`: افزودن `tagKind`/`tagTargetId` اختیاری به
  `CreateFeedPostDto`.
- `apps/api/src/feeds/feeds.service.ts`: انتشار پست رایگان شد (حذف الزام و کسر
  سهمیه‌ی اشتراک و بازگرداندن سهمیه در رد). افزودن `resolveTagTarget` برای
  اعتبارسنجی تگ روی اقلام خودِ کاربر، `projectFeedTag` برای افشای تگ فقط پس از
  پرداخت، `decideTagPayment` برای تأیید/رد پرداخت تگ توسط مدیر، و افزودن
  `tagPrice`/`taggableBiolinks`/`taggableCards` به `myOverview`.
- `apps/api/src/feeds/feeds.controller.ts`: افزودن
  `PATCH /admin/feeds/posts/:id/tag-payment`.
- `apps/api/src/admin/admin.service.ts`: افزودن ردیف درآمد «تگ فید» به
  `revenueReport`.
- `apps/web/lib/api.ts`: افزودن `FeedTag`/`FeedTaggableItem` و فیلدهای تگ به
  `FeedPost`/`FeedMineOverview`.
- `apps/web/app/dashboard/feeds/page.tsx`: پنل «فید من» — پنل اطلاع‌رسانی انتشار
  رایگان، کامپوزر همیشه‌فعال، انتخابگر تگ (نوع + مورد) و نمایش وضعیت تگ روی
  پست‌های خودی؛ اشتراک فید به گزینه‌ی اختیاری تبدیل شد.
- `apps/web/components/admin/AdminFeeds.tsx`: نمایش تگ و دکمه‌های «تأیید پرداخت»/
  «رد تگ» در تب بررسی پست‌ها.
- `apps/web/components/admin/AdminRevenue.tsx`: افزودن فیلد ویرایش «قیمت تگ فید».
- `apps/web/app/feeds/[id]/page.tsx`: نمایش لینک تگ تأییدشده روی صفحه‌ی پست.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` و `apps/api` بدون خطا (exit 0).
- تست API با curl: ساخت پست تگ‌دار (بدون اشتراک) → تأیید مدیر → تگ در پاسخ عمومی
  پنهان بود (`tag=null`) → تأیید پرداخت تگ → `tag` با `href` صحیح برگشت. مسیر رد
  تگ، پاک‌شدن کامل تگ، رد تگ کارت کاربر دیگر (۴۰۰) و ظاهرشدن ردیف درآمد «تگ فید»
  در گزارش درآمد هم بررسی شد.
- تست مرورگری با `playwright-core`: پنل «فید من» و تب «بررسی پست‌ها»ی پنل مدیر
  بدون خطای runtime رندر شدند و کنترل‌های تگ درست نمایش داده شدند.

## ۱۴۰۵/۰۷/۲۷ — بازچینش صفحه‌ی اصلی: تبلیغات، اسلایدر آخرین کارت‌ها/بیولینک‌ها، «اخبار شهر» و فوتر/نوبار موبایل — نسخه `v2.64.0`

**هدف:** «درخواست جدید» صفحه‌ی اصلی — صفحه کاملاً ریسپانسیو (دسکتاپ/تبلت/موبایل)
و درست زیر کادر جستجو و دو دکمه‌اش به ترتیب: ۱) کادر تبلیغات (مستطیل بزرگ همراه
اطلاعات)، ۲) اسلایدر ۶ کارت ویزیت آخر با کادر مربعی، ۳) اسلایدر ۶ بیولینک آخر با
کادر مربعی، ۴) سکشن «نبض شهر» با نام جدید «اخبار شهر»، ۵) سایر بخش‌های صفحه. در
موبایل و تبلت فوتر فقط خط کپی‌رایت/نسخه/عنوان را نشان دهد و دکمه‌ی «راهنما» از
نوبار حذف شود.

**تغییرات:**
- `apps/web/components/home/HomeItemSlider.tsx` (جدید): اسلایدر افقی ریسپانسیو با
  scroll-snap، کارت‌های مربعی و دکمه‌های قبلی/بعدی (فقط دسکتاپ). یک کارت در موبایل،
  دو در تبلت و تا چهار در دسکتاپ واید.
- `apps/web/app/page.tsx`: به کامپوننت `async` تبدیل شد و هر دو اسلایدر را
  سمت‌سرور (با `revalidate: 60`) موازی می‌گیرد؛ ترتیب جدید صفحه: تبلیغات →
  آخرین کارت‌ها → آخرین بیولینک‌ها → اخبار شهر → سایر بخش‌ها. اندازه‌ها/فاصله‌ها
  برای موبایل کوچک‌تر شد.
- `apps/web/components/home/HomeAdBox.tsx`: بدون تغییر (همان کادر `id="ads"` با
  عنوان «تبلیغات») — فقط جای آن در ترتیب صفحه عوض شد.
- `apps/api/src/biolinks/biolinks.{controller,service}.ts` و
  `apps/api/src/businesscards/business-cards.{controller,service}.ts`: مسیر عمومی
  `GET /public/latest?limit=` برای واکشی سبک (بدون فیلدهای تماس) آخرین موارد
  منتشرشده.
- `apps/web/components/news/PulseSection.tsx`، `apps/web/app/pulse/page.tsx` و
  `apps/web/app/pulse/[id]/page.tsx`: تغییر نام «نبض شهر» به «اخبار شهر».
- `apps/web/components/layout/MobileNav.tsx`: حذف دکمه‌ی «راهنما» و کاهش ستون‌ها
  به ۶.
- `apps/web/components/layout/Footer.tsx`: ستون پیوندها در موبایل/تبلت پنهان
  (`hidden lg:flex`) و فقط خط کپی‌رایت/نسخه/عنوان باقی ماند.
- `apps/web/app/globals.css`: قواعد `.home-slider` برای پنهان‌کردن اسکرول‌بار و
  اسکرول لمسی نرم.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` و `apps/api` بدون خطا (exit 0).
- `GET /api/business-cards/public/latest` و `/api/biolinks/public/latest` کد ۲۰۰
  با ۶ آیتم.
- رندر صفحه با `curl` ترتیب بخش‌ها را تأیید کرد: تبلیغات → آخرین کارت‌های ویزیت →
  آخرین بیولینک‌ها → اخبار شهر → سایر بخش‌ها.

## ۱۴۰۵/۰۷/۲۶ — نمایش تگ شهر و کسب‌وکار در پنل جزئیات دایرکتوری — نسخه `v2.63.1`

**هدف:** «درخواست ۲» — در `/biolinks` و `/business-cards`، با کلیک روی کارت و
نمایش آن، «شهر» و «کسب‌وکار» هم به‌صورت تگ نمایش داده شوند.

**تغییرات:**
- `apps/web/components/ui/DetailTags.tsx` (جدید): تگ‌های «شهر» و «کسب‌وکار» با
  آیکون، هم‌سبک چیپ‌های داخل کارت‌های تم‌دار.
- `apps/web/components/biolink/DirectoryDetail.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: افزودن
  تگ‌های شهر و کسب‌وکار به بالای فهرست اطلاعات تماس. داده‌ی شهر/کسب‌وکار از قبل
  در payload جزئیات (`city`/`business`) موجود بود؛ نیازی به تغییر API نبود.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`: با کلیک روی اولین
  ردیف در هر دو دایرکتوری، تگ‌ها در پنل جزئیات ظاهر شدند
  (`biolinks`: «رامسر» + «حسابداری» — `business-cards`: «ارومیه» + «بازاریابی و فروش»).

## ۱۴۰۵/۰۷/۲۶ — هم‌ترازی سربرگ کارت عمومی، اخطار ارتقای اشتراک، و اسکرول فقط داخل کارت — نسخه `v2.63.0`

**هدف:** «درخواست ۱» — در صفحه‌های عمومی کارت (`biolinks` و `business-cards`):
۱) سه عبارت بالای کارت (بازگشت به دایرکتوری — نوع اشتراک — صفحه اصلی) هم‌تراز
شوند. ۲) وقتی خودِ سازنده کارت با اشتراک رایگان صفحه را می‌بیند، اخطار «جهت
نمایش کامل لطفاً اشتراک خود را ارتقا دهید» همراه دکمه‌ی ارتقا نمایش داده شود.
۳) کل صفحه اسکرول نخورد و فقط کادر خود کارت اسکرول بخورد.

**تغییرات:**
- `apps/web/components/biolink/PublicBiolinkView.tsx`: سه عبارت بالای کارت در یک
  ردیف واحد و `justify-between` قرار گرفتند (پیش‌تر نشان اشتراک ردیف جدا و
  وسط‌چین بود). صفحه به پوسته‌ی `100dvh` بدون اسکرول تبدیل شد و فقط کادر کارت
  داخل ناحیه‌ی `card-public-scroll` اسکرول می‌خورد. اخطار ارتقا افزوده شد.
- `apps/web/components/businesscard/PublicBusinessCardView.tsx`: همان تغییرات
  آینه‌ای برای صفحه‌ی عمومی کارت ویزیت.
- `apps/web/components/ui/PlanUpgradeNotice.tsx` (جدید): اخطار «جهت نمایش کامل،
  لطفاً اشتراک خود را ارتقا دهید» با دکمه‌ی «ارتقای اشتراک» →
  `/dashboard/subscriptions`. فقط وقتی بیننده خودِ صاحب کارت باشد و پلن فعلی
  فیلدها را پنهان کند (رایگان) نمایش داده می‌شود.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: افزودن `planHidesFields`
  به payload عمومی (به‌همراه باقی‌ماندن `userId`) تا کلاینت پنهان‌شدن فیلدها را
  تشخیص دهد.
- `apps/web/lib/api.ts`: افزودن `planHidesFields` و `userId` به تایپ‌های
  `Biolink` و `BusinessCard`.
- `apps/web/app/globals.css`: استایل‌های `card-public-page`،
  `card-public-inner` و `card-public-scroll` برای پوسته‌ی بدون‌اسکرول و ناحیه‌ی
  اسکرول داخلی کارت.

**تأیید/تست:**
- `npx tsc --noEmit` روی `apps/web` و `apps/api` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`:
  - ارتفاع بدنه/سند صفحه دقیقاً برابر `innerHeight` شد (بدون اسکرول کل صفحه)؛
    ردیف بالا در همه‌ی اندازه‌ها ثابت (`top: 16`) و داخل ویوپورت ماند و تنها
    `card-public-scroll` مقدار `scrollTop` گرفت.
  - سه فرزند ردیف بالا در موبایل `51px` و دسکتاپ `33px` و هم‌ارتفاع؛ ردیف بدون
    سرریز افقی (`scrollWidth == width`) تا عرض ۳۲۰px.
  - نشان `planHidesFields` از API تأیید شد (`9032072` → `رایگان`/`true`؛
    `9031768` → `بلاس`/`false`).
  - با نشست شبیه‌سازی‌شده‌ی صاحب کارت، اخطار و دکمه‌ی ارتقا نمایش داده شد
    (`/dashboard/subscriptions`)؛ برای بازدیدکننده‌ی ناشناس و پلن غیررایگان
    نمایش داده نشد.
- بدون خطای کنسول در بارگذاری صفحات.

## ۱۴۰۵/۰۷/۲۶ — بهینه‌سازی سرعت بارگذاری صفحه‌ی اصلی بر پایه‌ی گزارش Lighthouse — نسخه `v2.62.3`

**هدف:** گزارش Lighthouse 13.4.1 در حالت Desktop با throttling روی
`https://alooshomal.ir/` امتیاز Performance حدود ۶۰ نشان می‌داد (FCP ~۱.۷s، LCP
~۲.۶s، TBT ~۳۵۰ms). تحلیل نشان داد ۷۶٪ زمان LCP «Render Delay» است: متن هیرو (عنصر
LCP) بعد از CSS و کشف دیرهنگام فونت رسم می‌شود، و بار اولیه چندین درخواست prefetch
غیرضروری هم دارد.

**تغییرات:**
- `apps/web/app/layout.tsx`: افزودن `preload` برای دو فونت Shabnam و
  Shabnam-Bold. پیش‌تر فونت‌ها فقط پس از رسیدن CSSِ رندر-بلاک کشف می‌شدند
  (شروع دانلود در ~۷۴۰ms)؛ حالا موازی با CSS شروع می‌شوند.
- `apps/web/components/layout/Header.tsx`: غیرفعال‌کردن `prefetch` روی لینک‌های
  ناوبری دسکتاپ. این لینک‌ها در هر صفحه تکرار می‌شوند و بار اولیه ~۱۰ درخواست
  RSC پس‌زمینه اضافه می‌کردند که با CSS/فونت‌های حیاتی رقابت می‌کرد (فوتر و نوار
  پایین موبایل از قبل همین کار را می‌کردند).
- `apps/web/components/layout/Footer.tsx`: افزودن `py-1.5` به لینک‌های فوتر تا
  هدف لمسی‌شان استاندارد شود (رفع ایراد «Touch targets» در Lighthouse،
  Accessibility از ۹۶ به ۱۰۰).

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` بدون خطا؛ `next build` پروداکشن موفق.
- بیلد پروداکشن به‌صورت محلی سرو شد و Lighthouse در همان حالت throttled دسکتاپ
  اجرا شد: زمان شروع دانلود فونت‌ها از ~۷۴۰ms به **~۴۷ms** رسید (موازی با CSS)،
  و درخواست‌های RSC بار اولیه از **۱۹ به ۰** کاهش یافت.
- اندازه‌ی کل صفحه و تعداد درخواست فونت بدون تغییر (۳ فایل)؛ مرورگر preloadهای
  تکراری را dedupe می‌کند و هیچ دانلود اضافه‌ای ندارد.
- `browserslist` برای حذف JS قدیمی آزمایش شد؛ چون با Next 16/Turbopack بی‌اثر بود
  (خروجی بایت‌به‌بایت یکسان) از تغییرات حذف شد تا حداقلی بماند.

## ۱۴۰۵/۰۷/۲۶ — ثابت‌ماندن کامل «با شمالی کارت» در عنوان هیرو — نسخه `v2.62.2`

**هدف:** پیشوند «با شمالی کارت» باید کاملاً بی‌حرکت بماند و هیچ جابه‌جایی افقی/عمودی
نداشته باشد؛ فقط متن بعد از آن انیمیشن داشته باشد. در پیاده‌سازی قبلی چون خط با
`justify-center` وسط‌چین بود، با تغییر عرض عبارت متحرک، پیشوند چند پیکسل جابه‌جا می‌شد.

**تغییرات:**
- `apps/web/components/home/HomeHeadline.tsx`: عبارت متحرک داخل یک سلول `inline-grid`
  قرار گرفت که هم‌زمان بلندترین عبارت **به‌همراه نشانگر چشمک‌زن** را به‌صورت
  نامرئی (`invisible`) رزرو می‌کند؛ در نتیجه عرض خط ثابت می‌ماند و پیشوند هرگز
  جابه‌جا نمی‌شود. `min-h` اضافی حذف شد چون دیگر لازم نیست.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`: در ۲۰ نمونه‌ی زمانی
  در طول انیمیشن، `x` و `y` کادر پیشوند دقیقاً یک مقدار ثابت داشتند
  (`x=814.59`, `y=146`) و فقط متن دوم تایپ/پاک شد. بدون خطای کنسول.

## ۱۴۰۵/۰۷/۲۶ — ثابت‌شدن «با شمالی کارت» و انیمیشن فقط روی عبارت دوم — نسخه `v2.62.1`

**هدف:** در عنوان هیرو، عبارت «با شمالی کارت» باید ثابت بماند و فقط عبارت‌های
«کارت ویزیت دیجیتال بساز» و «بیولینک حرفه‌ای بساز» با انیمیشن جابه‌جا شوند.

**تغییرات:**
- `apps/web/components/home/HomeHeadline.tsx`: افزودن `PREFIX = 'با شمالی کارت'` که
  به‌صورت ثابت کنار عبارت متحرک رندر می‌شود؛ چیدمان `h1` به `flex flex-wrap` با
  فاصله‌ی افقی تغییر کرد و بخش متحرک `whitespace-nowrap` شد تا در میانه‌ی تایپ
  شکسته نشود. مقدار `aria-label` هم به جمله‌ی کامل به‌روزرسانی شد.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`: در تمام نمونه‌های
  زمانی، «با شمالی کارت» ثابت ماند و فقط عبارت دوم تایپ/پاک شد. بدون خطای کنسول.

## ۱۴۰۵/۰۷/۲۶ — بازطراحی صفحه‌ی اصلی، نام‌گذاری هدر و صفحه‌ی «قوانین» — نسخه `v2.62.0`

**هدف:** یک‌جا کردن مسیر ورود به دایرکتوری‌ها روی صفحه‌ی اصلی، جایگزینی عنوان ثابت
با یک عنوان انیمیشنی، به‌روزرسانی متن معرفی، و در هدر دسکتاپ: تغییر نام سایت به
«شمالی کارت»، تغییر عنوان‌های «فیدها/نبض شهر» به «پست کاربران/اخبار شهر» و افزودن
صفحه‌ی «قوانین».

**تغییرات:**
- `apps/web/components/home/HomeHeadline.tsx` (فایل جدید): عنوان انیمیشنی هیرو با
  افکت تایپ/پاک‌کردن که بین «کارت ویزیت دیجیتال بساز» و «بیولینک حرفه‌ای بساز» جابه‌جا
  می‌شود؛ برای `prefers-reduced-motion` ثابت می‌ماند و برای صفحه‌خوان‌ها یک جمله‌ی
  ثابت (`aria-label`) اعلام می‌کند.
- `apps/web/app/globals.css`: کی‌فریم و کلاس `typewriter-caret` برای نشانگر چشمک‌زن.
- `apps/web/app/page.tsx`: جایگزینی `<h1>` ثابت با `HomeHeadline`، متن معرفی جدید
  («کارت ویزیت دیجیتال خود را بسازید، با یک QR اختصاصی … در بزرگ‌ترین بانک مشاغل
  شهر جستجو شوید»)، و باقی‌گذاشتن فقط دو دکمه‌ی «لیست کارت ویزیت‌ها» و «لیست
  بیولینک‌ها» (حذف دکمه‌های ساخت بیولینک، ورود به حساب و دایرکتوری‌ها).
- `apps/web/lib/nav.ts`: برچسب «فیدها» → «پست کاربران»، «نبض شهر» → «اخبار شهر» و
  افزودن آیتم «قوانین» با مقصد `/rules`.
- `apps/web/components/layout/Header.tsx` و `Footer.tsx`: نام برند به «شمالی کارت».
- `apps/web/components/layout/MobileNav.tsx`: همان تغییر برچسب‌ها برای هم‌خوانی با هدر دسکتاپ.
- `apps/web/app/rules/page.tsx` (فایل جدید): صفحه‌ی «قوانین» با ۹ بخش (حساب کاربری،
  ساخت کارت/بیولینک، بررسی و تأیید مدیر، محتوای مجاز و غیرمجاز، پله و تبلیغات،
  امتیازها، مسئولیت محتوا، تخطی از قوانین، حریم خصوصی) هم‌راستا با قابلیت‌های واقعی سایت.
- `apps/web/app/layout.tsx` و صفحات عمومی (`guide`, `services`, کارت/بیولینک عمومی،
  پنل کاربری و پنل مدیریت): به‌روزرسانی نام برند به «شمالی کارت».
- `apps/api/src/seo/seo.service.ts`: افزودن `/rules` به سایت‌مپ.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`:
  عنوان هیرو در مدت کوتاه هر دو عبارت را تایپ/پاک کرد و در پایان درست نمایش یافت؛
  زیرعنوان و هر دو دکمه‌ی «لیست کارت ویزیت‌ها/لیست بیولینک‌ها» حاضر بودند؛ هدر نام
  «شمالی کارت» و ناوبری «پست کاربران/اخبار شهر/قوانین» را نشان داد؛ صفحه‌ی
  `/rules` با ۹ بخش رندر شد. بدون خطای کنسول.

## ۱۴۰۵/۰۷/۲۶ — هدایت کاربر لاگین‌کرده از صفحه‌ی ورود به پنل — نسخه `v2.61.1`

**هدف:** وقتی کاربر از قبل وارد شده بود و دوباره به `/login` می‌رفت، فرم
ورود/ثبت‌نام را می‌دید. حالا در همه‌ی حالت‌ها باید به `/dashboard` منتقل شود (کاربر
ادمین محدود، که پنل کاربری ندارد، به `/moderator` می‌رود).

**تغییرات:**
- `apps/web/app/(auth)/login/page.tsx`: افزودن افکت `useEffect` که پس از
  رهیدریتشدن نشست (`hydrated && token`) کاربر را با `router.replace` به مقصد
  `next` منتقل می‌کند؛ برای نقش `MODERATOR` مقصد `/moderator` است. چون این افکت تا
  آماده‌شدن نشست صبر می‌کند، هنگام بارگذاری تازه‌ی صفحه هیچ فلش فرم برای کاربر
  لاگین‌کرده دیده نمی‌شود.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` بدون خطا.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome`:
  کاربر مهمان در `/login` می‌ماند؛ پس از ورود با ایمیل به `/dashboard` می‌رود؛ و
  مراجعه‌ی دوباره به `/login` در حالت لاگین‌کرده به‌طور خودکار به `/dashboard`
  منتقل شد. بدون خطای کنسول.

## ۱۴۰۵/۰۷/۲۶ — باز شدن فوری جزئیات کارت در دایرکتوری‌های کارت ویزیت و بیولینک — نسخه `v2.61.0`

**هدف:** در `/business-cards` و `/biolinks` کلیک روی هر کارت برای دیدن جزئیات یک
درخواست شبکه‌ی تازه می‌فرستاد و کاربر تا رسیدن پاسخ اسکلتون می‌دید؛ حس کندی به‌ویژه
هنگام بارگیری صفحات بعدی در اسکرول. حالا با هر صفحه‌ای که لود می‌شود، جزئیات همه‌ی
کارت‌های همان صفحه به‌صورت دسته‌ای و در پس‌زمینه از قبل گرفته و کش می‌شود، پس کلیک
روی هر کارت بلافاصله محتوای کامل (شامل تلفن، ایمیل و شبکه‌های اجتماعی) را نشان می‌دهد.

**تغییرات:**
- `apps/api/src/businesscards/business-cards.service.ts`: افزودن `findPublicBySlugs`
  (خواندن دسته‌ای کارت‌های منتشرشده با چند slug) و استخراج منطق مشترک خروجی عمومی به
  `projectPublicBusinessCard` تا مسیر تک و دسته دقیقاً یک شکل داشته باشند.
- `apps/api/src/businesscards/business-cards.controller.ts`: اندپوینت عمومی
  `GET /business-cards/public/batch?slugs=a,b,c` (حداکثر ۵۰ اسلاگ در هر درخواست).
- `apps/api/src/biolinks/biolinks.service.ts` و `biolinks.controller.ts`: معادل
  دقیق همان دو تغییر برای بیولینک‌ها (`findPublicBySlugs`، `projectPublicBiolink`،
  اندپوینت `GET /biolinks/public/batch`).
- `apps/web/lib/directory-detail.ts` (فایل جدید): کش کلاینتی جزئیات دایرکتوری به‌همراه
  `primeDirectoryDetails` (گرم‌کردن دسته‌ای یک صفحه کامل، بدون تکرار برای کش‌شده‌ها) و
  هوک `useDirectoryDetail` (خواندن فوری از کش و در غیر این صورت درخواست تک‌slug).
- `apps/web/lib/directory.ts`: افزودن نوع مشترک `DirectoryKind`.
- `apps/web/components/businesscard/DirectoryBusinessCardContent.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkContent.tsx`: با تغییر `items`،
  جزئیات کارت‌های صفحه به‌صورت دسته‌ای و دی‌بونس‌شده (۲۵۰ms) گرم می‌شود.
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx` و
  `apps/web/components/biolink/DirectoryDetail.tsx`: دریافت جزئیات از کش مشترک
  به‌جای درخواست مستقیم.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` بدون خطا.
- اندپوینت‌های جدید با curl بررسی شد: `?slugs=` چند اسلاگ → آرایه‌ی همان موارد با
  کلیدهای یکسان مسیر تک؛ بدون `slugs` یا با اسلاگ ناموجود → آرایه‌ی خالی.
- تست مرورگری با `playwright-core` و `/usr/bin/google-chrome` روی صفحات لوکال:
  در `/business-cards` یک درخواست batch با ۶ اسلاگ و در `/biolinks` دو درخواست
  (صفحه ۱ و ۲ که خودکار پر می‌شوند) ارسال شد. پس از کلیک روی کارت، پنل جزئیات در
  حدود **۲۵ms** رنگ شد و **هیچ** درخواست جزئیاتِ تازه‌ای زده نشد (فقط POST پس‌زمینه‌ی
  ثبت بازدید)؛ بدون خطای کنسول. کلیک روی ردیف‌های صفحه‌های بعدی هم همان‌قدر سریع بود.

## ۱۴۰۵/۰۷/۲۶ — رفع کرش استقرار API روی وولوم بکاپ روت‌مالک — نسخه `v2.60.1`

**هدف:** پس از استقرار، کانتینر `alooshomal-api` در حالت `Restarting (1)` می‌افتاد و
همه‌ی مسیرهای `/api/*` خطای 502 می‌دادند. ریشه: اسکریپت `docker-entrypoint.sh` وقتی
هش اسکیما عوض می‌شود، می‌خواهد در `$BACKUP_DIR` (وولوم نام‌دار
`alooshomal_api_backups`) بکاپ/هش بنویسد؛ آن وولوم از زمانی که API با کاربر روت اجرا
می‌شد **مالکیت روت** دارد، ولی ایمیج فعلی با `USER node` (uid 1000) اجرا می‌شود. چون
اسکریپت با `set -e` است، شکست نوشتن در خط ۶۷ باعث `exit 1` و حلقه‌ی ری‌استارت می‌شد.
این باگ از کامیت `eb8f55f` (کاربر غیرروت) پنهان مانده بود، چون هیچ تغییری در اسکیما
رخ نداده بود و این بلوک اجرا نمی‌شد؛ نخستین تغییر اسکیما (همین قابلیت کاربر ادمین)
آن را آشکار کرد.

**تغییرات:**
- `apps/api/docker-entrypoint.sh`: پیش از هر نوشتن، قابل‌نوشتن‌بودن `$BACKUP_DIR`
  بررسی می‌شود؛ اگر وولوم روت‌مالک/غیرقابل‌نوشتن بود، به دایرکتوری موقت
  `/tmp/alooshomal-backups` سقوط می‌کند و پیام هشدار می‌دهد. نوشتن فایل هش هم
  غیرکشنده شد؛ شکست بکاپ/هش دیگر هرگز مانع بالا آمدن اپ نمی‌شود.

**تأیید/تست:**
- `sh -n apps/api/docker-entrypoint.sh` بدون خطا.
- ایمیج production (`ghcr.io/...-api:latest`) با کاربر `node` و یک دایرکتوری بکاپِ
  فقط‌خواندنی اجرا شد: لاگ `backup dir ... not writable → using scratch dir`، سپس
  `snapshot saved`، سپس مهاجرت و در نهایت `ENTRYPOINT_REACHED` با **کد خروج ۰**
  (قبلاً همان سناریو `exit 1` می‌داد).
- اجرای همان entrypoint روی دیتابیس هم‌سطح پروداکشن (اسکیمای دیپلوی قبلی) بدون خطا.

## ۱۴۰۵/۰۷/۲۶ — صف‌های درآمدی برای کاربر ادمین، صفحه‌بندی و آمار صف‌ها، زنگ اعلان بلادرنگ — نسخه `v2.60.0`

**هدف:** تکمیل پنل «کاربر ادمین محدود»: افزودن صف‌های درخواست درآمدی (اشتراک، تبلیغ
صفحه اصلی، تبلیغ در صدر دایرکتوری، پله)، نمایش آمار عددی هر تب در همه‌ی صف‌ها،
اسکرول نامحدود با ۱۰ قلم در هر بار، محدودکردن تب‌های «تأییدشده/ردشده» به تصمیم‌های
همین بررسی‌کننده، حذف دسترسی این نقش به داشبورد و CTA شهروند خبرنگار، و بلادرنگ
کردن زنگ اعلان‌ها متناسب با سطح دسترسی.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن enum های `ContentDecisionKind` و
  `NotificationScope`، فیلد `Notification.scope` + ایندکس، و مدل `ContentDecision`
  (کلید یکتای `kind + itemId`) برای ردیابی تصمیم هر بررسی‌کننده.
- `apps/api/src/auth/moderator-scopes.ts`: گسترش سطح‌ها به ۸ مورد در دو گروه
  «محتوا» و «درخواست‌ها» به‌همراه `CONTENT_SCOPES`، `REQUEST_SCOPES` و متادیتای گروه‌دار.
- `apps/api/src/auth/moderator-scope-map.ts` و `apps/api/src/moderator/content-decision.service.ts`: نگاشت سطح‌ها به scope اعلان و رجیستری تصمیم‌ها.
- `apps/api/src/moderator/*`: بازنویسی سرویس/کنترلر برای صفحه‌بندی
  (`MODERATOR_PAGE_SIZE=10`)، آمار `counts` سه‌حالته، صف‌های درآمدی و فیلتر تب‌ها بر
  اساس تصمیم‌های خود بررسی‌کننده.
- `apps/api/src/subscriptions|boosts|ads/*`: افزودن `listRequestQueue`،
  `requestQueueCounts` و `decidedById` برای صف‌های درخواست.
- `apps/api/src/notifications/*`: `listForReviewer`/`unreadCountForReviewer`/`scopeFilterFor`
  و SSE متناسب با سطح دسترسی؛ زنگ اعلان فقط queue های مجاز کاربر ادمین را می‌شمارد.
- `apps/api/src/{biolinks,businesscards,feeds,news,subscriptions,boosts,ads}/*`:
  ثبت `scope` روی اعلان‌های مدیریتی مربوطه.
- `apps/web/components/moderator/ModeratorPanel.tsx`: بازنویسی کامل با اسکرول
  نامحدود، کارت‌های آماری و کارت‌های درخواست درآمدی.
- `apps/web/components/moderator/ModeratorShell.tsx` و
  `apps/web/app/moderator/notifications/page.tsx`: زنگ اعلان مبتنی بر بررسی‌کننده و
  صفحه‌ی اعلانات اختصاصی کاربر ادمین.
- `apps/web/components/ui/NotificationBell.tsx` و `NotificationsInbox.tsx`: پشتیبانی از
  `allPath` و `linkMapper` برای هدایت لینک‌های `/admin?section=…` به صف معادل.
- `apps/web/lib/moderator-links.ts`: نگاشت لینک اعلان‌ها به صف‌های `/moderator`.
- `apps/web/components/dashboard/UserShell.tsx`: هدایت کاربر ادمین از داشبورد به `/moderator`.
- `apps/web/components/news/ReporterCtaButton.tsx`: پنهان‌کردن «درخواست شهروند خبرنگار» برای این نقش.
- `apps/web/components/admin/AdminModerators.tsx`: گروه‌بندی انتخابگر سطح دسترسی بر اساس گروه.
- `apps/web/lib/api.ts` و `apps/web/lib/version.ts`: تایپ‌های جدید و ارتقای نسخه.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- `prisma generate` و `prisma db push` روی دیتابیس dev؛ وجود جدول `content_decisions` و ستون `notifications.scope` بررسی شد.
- تست API با curl: صفحه‌بندی `total=25, page1=10, page3=5`، شمارش‌های سه‌حالته،
  فیلتر تب «تأییدشده» فقط شامل ۳ قلم تصمیم‌شده‌ی همان بررسی‌کننده (از میان ۲۵۰۰+ تأییدشده‌ی کلی)،
  و خالی‌بودن تب‌های بررسی‌کننده‌ی دیگر؛ همچنین ۴۰۳ برای سطح‌های غیرمجاز.
- فیلتر scope اعلان‌ها: کاربر ادمین با scope بیولینک فقط اعلان‌های `BIOLINK` را می‌بیند و ادمین کل همه را.
- تست SSE: با ثبت یک بیولینک جدید از طریق API، شمارنده‌ی خوانده‌نشده بلافاصله از ۱ به ۲ تغییر کرد.
- تست UI با `playwright-core` و `/usr/bin/google-chrome` روی viewport تبلت و موبایل:
  تب‌ها و اعداد آماری، اسکرول نامحدود `10 → 22`، تب تأییدشده `3` و ردشده `1`،
  نبود دکمه‌ی ویرایش در صف‌های درخواست، هدایت زنگ به `/moderator/notifications` و
  هدایت `/dashboard` به `/moderator`، بدون خطای کنسول.

## ۱۴۰۵/۰۷/۲۶ — کاربر ادمین محدود با سطح دسترسی + پنل بررسی موبایل‌محور — نسخه `v2.59.0`

**هدف:** افزودن قابلیت جدید «امکان تعریف کاربر ادمین توسط ادمین کل با تعیین سطح
دسترسی». کاربر ادمین محدود فقط می‌تواند محتوای مجازِ تعیین‌شده را تأیید، ویرایش یا رد
کند (بیولینک‌ها، کارت‌های ویزیت، فیدها، خبرها) و هیچ دسترسی دیگری به پنل مدیریت ندارد.
رابط کاربری این پنل مخصوص موبایل/تبلت و کاملاً یوزرفرندلی طراحی شده است.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن مقدار `MODERATOR` به enum نقش `Role` و
  فیلد `moderatorScopes String[]` روی مدل `User`.
- `apps/api/src/auth/moderator-scopes.ts`: منبع یکتای سطح‌های دسترسی محتوا
  (`BIOLINK`/`BUSINESS_CARD`/`FEED`/`NEWS`) به‌همراه متادیتای فارسی و نرمال‌ساز.
- `apps/api/src/auth/moderator-scope.decorator.ts` و `moderator-scope.guard.ts`:
  دکوراتور `@RequireScope` و گارد بررسی سطح دسترسی (ادمین کل همه را دارد).
- `apps/api/src/moderator/*`: ماژول، کنترلر و سرویس اختصاصی پنل بررسی
  (`/moderator/me`, `/moderator/queue/:scope`, `/moderator/item/:scope/:id`
  و `.../decide`) که همان سرویس‌های پنل مدیریت را با محدودیت سطح فراخوانی می‌کند.
- `apps/api/src/admin/*`: افزودن اندپوینت‌های ساخت/ویرایش/حذف کاربر ادمین
  (`/admin/moderators`)، DTO مربوطه و جلوگیری از ارتقا به `MODERATOR` از مسیر
  تغییر نقش عادی. `AdminService` برای ماژول moderator اکسپورت شد.
- `apps/api/src/feeds/feeds.service.ts`: متد `updatePostContent` برای ویرایش
  درجای پست فید توسط کاربر ادمین (بدون بازگشت به صف).
- `apps/web/components/moderator/*`: شل موبایل‌محور (`ModeratorShell`)، پنل بررسی
  (`ModeratorPanel`) و ویرایشگر پست فید (`ModeratorFeedEditor`).
- `apps/web/app/moderator/page.tsx`: صفحه‌ی پنل بررسی.
- `apps/web/components/admin/AdminModerators.tsx`, `AdminShell.tsx` و
  `apps/web/app/admin/page.tsx`: بخش مدیریت «کاربران ادمین» در پنل مدیر کل.
- `apps/web/components/admin/BiolinkLiveEditor.tsx`, `BusinessCardLiveEditor.tsx`,
  `AdminNewsEditor.tsx`: امکان بازاستفاده با مسیرهای سفارشی (`routes`/`itemPath`)
  برای پنل کاربر ادمین.
- `apps/web/lib/api.ts`, `lib/auth.ts`, `ProfilePanel.tsx`, `UserShell.tsx`,
  `app/(auth)/login/page.tsx`: افزودن نقش `MODERATOR`، تایپ‌ها، برچسب‌ها و
  هدایت کاربر ادمین به `/moderator`.
- `apps/web/lib/version.ts`: نسخه به `v2.59.0`.

**تأیید/تست:**
- `apps/api`: `tsc --noEmit` بدون خطا؛ `apps/web`: `tsc --noEmit` بدون خطا.
- `prisma db push` روی دیتابیس dev: مقدار `MODERATOR` به enum و ستون
  `moderatorScopes` اضافه شد (بررسی با `psql`).
- تست دستی API با curl: ساخت کاربر ادمین با `scopes`، ورود، `GET /moderator/me`
  (بازگشت سطح‌ها و شمارنده‌ها)، مشاهده‌ی صف مجاز، ویرایش و تأیید بیولینک،
  رد شدن `403` برای صف غیرمجاز (`FEED`) و برای `/admin/users`، تغییر سطح
  (اعمال فوری روی توکن موجود)، غیرفعال‌سازی (باطل‌شدن نشست) و حذف حساب.
- تست UI با `playwright-core` و `/usr/bin/google-chrome` (موبایل 390px و تبلت
  768px): بارگذاری پنل `/moderator`، نمایش تب‌های مجاز، رندر کارت‌ها، تأیید
  درجای یک بیولینک، هدایت `/admin` → `/moderator`، و رندر بخش «کاربران ادمین» در
  پنل مدیر — بدون خطای کنسول.
- `python3 scripts/sync_install.py` سپس `--check` → `patched: 0` / `added: 0`.

## ۱۴۰۵/۰۷/۲۵ — سند تحلیل پلتفرم استخدام/SSO/ابزارهای مشترک — نسخه `v2.58.1`

**هدف:** افزودن یک سند راهبردی در `docs/` که اسناد `job1/job2`، `sso` و
`tools/tools2` را تحلیل کند (نقاط قوت/ضعف، تحلیل منابع ۱-core/3GB و ۱-core/3GB، و
معماری پیشنهادی جایگزین).

**تغییرات:**
- `docs/MULTI-PLATFORM-PLAN-REVIEW.md`: سند جدید (تحلیل راهبردی؛ بدون هیچ تغییری در
  کد یا زیرساخت).
- `apps/web/lib/version.ts`: نسخه به `v2.58.1`.

**تأیید/تست:**
- `python3 scripts/sync_install.py` → `added: 1`؛ سپس `--check` → `patched: 0` /
  `added: 0`.

## ۱۴۰۵/۰۷/۲۵ — لاگ اقدامات درآمدی در پنل ادمین — نسخه `v2.58.0`

**هدف:** نمایش یک لاگ کامل از تمامی اقدامات درآمدزایی (خرید/ارتقای اشتراک، پله،
تبلیغ دایرکتوری، تبلیغ صفحه اول، اشتراک فید و دریافت جایزه امتیاز) در پنل ادمین، تا
سابقه‌ی هر خرید و تصمیم مدیر قابل رهگیری باشد.

**تغییرات:**
- `apps/api/src/activity/activity.service.ts`: افزودن ثابت `REVENUE_ACTIONS` (کلیدهای
  رویدادهای اشتراک/پله/تبلیغ/فید/جایزه) و پارامتر `actions` برای فیلتر گروهی.
- `apps/api/src/activity/activity.controller.ts`: پارامتر `revenueOnly` در
  `GET /admin/activity` که فقط رویدادهای درآمدی را برمی‌گرداند و دراپ‌داونِ فیلتر را
  هم به همان کلیدها محدود می‌کند.
- `apps/web/components/admin/ActivityLogPanel.tsx`: پشتیبانی از `scope="revenue"`
  به‌همراه برچسب‌های فارسی کلیدهای `AD_*`، `FEED_SUBSCRIPTION_*` و `REWARD_REDEEMED`
  و عنوان/توضیح مخصوص این حالت.
- `apps/web/components/admin/AdminRevenue.tsx`: نمایش «گزارش اقدامات درآمدی» زیر جدول
  گزارش درآمد.
- `apps/web/lib/version.ts`: نسخه به `v2.58.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web`: هر دو بدون خطا.
- `GET /api/admin/activity?revenueOnly=true`: فقط کلیدهای درآمدی
  (`AD_*`, `BOOST_*`, `REWARD_REDEEMED`, `SUBSCRIPTION_*`) با ۴۶ رویداد؛ در حالت بدون
  فیلتر ۵۱۰ رویداد و ۴۲ کلید (یعنی فیلتر درست کار می‌کند).
- `python3 scripts/sync_install.py --check` → `patched: 0` / `added: 0`.

## ۱۴۰۵/۰۷/۲۵ — بازگرداندن سابقه‌ی تبلیغ‌ها در پنل کاربر + محافظ ضدحذف دیتابیس در استقرار — نسخه `v2.57.0`

**هدف:** رفع باگ «پریدن» درخواست‌های قبلی پله/تبلیغ از پنل کاربر و افزودن یک محافظ
در استقرار تا هیچ تغییر اسکیما دوباره دیتای واقعی را پاک نکند.

**علت ریشه‌ای (رگرسیون کامیت `745d223`):** آن کامیت بخش‌های مستقل «تبلیغ صفحه اول»
و «تبلیغ در دایرکتوری» را از داشبورد کاربر حذف و همه را در `BoostTable` ادغام کرد،
اما (۱) سابقه‌ی درخواست‌های تبلیغ اصلاً در جدول ادغام‌شده نمایش داده نمی‌شد و
(۲) در `BoostsService.overview` سابقه‌ی درخواست‌ها بر اساس `targetId in pageTargetIds`
فیلتر می‌شد؛ یعنی فقط درخواست‌های آیتم‌های همان صفحه‌ی جاری برمی‌گشت. با هزاران
کارت، درخواست‌های قدیمی در صفحه‌های دیگر می‌افتادند و «حذف‌شده» به‌نظر می‌رسیدند.
رکوردها در دیتابیس سالم بودند (هم لوکال و هم پروداکشن ردیف‌های پله/تبلیغ را دارند).

**تغییرات:**
- `apps/api/src/boosts/boosts.service.ts`: واکشی درخواست‌های پله و تبلیغ مستقیماً با
  `where: { userId }` (بدون فیلتر به آیتم‌های صفحه) و `take: 300`؛ افزودن
  `adRequests` به خروجی overview با `target` و `displayState`؛ افزودن هلپرهای
  `resolveTargetLabels` و `adDisplayState`.
- `apps/web/lib/api.ts`: افزودن فیلد `adRequests` به تایپ `BoostOverview`.
- `apps/web/components/dashboard/BoostTable.tsx`: افزودن بخش «تاریخچه درخواست‌های
  تبلیغ» (با تفکیک دایرکتوری/صفحه اول و وضعیت نمایش) و برچسب‌های فارسی
  `AD_DISPLAY_LABELS`.
- `apps/api/docker-entrypoint.sh`: پیش از `prisma db push`، SQL واقعیِ `migrate diff`
  گرفته می‌شود و اگر شامل `DROP TABLE/COLUMN` باشد، اجرا متوقف می‌شود (مگر با
  `ALLOW_DESTRUCTIVE_DB_PUSH=1`)؛ اسنپ‌شات قبلی همچنان گرفته می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v2.57.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web`: هر دو بدون خطا.
- `sh -n apps/api/docker-entrypoint.sh` سالم؛ و در کانتینر، `migrate diff` برای
  اسکیمای فعلی «empty migration» و برای اسکیمای آزمایشیِ حذف‌ستون/تغییرنام‌جدول
  خروجی `DROP COLUMN`/`DROP TABLE` داد و گارد همان‌جا بلاک کرد.
- `GET /api/boosts/overview`: خروجی شامل `adRequests: 8` با `target` و `displayState`
  (نمونه: `DIRECTORY ACTIVE علی بابایی`).
- `python3 scripts/sync_install.py --check` → `patched: 0` / `added: 0`.

## ۱۴۰۵/۰۷/۲۵ — اصلاح جایگاه «پله» در دایرکتوری (صدر لیست کل بدون فیلتر) — نسخه `v2.56.1`

**هدف:** رفع باگ؛ وقتی درخواست «پله» کاربر تأیید می‌شد، آیتم به‌جای صدر لیست
**کل** دایرکتوری، فقط در صدر لیست کارت‌های خودِ کاربر (داشبورد) می‌آمد. رفتار
درست: پله آیتم را بدون هیچ فیلتری به صدر لیست کل دایرکتوری می‌برد و به‌محض ثبت
یک آیتم جدیدتر، آن آیتم پله‌شده به رتبه دوم سقوط می‌کند. «تبلیغ در دایرکتوری»
(پرداختی/هدفمند) باید همچنان فقط در برش شهر+کسب‌وکار خودش بالا بیاید.

**علت ریشه‌ای (رگرسیون کامیت `21ccdd8`):** هنگام تأیید پله، پیش‌تر `pinnedAt`
روی «الان» تنظیم می‌شد (پس آیتم مثل آیتم تازه به صدر می‌رفت). در آن کامیت
`pinnedAt` حذف شد و به‌جایش منطق `boostScopeMatches` اضافه شد که پله را فقط وقتی
بالا می‌برد که بازدیدکننده **هم شهر و هم کسب‌وکار** را فیلتر کرده باشد؛ در حالت
بدون فیلتر، `boostedUntil` در پاسخ null می‌شد. در نتیجه پله در لیست کل اثری نداشت
و فقط `updatedAt` عوض می‌شد که آیتم را در لیست داشبورد خود کاربر بالا می‌برد.

**تغییرات:**
- `apps/api/src/boosts/boosts.service.ts`: هنگام تأیید پله برای `BIOLINK`،
  `BUSINESS_CARD` و `FEED` علاوه بر `boostedUntil`، مقدار `pinnedAt` هم روی «الان»
  بازنشانی می‌شود (رفتار «آیتم تازه‌ساخته»)؛ در نتیجه بدون فیلتر به صدر می‌رود و با
  ثبت آیتم جدیدتر پایین می‌افتد.
- `apps/api/src/common/directory-sort.ts`: تابع `boostScopeMatches` به
  `adDirectoryScopeMatches` تغییر نام یافت و دامنه‌اش صرفاً به «تبلیغ در
  دایرکتوری» محدود شد؛ پله دیگر اسکوپ‌شده نیست.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: گروه جدا برای پله حذف شد
  (چون `pinnedAt` خودش آن را اول می‌آورد)؛ در حالت بدون فیلتر دیگر `boostedUntil`
  null نمی‌شود تا برچسب «پله» نمایش داده شود، ولی `adDirectoryUntil` همچنان برای
  تبلیغ هدفمند null می‌شود.
- `apps/api/src/feeds/feeds.service.ts`: کلید مرتب‌سازی `boostedUntil` از `orderBy`
  حذف شد؛ پله با `pinnedAt` به صدر می‌آید (تبلیغ در دایرکتوری همیشه بالا نمی‌ماند).
- `apps/web/components/ui/BoostBadge.tsx`،
  `apps/web/components/biolink/DirectoryBiolinkItem.tsx`،
  `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx`: متن راهنمای
  برچسب «پله» از «همین دسته‌بندی شهر و کسب‌وکار» به «صدر لیست کل دایرکتوری» اصلاح شد.
- `docs/REVENUE-MODELS.md`: توضیح مدل «پله» به‌روزرسانی شد (بدون فیلتر، صدر لیست کل،
  سقوط با آیتم جدیدتر) و شرط نمایش تبلیغ دایرکتوری به `adDirectoryScopeMatches`
  اصلاح شد.

**تأیید/تست:**
- تایپ‌چک: `apps/api/node_modules/.bin/tsc --noEmit -p tsconfig.json` و
  `apps/web/node_modules/.bin/tsc --noEmit -p tsconfig.json` هر دو بدون خطا.
- تست زنده روی کانتینرهای dev (`alooshomal-api` + `alooshomal-db`):
  - `GET /api/business-cards/public?limit=3` بدون فیلتر → کارت پله‌شده دقیقاً ردیف
    اول با `boostedUntil` معتبر (برچسب پله). سپس با تازه‌ترکردن `pinnedAt` یک کارت
    دیگر، کارت پله‌شده به ردیف دوم سقوط کرد.
  - `GET /api/biolinks/public` بدون فیلتر → بیولینک پله‌شده با `boostedUntil` معتبر
    در لیست نمایش داده شد.
  - تبلیغ دایرکتوری (`adDirectoryUntil` فعال): در حالت بدون فیلتر `adDirectoryUntil`
    در پاسخ null شد (نشتی برچسب «تبلیغات» نداشت) و در فیلتر شهر+کسب‌وکار همان آیتم
    به‌عنوان ردیف اول با `adDirectoryUntil` فعال برگشت.
- پس از تست، مقادیر `pinnedAt` رکوردهای آزمایشی به حالت اول بازگردانده شد.

## ۱۴۰۵/۰۷/۲۵ — ذخیره‌ی خودکار فرم نیمه‌کاره در مرورگر (بازیابی پس از ترک صفحه) — نسخه `v2.56.0`

**هدف:** اگر کاربر فرم ساخت بیولینک/کارت ویزیت را نیمه‌کاره رها کند **بدون**
زدن دکمه‌ی «ذخیره به‌عنوان پیش‌نویس»، قبلاً همه‌چیز از دست می‌رفت. حالا مقادیر
به‌صورت خودکار در همان مرورگر ذخیره می‌شود و در بازگشت، امکان بازیابی داده می‌شود.

**تغییرات:**
- `apps/web/lib/use-form-autosave.ts` (فایل جدید): هوک `useFormAutosave` که با
  دیبانس (پیش‌فرض ۸۰۰ms) مقادیر فرم را در `localStorage` می‌نویسد، در mount
  می‌خواند و `clear()` می‌دهد؛ به‌همراه `hasAnyValue` برای تشخیص فرمِ معنادار.
  همچنین guardِ `hydrated` و `shouldPersist` تا snapshot ذخیره‌شده با حالت خالیِ
  اولیه بازنویسی نشود.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: پراپ `autosaveKey`؛
  بنر «اطلاعات نیمه‌کاره پیدا شد» با دکمه‌های «بازیابی» و «نادیده بگیر» در هر دو
  مرحله (انتخاب تم و ویرایش)؛ پاک‌شدن snapshot فقط پس از ارسال موفق.
- `apps/web/app/dashboard/biolinks/new/page.tsx` و
  `apps/web/app/dashboard/business-cards/new/page.tsx`: پاس‌دادن `autosaveKey` و
  برگرداندن موفقیت/شکست از `handleSubmit` (`Promise<boolean>`).

**تأیید/تست:**
- `tsc --noEmit` برای `apps/web` بدون خطا.
- تست UI با Playwright: تایپ در فرم و blur → snapshot در
  `alooshomal_autosave_biolink_new` ذخیره شد؛ reload → بنر بازیابی نمایش داده شد؛
  کلیک «بازیابی» → فیلد با مقدار ذخیره‌شده پیش‌پر شد؛ کلیک «نادیده بگیر» →
  snapshot پاک شد.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check`
  → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۷/۲۵ — بازگشت به پیش‌نویس بیولینک/کارت در صفحه‌ی «جدید» — نسخه `v2.55.0`

**هدف:** وقتی کاربر در صفحه‌ی ساخت بیولینک (`/dashboard/biolinks/new`) روی
«ذخیره به‌عنوان پیش‌نویس» می‌زد، پیش‌نویس در دیتابیس ذخیره می‌شد ولی صفحه‌ی «جدید»
هیچ‌وقت آن را بازنمی‌کرد؛ با مراجعه‌ی مجدد، فرم خالی بود و کاربر نمی‌توانست کار
ناقص خود را تکمیل کند. همین مشکل برای کارت ویزیت هم وجود داشت.

**تغییرات:**
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: متد `findLatestDraft`
  که آخرین پیش‌نویس (`status = DRAFT`) کاربر را با همان شکل `findMineById`
  (شامل `city`/`business`/لینک متقابل) و بدون خطا در صورت نبود پیش‌نویس برمی‌گرداند.
- `apps/api/src/biolinks/biolinks.controller.ts` و
  `apps/api/src/businesscards/business-cards.controller.ts`: اندپوینت جدید
  `GET /biolinks/mine/draft` و `GET /business-cards/mine/draft` (احراز‌شده).
- `apps/web/app/dashboard/biolinks/new/page.tsx` و
  `apps/web/app/dashboard/business-cards/new/page.tsx`: هنگام بارگذاری، پیش‌نویس
  خوانده و فرم با مقادیر آن پیش‌پر می‌شود؛ ارسال بعدی به‌جای ساخت رکورد جدید،
  همان پیش‌نویس را به‌روزرسانی می‌کند (پس رکورد تکراری ساخته نمی‌شود). دکمه‌ی
  «حذف پیش‌نویس و شروع از ابتدا» هم اضافه شد.
- `apps/web/lib/api.ts`: افزودن `'DRAFT'` به اتحاد `status` انواع `Biolink` و
  `BusinessCard`.

**تأیید/تست:**
- `tsc --noEmit` برای هر دو اپ بدون خطا.
- تست زنده‌ی API: `GET /biolinks/mine/draft` با نبود پیش‌نویس `null` و پس از ساخت
  پیش‌نویس، همان را با تمام فیلدها برگرداند؛ پس از ارسال نهایی، وضعیت به
  `PENDING` رفت و `total` ردیف‌های کاربر افزایش نیافت (به‌روزرسانی شد، نه ساخت جدید).
- تست UI با Playwright: در `/dashboard/biolinks/new` عنوان «ادامه‌ی تکمیل بیولینک»
  و فیلدهای پیش‌نویس (`fullName`، `jobTitle`) در فرم پیش‌پر بودند.
- داده‌ی تستی از دیتابیس پاک شد.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check`
  → `patched: 0 / added: 0`.

## ۱۴۰۵/۰۷/۲۵ — راهنمای بررسی خزش خزنده‌ها + خروجی PDF — نسخه `v2.54.0`

**هدف:** مستندسازی اینکه خزنده‌ها چگونه کارت‌ویزیت‌ها/بیولینک‌ها را می‌بینند،
چگونه کاربر هر لحظه بررسی کند، و اینکه آیتم‌های جدید خودکار وارد نقشه‌ی سایت
می‌شوند یا نه؛ به‌همراه خروجی PDF برای مرور.

**تغییرات:**
- `docs/SEO-CRAWLER-CHECK.md` (فایل جدید): راهنمای فارسی شامل دستورهای `curl`
  برای شمارش آدرس‌ها، مشاهده‌ی محتوا با هویت گوگل، مکانیزم خودکار sitemap
  (`GET /seo/sitemap` + شرط `APPROVED`/`isPublished`)، تأخیر کش (`revalidate=3600`)
  و سقف `MAX_ROWS=20_000`.
- `docs/reports/seo-crawler-check.html` و `docs/reports/seo-crawler-check.pdf`:
  نسخه‌ی PDF همان راهنما (فونت Vazirmatn، چیدمان RTL).

**تأیید/تست:**
- صحت مکانیزم خودکار با تست زنده روی دیتابیس توسعه: با غیرفعال‌کردن یک کارت،
  عدد نقشه‌ی سایت بلافاصله از ۲۵۱۷ به ۲۵۱۶ کاهش یافت و پس از بازگردانی دوباره
  ۲۵۱۷ شد (یعنی لیست دستی نیست).
- خروجی واقعی روی سایت پروداکشن: `sitemap.xml` دارای ۲۳۱۵ آدرس (۲۳۰۳ کارت)،
  صفحه‌ی یک کارت با هدر Googlebot کد ۲۰۰ و متن/JSON-LD قابل‌خواندن برگرداند.
- رندر PDF با Playwright/Chromium و بازبینی متن فارسی با `pdftotext`.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check`
  → `patched: 0 / added: 0` (PDF باینری جاسازی نمی‌شود).

## ۱۴۰۵/۰۷/۲۵ — مهار ارتقای غیر-LTS نود در Dependabot — نسخه `v2.53.4`

**هدف:** Dependabot برای هر دو ایمیج داکر PR ارتقای `node:24-alpine` به
`node:25-alpine` می‌ساخت؛ نسخه‌ی ۲۵ فرد و غیر-LTS است و با `engines` پروژه
(`>=24`، خط LTS) در تضاد است.

**تغییرات:**
- `.github/dependabot.yml`: برای اکوسیستم `docker` مسیرهای `/apps/api` و
  `/apps/web` قاعده‌ی `ignore` با `update-types: version-update:semver-major`
  برای وابستگی `node` اضافه شد؛ به‌روزرسانی‌های minor/patch همچنان می‌آیند.

**تأیید/تست:**
- اعتبارسنجی YAML با `yaml.safe_load` و نمایش قاعده‌ی `ignore` برای هر دو
  ورودی docker.
- `python3 scripts/sync_install.py --check` → `patched: 0 / added: 0`
  (`.github/` خارج از دامنه‌ی sync است).

## ۱۴۰۵/۰۷/۲۵ — اصلاح CI: قفل همزمانی دیپلوی و کاهش نویز Dependabot — نسخه `v2.53.3`

**هدف:** پس از افزودن Dependabot، در هر push چندین ران موازی (دیپلوی + شش
ران Dependabot) اجرا می‌شد. علاوه بر آن، دیپلوی بلوک `concurrency` نداشت و
pushهای پشت‌سرهم می‌توانستند چند دیپلوی همزمان و رقابتی روی سرور اجرا کنند.

**تغییرات:**
- `.github/workflows/deploy.yml`: افزودن بلوک `concurrency`
  (`group: deploy-${{ github.ref }}`, `cancel-in-progress: true`) تا فقط یک
  دیپلوی در هر زمان اجرا شود و push جدید، رانِ در جریان را لغو کند.
- `.github/dependabot.yml`: حذف ورودی‌های تکراری `npm` برای `/apps/api` و
  `/apps/web` (ورودی ریشه چون npm workspaces است همه را پوشش می‌دهد و باعث PR
  دوتایی برای یک وابستگی می‌شد) و کاهش `open-pull-requests-limit` برای مهار
  حجم PRها.

**تأیید/تست:**
- اعتبارسنجی YAML هر دو فایل با `python3 -c "import yaml; yaml.safe_load(...)"`
  بدون خطا و تأیید مقدار `concurrency`.
- `python3 scripts/sync_install.py --check` → `patched: 0 / added: 0`
  (فایل‌های `.github/` خارج از دامنه‌ی sync هستند).

## ۱۴۰۵/۰۷/۲۵ — رفع خطای CSP در حالت توسعه (`unsafe-eval` و منبع تصاویر) — نسخه `v2.53.2`

**هدف:** پس از افزودن CSP در مرحله‌ی امنیت، حالت توسعه‌ی Next.js/Turbopack دچار
خطای کنسول `eval() is not supported in this environment` شد و تصاویر MinIO
(`http://localhost:9000`) توسط `img-src` بلاک می‌شدند.

**تغییرات:**
- `apps/web/proxy.ts`: در حالت توسعه (`NODE_ENV !== 'production'`) به `script-src`
  مقدار `'unsafe-eval'` اضافه می‌شود تا Turbopack/HMR کار کند؛ در پروداکشن
  سیاست سخت‌گیرانه باقی می‌ماند. همچنین منبع عمومی رسانه از `MINIO_PUBLIC_URL`
  خوانده و در حالت توسعه به `img-src` اضافه می‌شود (پیش‌فرض `http://localhost:9000`)
  تا آواتارها/لوگوها بلاک نشوند.
- `docker-compose.yml` و `docker-compose.prod.yml`: پاس‌دادن متغیر
  `MINIO_PUBLIC_URL` به سرویس web برای ساخت درست `img-src` در CSP.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/web` بدون خطا.
- `curl -D -` نشان می‌دهد در dev هدر CSP شامل `'unsafe-eval'` و
  `http://localhost:9000` است و در پروداکشن بدون `'unsafe-eval'` خواهد بود.
- اجرای Playwright روی `/`، `/business-cards`، `/biolinks` و `/dashboard`:
  صفر خطای کنسول و صفر نقض CSP.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check` →
  `patched: 0 / added: 0`.

## ۱۴۰۵/۰۷/۲۵ — گزارش PDF اجرای سه مرحله (سئو، سرعت، امنیت) — نسخه `v2.53.1`

**هدف:** پس از اجرای سه مرحله‌ی مستندات راهنما (سئو، سرعت، امنیت)، یک گزارش
جمع‌بندی به‌صورت PDF فارسی برای کاربر تولید شود.

**تغییرات:**
- `docs/reports/security-perf-seo-report.html`: منبع گزارش فارسی (RTL، فونت
  Vazirmatn) شامل خلاصه‌ی مدیریتی، چهار مدل کسب درآمد، و شرح تغییرات و تأیید
  هر سه مرحله.
- `docs/reports/security-perf-seo-report.pdf`: خروجی نهایی گزارش (A4، رندر
  با Chromium/Playwright).

**تأیید/تست:**
- رندر با Playwright/Chromium انجام و متن فارسی خروجی با `pdftotext` بازبینی شد
  (چیدمان RTL و اعداد فارسی صحیح است).
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check` →
  `patched: 0 / added: 0` (فایل PDF باینری است و طبق قانون در install.sh جاسازی
  نمی‌شود).

## ۱۴۰۵/۰۷/۲۵ — سخت‌سازی امنیت: هدرهای امنیتی وب، کاربر غیر‌روت API، Dependabot و سند ممیزی — نسخه `v2.53.0`

**هدف:** اجرای مرحله‌ی سوم چک‌لیست امنیتی (`secure.pdf`): افزودن هدرهای امنیتی و
CSP به فرانت‌اند، اجرای کانتینر API با کاربر غیر‌روت، فعال‌سازی اسکن خودکار
وابستگی‌ها و ثبت یک سند ممیزی لایه‌به‌لایه.

**تغییرات:**
- `apps/web/proxy.ts` (فایل جدید): جایگزین `middleware.ts` بر پایه‌ی قرارداد
  جدید Next.js 16 («`middleware`» به «`proxy`» تغییر نام یافته و همیشه روی
  رانتایم Node اجرا می‌شود). روی همه‌ی مسیرها هدرهای `Content-Security-Policy`،
  `X-Content-Type-Options`، `X-Frame-Options: DENY`، `Referrer-Policy`،
  `Permissions-Policy`، `Cross-Origin-Opener-Policy` و در HTTPS
  `Strict-Transport-Security` اضافه می‌شود.
- `apps/web/middleware.ts`: حذف شد (به `proxy.ts` منتقل شد).
- `apps/api/Dockerfile`: در مرحله‌ی production کاربر غیر‌روت `node` تنظیم شد
  (به‌همراه ساخت و chown پوشه‌ی `backups` تا اسنپ‌شات entrypoint کار کند).
- `.github/dependabot.yml` (فایل جدید): به‌روزرسانی هفتگی وابستگی‌های `npm`
  (ریشه، api، web)، `github-actions` و `docker`.
- `docs/SECURITY-AUDIT.md` (فایل جدید): ممیزی چک‌لیست امنیتی به تفکیک لایه‌ها
  (SCA، SAST/Secret، بک‌اند Prisma/NestJS، فرانت‌اند Next.js، DAST، داکر/Postgres)
  و وضعیت فعلی هر مورد در مخزن.

**تأیید/تست:**
- `tsc --noEmit` برای `apps/web` بدون خطا.
- `curl -s -D - http://localhost:3000/{,biolinks,dashboard,api/health}`: حضور
  همهٔ هدرهای امنیتی (CSP، `X-Frame-Options: DENY`، `nosniff`، …) روی پاسخ‌ها
  تأیید شد و هشدار deprecated صادر نشد.
- `python3 scripts/sync_install.py && python3 scripts/sync_install.py --check` →
  `patched: 0 / added: 0`.

## ۱۴۰۵/۰۷/۲۵ — بهینه‌سازی سرعت: حذف N+1 لایک و پیش‌واکشی تهاجمی — نسخه `v2.52.0`

**هدف:** رفع دو گلوله اصلی سرعت که در «گزارش تحلیل سرعت» ثبت شده بود: (۱) هر
ردیف دایرکتوری هنگام لود یک درخواست مستقل `GET .../like` می‌فرستاد (الگوی N+1
سمت کلاینت) و (۲) پیش‌واکشی خودکار Next برای همه لینک‌های منو، سیل درخواست
`?_rsc=` روی `/dashboard`, `/admin` و مسیرهای ثانویه ایجاد می‌کرد.

**تغییرات:**
- `apps/web/components/ui/LikeButton.tsx`: افزودن پراپ `reconcile` (پیش‌فرض
  `true`). وقتی والد خودش حالت `liked` واقعی را دارد (ردیف دایرکتوری)، با
  `reconcile={false}` درخواست `GET .../like` آن ردیف حذف می‌شود. همچنین یک افکت
  آینه‌ای با `useRef` افزوده شد تا مقدار `liked`/`likeCount` که والد پس از
  بازواکشی صفحه ۱ می‌فرستد به حالت محلی منتقل شود، بی‌آن‌که کلیک خوش‌بینانه کاربر
  پاک شود.
- `apps/web/components/biolink/DirectoryBiolinkItem.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx`: پاس‌دادن
  `reconcile={false}` به `LikeButton` ردیف.
- `apps/web/components/layout/MobileNav.tsx`، `components/layout/Footer.tsx`،
  `components/dashboard/UserShell.tsx`: افزودن `prefetch={false}` به لینک‌های
  ناوبری جزئیات‌محور تا سیل پیش‌واکشی RSC فروکش کند (ناوبری همچنان لحظه‌ای است).

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright روی `/business-cards`: تعداد درخواست‌های `.../like` روی صفحه‌ای با
  ۵ ردیف از «۵» به **۰** کاهش یافت (قبلاً به‌ازای هر ردیف یک درخواست).
- صحت عملکرد لایک در سطح API: `POST .../like` → `{liked:true}`، سپس
  `GET .../like` → `{liked:true}` و `POST` دوباره → `{liked:false}`.
- `autocannon -c 20 -d 8` روی `GET /business-cards/public`: میانهٔ تأخیر ~۴۸ms و
  میانگین ~۵۱ms با ~۳۸۸ درخواست/ثانیه و بدون خطای Non-2xx.

## ۱۴۰۵/۰۷/۲۵ — ارتقای سئو دایرکتوری‌ها (SSR، لینک خزنده‌پسند، سایت‌مپ، متادیتا) — نسخه `v2.51.0`

**هدف:** رفعِ ریشه‌ایِ سه اشکال سئوی گزارش‌شده در «گزارش معماری سئو»: (۱) صفحات
دایرکتوری کاملاً CSR بودند و خزنده گوگل هیچ لینک/محتوایی در HTML اولیه نمی‌دید،
(۲) هیچ نقشه سایت XML پویا و robots.txt نبود، (۳) صفحه‌های کارت/بیولینک متادیتای
سئو و داده ساخت‌یافته (JSON-LD) نداشتند و درخواست `favicon.ico` خطای ۴۰۴ می‌داد.

**تغییرات:**
- `apps/api/src/seo/seo.module.ts` / `seo.service.ts` / `seo.controller.ts` (جدید):
  اندپوینت عمومی `GET /seo/sitemap` که فقط صفحات منتشرشده و تأییدشده (کارت ویزیت،
  بیولینک، پست فید) به‌همراه صفحات ثابت را با `lastModified`/`changeFrequency`
  برمی‌گرداند (سقف ۲۰٬۰۰۰ ردیف برای هر نوع).
- `apps/api/src/app.module.ts`: ثبت `SeoModule`.
- `apps/web/app/sitemap.ts` (جدید): تولید `sitemap.xml` زنده از اندپوینت بالا با
  `revalidate = 3600`.
- `apps/web/app/robots.ts` (جدید): مسدودسازی `/dashboard`, `/admin`, `/api/`,
  `/login`, `/register` و معرفی سایت‌مپ.
- `apps/web/app/icon.svg` (جدید): فاوآیکون تا درخواست `favicon.ico` ۴۰۴ نشود.
- `apps/web/lib/site.ts` (جدید): `SITE_URL`، `absoluteUrl`، `SERVER_API_URL` و
  `metaDescription`.
- `apps/web/app/layout.tsx`: افزودن `metadataBase`، canonical، Open Graph و
  Twitter به متادیتای ریشه.
- `apps/web/app/business-cards/[slug]/page.tsx` و `apps/web/app/biolinks/[slug]/page.tsx`:
  افزودن `generateMetadata` (عنوان کلیدواژه‌دار + description + canonical + OG)،
  JSON-LD (`LocalBusiness` وقتی شرکت ست است، وگرنه `ProfilePage`) در HTML سرور، و
  `robots: noindex` برای صفحات ناموجود.
- `apps/web/lib/directory-server.ts` (جدید): واکشی‌های SSR برای صفحهٔ اول دایرکتوری.
- `apps/web/lib/directory.ts`: افزودن گزینهٔ `initialData` به `useDirectoryResults`
  تا از دادهٔ SSR هایدریت شود و بازهم برای آشتی‌دادن پرچم‌های per-visitor
  (`liked`/`saved`) یک‌بار بازواکشی کند.
- `apps/web/app/business-cards/page.tsx` و `apps/web/app/biolinks/page.tsx`:
  تبدیل به Server Component که صفحهٔ اول را SSR می‌کند؛ منطق تعاملی به
  `components/**/DirectoryBusinessCardContent.tsx` و `DirectoryBiolinkContent.tsx`
  منتقل شد.
- `apps/web/components/businesscard/DirectoryBusinessCardItem.tsx` و
  `apps/web/components/biolink/DirectoryBiolinkItem.tsx`: عنوان هر ردیف حالا یک
  `<a href>` واقعی با متن لینک توصیفی است (به‌جای کلیک JS-only) تا خزنده‌ها آن را
  دنبال کنند؛ دکمه‌های لایک/ذخیره بیرون از لنگر ماندند.
- `apps/web/lib/api.ts`: افزودن `publishedAt` اختیاری به `Biolink`/`BusinessCard`.

**تأیید/تست:**
- `node_modules/.bin/tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- `curl http://localhost:3001/api/seo/sitemap` → ۲۵۱۷ ورودی معتبر.
- `curl http://localhost:3000/business-cards` → ۴۲ کیلوبایت HTML با ۵ لینک واقعی
  `href="/business-cards/<slug>"` در سورس اولیه (قبلاً فقط شل خالی بود).
- `curl /biolinks` → لینک‌های `/biolinks/<slug>` در سورس؛ `/sitemap.xml` و
  `/robots.txt` و `/icon.svg` همه با کد ۲۰۰ پاسخ دادند.
- متادیتای `/business-cards/9074939`: تگ `title` کلیدواژه‌دار، `description`،
  `canonical` و بلوک `application/ld+json` در HTML سرور.
- Playwright: کلیک روی ردیف دایرکتوری جزئیات را در همان صفحه باز کرد
  (`?card=<slug>`)؛ اسکرول بی‌نهایت سالم بود (۲۰ → ۷۰ لینک) و خطای کنسول نبود.

## ۱۴۰۵/۰۷/۲۵ — مستندسازی چهار مدل کسب درآمد برای برنامه‌نویس — نسخه `v2.50.0`

**هدف:** ثبت رسمی و دقیقِ چهار مدل درآمدی پلتفرم — (۱) خرید اشتراک، (۲) پله،
(۳) تبلیغ در دایرکتوری (تبلیغ هدفمند مدت‌دار)، (۴) تبلیغ در صفحه اصلی — به‌همراه
جریان مکمل «اشتراک فید»، در یک سند فنی برای برنامه‌نویس؛ با تأکید صریح بر تفاوت
«پله» (برچسب «پله») و «تبلیغ در دایرکتوری» (برچسب «تبلیغات») که پیش‌تر با هم
اشتباه گرفته می‌شدند.

**تغییرات:**
- `docs/REVENUE-MODELS.md` (جدید): مرجع فنی هر مدل شامل جدول یک‌نگاه، منطق،
  مدل‌های Prisma، کلیدهای تنظیمات (مدت/قیمت/اسلات)، مسیر سرویس‌ها، ترتیب نمایش
  دایرکتوری، نگاشت امتیاز (`RewardKind`)، گزارش درآمد و چک‌لیست تغییر.
- `README.md`: افزودن ارجاع به `docs/REVENUE-MODELS.md` در بخش «Technical notes».

**تأیید/تست:**
- بازبینی دستی: تمام ارجاع‌های فایل/تابع/کلیدِ ذکرشده در سند با کد تطبیق داده شد
  (`common/plans.ts`، `common/directory-sort.ts`، `common/ad-scheduling.ts`،
  `subscriptions.service.ts#enforceNotExceeded`، `ads.service.ts#decide`،
  `boosts.service.ts#decide`، `settings.service.ts`).
- `python3 scripts/sync_install.py` سپس `--check` → «patched: 0 / added: 0»
  (سند و README در `install.sh` جاسازی شدند).

## ۱۴۰۵/۰۷/۲۵ — گزارش درآمد مدل‌های کسب درآمد — نسخه `v2.49.0`

**هدف:** افزودن یک گزارش درآمد مجزا در پنل ادمین برای هر یک از مدل‌های درآمدی
(اشتراک، پله، تبلیغ در دایرکتوری، تبلیغ در صفحه اصلی و اشتراک فید). چون هنوز
درگاه پرداخت متصل نیست، هر تراکنش تأییدشده با «قیمت واحد» قابل‌تنظیم همان مدل
ضرب می‌شود و خروجی به‌عنوان برآورد درآمد نمایش داده می‌شود.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن کلیدهای قیمت واحد
  `boostPrice`، `adHomePrice` و `adDirectoryPrice` (پیش‌فرض ۵۰٬۰۰۰ / ۱۵۰٬۰۰۰ /
  ۱۰۰٬۰۰۰ تومان) به‌همراه seed و getter/setter با اعتبارسنجی.
- `apps/api/src/settings/settings.controller.ts`: افزودن سه فیلد قیمت به DTO،
  پیلود `GET /admin/settings` و پردازش `PATCH`.
- `apps/api/src/admin/admin.service.ts`: افزودن `revenueReport()`؛ شمارش
  تراکنش‌های تأییدشده‌ی هر مدل (پله، تبلیغ دایرکتوری، تبلیغ صفحه اول، اشتراک
  پلن‌ها به‌تفکیک پلن، و اشتراک فید به‌تفکیک بسته) و ضرب در قیمت واحد.
- `apps/api/src/admin/admin.controller.ts`: افزودن `GET /admin/revenue`.
- `apps/web/components/admin/AdminRevenue.tsx` (جدید): جدول گزارش درآمد، دو
  کارت خلاصه (درآمد برآوردی کل و مجموع تراکنش‌ها) و فرم تنظیم سه قیمت واحد.
- `apps/web/components/admin/AdminShell.tsx`: افزودن آیتم منو و سکشن `revenue`.
- `apps/web/app/admin/page.tsx`: ثبت سکشن `revenue`، عنوان صفحه و رندر
  `AdminRevenue`.
- `apps/web/lib/version.ts`: نسخه به `v2.49.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- API: `GET /admin/revenue` ردیف‌های هر مدل را با تعداد/قیمت واحد/درآمد برآوردی
  برگرداند (نمونه: پله ۷×۵۰٬۰۰۰، تبلیغ دایرکتوری ۱×۱۰۰٬۰۰۰، تبلیغ صفحه اول
  ۵×۱۵۰٬۰۰۰). `PATCH /admin/settings` قیمت جدید را ذخیره کرد و `totalRevenue`
  به‌درستی به‌روز شد؛ سپس قیمت‌ها به مقدار پیش‌فرض بازگردانده شد.
- Playwright: در `/admin?section=revenue` آیتم منو، کارت‌های خلاصه، جدول ۶‌ردیفی و
  سه ورودی قیمت رندر شدند.

## ۱۴۰۵/۰۷/۲۵ — جداسازی «تبلیغ در دایرکتوری» (تبلیغ هدفمند مدت‌دار) از «پله» — نسخه `v2.48.0`

**هدف:** از چهار مدل درآمدی، مدل «تبلیغ در دایرکتوری» به‌اشتباه با «پله» یکی
گرفته شده بود. «پله» مورد را مثل تازه‌ساخته‌شده به صدر می‌آورد، اما «تبلیغ در
دایرکتوری» یک محصول مستقل است: پرداختی، هدفمند و مدت‌دار (مدت را ادمین تعیین
می‌کند)؛ فقط وقتی بازدیدکننده هم شهر و هم کسب‌وکار را فیلتر می‌کند، مورد تبلیغ‌شده
با نشان **«تبلیغات»** بالای همه می‌نشیند. «پله» نشان **«پله»** دارد و از آن جداست.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن enum `AdPlacement { HOME, DIRECTORY }`؛
  افزودن `placement` به `AdRequest` (پیش‌فرض `HOME`) با ایندکس
  `[placement, targetId]`؛ افزودن `adDirectoryUntil DateTime?` به `Biolink`،
  `BusinessCard` و `FeedPost`.
- `apps/api/src/settings/settings.service.ts` و `settings.controller.ts`: کلید
  `adDirectoryDurationDays` (پیش‌فرض ۳۰ روز) + getter/setter و اعتبارسنجی DTO.
- `apps/api/src/ads/dto/create-ad.dto.ts`: فیلد اختیاری `placement`.
- `apps/api/src/ads/ads.service.ts`: `create` جداسازی صف بر اساس `placement` و
  متن اعلان متفاوت؛ `decide` برای تبلیغ دایرکتوری پنجره‌ی فوری (بدون صف لِین)
  با مدت ادمین و مهر `adDirectoryUntil` روی هدف در یک تراکنش؛ `computeActiveAd`
  فقط تبلیغ‌های `HOME` را برمی‌گرداند؛ `listRequests(status, placement)`؛
  باطل‌کردن کش دایرکتوری‌ها هنگام تأیید تبلیغ دایرکتوری.
- `apps/api/src/admin/admin.controller.ts`: افزودن کوئری `placement` به
  `GET /admin/ads`.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `business-cards.service.ts`: در حالت فیلتر دقیق شهر+کسب‌وکار سه گروه
  (تبلیغ > پله > عادی) جداگانه واکشی و به‌ترتیب چیده می‌شوند؛ بیرون از آن برش،
  `adDirectoryUntil`/`boostedUntil` صفر می‌شوند.
- `apps/api/src/feeds/feeds.service.ts`: ترتیب دایرکتوری فید
  `adDirectoryUntil` → `boostedUntil` → `pinnedAt` → `id`.
- `apps/api/src/boosts/boosts.service.ts`: افزودن `adDirectoryUntil` به select و
  بازگرداندن `directoryAdStatus` جدا از `adStatus` (کلید `kind:id`).
- `apps/api/src/points/points.service.ts`: اصلاح مسیر جایزه‌ی امتیازی
  `AD_DIRECTORY` — پیش‌تر «پله» می‌داد، حالا یک `AdRequest` با
  `placement=DIRECTORY` و مهر `adDirectoryUntil` به‌مدت ادمین می‌سازد.
- `apps/web/lib/api.ts`: افزودن `placement` به `AdRequest` و
  `adDirectoryUntil`/`directoryAdStatus` به تایپ‌های مربوطه.
- `apps/web/components/biolink/DirectoryBiolinkItem.tsx` و
  `businesscard/DirectoryBusinessCardItem.tsx` و `feed/FeedCard.tsx`: نشان
  «تبلیغات» برای تبلیغ دایرکتوری و نشان «پله» برای پله.
- `apps/web/components/dashboard/BoostTable.tsx` و `MyItemsTable.tsx`: افزودن
  دکمه‌ی «تبلیغ در دایرکتوری» با `POST /ads/request {placement:'DIRECTORY'}`؛
  تغییر برچسب «تبلیغ صفحه اول» به «تبلیغ در صفحه اول» و «پله (تبلیغ دایرکتوری)»
  به «پله».
- `apps/web/components/admin/AdminAds.tsx`: تب «دایرکتوری» حالا تبلیغ‌های
  واقعی `placement=DIRECTORY` را جدولی نشان می‌دهد (پله بخش ادمین مستقل خود را
  دارد)؛ افزودن فیلد تنظیمات مدت تبلیغ دایرکتوری.
- `apps/web/app/dashboard/boost/page.tsx`: به‌روزرسانی متن معرفی سه گزینه.
- `apps/web/lib/version.ts`: نسخه به `v2.48.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- `prisma generate` + `prisma db push` موفق؛ دیتابیس هم‌گام.
- API: درخواست تبلیغ دایرکتوری → `PENDING` با `placement=DIRECTORY`؛ تأیید ادمین
  → `adDirectoryUntil` به‌اندازه‌ی ۳۰ روز و `boostedUntil` دست‌نخورده.
  `GET /biolinks/public?cityId=..&businessId=..` مورد تبلیغ‌شده را ایندکس ۰
  برگرداند و در لیست بدون فیلتر دیده نشد؛ باکس تبلیغ صفحه اصلی
  (`/ads/public/active`) تبلیغ دایرکتوری را نشان نداد.
- Playwright: نشان‌های «تبلیغات» و «پله» در دایرکتوری `/biolinks`، سه دکمه در
  `/dashboard/boost` و جدول تب دایرکتوری در پنل ادمین رندر شدند.
- داده‌های تست (بیولینک، درخواست تبلیغ، اعلان‌ها) و اسکریپت‌های موقت پاک شدند.

## ۱۴۰۵/۰۷/۲۵ — فیدها: آپلود پس‌زمینه تصویر + ارتقای اشتراک — نسخه `v2.47.0`

**هدف:** (۱) آپلود عکس پست فید در پس‌زمینه انجام شود تا کاربر منتظر نماند؛
(۲) وقتی ظرفیت پست‌های اشتراک پر شد، کاربر فقط بتواند اشتراک خود را به بسته‌ی
بالاتر ارتقا دهد، روزهای اشتراک از ابتدا شروع شود و سهمیه‌ی بسته‌ی جدید، پست‌های
فعلی کاربر را هم حساب کند.

**تغییرات:**
- `apps/web/app/dashboard/feeds/page.tsx`: جایگزینی آپلود ترتیبی با اسلات‌های
  تصویر؛ هر فایل بلافاصله پیش‌نمایش می‌گیرد و آپلود در پس‌زمینه انجام می‌شود
  (`ImageSlot` + `pendingUploads`). هنگام «ثبت پست» فقط آپلودهای در جریان
  منتظر می‌مانند؛ عکس بدون متن هم مجاز شد. افزودن پنل «ارتقای اشتراک فید» برای
  حالت پرشدن ظرفیت.
- `apps/api/src/feeds/feeds.service.ts`: افزودن `exhaustedSubscription` و
  `upgradePackageIds`؛ `myOverview` حالا `exhausted` و `upgradePackageIds` را
  برمی‌گرداند. `requestSubscription` ارتقا به بسته‌ی کوچک‌تر/مساوی را رد می‌کند.
  `decideSubscription` هنگام ارتقا: `startedAt`/`expiresAt` از لحظه‌ی تأیید و
  `postsUsed` برابر تعداد پست‌های فعلی کاربر؛ اشتراک فعال قبلی `CANCELLED` می‌شود.
- `apps/api/src/feeds/dto/feed.dto.ts`: `images` می‌تواند خالی باشد (حذف حداقل یک).
- `apps/web/lib/api.ts`: افزودن `exhausted` و `upgradePackageIds` به
  `FeedMineOverview`.
- `apps/web/lib/version.ts`: نسخه به `v2.47.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- API: با اشتراک ۵ پست پرشده، `GET /feeds/mine` درست `exhausted` و فقط بسته‌ی
  ۱۰ پستی را در `upgradePackageIds` برگرداند؛ درخواست بسته‌ی ۵ پستی خطای ۴۰۰ گرفت و
  درخواست بسته‌ی ۱۰ پستی ثبت شد. تأیید مدیر: اشتراک جدید `ACTIVE` با
  `postsUsed=1` (تعداد پست فعلی)، انقضای ۳۰ روز بعد، و اشتراک قبلی `CANCELLED`.
- Playwright: با ظرفیت پرشده پنل ارتقا و «درخواست ارتقا» رندر شد؛ با ظرفیت باقی‌مانده
  فرم پست نمایش داده شد و با انتخاب فایل، پیش‌نمایش بلافاصله آمد و
  `POST /feeds/mine/uploads` در پس‌زمینه فراخوانی شد.
- داده‌های تست (پست، اشتراک‌ها، اعلان‌ها، لاگ‌ها) پاک شدند.

## ۱۴۰۵/۰۷/۲۵ — صفحه راهنمای استفاده + لینک در نوبار — نسخه `v2.46.0`

**هدف:** ساخت یک صفحه‌ی راهنمای ساده و روان که همه‌ی امکانات اپلیکیشن را برای
کاربر توضیح دهد و هر گام به همان ویژگی لینک بدهد، و قرار دادنش در نوبار سایت.

**تغییرات:**
- `apps/web/app/guide/page.tsx`: صفحه‌ی راهنما با ۱۲ گام (ثبت‌نام، ساخت کارت
  ویزیت، بیولینک، دایرکتوری، افزایش بازدید/پله، تبلیغات، فیدها، شهروند خبرنگار،
  ذخیره‌شده‌ها، اشتراک/ارتقا، امتیاز، پشتیبانی) — هر گام لینک ریدایرکت به همان
  بخش دارد؛ به‌همراه CTA شروع و بخش ارتباط با پشتیبانی.
- `apps/web/lib/nav.ts`: افزودن «راهنما» به `PUBLIC_NAV` (هدر و فوتر).
- `apps/web/components/layout/MobileNav.tsx`: افزودن آیتم «راهنما» و تغییر شبکه به
  `grid-cols-7` برای جا دادن آیتم هفتم.
- `apps/web/lib/version.ts`: نسخه به `v2.46.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright: `/guide` با عنوان «آلوشمال چطور کار می‌کند؟» و گام «۱۲. پشتیبانی»
  رندر شد؛ لینک «راهنما» در هدر ظاهر شد و لینک‌های درون‌صفحه‌ای (مثلاً به
  `/dashboard/boost`) موجود بودند.

## ۱۴۰۵/۰۷/۲۵ — سه دکمه تبلیغ در جدول «کارت‌های من / بیولینک‌های من» — نسخه `v2.45.1`

**هدف:** در `/dashboard/biolinks` و `/dashboard/business-cards` دکمه‌های تبلیغ
بازچینش شوند: «تبلیغ صفحه اول» → «تبلیغ در صفحه اول»، دکمه‌ی پله با برچسب کوتاه،
و افزودن دکمه‌ی جدید «تبلیغ در دایرکتوری».

**تغییرات:**
- `apps/web/components/dashboard/MyItemsTable.tsx`: تغییر برچسب «تبلیغ صفحه اول» به
  «تبلیغ در صفحه اول»؛ افزودن دکمه‌ی سوم «تبلیغ در دایرکتوری»
  (`POST /boosts/request` با یادداشت «درخواست تبلیغ در صدر لیست دایرکتوری») و
  وضعیت `PENDING` مستقل برای آن.
- `apps/web/lib/version.ts`: نسخه به `v2.45.1`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright با کاربر تست (پس از ساخت موقت یک کارت ویزیت): در هر دو صفحه‌ی
  `/dashboard/biolinks` و `/dashboard/business-cards` سه دکمه‌ی «تبلیغ در صفحه اول»،
  «پله» و «تبلیغ در دایرکتوری» رندر شدند (کارت تست موقت سپس حذف شد).

**یادداشت:** برچسب «بله» در درخواست کاربر به‌احتمال زیاد غلط تایپی «پله» است؛ دکمه
موجود همان پله (`POLE`) است و برچسب آن «پله» نگه داشته شد. یکسان‌بودن/تفکیک
دکمه‌ی «تبلیغ در دایرکتوری» از «پله» برای بررسی بعدی موکول شد.

## ۱۴۰۵/۰۷/۲۵ — نمایش جدولی صفحات اصلی پنل ادمین — نسخه `v2.45.0`

**هدف:** بخش‌های `biolinks`، `business-cards`، `subscriptions`، `boosts` و `ads`
پنل ادمین (و تب‌های داخلی‌شان) از حالت کارتی به جدول تبدیل شوند.

**تغییرات:**
- `apps/web/components/admin/AdminDataTable.tsx`: کامپوننت مشترک جدول ادمین
  (`AdminColumn<T>` + پوسته‌ی جدول با هدر/ردیف/حالت خالی یکسان).
- `apps/web/components/admin/AdminBoosts.tsx`: تبدیل لیست درخواست‌های پله به جدول
  (مورد، کاربر، تاریخ، یادداشت، عملیات) + پشتیبانی از برچسب «پست فید».
- `apps/web/components/admin/AdminAds.tsx`: تب «تبلیغ در صفحه اصلی» جدولی شد
  (مورد، کاربر، تاریخ، بازه نمایش، یادداشت، وضعیت، عملیات).
- `apps/web/components/admin/AdminSubscriptions.tsx`: هم «بسته‌های اشتراک» و هم
  «درخواست‌های اشتراک» جدولی شدند.
- `apps/web/app/admin/page.tsx`: بخش‌های بیولینک‌ها و کارت‌های ویزیت به جدول
  تبدیل شدند (نام، شغل/شرکت، کاربر، وضعیت، عملیات).
- `apps/web/lib/version.ts`: نسخه به `v2.45.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright با ورود ادمین: در `?section=biolinks|business-cards|boosts|ads` یک
  جدول و در `subscriptions` دو جدول (بسته‌ها + درخواست‌ها) رندر شد.

## ۱۴۰۵/۰۷/۲۵ — اعلان ادمین برای درخواست شهروند خبرنگار + دکمه «ثبت خبر» — نسخه `v2.44.2`

**هدف:** ثبت درخواست شهروند خبرنگار توسط کاربر هیچ اعلانی در پنل ادمین نمی‌ساخت،
و شهروند خبرنگارهای تأییدشده در صفحه‌ی «نبض شهر» راهی برای ثبت خبر نداشتند.

**تغییرات:**
- `apps/api/src/news/news.service.ts`: `requestReporter` حالا `notifyAdmins` (عنوان
  «درخواست شهروند خبرنگار جدید» با لینک `/admin?section=news`) و یک
  `activity.log` با اکشن `REPORTER_REQUESTED` ثبت می‌کند.
- `apps/web/components/news/ReporterCtaButton.tsx`: برای کاربران شهروند خبرنگار
  یا ادمین، به‌جای مخفی‌شدن، دکمه‌ی «ثبت خبر» با لینک `/dashboard/reporter`
  نمایش داده می‌شود.
- `apps/web/lib/version.ts`: نسخه به `v2.44.2`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- API: `POST /news/reporter/request` با کاربر تست، سپس
  `GET /admin/notifications` ردیف «درخواست شهروند خبرنگار جدید» را نشان داد (سپس
  داده‌های تست پاک شد).
- Playwright: با نقش `CITIZEN_REPORTER` در `/pulse` متن دکمه «ثبت خبر» مشاهده شد
  و «درخواست شهروند خبرنگار» دیگر نمایش داده نشد.

## ۱۴۰۵/۰۷/۲۵ — فعال‌سازی شمارش «بازدید» صفحات عمومی بیولینک/کارت ویزیت — نسخه `v2.44.1`

**هدف:** شمارنده‌ی «بازدید» هیچ‌وقت زیاد نمی‌شد چون صفحات عمومی بیولینک و کارت
ویزیت هرگز اندپوینت ثبت اسکن را صدا نمی‌زدند (هیچ `ScanEvent` ساخته نمی‌شد).

**تغییرات:**
- `apps/web/components/ui/RecordView.tsx`: کامپوننت کلاینتی سبک که یک‌بار در هر
  بارگذاری صفحه، `POST /{kind}/public/{slug}/scan` را صدا می‌زند (با گارد ref برای
  جلوگیری از اجرای دوباره‌ی افکت در حالت dev).
- `apps/web/app/biolinks/[slug]/page.tsx`: افزودن `<RecordView kind="biolinks" .../>`.
- `apps/web/app/business-cards/[slug]/page.tsx`: افزودن
  `<RecordView kind="business-cards" .../>`.
- `apps/web/components/biolink/DirectoryDetail.tsx`: ثبت بازدید هنگام باز شدن پنل
  جزئیات دایرکتوری.
- `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: همان کار برای
  کارت ویزیت.
- `apps/web/lib/version.ts`: نسخه به `v2.44.1`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright: بازدید صفحه‌ی `/biolinks/<slug>` دقیقاً یک فراخوانی `.../scan` زد و
  ردیف `scan_events` از ۰ به ۱ رسید؛ همین تست برای `/business-cards/<slug>` هم
  `business_card_scan_events` را به ۱ رساند. سپس ردیف‌های تست پاک شدند.

## ۱۴۰۵/۰۷/۲۵ — پروفایل کاربری: نمایش جدولی + صفحه‌بندی نشست‌های فعال — نسخه `v2.44.0`

**هدف:** در `/dashboard/profile` اطلاعات حساب به شکل جدول نمایش داده شود و فهرست
«نشست‌های فعال» با صفحه‌بندی بیاید.

**تغییرات:**
- `apps/api/src/sessions/sessions.service.ts`: `listForUser` حالا صفحه‌بندی‌شده است و
  `{ items, meta }` برمی‌گرداند؛ `listForAdmin` سازگار نگه داشته شد.
- `apps/api/src/sessions/sessions.controller.ts`: `GET /sessions` پارامترهای
  `page`/`limit` را با `PaginationDto` می‌پذیرد.
- `apps/web/components/dashboard/SessionsPanel.tsx`: جدول نشست‌ها (دستگاه/مرورگر/
  آخرین فعالیت/IP/وضعیت/عملیات) و افزودن `Pagination`.
- `apps/web/components/dashboard/ProfilePanel.tsx`: تبدیل بلوک اطلاعات حساب به جدول
  (`ProfileRow` جایگزین `InfoRow`).
- `apps/web/lib/version.ts`: نسخه به `v2.44.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- API: `GET /sessions?page=1` ساختار `{items, meta}` با `total:13` و
  `totalPages:2` برگرداند.
- Playwright: در `/dashboard/profile` دو جدول رندر شد؛ جدول اطلاعات حساب با سرستون‌های
  «نام/ایمیل/موبایل/نقش/وضعیت حساب/تاریخ عضویت» و جدول نشست‌ها با سرستون‌های
  «دستگاه/مرورگر/آخرین فعالیت/IP/وضعیت/عملیات»، و کنترل صفحه‌بندی نمایش داده شد.

## ۱۴۰۵/۰۷/۲۵ — ادغام «تبلیغات» در «افزایش بازدید» + جدول و تب‌های بیولینک/کارت/فید — نسخه `v2.43.0`

**هدف:** صفحه‌ی `/dashboard/boost` جدولی شود، به سه تب «بیولینک‌ها/کارت‌های ویزیت/
فیدها» تقسیم شود، و «افزایش بازدید» و «تبلیغات» در همین یک بخش ادغام شوند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن `FEED` به دو enum `BoostTargetKind` و
  `AdTargetKind`؛ افزودن `boostedUntil` و `pinnedAt` به `FeedPost` (+ ایندکس‌ها).
- `apps/api/src/boosts/boosts.service.ts`: پشتیبانی کامل از `FEED` در
  `overview` (فهرست/شمارش/رنک فید + `adStatus` هر مورد)، `create`،
  `listRequests` و `findOwnedTarget`؛ برچسب‌های فارسی اعلان/لاگ با
  `boostKindLabel`؛ نامعتبرسازی کش `dir:feeds`.
- `apps/api/src/ads/ads.service.ts`: پشتیبانی از `FEED` در `overview`،
  `targetLabels`، `publicAdPayload`، `findOwnedTarget` و شمارش‌ها.
- `apps/api/src/feeds/feeds.service.ts`: `findMySaved` (ذخیره‌شده‌های فید)،
  `directoryRank`، و اعمال «پله» در ترتیب دایرکتوری عمومی فید.
- `apps/api/src/feeds/feeds.controller.ts`: `GET /feeds/mine/saved`.
- `apps/api/src/common/facets-cache.service.ts`: پشتیبانی `feed` در
  `invalidateDirectory`.
- `apps/api/src/boosts/boosts.module.ts`: افزودن `FeedsModule`.
- `apps/web/components/dashboard/BoostTable.tsx` (جدید): جدول موارد با سه تب و دو
  اکشن «پله (تبلیغ دایرکتوری)» و «تبلیغ صفحه اول» + تاریخچه‌ی درخواست‌ها؛
  `BoostSearchForm` هم در همین فایل.
- `apps/web/app/dashboard/boost/page.tsx`: بازنویسی روی `BoostTable`.
- `apps/web/app/dashboard/ads/page.tsx`: تبدیل به ریدایرکت به `/dashboard/boost`.
- `apps/web/components/dashboard/UserShell.tsx`: حذف آیتم «تبلیغات» و تغییر برچسب
  «افزایش بازدید» به «افزایش بازدید و تبلیغات».
- حذف کامپوننت‌های بی‌استفاده‌ی `HomeAdSection.tsx` و `DirectoryAdSection.tsx`.
- `apps/web/lib/api.ts`: افزودن `FEED` به `BoostTargetKind`/`AdTargetKind` و فیلدهای
  `feeds`/`feedTotal` به overviewها و `adStatus` به `BoostTargetItem`.
- `apps/web/lib/version.ts`: نسخه به `v2.43.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا (پس از `prisma generate`).
- `prisma db push` → ستون‌های `feed_posts.boostedUntil/pinnedAt` و مقادیر enum
  `FEED` اضافه شدند.
- API: `GET /boosts/overview` کلیدهای `feeds` و `feedTotal` را برگرداند؛
  `POST /boosts/request` و `POST /ads/request` با `kind:"FEED"` موفق بودند؛ تأیید
  مدیر (`PATCH /admin/boosts/:id`) روی پست فید، `boostedUntil` را ست کرد.
- Playwright: منوی کناری دیگر «تبلیغات» ندارد و «افزایش بازدید و تبلیغات» نشان
  می‌دهد؛ در `/dashboard/boost` سه تب و جدول با ستون‌های
  «عنوان/وضعیت/جایگاه/بازدید/لایک/آخرین پله/عملیات» و دکمه‌های «پله» و
  «تبلیغ صفحه اول» رندر شد؛ `/dashboard/ads` به `/dashboard/boost` ریدایرکت شد.
  (داده‌های آزمایشی پس از تست حذف شدند.)

## ۱۴۰۵/۰۷/۲۵ — «ذخیره‌شده‌های من»: تب‌بندی بیولینک/کارت/فید + نمایش جدولی — نسخه `v2.42.0`

**هدف:** صفحه‌ی `/dashboard/saved` به نمایش جدولی تغییر کند و محتوای آن در سه تب
«بیولینک‌ها»، «کارت‌های ویزیت» و «فیدها» تفکیک شود.

**تغییرات:**
- `apps/api/src/feeds/feeds.service.ts`: افزودن `findMySaved` (پست‌های فید
  ذخیره‌شده‌ی کاربر، مرتب بر اساس تاریخ ذخیره، صفحه‌بندی‌شده با `myListPageSize`).
- `apps/api/src/feeds/feeds.controller.ts`: افزودن `GET /feeds/mine/saved` با
  `PaginationDto`.
- `apps/web/lib/api.ts`: افزودن فیلد اختیاری `savedAt` به تایپ `FeedPost`.
- `apps/web/app/dashboard/saved/page.tsx`: بازنویسی با سه تب و دو جدول (`SavedTable`
  برای بیولینک/کارت و `SavedFeedsTable` برای فیدها)؛ هر تب صفحه‌بندی مستقل دارد و
  حذف با «برداشتن ذخیره» همان‌طور که قبلاً بود کار می‌کند.
- `apps/web/lib/version.ts`: نسخه به `v2.42.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا.
- API: `GET /feeds/mine/saved` پاسخ صفحه‌بندی‌شده برگرداند.
- Playwright: سه تب «بیولینک‌ها/کارت‌های ویزیت/فیدها» در `/dashboard/saved` رندر شد؛
  با درج یک ردیف `biolink_saves` آزمایشی، جدول بیولینک‌ها با ستون‌های
  «عنوان/شرکت/تاریخ ذخیره/عملیات» و یک ردیف نمایش داده شد؛ تب‌های دیگر حالت خالی
  صحیح داشتند. (ردیف آزمایشی پس از تست حذف شد.)

## ۱۴۰۵/۰۷/۲۵ — نمایش جدولی «بیولینک‌های من» و «کارت‌های ویزیت من» + درخواست تبلیغ — نسخه `v2.41.0`

**هدف:** صفحات `/dashboard/biolinks` و `/dashboard/business-cards` از حالت کارت به
نمایش جدولی تغییر کنند، همه‌ی قابلیت‌های قبلی (وضعیت، جایگاه، بازدید، لایک/ذخیره،
ویرایش، مشاهده، حذف، درخواست پله) حفظ شوند، و دو دکمه‌ی جدید «تبلیغ در صفحه اول» و
«تبلیغ در دایرکتوری» برای هر ردیف اضافه شود.

**تغییرات:**
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: افزودن `adStatus` (آخرین
  وضعیت درخواست تبلیغ صفحه اصلی هر مورد) به پاسخ `/mine` در کنار `boostStatus`.
- `apps/web/lib/api.ts`: افزودن `adStatus` به تایپ‌های `Biolink` و `BusinessCard`.
- `apps/web/components/dashboard/MyItemsTable.tsx` (جدید): جدول مشترک موارد کاربر با
  ستون‌های عنوان/وضعیت/جایگاه/بازدید/لایک و ذخیره/عملیات؛ دکمه‌های ویرایش، مشاهده،
  حذف، «تبلیغ صفحه اول» (POST `/ads/request`) و «تبلیغ دایرکتوری» (POST
  `/boosts/request`) با نمایش وضعیت «در انتظار».
- `apps/web/app/dashboard/biolinks/page.tsx` و
  `apps/web/app/dashboard/business-cards/page.tsx`: جایگزینی گرید کارت‌ها با
  `MyItemsTable` (صفحه‌بندی و حالت خالی حفظ شد).
- `apps/web/components/dashboard/CardStatsBar.tsx`: بدون استفاده باقی ماند (حذف نشد).
- `apps/web/lib/version.ts`: نسخه به `v2.41.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/api` و `apps/web` → بدون خطا (پس از `prisma generate`).
- API: `GET /biolinks/mine` حالا `adStatus` را برمی‌گرداند.
- Playwright: در `/dashboard/biolinks` جدول با ۶ ستون رندر شد؛ دکمه‌های «تبلیغ صفحه
  اول» و «تبلیغ دایرکتوری» موجودند؛ کلیک روی «تبلیغ صفحه اول» یک درخواست واقعی ثبت
  کرد و دکمه به «تبلیغ: در انتظار» تغییر یافت (بدون خطای runtime). `/dashboard/business-cards`
  برای کاربر بدون کارت، حالت خالی را نشان می‌دهد.

## ۱۴۰۵/۰۷/۲۵ — حذف بخش‌های «آخرین کارت‌های ویزیت من» و «آخرین بیولینک‌های من» از داشبورد — نسخه `v2.40.1`

**هدف:** در صفحه‌ی `/dashboard` دو بخش فهرست «آخرین کارت‌های ویزیت من» و
«آخرین بیولینک‌های من» حذف شوند (کاربر درخواست کرد این دو بخش از داشبورد برداشته
شوند).

**تغییرات:**
- `apps/web/app/dashboard/page.tsx`: حذف کامل دو بلوک «آخرین کارت‌های ویزیت من» و
  «آخرین بیولینک‌های من» و پاک‌سازی state/importهای بی‌استفاده (`loading`,
  `rejected`, `Plus`, `XCircle`, `BiolinkStatusBadge`, `BusinessCardStatusBadge`)؛
  کارت‌های آماری و «وضعیت تیکت‌ها»/«دسترسی سریع» حفظ شدند.
- `apps/web/lib/version.ts`: نسخه به `v2.40.1`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- Playwright: پس از ورود، در `/dashboard` متن «آخرین کارت‌های ویزیت من» و
  «آخرین بیولینک‌های من» دیگر وجود ندارد، در حالی که «وضعیت تیکت‌ها» و
  «دسترسی سریع» باقی مانده‌اند.

## ۱۴۰۵/۰۷/۲۵ — مرتب‌سازی منوی پنل کاربری + انتقال «امتیاز من» به تبِ شهروند خبرنگار — نسخه `v2.40.0`

**هدف:** مرتب‌کردن دقیق ترتیب آیتم‌های بنل کاربری از بالا به پایین مطابق فهرست
درخواستی، و تبدیل «امتیاز من» از یک آیتم مستقل منو به یک تب داخل «شهروند خبرنگار».

**تغییرات:**
- `apps/web/components/dashboard/UserShell.tsx`: ترتیب `NAV` به «داشبورد، کارت‌های
  ویزیت من، بیولینک‌های من، فید من، ذخیره‌شده‌های من، اشتراک، افزایش بازدید،
  تبلیغات، شهروند خبرنگار، تیکت‌های پشتیبانی، پروفایل کاربری» تغییر کرد و آیتم
  مستقل «امتیاز من» حذف شد (`Coins` هم از importها حذف شد).
- `apps/web/components/dashboard/PointsPanel.tsx` (جدید): بدنه‌ی صفحه‌ی امتیاز به
  یک کامپوننت قابل‌استفاده‌ی مجدد منتقل شد.
- `apps/web/components/reporter/ReporterPanel.tsx`: افزودن دو تبِ «خبرهای من» و
  «امتیاز من»؛ تبِ امتیاز `PointsPanel` را رندر می‌کند (هم در حالت دارا بودن نقش
  خبرنگار و هم پیش از آن).
- `apps/web/app/dashboard/points/page.tsx`: به پوسته‌ی سبک تبدیل شد که همان
  `PointsPanel` را رندر می‌کند (لینک‌های مستقیم قبلی حفظ شدند).
- `apps/web/lib/version.ts`: نسخه به `v2.40.0`.

**تأیید/تست:**
- `tsc --noEmit` روی `apps/web` → بدون خطا.
- `python3 scripts/sync_install.py` سپس `--check` → «patched: 0 / added: 0» (بدون تغییر معلق).
- Playwright با `/usr/bin/google-chrome`: ورود با کاربر آزمایشی، ترتیب منوی کناری
  دقیقاً `["داشبورد","کارت‌های ویزیت من","بیولینک‌های من","فید من","ذخیره‌شده‌های من","اشتراک","افزایش بازدید","تبلیغات","شهروند خبرنگار","تیکت‌های پشتیبانی","پروفایل کاربری"]`
  بود؛ در `/dashboard/reporter` دو تب «خبرهای من» و «امتیاز من» دیده شد و با کلیک
  روی تب امتیاز، بخش «موجودی امتیاز شما» رندر شد؛ مسیر مستقیم `/dashboard/points`
  هم همچنان کار می‌کند. بدون خطای runtime.

## ۱۴۰۵/۰۷/۲۵ — تبلیغات: جستجو/صفحه‌بندی انتخاب مورد + ادغام «تبلیغ در دایرکتوری» — نسخه `v2.39.0`

**هدف:** (۱) در `/dashboard/ads` به‌جای فهرست طولانی همه‌ی کارت‌ها/بیولینک‌ها،
جستجو و صفحه‌بندی اضافه شود. (۳) قابلیت «تبلیغ در دایرکتوری» (پله) که قبلاً فقط در
صفحه‌ی جدا بود، در بخش «تبلیغات» هم بیاید و این بخش به دو تبِ «تبلیغ در صفحه اصلی» و
«تبلیغ در دایرکتوری» تقسیم شود (هم در پنل کاربر و هم در پنل مدیر).

**تغییرات:**
- `apps/api/src/ads/ads.service.ts` + `ads.controller.ts` + `dto/ads-overview-query.dto.ts`:
  `overview` حالا با `page` و `q` کار می‌کند؛ فهرست کارت/بیولینک با جستجو در
  عنوان/شغل/شرکت و صفحه‌بندی (`myListPageSize`) و افزودن `meta` به پاسخ.
- `apps/api/src/boosts/boosts.service.ts` + `boosts.controller.ts` +
  `dto/boost-overview-query.dto.ts`: افزودن جستجو (`q`) به نمای کلی پله.
- `apps/web/components/dashboard/HomeAdSection.tsx` (جدید): تب «تبلیغ در صفحه اصلی»
  با نوار جستجو و `Pagination` و تاریخچه‌ی درخواست‌ها.
- `apps/web/components/dashboard/DirectoryAdSection.tsx` (جدید): تب «تبلیغ در
  دایرکتوری» با جستجو و صفحه‌بندی (منتقل‌شده از صفحه‌ی boost).
- `apps/web/app/dashboard/ads/page.tsx`: تبدیل به دو تب.
- `apps/web/app/dashboard/boost/page.tsx`: بازنویسی سبک که همان `DirectoryAdSection`
  را رندر می‌کند (لینک کنارِ موجود حفظ شد).
- `apps/web/components/admin/AdminAds.tsx`: سه تب «تبلیغ در صفحه اصلی»، «تبلیغ در
  دایرکتوری» (با `AdminBoosts`) و «تنظیمات».
- `apps/web/lib/api.ts`: افزودن `meta` به `AdsOverview`.

**تأیید/تست:**
- `tsc --noEmit` روی API و Web → بدون خطا.
- API: `GET /ads/overview?page=1` با ۲۵۰۱ بیولینک، `limit=12`، `biolinkTotalPages=209`
  و صفحه‌ی ۲ ادامه‌ی درست را داد؛ `?q=محمد` نتیجه را به ۲۸۹ محدود کرد. همین برای
  `/boosts/overview` هم درست بود.
- Playwright: `/dashboard/ads` دو تب و نوار جستجو و کنترل صفحه‌بندی را نشان داد؛ تب
  دایرکتوری فهرست و صفحه‌بندی دارد. `/admin?section=ads` سه تب «صفحه اصلی/دایرکتوری/
  تنظیمات» را داشت و تب دایرکتوری درخواست‌های پله را نشان داد؛ بدون خطای runtime.

## ۱۴۰۵/۰۷/۲۵ — رفع باگ فیلتر هم‌زمان شهر+کسب‌وکار در دایرکتوری‌ها — نسخه `v2.38.1`

**هدف:** در دایرکتوری بیولینک/کارت ویزیت، وقتی هم شهر و هم کسب‌وکار انتخاب می‌شد،
هدر تعداد را درست می‌گفت ولی هیچ آیتمی نمایش داده نمی‌شد.

**ریشه‌ی باگ:** در شاخه‌ی «پله»، کوئری آیتم‌های غیربوست‌شده از
`NOT: { boostedUntil: { gt: now } }` استفاده می‌کرد؛ در SQL چنین شرطی ردیف‌هایی که
`boostedUntil` آن‌ها `NULL` است را هم حذف می‌کند (منطق سه‌مقداری). چون همه‌ی ردیف‌های
یک اسلایس بوست‌نشده بودند، هیچ آیتمی برنمی‌گشت.

**تغییرات:**
- `apps/api/src/biolinks/biolinks.service.ts`: جای `NOT boosted` از شرط صریح
  `OR: [{ boostedUntil: null }, { boostedUntil: { lte: now } }]` استفاده شد.
- `apps/api/src/businesscards/business-cards.service.ts`: همان اصلاح.

**تأیید/تست:**
- کوئری مستقیم SQL روی اسلایس موردنظر: `NOT boosted` صفر ردیف می‌داد در حالی که کل
  اسلایس ۱۰ ردیف بود.
- API: `GET /biolinks/public?cityId=…&businessId=…` پس از اصلاح ۱۰ آیتم با `total=10`
  برگرداند. با بوست واقعی در یک اسلایس ۲۱تایی: صفحه‌ی اول آیتم بوست‌شده را اول و سپس
  بقیه را آورد و صفحه‌ی دوم ادامه‌ی آیتم‌های غیربوست را. خارج از اسلایس، تگ بوست لو نرفت.
- Playwright: `/biolinks?...&cityId&businessId` ۱۰ کارت رندر کرد (قبلاً ۰)؛ بدون خطای runtime.

## ۱۴۰۵/۰۷/۲۵ — زمان‌بندی خودکار تبلیغات صفحه اصلی و صف «در انتظار نمایش» — نسخه `v2.38.0`

**هدف:** وقتی مدیر «تعداد تبلیغ نمایش‌داده‌شده» را روی ۱ (یا هر عددی) می‌گذارد، با
تأیید هر درخواست، بازه‌ی نمایش (زمان شروع و پایان) به‌صورت خودکار محاسبه شود؛
تبلیغ‌های اضافه در صف «در انتظار نمایش» بمانند و در بنل مدیر و کاربر این زمان‌ها
نمایش داده شوند. تبلیغ‌ها فقط در بازه‌ی خودشان در صفحه اصلی ظاهر شوند.

**تغییرات:**
- `apps/api/src/common/ad-scheduling.ts` (جدید): تابع خالص `scheduleAdWindow` که
  با توجه به `adDailySlots` لِین‌های موازی و مدت `adDurationDays`، اولین بازه‌ی آزاد
  را انتخاب می‌کند؛ اگر همه‌ی لِین‌ها مشغول باشند، شروعِ تبلیغ جدید را بعد از اولین
  لِینی که آزاد می‌شود می‌گذارد (بدون هم‌پوشانی).
- `apps/api/src/ads/ads.service.ts`: در `decide` هنگام تأیید، `startedAt/endsAt`
  با `scheduleAdWindow` محاسبه می‌شود (نه همیشه `now`). `computeActiveAd` فقط
  تبلیغ‌هایی را نشان می‌دهد که `startedAt <= now < endsAt` و حداکثر به تعداد
  `adDailySlots`؛ افزودن `displayState` (`PENDING`/`SCHEDULED`/`ACTIVE`/`EXPIRED`/
  `REJECTED`) به پاسخ‌های کاربر و مدیر؛ متن اعلان تأیید شامل بازه‌ی زمان‌بندی‌شده.
- `apps/api/src/points/points.service.ts`: جایزه‌ی «تبلیغ در صفحه اصلی» هم به همان
  صف زمان‌بندی متصل شد (به‌جای مدت ثابت ۳۰ روزه) و از `adDurationDays`/`adDailySlots`
  پیروی می‌کند.
- `apps/web/lib/api.ts`: تایپ `AdDisplayState` و فیلد `displayState` روی `AdRequest`.
- `apps/web/app/dashboard/ads/page.tsx`: نمایش وضعیت «در حال نمایش»/«در انتظار نمایش»
  همراه تاریخ شروع و پایان در کارت‌ها و تاریخچه‌ی درخواست‌ها.
- `apps/web/components/admin/AdminAds.tsx`: نمایش وضعیت نمایش و «بازه نمایش: X تا Y»
  برای درخواست‌های تأییدشده و به‌روزرسانی برچسب فیلترها.

**تأیید/تست:**
- `tsc --noEmit` روی API و Web → بدون خطا.
- API (curl): با `adDailySlots=1` و سه درخواست، تأیید پشت‌سرهم بازه‌ها را زنجیره‌ای
  چید (شروعِ هر کدام = پایان قبلی)؛ `GET /ads/public/active` فقط اولی را برگرداند.
  با `adDailySlots=2` دو تبلیغ هم‌زمان (شروع برابر) و سومی در صف قرار گرفت و
  `active` دقیقاً دو مورد را نشان داد. `displayState` در نمای کاربر/مدیر درست بود
  (ACTIVE برای فعال، SCHEDULED برای در صف). مسیر جایزه‌ی امتیاز «تبلیغ در صفحه اصلی»
  نیز تبلیغ را دقیقاً در پایان نزدیک‌ترین لِین زمان‌بندی کرد.
- Web (Playwright): `/dashboard/ads` هم «در حال نمایش» و هم «در انتظار نمایش» را
  نشان می‌دهد؛ `/admin?section=ads` در فیلتر «تأییدشده» وضعیت‌ها و «بازه نمایش» را
  نمایش می‌دهد؛ بدون خطای runtime.

## ۱۴۰۵/۰۷/۲۵ — دایرکتوری بیولینک/کارت ویزیت: فقط اسکرول بی‌نهایت — نسخه `v2.37.1`

**هدف:** در صفحات `/biolinks` و `/business-cards` حالت صفحه‌بندی («قبلی/بعدی») حذف
شود و همیشه فقط اسکرول بی‌نهایت فعال باشد؛ تعداد هر بار بارگذاری هم تابع تنظیم مدیر
(`directoryPageSize`) بماند.

**تغییرات:**
- `apps/web/app/biolinks/page.tsx`: حذف `useDirectoryDisplayMode`، `page/setPage` و
  کل بلوک صفحه‌بندی؛ `useDirectoryResults` با `mode: 'INFINITE'` و
  `useInfiniteScroll(true, ...)`؛ حذف `page` از سینک URL.
- `apps/web/app/business-cards/page.tsx`: همان تغییرات مشابه.

**تأیید/تست:**
- `tsc --noEmit` روی Web → بدون خطا.
- Playwright: در هر دو صفحه هیچ کنترل صفحه‌بندی («صفحه X از Y»/«قبلی»/«بعدی») رندر
  نمی‌شود و خطای runtime ندارد؛ اسکرول لیست در `/biolinks` تعداد آیتم‌ها را از ۱۰ به
  ۹۰ رساند (بارگذاری صفحات بعدی) و `scrollHeight > clientHeight` لیست برقرار است؛
  `overflow` سطح صفحه صفر ماند یعنی فقط لیست اسکرول می‌خورد. `/business-cards` با
  کل ۴ مورد (بدون صفحه‌ی بعد) درست نمایش داده شد.
- اندازه‌ی صفحه همان `directoryPageSize=10` تنظیم مدیر است.

## ۱۴۰۵/۰۷/۲۵ — بخش فیدها (پست تصویری، اشتراک، لایک/ذخیره، پنل مدیر) — نسخه `v2.37.0`

**هدف:** افزودن بخش «فیدها» شبیه پست‌های اینستاگرام: کاربر اشتراک ماهانه (۵ یا ۱۰
پست) می‌خرد، پست متن‌+عکس ثبت می‌کند (با تأیید مدیر منتشر می‌شود)، بازدیدکننده می‌تواند
لایک و ذخیره کند. دایرکتوری کلی فیدها با فیلتر موضوع، جستجوی متنی و اسکرول بی‌نهایت؛
هر پست صفحه‌ی تک دارد. مدیر سهمیه/بسته‌ها، موضوع‌ها و محدودیت تعداد و حجم تصویر را
تعیین می‌کند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: enumهای `FeedTopic`، `FeedPackage` و مدل‌های
  `UserFeedSubscription`، `FeedPost`، `FeedLike`، `FeedSave` (+ روابط روی `User`).
- `apps/api/src/settings/settings.service.ts` + `settings.controller.ts`: کلیدهای
  `feedMaxImages` (پیش‌فرض ۵، بازه ۱–۲۰) و `feedMaxImageKb` (پیش‌فرض ۲۰۴۸، بازه
  ۶۴KB–۲۰MB) با گتر/ستر و افزودن به DTO و پاسخ‌های عمومی/مدیر.
- `apps/api/src/uploads/uploads.constants.ts`: دسته‌ی آپلود `feed` (پوشه `feeds`،
  خروجی ۱۰۸۰×۱۳۵۰) و سقف مطلق `MAX_FEED_UPLOAD_BYTES` (۲۰MB).
- `apps/api/src/uploads/uploads.service.ts`: پارامتر اختیاری `maxBytes` برای اعمال
  سقف اندازه‌ی تعیین‌شده توسط مدیر روی آپلود.
- `apps/api/src/feeds/`: ماژول/سرویس/کنترلر/DTO جدید. کنترلرها: دایرکتوری عمومی
  (`GET /feeds/public`، موضوع‌ها، جزئیات، لایک، ذخیره)، «فید من»
  (`GET/POST/PATCH/DELETE /feeds/mine`، درخواست اشتراک، آپلود با اعمال
  `getFeedMaxImageKb`)، و پنل مدیر (`/admin/feeds/posts|packages|subscriptions|topics`).
  seed بسته‌های پیش‌فرض در boot؛ رزرو سهمیه هنگام ثبت پست و برگشت سهمیه در رد شدن.
- `apps/api/src/app.module.ts` + `settings.service.ts`: ثبت `FeedsModule` و افزودن
  دسته‌ی اعلان `FEED`.
- `apps/web/lib/api.ts`: تایپ‌های `FeedTopic`/`FeedPackage`/`FeedSubscription`/
  `FeedPost`/`FeedDirectoryResponse`/`FeedMineOverview`.
- `apps/web/lib/directory.ts`: جنریک‌کردن `useDirectoryResults` روی شکل facetها و
  پارامتر `initialFacets` (رفع کرش دایرکتوری فید که facetهای `{cities,businesses}`
  می‌گرفت ولی `topics` لازم داشت).
- `apps/web/components/feed/FeedCard.tsx`: کارت اینستاگرامی (تصویر مربع، بج چندتصویری،
  موضوع، نویسنده، لایک).
- `apps/web/app/feeds/page.tsx`: دایرکتوری فیدها با فیلتر موضوع + جستجوی متن +
  صفحه‌بندی/اسکرول بی‌نهایت و سینگل‌صفحه‌ی `apps/web/app/feeds/[id]/page.tsx` با لایک/ذخیره.
- `apps/web/app/dashboard/feeds/page.tsx`: «فید من» (خرید اشتراک، ثبت/ویرایش/حذف پست،
  آپلود عکس با رعایت محدودیت‌ها).
- `apps/web/components/admin/AdminFeeds.tsx` + `app/admin/page.tsx` + `AdminShell.tsx`:
  پنل مدیر فیدها با تب‌های بررسی پست‌ها، اشتراک‌ها، بسته‌ها، موضوع‌ها و تنظیمات
  (تعداد و حجم تصویر).
- `apps/web/components/dashboard/UserShell.tsx` و `components/layout/MobileNav.tsx`:
  افزودن «فید من» و آیتم «فیدها» در نوار پایین موبایل/تبلت (گرید ۶ ستونی).
- `apps/web/components/admin/AdminNotificationSettings.tsx`: برچسب `FEED`.
- `apps/web/lib/version.ts`: نسخه به `v2.37.0`.

**تأیید/تست:**
- `prisma db push` + `prisma generate` → جداول feed_* ساخته شد؛ `tsc --noEmit` روی API
  و Web → بدون خطا.
- API (curl): seed دو بسته‌ی پیش‌فرض؛ درخواست اشتراک → تأیید مدیر (`ACTIVE`) →
  `expiresAt=+۳۰ روز` و `startedAt`؛ آپلود تصویر → WebP؛ ثبت پست → `PENDING` و
  `postsUsed=1`؛ عدم نمایش در دایرکتوری پیش از تأیید؛ تأیید → انتشار و نمایش؛
  ویرایش → بازگشت به صف بررسی و حذف از دایرکتوری؛ لایک/ذخیره و نمایش وضعیت در
  جزئیات؛ جستجوی متنی hit/miss و فیلتر موضوع؛ رد شدن پست → برگشت سهمیه؛ حذف توسط
  کاربر و مدیر؛ CRUD بسته/موضوع؛ اعمال سرورساید `feedMaxImageKb` (خطای «حداکثر ۶۴
  کیلوبایت» برای فایل ۸۴KB) و بازگشت به مقدار پیش‌فرض.
- Web (Playwright + google-chrome): `/feeds` کارت‌ها و فیلتر موضوع را رندر می‌کند و
  بدون خطای runtime است (کرش قبلی facet رفع شد)؛ صفحه‌ی سینگل پست متن و دکمه‌ی
  پسند را نشان می‌دهد؛ `/dashboard/feeds` فرم و اینپوت فایل دارد؛ `/admin?section=feeds`
  همه‌ی ۵ تب را نشان می‌دهد؛ نوار پایین موبایل شامل «فیدها» و بدون سرریز افقی
  (۳۶۰px). حالت `INFINITE` نیز تا بارگذاری کامل ۱۷ پست اسکرول شد (بدون صفحه‌بندی).

## ۱۴۰۵/۰۷/۲۵ — سیستم امتیاز نبض شهر + جوایز (اشتراک/تبلیغ) — نسخه `v2.36.0`

**هدف:** کاربران فعال بابت هر خبر تأییدشده در «نبض شهر» امتیاز می‌گیرند و می‌توانند
امتیازشان را صرف جوایزی کنند که مدیر تعریف می‌کند (اشتراک پولی، تبلیغ در صفحه اصلی،
تبلیغ در دایرکتوری). مدیر امتیاز هر خبر و هزینه‌ی هر جایزه را تعیین می‌کند.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل‌های `Reward`، `RewardRedemption` و
  `PointsLedger`، enum `RewardKind` و فیلد `User.pointsBalance` (+ روابط).
- `apps/api/src/settings/settings.service.ts`: کلید `pointsPerNews` (پیش‌فرض ۱۰) با
  گتر/ستر؛ `apps/api/src/settings/settings.controller.ts`: افزودن `pointsPerNews` به
  DTO و پاسخ admin settings.
- `apps/api/src/points/`: ماژول جدید امتیاز (سرویس/کنترلر/DTO). `earnForNews` ایدمپوتنت
  (هر خبر فقط یک‌بار امتیاز می‌دهد)؛ `redeem` با کسر اتمیک امتیاز و اعمال جایزه
  (فعال‌سازی پلن اشتراک / ساخت تبلیغ تأییدشده‌ی صفحه اصلی / ساخت پله‌ی تأییدشده در
  دایرکتوری)؛ `adjustPoints` برای تنظیم دستی مدیر؛ seed جوایز پیش‌فرض
  (اکو ۵۰، بلاس ۱۵۰، تبلیغ دایرکتوری ۲۵۰، تبلیغ صفحه اصلی ۳۰۰).
- `apps/api/src/news/news.service.ts` + `news.module.ts`: پس از تأیید هر خبر (هم از
  مسیر moderate و هم انتشار مستقیم مدیر) امتیاز به نویسنده واریز می‌شود.
- `apps/api/src/app.module.ts`: ثبت `PointsModule`.
- `apps/web/lib/api.ts`: تایپ‌های `Reward`/`PointsSummary`/`RewardRedemption`/
  `AdminPointsOverview`.
- `apps/web/app/dashboard/points/page.tsx`: صفحه‌ی «امتیاز من» (موجودی، جوایز،
  دریافت جایزه با انتخاب کارت/بیولینک برای جوایز تبلیغی، گردش امتیاز و تاریخچه)؛ آیتم
  منو در `apps/web/components/dashboard/UserShell.tsx`.
- `apps/web/components/admin/AdminPoints.tsx`: پنل مدیر امتیازها با تب‌های «جوایز»
  (ساخت/ویرایش/حذف)، «تنظیمات» (امتیاز هر خبر) و «کاربران و دریافت‌ها»؛ ثبت در
  `AdminShell` و `apps/web/app/admin/page.tsx`.
- `apps/web/app/page.tsx`: افزودن متن امتیاز و دکمه «مشاهده امتیازها» به بخش خبر.
- `apps/web/lib/version.ts`: نسخه به `v2.36.0`.

**تأیید/تست:**
- `prisma db push` + `prisma generate` → مدل‌های جدید ساخته شد؛ `tsc --noEmit` روی
  API و Web → بدون خطا.
- API: ثبت خبر → موجودی ۰؛ تأیید مدیر → موجودی ۱۰ و یک ردیف گردش «تأیید خبر در نبض
  شهر»؛ تأیید مجدد بدون افزایش (ایدمپوتنت). تنظیم دستی `+1000` → ۱۰۱۰. دریافت «اشتراک
  اکو» (۵۰) → موجودی ۹۶۰ و پلن کاربر «اکو» شد. دریافت «تبلیغ صفحه اصلی» با انتخاب
  کارت → یک `AdRequest` تأییدشده با `endsAt` یک‌ماهه ساخته شد. دریافت «تبلیغ
  دایرکتوری» → کارت در دایرکتوری همان شهر+کسب‌وکار با `boostedUntil` بالا آمد.
- Playwright دسکتاپ: صفحه‌ی `/dashboard/points` و پنل `/admin?section=points` (تب
  جوایز با «اشتراک اکو» و تب تنظیمات) بدون خطای JS بارگذاری شدند.

## ۱۴۰۵/۰۷/۲۵ — بخش تبلیغات (کادر صفحه اصلی + بنل کاربر و مدیر) و تبلیغ دسته‌محور «پله» — نسخه `v2.35.0`

**هدف:** افزودن بخش «تبلیغات»: کاربر یک کارت ویزیت/بیولینک خود را برای تبلیغ در
صفحه اصلی انتخاب و ارسال می‌کند، مدیر تأیید می‌کند و تبلیغ برای مدت تعیین‌شده در کادر
صفحه اصلی نمایش داده می‌شود؛ همچنین «پله» حالا تبلیغی دسته‌محور است (فقط در همان
شهر+کسب‌وکار و هنگام فیلتر بازدیدکننده) و با تگ «تبلیغات» مشخص می‌شود.

**تغییرات:**
- `apps/api/prisma/schema.prisma`: مدل `AdRequest` و enum `AdTargetKind` (اتصال
  `adRequests`/`adDecisions` به مدل `User`).
- `apps/api/src/settings/settings.service.ts`: کلیدهای تنظیم `adDurationDays`
  (پیش‌فرض ۳۰)، `adDailySlots` (پیش‌فرض ۱) و `boostDurationDays` (پیش‌فرض ۷)
  به‌همراه گتر/سترها؛ افزودن دسته‌ی اعلان مدیر `AD`.
- `apps/api/src/settings/settings.controller.ts`: افزودن سه فیلد تنظیمات تبلیغات/پله
  به DTO و پاسخ admin settings.
- `apps/api/src/ads/`: ماژول جدید تبلیغات (سرویس، کنترلر، DTOها). درخواست کاربر،
  تأیید/رد مدیر، محاسبه‌ی تبلیغ فعال با چرخش روزانه بر اساس `adDailySlots`، و
  اعتبارسنجی مالکیت/انتشار مورد انتخابی.
- `apps/api/src/admin/admin.controller.ts` و `admin.module.ts`: اندپوینت‌های
  `GET /admin/ads` و `PATCH /admin/ads/:id`.
- `apps/api/src/boosts/boosts.service.ts`: مدت پله از تنظیم `boostDurationDays`
  خوانده می‌شود و دیگر `pinnedAt` سراسری را تغییر نمی‌دهد (تبلیغ فقط دسته‌محور).
- `apps/api/src/common/directory-sort.ts`: هلپر `boostScopeMatches(cityId, businessId)`.
- `apps/api/src/biolinks/biolinks.service.ts` و
  `apps/api/src/businesscards/business-cards.service.ts`: در دایرکتوری عمومی، وقتی
  هم شهر و هم کسب‌وکار فیلتر شده باشد موارد دارای پله‌ی فعال به ابتدای لیست (با
  صفحه‌بندی صحیح) می‌آیند؛ در غیر این صورت `boostedUntil` صفر می‌شود تا تگ تبلیغ
  جایی که نباید نمایش داده نشود.
- `apps/web/lib/api.ts`: تایپ‌های `AdRequest`/`AdsOverview`/`ActiveAd`/`AdTargetKind`.
- `apps/web/app/dashboard/ads/page.tsx`: صفحه‌ی تبلیغات کاربر (انتخاب کارت/بیولینک،
  ثبت درخواست، وضعیت و تاریخچه)؛ آیتم منو در `apps/web/components/dashboard/UserShell.tsx`.
- `apps/web/components/home/HomeAdBox.tsx` و `apps/web/app/page.tsx`: کادر تبلیغ
  صفحه اصلی (SSR با `revalidate`).
- `apps/web/components/admin/AdminAds.tsx`: پنل مدیر تبلیغات با تب‌های «در انتظار
  تأیید» و «تنظیمات»؛ ثبت در `AdminShell`, `apps/web/app/admin/page.tsx` و برچسب
  دسته‌ی اعلان `AD` در `AdminNotificationSettings.tsx`.
- `apps/web/components/ui/BoostBadge.tsx`, `DirectoryBiolinkItem.tsx`,
  `DirectoryBusinessCardItem.tsx`: برچسب «تبلیغات» برای آیتم‌های تبلیغی.
- `apps/web/components/admin/AdminDirectorySettings.tsx`: تنظیم «مدت هر پله (روز)».
- `apps/web/lib/version.ts`: نسخه به `v2.35.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx prisma db push` و `prisma generate` → اسکیمای جدید
  اعمال شد؛ `npx tsc --noEmit` روی API و Web → بدون خطا.
- API: ثبت درخواست تبلیغ → در صف `GET /admin/ads?status=PENDING` دیده شد؛ تأیید مدیر
  → `endsAt = now + 30d`؛ سپس `GET /ads/public/active` همان تبلیغ را با
  `href=/business-cards/9074939` برگرداند.
- پله‌ی دسته‌محور: تأیید پله برای کارت «محمد فروتن» (اصفهان + ساختمان و عمران) →
  دایرکتوری با فیلتر همان شهر+کسب‌وکار فقط همان کارت را با `boostedUntil` و تگ
  «تبلیغات» نشان داد؛ دایرکتوری بدون فیلتر هیچ تگی نداشت.
- Playwright دسکتاپ: کادر `#ads` صفحه اصلی تبلیغ را با لینک درست نشان داد؛ فوتر/هدر
  سالم؛ پنل `/dashboard/ads` و `/admin?section=ads` بدون خطای صفحه‌ی JS و با تب‌های
  «در انتظار تأیید» و «تنظیمات» بارگذاری شدند؛ حذف کلیدهای تنظیم + ری‌استارت API →
  مقادیر پیش‌فرض (۳۰/۱/۷) دوباره ساخته شدند.

## ۱۴۰۵/۰۷/۲۵ — هدر و فوتر عمومی جدید — نسخه `v2.34.0`

**هدف:** بازطراحی هدر صفحه‌ی اصلی (آگاه به ورود کاربر) و ساده‌سازی فوتر به دو ستون.

**تغییرات:**
- `apps/web/lib/nav.ts`: منبع یکتای لینک‌های ناوبری عمومی (کارت ویزیت‌ها، بیولینک‌ها،
  فیدها، نبض شهر، لیست خدمات) برای هدر و فوتر.
- `apps/web/components/layout/Header.tsx`: کلاینت‌ساید و آگاه به احراز هویت. منو به
  ترتیب خواسته‌شده. مهمان: دکمه‌ی «رایگان شروع کنید» → `/login?next=/dashboard/business-cards`
  و «ورود/ثبت‌نام» → `/login`. کاربر واردشده: «رایگان شروع کنید» →
  `/dashboard/business-cards` و دکمه‌ی دوم «پنل کاربری» → `/dashboard`. حذف دکمه‌های
  «بیولینک‌های من» و «کارت‌های ویزیت من».
- `apps/web/components/layout/Footer.tsx`: دو ستونه؛ ستون راست لینک‌های هدر به‌صورت
  عمودی و با فونت ریزتر، ستون چپ فقط کپی‌رایت + نسخه.
- `apps/web/app/services/page.tsx`: صفحه‌ی عمومی «لیست خدمات» (نمایش اشتراک‌های فعال).
- `apps/web/app/feeds/page.tsx`: صفحه‌ی جای‌نگهدار «فیدها» تا لینک هدر/فوتر سالم بماند.
- `apps/web/lib/version.ts`: نسخه به `v2.34.0`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- Playwright دسکتاپ، حالت مهمان: ناوبری به ترتیب خواسته‌شده؛ «رایگان شروع کنید» →
  `/login?next=/dashboard/business-cards`؛ «ورود/ثبت‌نام» → `/login`؛ دکمه‌های «من» حذف
  شده‌اند؛ فوتر دو ستونه با لینک‌های عمودی و کپی‌رایت+نسخه.
- حالت وارد‌شده (توکن واقعی): «رایگان شروع کنید» → `/dashboard/business-cards` و دکمه‌ی
  دوم «پنل کاربری» → `/dashboard`.
- صفحه‌ی `/services` با ۳ پلن فعال و `/feeds` جای‌نگهدار هر دو با کد ۲۰۰ بالا آمدند.

## ۱۴۰۵/۰۷/۲۵ — ثابت‌شدن چیدمان دایرکتوری در دسکتاپ هنگام انتخاب کارت — نسخه `v2.33.2`

**هدف:** در صفحات دایرکتوری (`/biolinks` و `/business-cards`) در دسکتاپ، وقتی هیچ
کارتی انتخاب نشده بود همه‌ی صفحه ثابت می‌ماند و فقط لیست اسکرول می‌خورد؛ اما به‌محض
انتخاب یک کارت و باز شدن پنل خلاصه در ستون کنار، ارتفاع صفحه رشد می‌کرد و کل صفحه
(هدر/فیلتر/لیست) با هم اسکرول می‌شد. خواسته: مثل حالت تبلت، همه‌چیز ثابت بماند و فقط
لیست کارت‌ها اسکرول بخورد.

**تغییرات:**
- `apps/web/app/globals.css`: قاعده‌ی «shell ثابت + لیست اسکرول‌شونده» از media query
  موبایل/تبلت (`max-width:1023px`) بیرون آورده و برای همه‌ی بریک‌پوینت‌ها اعمال شد.
  ارتفاع shell اکنون با `--dir-top`/`--dir-bottom` محاسبه می‌شود: در دسکتاپ هدر چسبان
  (۶۴px + ۲px خط‌چین = ۶۶px) و در موبایل/تبلت نوار پایین
  (`56px + safe-area`). ستون جزئیات (`directory-aside`) هم `height:100%` و
  `min-height:0` گرفت تا خودش اسکرول شود و صفحه را بلند نکند.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`: حذف
  `<Footer/>` و import مربوطه؛ فوتر در این صفحات نمایش داده نمی‌شود تا shell دقیقاً
  کل ویوپورت را پر کند. یادداشت توضیحی به‌جای آن گذاشته شد.
- `apps/web/lib/version.ts`: نسخه به `v2.33.2`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- Playwright در عرض‌های ۱۴۴۰ (دسکتاپ)، ۱۰۲۴ (آستانه‌ی lg)، ۸۲۰ (تبلت) و ۳۹۰ (موبایل)
  روی هر دو مسیر: با و بدون انتخاب کارت، `scrollHeight - clientHeight` صفحه = ۰؛
  `window.scrollTo(0,400)` باعث اسکرول صفحه نشد؛ فقط `.directory-list` اسکرول‌شونده بود.
- هندسه در دسکتاپ: هدر `0–66`، shell `66–900` (پرکردن دقیق ویوپورت ۹۰۰px)، لیست و
  ستون جزئیات هر دو داخل محدوده و با اسکرول مستقل.
- اسکرول بی‌نهایت روی `/biolinks` (حالت `INFINITE`) در دسکتاپ: با اسکرول لیست داخلی،
  موارد از ۲۰ به ۸۰ و سپس ۱۲۰ رسید و درخواست‌ها به‌ترتیب `page=1,2,3,4,5…` آمدند؛
  بدون انتخاب و با انتخاب کارت، سرریز صفحه ۰ ماند. (پس از تست، مقدار
  `directoryDisplayMode` به `PAGINATION` برگردانده شد.)
- حالت `PAGINATION` دسکتاپ: دکمه‌های قبلی/بعدی کار کردند و صفحه‌ی بعدی لیست را عوض کرد.
- موبایل: با انتخاب کارت، شیت پایین باز شد و سرریز صفحه همچنان ۰ بود.

## ۱۴۰۵/۰۷/۲۵ — استایل خوانا برای انتخاب‌گر اتصال بیولینک/کارت ویزیت — نسخه `v2.33.1`

**هدف:** در فرم‌های ویرایش، بخش «اتصال کارت به بیولینک» و «اتصال بیولینک به کارت»
از `<select>` بومی مرورگر استفاده می‌کرد که ظاهر آن به سیستم‌عامل و حالت رنگ (تیره/
روشن) وابسته بود؛ در برخی سیستم‌ها متن و شماره‌ی گزینه‌ها ناخوانا یا نامرئی می‌شد.

**تغییرات:**
- `apps/web/components/link/LinkSelector.tsx`: جایگزینی `<select>` بومی با یک
  دراپ‌داون سفارشی هم‌سبک سایت (دکمه‌ی trigger با `aria-haspopup="listbox"` و لیست
  `role="option"`). نام در یک خط و شماره/اسلاگ (`dir="ltr"`) در کنارش نمایش داده
  می‌شود؛ گزینه‌ی «بدون اتصال» و گزینه‌های ازپیش‌متصل (غیرفعال با برچسب «— قبلاً
  متصل شده») همیشه خوانا هستند. بستن با کلیک بیرون و کلید Escape، و چرخش آیکن
  `ChevronDown` هنگام باز بودن.
- `apps/web/lib/version.ts`: نسخه به `v2.33.1`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- Playwright روی فرم ویرایش بیولینک در دسکتاپ و موبایل (۳۹۰px): متن دکمه‌ی انتخاب و
  گزینه‌های لیست شامل نام + شماره (مثلاً «BITA 9095448») خوانا و کامل دیده شدند و
  لیست داخل ویوپورت باز می‌شود.
- تست عملکردی: قطع اتصال از دراپ‌داون، ذخیره، بارگذاری مجدد (نمایش «بدون اتصال»)،
  سپس اتصال مجدد و ذخیره؛ همه با موفقیت.
- بازسازی با `colorScheme: 'dark'`: پنل لیست پس‌زمینه‌ی سفید و متن تیره دارد و
  خوانا می‌ماند (برخلاف `<select>` بومی که ممکن بود تیره/ناخوانا شود).
- سمت کارت ویزیت هم بررسی شد: «اتصال به بیولینک» همان دراپ‌داون خوانا را نشان می‌دهد.
- داده‌های آزمایشی حذف و وضعیت/رمز کاربر تستی به حالت اول بازگردانده شد.

## ۱۴۰۵/۰۷/۲۵ — اتصال یک‌به‌یک بیولینک و کارت ویزیت — نسخه `v2.33.0`

**هدف:** کاربر هنگام ساخت/ویرایش بیولینک یا کارت ویزیت بتواند آن را به کارت/بیولینک
خود متصل کند، و در دایرکتوری هر کارت پس از نمایش خلاصه، دکمه‌ی رفتن به طرف مقابل
نمایش داده شود («مشاهده کارت ویزیت این بیولینک» / «مشاهده بیولینک این کارت ویزیت»).

**تغییرات:**
- `apps/api/prisma/schema.prisma`: افزودن رابطه‌ی یک‌به‌یک «BiolinkBusinessCard»
  (`Biolink.businessCardId` یکتا و nullable ↔ `BusinessCard.linkedBiolinks`). حذف
  طرف، لینک را با `SetNull` پاک می‌کند.
- `apps/api/src/biolinks/dto/create-biolink.dto.ts` و
  `apps/api/src/businesscards/dto/create-business-card.dto.ts`: فیلدهای اختیاری
  `businessCardId` و `biolinkId`.
- `apps/api/src/biolinks/biolinks.service.ts`: ذخیره/اعتبارسنجی اتصال در create/update
  (خالی‌کردن = قطع اتصال)، متد `linkableBusinessCards` برای انتخاب‌گر، و افزودن
  `linkedBusinessCard` (فقط وقتی کارت تأیید و منتشر شده) به خروجی عمومی.
- `apps/api/src/businesscards/business-cards.service.ts`: مدیریت اتصال سمت بیولینک در
  create/update به‌صورت تراکنشی، متد `linkableBiolinks`، و `linkedBiolink` در خروجی عمومی.
- کنترلرها: اندپوینت‌های احرازشده‌ی `GET /biolinks/linkable/business-cards` و
  `GET /business-cards/linkable/biolinks`.
- `apps/web/components/link/LinkSelector.tsx`: انتخاب‌گر مشترک یک‌به‌یک؛ گزینه‌های
  ازپیش‌متصل غیرفعال و گزینه‌ی خودِ آیتم قابل‌انتخاب است.
- `apps/web/components/biolink/BiolinkForm.tsx` و
  `apps/web/components/businesscard/BusinessCardForm.tsx`: بخش «اتصال …» (پنهان‌شدنی
  با `hideLink` برای ویرایشگر ادمین).
- `apps/web/app/dashboard/biolinks/[id]/edit/page.tsx` و
  `apps/web/app/dashboard/business-cards/[id]/edit/page.tsx`: پیش‌انتخاب اتصال و ارسال
  صریح فیلد اتصال (حتی خالی) تا امکان قطع اتصال باشد.
- `apps/web/components/biolink/DirectoryDetail.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardDetail.tsx`: دکمه‌ی متقاطع
  بالای دکمه‌ی «مشاهده صفحه کامل».
- `apps/web/lib/api.ts`: نوع `LinkedCounterpart` و فیلدهای `linkedBusinessCard` /
  `linkedBiolink` / `businessCard` / `linkedBiolinks`.
- `apps/web/lib/version.ts`: نسخه به `v2.33.0`.

**تأیید/تست:**
- `docker exec alooshomal-api npx tsc --noEmit` و `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- `prisma generate` + `prisma db push` موفق؛ ستون یکتای `biolinks.businessCardId` ساخته شد.
- تست API با کاربر آزمایشی: ساخت کارت با `biolinkId` و ساخت بیولینک با `businessCardId`
  اتصال را در DB ثبت کرد؛ پس از تأیید/انتشار، خروجی عمومی هر دو طرف
  `linkedBiolink`/`linkedBusinessCard` را برگرداند.
- قواعد اعتبارسنجی: اتصال کارت متعلق به کاربر دیگر یا ناموجود → ۴۰۰؛ اتصال کارتی که
  به بیولینک دیگری وصل است → ۴۰۹؛ PATCH با مقدار خالی اتصال را قطع کرد (`businessCardId`=null).
- Playwright: در دایرکتوری، هر دو دکمه‌ی متقاطع با href صحیح و **بالای** دکمه‌ی صفحه‌ی کامل
  نمایش یافتند؛ در ویرایشگرها انتخاب‌گر گزینه‌ی جاری را پیش‌انتخاب و گزینه‌های گرفته‌شده را
  غیرفعال کرد؛ قطع اتصال از UI با PATCH موفق و `businessCardId:null` ثبت شد.
- داده‌های کاربر/آیتم آزمایشی و اتصال موقت حذف/بازگردانی شدند.

## ۱۴۰۵/۰۷/۲۵ — کادر جستجوی صفحه‌ی اصلی (متن + شهر + کسب‌وکار) — نسخه `v2.32.0`

**هدف:** کاربر در صفحه‌ی اصلی یک کادر جستجو ببیند که با وارد کردن متن و انتخاب
شهر و کسب‌وکار (هر سه اختیاری)، جستجو را شروع کند و با همان فیلترها به دایرکتوری
کارت ویزیت‌ها هدایت شود.

**تغییرات:**
- `apps/web/components/home/HomeSearchBox.tsx`: کامپوننت کلاینتساید کادر جستجو با
  فیلد متن (`q`) و دو انتخاب شهر و نوع کسب‌وکار؛ شهرها و کسب‌وکارها از اندپوینت‌های
  عمومی `/cities` و `/businesses` پر می‌شوند. در submit، فقط فیلترهای غیرخالی به‌صورت
  `?q=&cityId=&businessId=` ساخته و با `router.push` به `/business-cards` منتقل می‌شود.
- `apps/web/app/page.tsx`: افزودن `HomeSearchBox` به بخش هیرو، زیر متن توضیح.
- `apps/web/lib/version.ts`: نسخه به `v2.32.0`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- تست Playwright دسکتاپ: شهرها/کسب‌وکارها (۲۱ و ۱۸ گزینه) بارگذاری شدند؛ با ورود
  «دکتر» + انتخاب شهر و کسب‌وکار، URL به
  `/business-cards?q=دکتر&cityId=...&businessId=...` تغییر کرد و فیلد جستجوی خودِ
  دایرکتوری هم همان مقدار «دکتر» را نشان داد.
- ارسال فرم خالی → انتقال به `/business-cards` بدون پارامتر (دایرکتوری کامل).
- تست موبایل (۳۹۰px): فرم در عرض ۳۵۸px داخل ویوپورت جا می‌شود و چیدمان `column`
  (متن در یک ردیف، شهر/کسب‌وکار/دکمه در ردیف بعد) است.

## ۱۴۰۵/۰۷/۲۲ — رفع نرمی اسکرول بی‌نهایت دایرکتوری — نسخه `v2.31.1`

**هدف:** حالت اسکرول بی‌نهایت صفحه‌های `/biolinks` و `/business-cards` نه نرم بود
و نه پیوسته: فقط نزدیک انتهای فهرست (با `rootMargin: 200px` روی سنتینل) لود می‌شد،
بریدگی/پرش داشت و در تند‌اسکرول، درخواست‌ها روی هم می‌افتادند و پاسخ‌ها دور ریخته
می‌شدند (فهرست اصلاً رشد نمی‌کرد).

**تغییرات:**
- `apps/web/lib/directory.ts`:
  - جایگزینی `IntersectionObserver` با شنونده‌ی `scroll` روی نزدیک‌ترین ظرف
    اسکرول (فهرست داخلی موبایل یا پنجره در دسکتاپ) که وقتی فاصله تا انتها کمتر از
    ~۹۰۰px شد (حدود ۱۰ مورد مانده) صفحه‌ی بعد را از پیش بارگذاری می‌کند.
  - انتقال مالکیت `page`/`loadMore` به هوک؛ `loadMore` تنها وقتی صفحه را جلو
    می‌برد که صفحه‌ی درخواست‌شده‌ی قبلی واقعاً رسیده باشد، پس تنداسکرول نه درخواست
    تکراری می‌سازد و نه صفحه‌ای را جا می‌اندازد.
  - حذف درخواست‌های ناکارآمد با `AbortController`؛ توقف `loadMore` وقتی سرور
    `hasNext=false` می‌دهد؛ حفظ `initialPage` از URL برای لینک‌های قابل اشتراک.
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`:
  استفاده از API جدید هوک (`page`/`setPage`/`loadMore`) و همگام‌سازی شماره‌ی صفحه
  در URL.
- `apps/web/lib/version.ts`: نسخه به `v2.31.1`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا.
- تست Playwright موبایل (۳۹۰px) با `directoryDisplayMode=INFINITE`: اسکرول تدریجی
  فهرست را به‌طور یکنواخت از ۱۰ به ۱۶۰+ مورد رساند، فاصله تا انتها هرگز به صفر/برش
  نرسید و درخواست‌ها به ترتیب `page=2..16` بدون صفحه‌ی جاافتاده آمدند.
- تنداسکرول سریع تا انتها (۲۵ بار پشت‌سرهم): موارد به ۱۰۰ رسید و صفحه‌ها به ترتیب
  `2..10` بدون تکرار/جاافتادگی ثبت شدند.
- بازگشت به حالت `PAGINATION`: دکمه‌های قبلی/بعدی کار می‌کنند و `?page=3` در URL
  مستقیم «صفحه ۳» را نشان می‌دهد.
- مقدار DB در پایان تست به `PAGINATION` برگردانده شد.

## ۱۴۰۵/۰۷/۲۲ — اصلاح چیدمان موبایل دایرکتوری + حالت اسکرول بی‌نهایت — نسخه `v2.31.0`

**هدف:** اصلاح نمایش موبایل در دایرکتوری‌های `biolinks` و `business-cards`
(هم‌ردیفه‌شدن سه فیلد جستجو، حذف پیشوند تکراری از نوارها) و افزودن حالت نمایش
«اسکرول بی‌نهایت» به‌عنوان گزینه‌ی قابل انتخاب مدیر در کنار صفحه‌بندی.

**تغییرات:**
- `apps/api/src/settings/settings.service.ts`: افزودن کلید `directoryDisplayMode`
  (`PAGINATION`/`INFINITE`)، مقدار پیش‌فرض `PAGINATION`، seed در `ensureDefaults` و
  متدهای `get/setDirectoryDisplayMode`.
- `apps/api/src/settings/settings.controller.ts`: افزودن `directoryDisplayMode` به
  DTO، خروجی‌های `settings/public` و `admin/settings` و مسیر `PATCH`.
- `apps/web/lib/directory.ts` (جدید): هوک‌های `useDirectoryDisplayMode`،
  `useDirectoryResults` (ادغام/جایگزینی صفحات) و `useInfiniteScroll` (IntersectionObserver).
- `apps/web/lib/api.ts`: افزودن `directoryDisplayMode` به `AdminSettingsPayload`.
- `apps/web/components/biolink/DirectoryFilters.tsx` و
  `apps/web/components/businesscard/DirectoryBusinessCardFilters.tsx`: در موبایل
  فیلد جستجو یک سطر و «شهر/نوع کسب‌وکار/جستجو» در یک سطر کنار هم؛ متن نوارها به
  «شهر» و «نوع کسب‌وکار» کوتاه شد (پیشوند «بر اساس» حذف شد).
- `apps/web/app/biolinks/page.tsx` و `apps/web/app/business-cards/page.tsx`:
  استفاده از هوک‌های مشترک، سنتینل اسکرول و مخفی‌کردن صفحه‌بندی در حالت بی‌نهایت.
- `apps/web/components/admin/AdminDirectorySettings.tsx`: کلید انتخاب حالت نمایش
  («صفحه‌بندی» / «اسکرول بی‌نهایت») و ذخیره در `PATCH /admin/settings`.
- `apps/web/lib/version.ts`: افزایش نسخه به `v2.31.0`.

**تأیید/تست:**
- `docker exec alooshomal-web npx tsc --noEmit` → بدون خطا (`WEB_EXIT=0`).
- `docker exec alooshomal-api npx tsc --noEmit` → بدون خطا (`API_EXIT=0`).
- `curl http://localhost:3001/api/settings/public` → شامل `directoryDisplayMode`.
- اسکرین‌شات Playwright موبایل (۳۹۰px): سطر جستجو=`input` تمام‌عرض، و `شهر`/`نوع
  کسب‌وکار`/`جستجو` در `y=142` کنار هم (یک سطر) و صفحه‌بندی مخفی.
- تست اسکرول بی‌نهایت (با ست‌کردن موقت `INFINITE` در DB): اسکرول تا انتها تعداد
  موارد را از ۱۰ به ۹۰ رساند و درخواست‌های `page=2..9` با ۲۰۰ ثبت شد؛ سپس مقدار
  DB به `PAGINATION` برگردانده شد.
- `python3 scripts/sync_install.py` و `--check` → صفر تغییر معلق.

## ۱۴۰۵/۰۷/۲۲ — افزودن CHANGELOG خلاصه‌ی نسخه‌ها — نسخه `v2.30.1`

**هدف:** یک خلاصه‌ی کاربرمحور و نسخه‌به‌نسخه از تغییرات اخیر (به‌ویژه دور امنیت/auth)
برای مرور سریع، جدا از جزئیات فنی `History-Agent.md`.

**تغییرات:**
- `CHANGELOG.md` (جدید): خلاصه‌ی `v2.26.0` تا `v2.30.0` (تأیید مدیر برای تغییر تماس،
  اصلاح OTP، مدیریت نشست، کوکی امن، سخت‌سازی JWT، بازبینی امنیتی و تیکت SSE) + توضیح
  قالب نسخه‌دهی.
- `scripts/sync_install.py`: افزودن `CHANGELOG.md` به فایل‌های ریشه‌ای که در `install.sh`
  جاسازی می‌شوند.
- `README.md`: ارجاع به `CHANGELOG.md`.
- `apps/web/lib/version.ts`: نسخه به `v2.30.1`.

**تأیید/تست:**
- `python3 scripts/sync_install.py --check` → صفر تغییر معلق (بلوک `CHANGELOG.md` در
  `install.sh` ساخته شد). بررسی دستی می‌شود که خلاصه‌ها با ورودی‌های `History-Agent.md`
  هم‌خوان‌اند.

## ۱۴۰۵/۰۷/۲۲ — تیکت یک‌بارمصرف برای جریان SSE (حذف توکن از URL) — نسخه `v2.30.0`

**هدف:** رفع افشای توکن دسترسی در URLِ اتصال زنده‌ی اعلان‌ها (`?token=` که در
لاگ‌های وب‌سرور/پروکسی ثبت می‌شود) با جایگزینی آن به یک تیکت کوتاه‌عمر و یک‌بارمصرف.

**تغییرات:**
- `apps/api/src/auth/stream-ticket.service.ts` (جدید): صدور/مصرف تیکت تصادفی ۳۲ بایتی با
  TTL ۳۰ ثانیه؛ مصرف اتمیک با Redis `GETDEL` و fallback حافظه‌ای؛ محدودیت حجم حافظه.
- `apps/api/src/redis/redis.service.ts`: افزودن `getdel` اتمیک.
- `apps/api/src/auth/strategies/jwt.strategy.ts`: حذف `?token=` از استخراج‌کننده‌ها
  (فقط `Authorization: Bearer`).
- `apps/api/src/notifications/notifications.controller.ts`: تیکت استریم در مسیرهای
  احرازشده‌ی `mine/stream-ticket` و `admin/stream-ticket`؛ متدهای `stream` با `@Public()`
  و مصرف تیکت (`ticket` کوئری) به‌جای `@CurrentUser`؛ رد تیکت کاربر روی استریم ادمین و
  برعکس.
- `apps/api/src/common/guards/roles.guard.ts`: احترام به `@Public()` تا مسیرهای تیکتی
  گارد نقش را رد کنند.
- `apps/api/src/common/common.module.ts`: ارائه‌ی `StreamTicketService` به‌صورت Global.
- `apps/web/components/ui/NotificationBell.tsx`: گرفتن تیکت از API احرازشده و اتصال
  `EventSource` با `?ticket=` به‌جای توکن.
- `docs/SECURITY.md` و `BACKLOG.md` (به‌روزرسانی وضعیت به «انجام‌شده») و
  `apps/web/lib/version.ts` (`v2.30.0`).

**تأیید/تست:**
- `tsc --noEmit` برای `apps/api` و `apps/web` بدون خطا.
- curl: `?token=` قدیمی روی استریم → `401`؛ تیکت معتبر → `200` با فریم `data: {"unread":…}`؛
  استفاده‌ی مجدد از همان تیکت → `401`؛ بدون تیکت → `401`؛ تیکت کاربر روی استریم ادمین →
  `401`؛ تیکت ادمین روی استریم ادمین → `200`؛ صدور تیکت بدون احراز هویت → `401`.
- Playwright: زنگ اعلان ابتدا `stream-ticket` را می‌گیرد و اتصال `/stream` با `ticket=`
  و **بدون** `token=` در URL برقرار می‌شود.

## ۱۴۰۵/۰۷/۲۲ — runbook اعمال تغییرات امنیتی auth روی سرور — نسخه `v2.29.1`

**هدف:** مستندسازی گام‌به‌گام اعمال تغییرات نشست/توکن/کوکی روی سرور تولید
(`JWT_EXPIRES_IN=15m`، جایگزینی امن `JWT_SECRET`، ری‌استارت فقط `api` و بررسی
کوکی `HttpOnly` و سلامت سرویس).

**تغییرات:**
- `docs/DEPLOY.md`: افزودن بخش «۳.۵) اعمال تغییرات امنیتی auth روی سرور (یک‌بار)» با
  دستورهای دقیق `.env`، `up -d api`، بررسی `set-cookie` و توضیح ابطال توکن‌های قبلی.
- `apps/web/lib/version.ts`: نسخه به `v2.29.1`.

**تأیید/تست:**
- بررسی صحت دستورها با محتوای واقعی `docker-compose.prod.yml` و نام سرویس/متغیرها
  (`JWT_EXPIRES_IN`، `api`، مسیر `deploy`). صحت کارکرد خود تغییرات امنیتی در نسخه‌های
  `v2.27.0`–`v2.29.0` تست و ثبت شده است.

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
