import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PublicInquiryDto } from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@Controller('public/properties')
export class PublicPropertiesController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: '(عمومی) آگهی منتشرشده‌ی ملکی بدون اطلاعات تماس مالک' })
  ad(@Param('token') token: string) {
    return this.realEstate.publicProperty(token);
  }

  @Public()
  @Post(':token/inquiry')
  @ApiOperation({ summary: '(عمومی) ثبت درخواست بازدید/تماس از آگهی (تبدیل به تقاضای مشتری)' })
  inquiry(@Param('token') token: string, @Body() dto: PublicInquiryDto) {
    return this.realEstate.publicInquiry(token, dto);
  }
}
