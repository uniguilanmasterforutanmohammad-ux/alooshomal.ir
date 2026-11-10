import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessCardsDirectoryService } from './business-cards-directory.service';
import { PublicBusinessCardQueryDto } from './dto/public-business-card-query.dto';

/**
 * Public «دسته‌بندی مشاغل» pages: one landing page per active business
 * category, listing every published business card in that category.
 */
@ApiTags('business-categories')
@Controller('business-categories')
export class BusinessCategoriesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: BusinessCardsDirectoryService,
  ) {}

  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'فهرست دسته‌بندی‌های شغلی فعال همراه با تعداد کسب‌وکارهای منتشرشده',
  })
  async list() {
    const categories = await this.prisma.businessCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            businessCards: {
              where: { status: 'APPROVED', isPublished: true },
            },
          },
        },
      },
    });
    return categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        count: category._count.businessCards,
      }))
      .sort(
        (a, b) =>
          b.count - a.count ||
          new Intl.Collator('fa').compare(a.name, b.name),
      );
  }

  @Public()
  @Get('public/:slug')
  @ApiOperation({
    summary:
      'صفحه‌ی یک دسته‌بندی شغلی: اطلاعات دسته + فهرست صفحه‌بندی‌شده‌ی کسب‌وکارها با فیلتر شهر و مرتب‌سازی',
  })
  async detail(
    @Param('slug') slug: string,
    @Query() query: PublicBusinessCardQueryDto,
  ) {
    const category = await this.prisma.businessCategory.findFirst({
      where: { name: slug, isActive: true },
      select: { id: true, name: true },
    });
    if (!category) {
      return null;
    }
    const [page, total] = await Promise.all([
      this.directory.findPublicDirectory({
        ...query,
        businessId: category.id,
      }),
      this.prisma.businessCard.count({
        where: {
          businessId: category.id,
          status: 'APPROVED',
          isPublished: true,
        },
      }),
    ]);
    return {
      category: { ...category, count: total },
      ...page,
    };
  }
}
