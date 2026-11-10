import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { Roles } from '../common/decorators/roles.decorator';
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
  @ApiProperty({ type: [PricingEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PricingEntryDto)
  items!: PricingEntryDto[];
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
    return this.pricing.update(dto.items);
  }
}
