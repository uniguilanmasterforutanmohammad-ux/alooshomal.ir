import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/** Body of `POST /v3/pay` — builds a payment order and returns its gateway URL. */
export class CreatePaymentDto {
  @ApiProperty({ description: 'مبلغ دستور پرداخت (تومان)', minimum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amount!: number;

  @ApiProperty({
    description: 'آدرس بازگشت پذیرنده پس از پرداخت',
    example: 'https://shomalicard.ir/payments/callback',
  })
  @IsString()
  @MinLength(4)
  returnUrl!: string;

  @ApiPropertyOptional({
    description: 'شماره موبایل یا ایمیل پرداخت‌کننده',
  })
  @IsOptional()
  @IsString()
  payerIdentity?: string;

  @ApiPropertyOptional({ description: 'نام پرداخت‌کننده' })
  @IsOptional()
  @IsString()
  payerName?: string;

  @ApiPropertyOptional({ description: 'توضیحات پرداخت' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'شناسه ارجاع یکتای پذیرنده (برای تطبیق پرداخت)',
  })
  @IsOptional()
  @IsString()
  clientRefId?: string;

  @ApiPropertyOptional({ description: 'قابلیت بازگشت وجه برای این تراکنش' })
  @IsOptional()
  @IsBoolean()
  isReversible?: boolean;
}

/** Body of `POST /v3/pay/verify` — confirms a paid transaction. */
export class VerifyPaymentDto {
  @ApiProperty({ description: 'کد رهگیری پرداخت (refId)' })
  @Type(() => Number)
  @IsInt()
  paymentRefId!: number;

  @ApiProperty({ description: 'کد پرداخت' })
  @IsString()
  paymentCode!: string;

  @ApiProperty({ description: 'مبلغ دستور پرداخت (تومان)', minimum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amount!: number;
}

/** Body of `POST /v3/pay/reverse` — refunds a (reversible) payment. */
export class ReversePaymentDto {
  @ApiProperty({ description: 'کد رهگیری پرداخت (refId)' })
  @Type(() => Number)
  @IsInt()
  paymentRefId!: number;

  @ApiProperty({ description: 'کد پرداخت' })
  @IsString()
  paymentCode!: string;
}

/** Body of `POST /v3/pay/unblock` — releases a blocked transaction. */
export class UnblockPaymentDto {
  @ApiProperty({ description: 'کد پرداخت مسدودشده' })
  @IsString()
  paymentCode!: string;

  @ApiPropertyOptional({ description: 'توضیح آزادسازی' })
  @IsOptional()
  @IsString()
  description?: string;
}

/** Body of `DELETE /v3/pay` — deletes an unpaid payment order. */
export class DeletePaymentDto {
  @ApiProperty({ description: 'کد پرداخت' })
  @IsString()
  paymentCode!: string;
}

/** Body of `POST /v1/withdraw/{amount}` — requests a settlement. */
export class WithdrawRequestDto {
  @ApiProperty({ description: 'مبلغ درخواست تسویه (تومان)', minimum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amount!: number;
}

/** Unused e-mail shape kept for a future invoice "cc" UI. */
export class InvoiceCcEmailDto {
  @ApiProperty({ description: 'آدرس ایمیل' })
  @IsEmail()
  emailAddress!: string;
}
