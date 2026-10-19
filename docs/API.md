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

1. با `POST /api/auth/login` (ایمیل/گذرواژه) یا `POST /api/auth/verify-otp`
   (شماره/کد پیامکی) توکن دسترسی بگیرید.
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

- هر کنترلر با `@ApiTags` یک گروه مشخص دارد (۲۲ کنترلر / ۲۱ برچسب).
- هر مسیر باید `@ApiOperation({ summary })` و برای ورودی‌ها DTO با
  `@ApiProperty`/`@ApiPropertyOptional` داشته باشد.
- DTOهای به‌روزرسانی با `PartialType` از DTO ساخت ارث‌بری می‌کنند، پس متادیتای
  Swagger را خودکار به ارث می‌برند.

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

## وظیفه‌ی دائمی ایجنت (قانون ۸)

هنگام **افزودن یا تغییر هر مسیر API**، ایجنت موظف است پیش از اعلام اتمام کار:

1. کنترلر/مسیر جدید را با `@ApiTags`، `@ApiOperation` و DTO مستندشده
   (`@ApiProperty`) بنویسد.
2. مطمئن شود مسیر در `GET /api/docs-json` دیده می‌شود و `summary` دارد.
3. این سند (`docs/API.md`) را در صورت تغییر قرارداد/آدرس به‌روز کند.
4. طبق قوانین ۱ و ۲، در `History-Agent.md` ثبت و نسخه را بالا ببرد.
