import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessModulesService } from './business-modules.service';

/**
 * Public extras shown on a business card page (`/business/:slug`): the
 * published products of a shop and the published stays of an accommodation
 * owner. Both are gated by the workspace's active business package, so once
 * the paid term expires they disappear while the free business card page
 * itself stays published.
 */
@ApiTags('business-modules')
@Public()
@Controller('public/business')
export class PublicBusinessExtrasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
  ) {}

  @Get(':slug/extras')
  @ApiOperation({
    summary:
      'محصولات و اقامتگاه‌های منتشرشده‌ی کسب‌وکار برای نمایش در صفحه‌ی عمومی کارت (وابسته به بسته‌ی فعال)',
  })
  async extras(@Param('slug') slug: string) {
    const card = await this.prisma.businessCard.findFirst({
      where: {
        slug,
        OR: [
          { status: 'APPROVED', isPublished: true },
          { isUnclaimed: true },
        ],
      },
      select: {
        workspaceId: true,
        workspace: { select: { publicSlug: true, name: true } },
      },
    });
    if (!card?.workspaceId) {
      return { workspace: null, products: [], stays: [] };
    }
    const workspaceId = card.workspaceId;

    const [retailOn, staysOn] = await Promise.all([
      this.modules.isModuleEnabledForWorkspace(workspaceId, 'retailCatalog'),
      this.modules.isModuleEnabledForWorkspace(workspaceId, 'accommodationRental'),
    ]);

    const [products, stays] = await Promise.all([
      retailOn
        ? this.prisma.retailProduct.findMany({
            where: { workspaceId, status: 'PUBLISHED' },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: 100,
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              price: true,
              compareAtPrice: true,
              unit: true,
              imageUrl: true,
              category: true,
              stock: true,
            },
          })
        : [],
      staysOn
        ? this.prisma.accommodationProperty.findMany({
            where: { workspaceId, status: 'PUBLISHED' },
            orderBy: [{ publishedAt: 'desc' }],
            take: 100,
            select: {
              id: true,
              slug: true,
              title: true,
              propertyType: true,
              basePrice: true,
              currency: true,
              maxGuests: true,
              bedrooms: true,
              beds: true,
              city: { select: { id: true, name: true } },
              photos: {
                where: { isCover: true },
                take: 1,
                select: { url: true },
              },
            },
          })
        : [],
    ]);

    return {
      workspace: card.workspace
        ? { publicSlug: card.workspace.publicSlug, name: card.workspace.name }
        : null,
      products,
      stays,
    };
  }
}
