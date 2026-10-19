# راهنمای توسعه‌ی لوکال و تفاوت آن با پروداکشن

این سند نحوه‌ی اجرای پروژه روی سیستم لوکال، تفاوت آن با استقرار پروداکشن، و این‌که
**چه زمانی به بازسازی (rebuild) کانتینر نیاز داریم و چه زمانی نه** را توضیح می‌دهد.

فایل‌های compose پروژه:

| فایل | نقش |
| --- | --- |
| `docker-compose.yml` | استک پایه؛ سرویس‌های `db`/`redis`/`minio`/`api`/`web` |
| `docker-compose.dev.yml` | override لوکال: bind-mount سورس + اجرای حالت watch/HMR |
| `docker-compose.prod.yml` | استک پروداکشن: فقط ایمیج‌های ساخته‌شده از GHCR |

> نکته‌ی کلیدی: **حالت لوکال = `docker-compose.yml` + `docker-compose.dev.yml`**.
> اگر فقط `docker-compose.yml` را بالا بیاورید، کد داخل ایمیج «پخته» می‌شود و هر
> تغییری نیاز به rebuild دارد. با overlay توسعه، این مشکل از بین می‌رود.

---

## ۱. اجرای لوکال با hot-reload (روش پیشنهادی)

```bash
npm run dev
# معادل:
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

با این دستور:

- پوشه‌های `apps/api` و `apps/web` به‌صورت **bind-mount** داخل کانتینر قرار می‌گیرند،
  پس هر تغییر روی هاست بلافاصله داخل کانتینر دیده می‌شود.
- API با `nest start --watch` اجرا می‌شود → پس از ذخیره‌ی فایل `.ts`، خودکار
  ری‌کامپایل و ری‌استارت می‌شود.
- Web با `next dev` (Turbopack) اجرا می‌شود → تغییرات `.tsx` با HMR اعمال می‌شوند
  (معمولاً بدون رفرش دستی).
- `node_modules` و `.next` با volumeهای نام‌دار پایدار
  (`alooshomal_api_node_modules`، `alooshomal_web_node_modules`،
  `alooshomal_web_next`) نگه داشته می‌شوند تا از `node_modules` سالم داخل ایمیج
  استفاده شود و روی هاست انبوه فایل ساخته نشود.

### بالا آوردن در پس‌زمینه

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api web
```

### آدرس‌های لوکال

| سرویس | آدرس |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001/api |
| Swagger | http://localhost:3001/api/docs |
| OpenAPI JSON | http://localhost:3001/api/docs-json |
| Health | http://localhost:3001/api/health |
| MinIO Console | http://localhost:9001 |
| Postgres | `localhost:5432` |

> پورت‌ها از `.env` خوانده می‌شوند (`WEB_PORT`، `API_PORT`، `POSTGRES_PORT`، ...).

### بررسی این‌که hot-reload فعال است

```bash
# باید هر دو فایل compose دیده شوند
docker inspect alooshomal-api --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'

# باید bind-mount سورس دیده شود
docker inspect alooshomal-api --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# پروسه‌ی watch باید در حال اجرا باشد
docker exec alooshomal-api ps -o pid,args | grep -E "nest|node"
```

---

## ۲. چه زمانی هنوز باید rebuild کنیم؟

bind-mount فقط **سورس کد** را زنده می‌کند؛ موارد زیر خارج از آن هستند و به
بازسازی/بازآفرینی نیاز دارند:

| تغییر | اقدام لازم |
| --- | --- |
| تغییر `package.json` یا نصب وابستگی جدید | یک‌بار `down -v` و بالا آوردن مجدد (پایین) |
| تغییر `Dockerfile` یا مرحله‌ی build | `docker compose ... build --no-cache` |
| تغییر متغیرهای build-time مثل `NEXT_PUBLIC_*` | rebuild سرویس `web` |
| افزودن/تغییر فونت یا فایل داخل `public/` که در ایمیج کپی می‌شود | rebuild سرویس مربوطه |
| تغییر `prisma/schema.prisma` | نیازی به rebuild نیست؛ `prisma db push` هنگام بوت API اجرا می‌شود |

### تازه‌سازی volumeهای وابستگی

