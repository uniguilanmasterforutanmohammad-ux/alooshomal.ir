import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { StudentPaymentDto } from './dto/education.dto';
import { EducationService } from './education.service';

@ApiTags('education')
@Controller('public/edu')
export class PublicEducationController {
  constructor(private readonly education: EducationService) {}

  @Public()
  @Get('student/:token')
  @ApiOperation({ summary: '(عمومی) پنل هنرجو/ولی: ثبت‌نام‌ها، جلسات، اقساط و پیشرفت' })
  panel(@Param('token') token: string) {
    return this.education.studentPanel(token);
  }

  @Public()
  @Post('student/:token/payments')
  @ApiOperation({ summary: '(عمومی) ثبت رسید پرداخت شهریه توسط هنرجو/ولی' })
  pay(@Param('token') token: string, @Body() dto: StudentPaymentDto) {
    return this.education.createStudentPayment(token, dto);
  }
}
