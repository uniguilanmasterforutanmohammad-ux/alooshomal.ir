# راهنمای بررسی خزش (Crawler / SEO) — آلوشمال

این سند راهنمای عملی برای پاسخ به این پرسش است: «آیا خزنده‌ها (گوگل و بقیه)
کارت‌ویزیت‌ها و بیولینک‌ها را می‌بینند، و چگونه خودم هر لحظه بررسی کنم؟»

> **مرجع قوانین پروژه:** `AGENTS.md`. این سند مکمل `docs/REVENUE-MODELS.md` و
> `History-Agent.md` است و باید هنگام تغییر مکانیزم سئو هم‌سو بماند.

---

## خلاصه‌ی یک‌نگاه

| پرسش | پاسخ | کجا |
| --- | --- | --- |
| لیست کامل صفحات قابل‌خزش؟ | `sitemap.xml` | `apps/web/app/sitemap.ts` + `apps/api/src/seo/` |
| اجازه‌ی خزش و مسیرهای ممنوع؟ | `robots.txt` | `apps/web/app/robots.ts` |
| محتوای هر کارت قابل‌خواندن است؟ | بله، SSR (بدونِ نیاز به اجرای JS) | `apps/web/app/business-cards/[slug]/page.tsx` و `biolinks/[slug]/page.tsx` |
| داده‌ی ساخت‌یافته؟ | JSON-LD (`LocalBusiness`/`ProfilePage`) | همان صفحات جزئیات |
| لینک‌های داخلی دایرکتوری؟ | لینک واقعی `<a href>` در HTML | کامپوننت‌های `Directory*Content.tsx` |

---

## چطور خودم هر لحظه چک کنی

همه‌ی دستورها را می‌توانی روی دامنه‌ی واقعی اجرا کنی (نیاز به نصب چیزی نیست):

```bash
# ۱) تعداد کل آدرس‌های قابل‌خزش در نقشه‌ی سایت
curl -s https://alooshomal.ir/sitemap.xml | grep -c '<loc>'

# ۲) فقط کارت‌ویزیت‌ها
curl -s https://alooshomal.ir/sitemap.xml | grep -c 'business-cards/'

# ۳) فقط بیولینک‌ها
curl -s https://alooshomal.ir/sitemap.xml | grep -c 'biolinks/'

# ۴) محتوای یک کارت با «دید گوگل» (بدون اجرای جاوااسکریپت)
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1)" \
  https://alooshomal.ir/business-cards/<slug>

# ۵) مجوز خزش و آدرس نقشه‌ی سایت
curl -s https://alooshomal.ir/robots.txt

# ۶) بررسی کد پاسخ یک صفحه برای خزنده (باید 200 باشد)
curl -s -o /dev/null -w '%{http_code}\n' \
  -A "Googlebot" https://alooshomal.ir/business-cards/<slug>
```

نکته‌ی محلی: اگر روی محیط توسعه کار می‌کنی، `https://alooshomal.ir` را با
`http://localhost:3000` جای‌گزین کن.

### فهرست کردن همه‌ی کارت‌ها/بیولینک‌های ثبت‌شده به‌صورت متن

```bash
# همه‌ی آدرس‌های کارت‌ویزیت، یک در هر خط
curl -s https://alooshomal.ir/sitemap.xml \
  | grep -oE '<loc>[^<]+business-cards/[^<]+</loc>' \
  | sed -E 's#</?loc>##g'

# همه‌ی آدرس‌های بیولینک
curl -s https://alooshomal.ir/sitemap.xml \
  | grep -oE '<loc>[^<]+biolinks/[^<]+</loc>' \
  | sed -E 's#</?loc>##g'
```

### ابزارهای گوگل (مرجع رسمی)

- **Google Search Console → URL Inspection**: دقیقاً همان HTML خامی را نشان
  می‌دهد که گوگل دیده، به‌همراه وضعیت ایندکس.
- **Rich Results Test** (`search.google.com/test/rich-results`): اعتبار
  JSON-LD و امکان نمایش نتایج غنی را بررسی می‌کند.
- **PageSpeed / Lighthouse**: بخش SEO را می‌سنجد (قابل‌خزش بودن، متادیتا).

---

## آیا کارت/بیولینک جدید خودکار وارد لیست می‌شود؟

**بله.** مکانیزم خودکار است و نیاز به کار دستی ندارد:

1. `apps/web/app/sitemap.ts` هنگام درخواست، اندپوینت
   `GET /seo/sitemap` را صدا می‌زند.
2. `apps/api/src/seo/seo.service.ts` با یک کوئری زنده از دیتابیس، ردیف‌های
   `status = APPROVED` و `isPublished = true` را برمی‌گرداند — **بدون هیچ لیست
   ثابت دستی**.
3. پس هر کارت/بیولینک جدید که منتشر و تأیید شود، در درخواست بعدی نقشه‌ی سایت
   حاضر است؛ و هر آیتمی که غیرفعال/حذف شود، خودکار حذف می‌شود.

> **تست سریع (Docker):**
> ```bash
> # آمار زنده‌ی نقشه‌ی سایت از سمت API
> curl -s http://localhost:3001/api/seo/sitemap \
>   | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']),'entries')"
> ```
> با غیرفعال‌کردن یک ردیف (`UPDATE ... SET "isPublished"=false`)، عدد بلافاصله
> یکی کم می‌شود؛ تأیید شد که لیست دستی نیست.

### نکته‌ی مهم: تأخیر کش

نقشه‌ی سایت `revalidate = 3600` دارد؛ یعنی تا **حداکثر یک ساعت** ممکن است نسخه‌ی
کش‌شده سرو شود. پس:

- خزنده‌ی گوگل خودش برنامه‌ی بازدید دوره‌ای دارد و کارت جدید را در بازدید بعدی
  (نه فوری) ایندکس می‌کند.
- برای دیدن فوری در محیط توسعه، کش را دور بزن یا کانتینر `web` را ری‌استارت کن.

### سقف تعداد

`MAX_ROWS = 20_000` در `apps/api/src/seo/seo.service.ts` سقف هر نوع ردیف در هر
پاسخ است. با عبور از این عدد باید نقشه‌ی سایت را به چند فایل صفحه‌بندی کرد
(sitemap index).

---

## چک‌لیست تغییر مکانیزم سئو

- [ ] آیا ردیف‌های غیرمنتشرشده/رد‌شده از sitemap خارج می‌مانند؟ (نباید لینک بشوند)
- [ ] آیا صفحات ناموجود همچنان `noindex` می‌خورند؟
- [ ] آیا `canonical` و Open Graph روی صفحات جزئیات به‌روز است؟
- [ ] آیا لینک‌های دایرکتوری همچنان به‌صورت `<a href>` در HTML سمت سرور هستند؟
- [ ] آیا ورودی `History-Agent.md` و نسخه‌ی `apps/web/lib/version.ts` به‌روز شده؟
