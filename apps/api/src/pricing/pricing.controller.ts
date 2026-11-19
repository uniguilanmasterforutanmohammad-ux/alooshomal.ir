import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MAX_PRICE } from '../settings/settings.service';
import { PricingService } from './pricing.service';

class PricingEntryDto {
  @ApiProperty({ example: 'setting:boostPrice' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 50000, minimum: 0, maximum: MAX_PRICE })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price!: number;
}

class UpdatePricingDto {
  @ApiPropertyOptional({ type: [PricingEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingEntryDto)
  items?: PricingEntryDto[];

  @ApiPropertyOptional({
    description:
      'پرداخت فقط آنلاین: اشتراک و استعلام هویت در همان مرحله از درگاه پرداخت می‌شوند و کیف پول منفی نمی‌شود.',
  })
  @IsOptional()
  @IsBoolean()
  onlineOnly?: boolean;
}

class SyncPricingPaypingDto {
  @ApiProperty({
    description:
      'کلید ردیف قیمت (مثلاً `setting:boostPrice`). فقط ردیف‌های پشتیبانی‌شده محصول پی‌پینگ می‌گیرند.',
    example: 'setting:boostPrice',
  })
  @IsString()
  key!: string;
}

@ApiTags('pricing')
@Public()
@Controller('pricing')
export class PublicPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({
    summary: 'تعرفه‌ی عمومی همه‌ی خدمات فعال (اشتراک‌ها، استعلام‌ها و بازاریابی)',
  })
  list() {
    return this.pricing.listPublic();
  }
}

@ApiTags('pricing')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/pricing')
export class AdminPricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({
    summary: 'فهرست یک‌جای همه‌ی خدمات دارای هزینه و مبالغ آن‌ها',
  })
  list() {
    return this.pricing.list();
  }

  @Patch()
  @ApiOperation({ summary: 'به‌روزرسانی یک‌جای مبالغ خدمات دارای هزینه' })
  update(@Body() dto: UpdatePricingDto) {
    return this.pricing.update(dto.items ?? [], dto.onlineOnly);
  }

  @Post('payping-product')
  @ApiOperation({
    summary:
      'ساخت/همگام‌سازی محصول پی‌پینگ برای یک ردیف قیمت (پله، تبلیغ دایرکتوری، تبلیغ صفحه‌ی اول)',
  })
  syncPaypingProduct(
    @CurrentUser() admin: AuthUser,
    @Body() dto: SyncPricingPaypingDto,
  ) {
    return this.pricing.syncPaypingProduct(dto.key, admin.id);
  }
}