وقتی `package.json` تغییر کرد، `node_modules` داخل volume قدیمی می‌ماند. برای ساخت
دوباره‌ی آن‌ها:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

> `down -v` فقط به volumeهای dev مربوط است؛ **والیوم دیتابیس/رسانه را پاک نکنید**
> مگر عمداً بخواهید. برای پاک‌کردن فقط volumeهای وابستگی می‌توانید صریحاً نام ببرید:
> `docker volume rm alooshomal_api_node_modules alooshomal_web_node_modules alooshomal_web_next`

---

## ۳. دستورات پرکاربرد

```bash
# وضعیت و لاگ‌ها
docker compose ps
docker compose logs -f api web
npm run api:logs
npm run web:logs

# تایپ‌چک (بدون ساخت ایمیج)
apps/api/node_modules/.bin/tsc --noEmit --incremental false -p apps/api/tsconfig.json
apps/web/node_modules/.bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json

# دیتابیس
npm run db:studio      # Prisma Studio
npm run db:backup      # snapshot
npm run db:backups     # فهرست snapshotها
npm run db:restore     # بازیابی آخرین snapshot

# توقف
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

---

## ۴. مشکلات رایج لوکال

### «next: not found» یا خطای وابستگی

یعنی volume وابستگی‌ها با `package.json` جدید هم‌خوان نیست. `down -v` و بالا آوردن
مجدد (بخش ۲) را اجرا کنید.

### Next.js فایل‌های `tsconfig.json` و `next-env.d.ts` را تغییر می‌دهد

در حالت dev، Next ممکن است این دو فایل را خودش اصلاح کند و همچنین یک
`apps/web/AGENTS.md` تولید کند. این‌ها artifacts ابزار هستند؛ اگر لازم نیست آن‌ها را
کامیت نکنید (می‌توانید با `git checkout --` برگردانید).

### تغییر اعمال نمی‌شود

مطمئن شوید واقعاً overlay توسعه اعمال شده (بخش ۱) و کانتینر با آن بالا آمده است:

```bash
docker inspect alooshomal-web --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
```

اگر فقط `docker-compose.yml` چاپ شد، یعنی کانتینر بدون overlay بالا آمده است؛ آن را
پایین آورده و با `npm run dev` (یا دستور دو-فایلی) دوباره بالا بیاورید.

---

## ۵. پروداکشن (هرگز از حالت dev استفاده نکنید)

- روی سرور فقط `docker-compose.prod.yml` اجرا می‌شود و ایمیج‌ها از GHCR pull می‌شوند
  (بدون build محلی).
- استقرار خودکار با GitHub Actions انجام می‌شود: هر push به `main` → ساخت ایمیج‌های
  `api`/`web` → push به `ghcr.io` → SSH به سرور و به‌روزرسانی سرویس‌ها.
- overlay توسعه (`docker-compose.dev.yml`) شامل bind-mount سورس و اجرای watch است و
  **نباید** در پروداکشن استفاده شود.
- راهنمای کامل: `docs/DEPLOY.md`.

خلاصه‌ی تفاوت‌ها:

| موضوع | لوکال | پروداکشن |
| --- | --- | --- |
| فایل compose | `docker-compose.yml` + `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| سورس | bind-mount از هاست | پخته‌شده در ایمیج |
| اجرا | `nest start --watch` / `next dev` | `node dist/main.js` / Next standalone |
| اعمال تغییر | خودکار (hot-reload) | build در CI + push ایمیج + deploy |
| node_modules | volume نام‌دار + bind | نصب‌شده در ایمیج build |

---

## ۶. جریان کاری پیشنهادی ایجنت/توسعه‌دهنده

1. `npm run dev` را بالا بیاور (یک‌بار).
2. تغییر را اعمال کن → hot-reload خودکار.
3. تایپ‌چک بگیر (بخش ۳).
4. اگر `package.json`/`Dockerfile`/`NEXT_PUBLIC_*` تغییر نکرده، **rebuild نزن**.
5. قبل از پذیرش نهایی، `scripts/sync_install.py --check` را بزن (قانون ۳ پروژه) و
   برای پروداکشن فقط از مسیر CI استفاده کن.
