import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { CardToCardService } from './card-to-card.service';
import { SubmitCardPaymentDto } from './dto/submit-payment.dto';

@ApiTags('card-to-card')
@Public()
@Controller('public/card-to-card')
export class PublicCardToCardController {
  constructor(private readonly cardToCard: CardToCardService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'اطلاعات کارت عمومی کسب‌وکار برای واریز' })
  info(@Param('slug') slug: string) {
    return this.cardToCard.publicInfo(slug);
  }

  @Post(':slug/payments')
  @ApiOperation({ summary: 'ثبت رسید کارت به کارت توسط مشتری برای تأیید' })
  submit(@Param('slug') slug: string, @Body() dto: SubmitCardPaymentDto) {
    return this.cardToCard.submitPublic(slug, dto);
  }
}
