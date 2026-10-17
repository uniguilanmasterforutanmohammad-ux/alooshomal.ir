import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { SeoService } from './seo.service';

@ApiTags('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Public()
  @Get('sitemap')
  @ApiOperation({
    summary: 'ورودی‌های نقشه سایت عمومی (فقط صفحات منتشرشده و تأییدشده)',
  })
  sitemap() {
    return this.seo.sitemapEntries();
  }
}
