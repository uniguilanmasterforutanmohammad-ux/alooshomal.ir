import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

/**
 * Version shown in the Swagger UI. The single source of truth for the product
 * version is `apps/web/lib/version.ts`; the deploy pipeline may override this
 * with the `APP_VERSION` env var so the docs stay in sync with the release.
 */
const APP_VERSION = process.env.APP_VERSION ?? '1.0.0';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  const port = config.get<number>('API_PORT', 4000);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const enableSwagger = config.get<string>('ENABLE_SWAGGER', 'true') === 'true';

  app.setGlobalPrefix('api');

  app.use(helmet());
  app.enableCors({
    origin: corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Alooshomal API')
      .setDescription(
        [
          'API پلتفرم کارت ویزیت دیجیتال «شمالی کارت».',
          '',
          'همه‌ی پاسخ‌ها در یک پوشش یکنواخت `{ success, data }` برگردانده می‌شوند ',
          'و مسیرها زیر پیشوند سراسری `/api` سرو می‌شوند.',
          '',
          'برای فراخوانی مسیرهای محافظت‌شده، توکن دسترسی را از `POST /api/auth/login` ',
          'یا `POST /api/auth/verify-otp` بگیرید و در Swagger با دکمه‌ی Authorize ',
          'وارد کنید.',
        ].join('\n'),
      )
      .setVersion(APP_VERSION)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addServer('/', 'نسبت به میزبان جاری')
      .addTag('auth', 'ورود/ثبت‌نام، OTP و چرخه‌ی توکن')
      .addTag('users', 'پروفایل کاربر جاری')
      .addTag('sessions', 'نشست‌های فعال و ابطال آن‌ها')
      .addTag('biolinks', 'بیولینک‌ها: مالک، دایرکتوری عمومی و تعامل‌ها')
      .addTag('business-cards', 'کارت‌های ویزیت: مالک، دایرکتوری عمومی و تعامل‌ها')
      .addTag('feeds', 'فید کاربران: پست، موضوع و اشتراک')
      .addTag('news', '«نبض شهر» و اخبار شهروندخبرنگار')
      .addTag('boosts', '«پله» و افزایش بازدید')
      .addTag('ads', 'تبلیغات صفحه‌ی اول و دایرکتوری')
      .addTag('points', 'امتیاز و جوایز کاربران')
      .addTag('subscriptions', 'پلن‌ها و اشتراک کاربران')
      .addTag('tickets', 'تیکت‌های پشتیبانی')
      .addTag('taxonomy', 'شهرها و کسب‌وکارها')
      .addTag('uploads', 'آپلود تصویر روی MinIO')
      .addTag('notifications', 'اعلان‌های کاربر')
      .addTag('profile', 'درخواست‌های تغییر پروفایل')
      .addTag('moderator', 'پنل کاربر ادمین (بررسی محتوا)')
      .addTag('admin', 'پنل مدیریت: کاربران، محتوا، تنظیمات و گزارش‌ها')
      .addTag('settings', 'تنظیمات عمومی سایت')
      .addTag('seo', 'نقشه‌ی سایت و داده‌های سئو')
      .addTag('health', 'سلامت سرویس')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      // Keep the entered bearer token across page reloads while developing.
      swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
      jsonDocumentUrl: 'api/docs-json',
    });
  }

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${port}/api`);
}

void bootstrap();
