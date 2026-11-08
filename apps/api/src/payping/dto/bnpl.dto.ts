import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

/** Body of `POST /v1/bnpl/merchant/order/create` — creates an instalment order. */
export class CreateBnplOrderDto {
  @ApiProperty({ description: 'مبلغ سفارش (تومان)', minimum: 1000 })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  amount!: number;

  @ApiProperty({ description: 'موبایل خریدار', example: '09xxxxxxxxx' })
  @IsString()
  @MinLength(11)
  mobile!: string;

  @ApiProperty({ description: 'شناسه ارجاع یکتای پذیرنده' })
  @IsString()
  @MinLength(1)
  refId!: string;

  @ApiProperty({ description: 'آدرس بازگشت پس از پرداخت' })
  @IsString()
  @MinLength(4)
  callbackUrl!: string;

  @ApiPropertyOptional({ description: 'آدرس بازگشت در صورت لغو' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;

  @ApiPropertyOptional({ description: 'توضیحات سفارش' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'طرح‌های اقساطی هدف',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  targetPlans?: string[];
}

/** Body of `PUT /v1/bnpl/merchant/plan/toggle-active`. */
export class ToggleBnplPlanDto {
  @ApiProperty({ description: 'کد طرح اقساطی' })
  @IsString()
  @MinLength(1)
  planCode!: string;

  @ApiProperty({ description: 'فعال یا غیرفعال' })
  @IsBoolean()
  isActive!: boolean;
}

/** Body of `POST /v1/bnpl/merchant/contract/change-wallet-credit-amount`. */
export class ChangeBnplWalletCreditDto {
  @ApiProperty({ description: 'کد اعتبار (creditCode)' })
  @IsString()
  @MinLength(1)
  creditCode!: string;

  @ApiProperty({ description: 'مبلغ اعتبار کیف پول (تومان)' })
  @Type(() => Number)
  @IsInt()
  walletCreditAmount!: number;
}

/** Query filters for `GET /v1/bnpl/merchant/order/list`. */
export class BnplOrderListQueryDto {
  @ApiPropertyOptional({ description: 'از تاریخ' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'تا تاریخ' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'نام خریدار' })
  @IsOptional()
  @IsString()
  consumerName?: string;

  @ApiPropertyOptional({ description: 'موبایل خریدار' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({ description: 'کد رهگیری' })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional({ description: 'شماره صفحه' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageNumber?: number;

  @ApiPropertyOptional({ description: 'تعداد سطر' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}
