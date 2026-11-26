# دروازه‌ی پیامک بانکی (SMS Gateway)

> **مرجع قوانین:** `AGENTS.md`. این سند مکمل `docs/API.md` است.

## هدف

فروشنده‌ای که پرداخت کارت‌به‌کارت می‌پذیرد، یک اپ اندروید روی گوشی خود نصب
می‌کند. اپ پیامک‌های واریز بانکی را می‌خواند و به API می‌فرستد؛ اگر مبلغ و
چهار رقم آخر کارت مقصد با یک سفارش کارت‌به‌کارتِ در انتظار پرداخت بخواند،
پرداخت خودکار تأیید می‌شود. روش دستی ارسال رسید همچنان فعال است.

اپ اندروید در پوشه‌ی مستقل `android-sms-gateway/` است و در `install.sh`،
`docker-compose` و workflow استقرار قرار ندارد.

## جریان کار

1. فروشنده شماره کارت را در «کارت به کارت» ثبت می‌کند.
2. از «دروازه‌ی پیامک بانکی» یک کد یک‌بارمصرف ۸ کاراکتری می‌سازد.
3. اپ با `POST /api/sms-gateway/device/pair` کد را به توکن دستگاه تبدیل می‌کند.
4. اپ پیامک واریز را پارس و با `POST /api/sms-gateway/device/transactions`
   ارسال می‌کند (idempotent با `dedupeKey`).
5. سرور کارت مقصد را با کارت ثبت‌شده مقایسه و سفارش هم‌مبلغ را پیدا می‌کند:
   - یک سفارش → تأیید خودکار + `settleOrderPaid` + فاکتور.
   - چند سفارش → `AMBIGUOUS` و تطبیق دستی.
   - هیچ سفارش → `UNMATCHED` و تطبیق دستی.

## مدل داده

- `SmsGatewayDevice` — گوشی متصل؛ توکن فقط هش‌شده ذخیره می‌شود.
- `SmsGatewayPairingCode` — کد یک‌بارمصرف ۱۵ دقیقه‌ای (هش‌شده).
- `SmsGatewayTransaction` — پیامک پارس‌شده + نتیجه‌ی تطبیق + کاندیدها.
- `CardToCardPayment.source = SMS_GATEWAY` — پرداخت خودکار با پیامک.

## امنیت

- توکن دستگاه ۳۲ بایت تصادفی و فقط یک‌بار در پاسخ pairing برمی‌گردد.
- کد اتصال و توکن هر دو با SHA-256 هش می‌شوند.
- محدودیت نرخ روی ساخت کد و تلاش pairing.
- تمام مسیرهای دستگاه با `SmsDeviceGuard` و توکن Bearer محافظت می‌شوند.
- سوئیچ مدیر `featureSmsGateway` در `FEATURE_FLAGS` هم مسیرهای پنل و هم
  مسیرهای دستگاه را می‌بندد.

## تست

```bash
python3 scripts/check_api_docs.py
```

سپس در پنل یک سفارش کارت‌به‌کارت هم‌مبلغ بسازید و با یک پیامک نمونه‌ی
`android-sms-gateway/SAMPLE-SMS.md` تراکنش را ثبت کنید. انتظار:

- `SmsGatewayTransaction.status = AUTO_APPROVED`
- `RetailOrder.paymentStatus = PAID`
- `CardToCardPayment.source = SMS_GATEWAY`
- فاکتور `RETAIL_ORDER_PAYMENT` برای سفارش صادر شود.
