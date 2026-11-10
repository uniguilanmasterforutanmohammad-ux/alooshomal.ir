import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalAuth } from '../common/decorators/optional-auth.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BusinessReviewsService } from './business-reviews.service';
import { CreateBusinessReviewDto } from './dto/create-business-review.dto';

@ApiTags('business-reviews')
@Controller('business-reviews')
export class BusinessReviewsController {
  constructor(private readonly reviews: BusinessReviewsService) {}

  @OptionalAuth()
  @Get('public/:slug')
  @ApiOperation({
    summary: 'دیدگاه‌ها و امتیاز عمومی یک کسب‌وکار (میانگین + توزیع ستاره‌ها)',
  })
  listPublic(
    @Param('slug') slug: string,
    @Query() query: PaginationDto,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.reviews.listPublic(slug, query.page, query.limit, user?.id);
  }

  @OptionalAuth()
  @Get('public/:slug/mine')
  @ApiOperation({ summary: 'دیدگاه من برای یک کسب‌وکار (برای پیش‌پر کردن فرم)' })
  mine(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    if (!user) return { review: null, summary: null };
    return this.reviews.findMine(slug, user.id);
  }

  @Post('public/:slug')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'ثبت یا ویرایش دیدگاه و امتیاز من برای یک کسب‌وکار',
  })
  save(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBusinessReviewDto,
  ) {
    return this.reviews.save(slug, user.id, dto);
  }

  @Delete('public/:slug/mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف دیدگاه من برای یک کسب‌وکار' })
  removeMine(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.reviews.removeMine(slug, user.id);
  }
}
