import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Filters for `GET /v2/invoice/List`. All optional; unknown values are ignored
 * by PayPing.
 */
export class InvoiceListQueryDto {
  @ApiPropertyOptional({ description: 'شروع لیست' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset?: number;

  @ApiPropertyOptional({ description: 'تعداد سطر بازگشتی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: 'فیلتر وضعیت فاکتور' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;

  @ApiPropertyOptional({ description: 'فقط فاکتورهای بایگانی‌شده' })
  @IsOptional()
  @IsString()
  isArchived?: string;

  @ApiPropertyOptional({ description: 'متن جستجو (نام/کد فاکتور)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'از تاریخ' })
  @IsOptional()
  @IsString()
  searchDateFrom?: string;

  @ApiPropertyOptional({ description: 'تا تاریخ' })
  @IsOptional()
  @IsString()
  searchDateTo?: string;
}

/** Body of `POST /v2/invoice`. `products`/`customers` keep their PayPing shape. */
export class InvoiceDto {
  @ApiPropertyOptional({ description: 'عنوان فاکتور' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'شماره فاکتور' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({
    description: 'نوع ثبت: ۰ پیش‌نویس، ۱ ارسال، ۲ پرداخت‌شده',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createStatus?: number;

  @ApiPropertyOptional({
    description: 'آیتم‌های مالی فاکتور',
    type: Object,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  products?: unknown[];

  @ApiPropertyOptional({
    description: 'مشتریان فاکتور (addressBookCode)',
    type: Object,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  customers?: unknown[];

  @ApiPropertyOptional({
    description: 'ایمیل‌های اطلاع‌رسانی',
    type: Object,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  cc?: unknown[];

  @ApiPropertyOptional({ description: 'توضیح پرداخت دستی' })
  @IsOptional()
  @IsString()
  paidManualDescription?: string;

  @ApiPropertyOptional({ description: 'کد تخفیف کلی فاکتور' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ description: 'مبلغ/درصد تخفیف کلی' })
  @IsOptional()
  @Type(() => Number)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'نوع تخفیف کلی: ۱ مبلغ، ۰ درصد' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountType?: number;

  @ApiPropertyOptional({ description: 'هزینه حمل و نقل' })
  @IsOptional()
  @Type(() => Number)
  shipping?: number;

  @ApiPropertyOptional({ description: 'پیام برای پرداخت‌کننده' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'شرایط و قوانین' })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional({ description: 'یادداشت داخلی' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: 'تاریخ ارسال' })
  @IsOptional()
  @IsString()
  sendDate?: string;

  @ApiPropertyOptional({ description: 'تاریخ سررسید' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'آدرس بازگشت از صفحه پرداخت' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

/** Body of `POST /v2/invoice/Cancel`. */
export class CancelInvoiceDto {
  @ApiProperty({ description: 'کد فاکتور' })
  @IsString()
  @MinLength(1)
  code!: string;
}

/** Body of `POST /v2/invoice/ConfirmPayment`. */
export class ConfirmInvoicePaymentDto {
  @ApiProperty({ description: 'کد فاکتور' })
  @IsString()
  @MinLength(1)
  invoiceCode!: string;

  @ApiProperty({ description: 'کد رهگیری پرداخت' })
  @IsString()
  @MinLength(1)
  refId!: string;
}
