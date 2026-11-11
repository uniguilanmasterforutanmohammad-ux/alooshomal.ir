# تم‌های سایت

تم سراسری سایت با `siteTheme` در جدول `settings` ذخیره می‌شود، در
`GET /settings/public` برگردانده می‌شود و لایه‌ی ریشه‌ی وب آن را روی
`<html data-theme="...">` می‌نویسد.

## ساختار

چهار تم پایه (`vintage`, `modern`, `bazaar`, `twitter`) از قبل داخل
`apps/web/app/globals.css` تعریف شده‌اند. تم‌های تازه **ماژولار** هستند و هر کدام
فقط فایل‌های خودش را دارند:

| مسیر | نقش |
| --- | --- |
| `apps/web/app/themes/<key>.css` | همه‌ی قواعد ظاهری، محدود به `html[data-theme='<key>']` |
| `apps/web/lib/site-themes/<key>.ts` | متادیتا (نام، توضیح، رنگ نوار مرورگر) |
| `apps/web/lib/site-themes/index.ts` | رجیستری واحد `EXTRA_SITE_THEMES` |
| `apps/web/components/admin/theme-previews/<Key>ThemePreview.tsx` | پیش‌نمایش در پنل مدیر |
| `apps/web/components/admin/theme-previews/index.tsx` | نگاشت کلید تم به پیش‌نمایش |

فهرست مجاز سمت API نیز در `apps/api/src/settings/settings.constants.ts`
(`SITE_THEMES`) نگه‌داری می‌شود.

## افزودن تم

1. فایل `app/themes/<key>.css` را بسازید و تمام سلکتورها را زیر
   `html[data-theme='<key>']` ببرید.
2. ماژول `lib/site-themes/<key>.ts` را با `SiteThemeDefinition` بسازید.
3. آن را به `EXTRA_SITE_THEMES` در `lib/site-themes/index.ts` اضافه کنید.
4. یک پیش‌نمایش در `components/admin/theme-previews/` بسازید و در `index.tsx`
   ثبت کنید.
5. کلید را به `SITE_THEMES` در API و فهرست تم‌ها در `docs/API.md` اضافه کنید.
6. `python3 scripts/sync_install.py` و `python3 scripts/check_api_docs.py` را
   اجرا کنید.

نوع `SiteTheme`، گزینه‌های پنل، نگاشت `data-theme`/`data-skin` و رنگ
`viewport` به‌طور خودکار از رجیستری ساخته می‌شوند.

## حذف یک تم ماژولار

برای حذف (مثلاً «کاشی ایرانی»):

1. `apps/web/app/themes/kashi.css` را حذف کنید.
2. `apps/web/lib/site-themes/kashi.ts` را حذف کنید و ورودی آن را از
   `lib/site-themes/index.ts` بردارید.
3. `components/admin/theme-previews/KashiThemePreview.tsx` را حذف کنید و
   ورودی‌اش را از `index.tsx` بردارید.
4. `kashi` را از `SITE_THEMES` در API و از `docs/API.md` بردارید.
5. `python3 scripts/sync_install.py` را اجرا کنید.

هیچ تم دیگری به این فایل‌ها ارجاع نمی‌دهد؛ اگر مقدار ذخیره‌شده در دیتابیس
همان تم حذف‌شده باشد، `isSiteTheme` آن را نامعتبر می‌داند و سایت به تم پیش‌فرض
(`vintage`) برمی‌گردد.

## قواعد

- هر قاعده‌ی CSS تم باید با `html[data-theme='<key>']` شروع شود؛ سلکتور سراسری
  ننویسید تا تم‌ها با هم قاطی نشوند.
- برای حالت تیره از `html[data-theme='<key>'].dark` استفاده کنید.
- اندازه‌ی متن، فونت شبنم، ساختار هدر/فوتر و کلاس‌های کامپوننت‌ها را تغییر
  ندهید؛ فقط توکن‌های رنگ، سطح، شعاع و سایه را بازنویسی کنید.
