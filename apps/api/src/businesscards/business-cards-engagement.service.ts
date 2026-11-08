import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

import { appUrl } from '../common/app-url';
import { paginationMeta } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { BusinessCardsService } from './business-cards.service';

/**
 * Public engagement and share assets of a business card: view counters,
 * like/save toggles and summaries, the visitor's saved list, and the vCard / QR
 * / share-link assets of the public page. Split out of `BusinessCardsService`
 * so the CRUD/moderation surface stays focused.
 */
@Injectable()
export class BusinessCardsEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly businessCards: BusinessCardsService,
  ) {}

  async recordScan(
    businessCardId: string,
    meta: { ipHash?: string; userAgent?: string; referer?: string },
  ) {
    await this.prisma.businessCardScanEvent.create({
      data: {
        businessCardId,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent?.slice(0, 500),
        referer: meta.referer?.slice(0, 500),
      },
    });
  }

  async toggleLike(slug: string, visitorKey: string) {
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardLike.findUnique({
      where: {
        businessCardId_visitorKey: {
          businessCardId: businessCard.id,
          visitorKey,
        },
      },
    });
    if (existing) {
      await this.prisma.businessCardLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.businessCardLike.create({
        data: { businessCardId: businessCard.id, visitorKey },
      });
    }
    const likeCount = await this.prisma.businessCardLike.count({
      where: { businessCardId: businessCard.id },
    });
    return { liked: !existing, likeCount };
  }

  async likeSummary(slug: string, visitorKey?: string) {
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const likeCount = await this.prisma.businessCardLike.count({
      where: { businessCardId: businessCard.id },
    });
    const liked = visitorKey
      ? Boolean(
          await this.prisma.businessCardLike.findUnique({
            where: {
              businessCardId_visitorKey: {
                businessCardId: businessCard.id,
                visitorKey,
              },
            },
          }),
        )
      : false;
    return { likeCount, liked };
  }

  /**
   * Toggle a save ("ذخیره") for a logged-in user. Only authenticated users can
   * save, so a `userId` is always required here.
   */

  async toggleSave(slug: string, userId: string) {
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardSave.findUnique({
      where: {
        userId_businessCardId: { userId, businessCardId: businessCard.id },
      },
    });
    if (existing) {
      await this.prisma.businessCardSave.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.businessCardSave.create({
        data: { userId, businessCardId: businessCard.id },
      });
    }
    return { saved: !existing };
  }

  /**
   * Whether the current visitor has saved this business card. Anonymous
   * visitors (no `userId`) always get `saved: false`, so the public page can
   * render the save button without requiring a login.
   */

  async saveSummary(slug: string, userId?: string) {
    if (!userId) return { saved: false };
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const existing = await this.prisma.businessCardSave.findUnique({
      where: {
        userId_businessCardId: { userId, businessCardId: businessCard.id },
      },
    });
    return { saved: Boolean(existing) };
  }

  /**
   * Published business cards a user has saved, newest save first, paginated
   * with the admin-controlled `myListPageSize` setting.
   */

  async findMySaved(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);
    const [saves, total] = await Promise.all([
      this.prisma.businessCardSave.findMany({
        where: { userId },
        include: {
          businessCard: {
            select: {
              id: true,
              slug: true,
              fullName: true,
              jobTitle: true,
              company: true,
              avatarUrl: true,
              primaryColor: true,
              template: true,
              _count: { select: { likes: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (currentPage - 1) * limit,
        take: limit,
      }),
      this.prisma.businessCardSave.count({ where: { userId } }),
    ]);
    return {
      items: saves.map((save) => ({
        id: save.businessCard.id,
        slug: save.businessCard.slug,
        fullName: save.businessCard.fullName,
        jobTitle: save.businessCard.jobTitle,
        company: save.businessCard.company,
        avatarUrl: save.businessCard.avatarUrl,
        primaryColor: save.businessCard.primaryColor,
        template: save.businessCard.template,
        likeCount: save.businessCard._count.likes,
        savedAt: save.createdAt,
      })),
      meta: paginationMeta(currentPage, limit, total),
    };
  }

  /**
   * 1-based rank of a business card inside its published directory (ordered by
   * the default "newest" sort), plus the page it lands on with the current page
   * size. Used by the "افزایش بازدید" panel to show a position like 55 / page 3.
   */

  async buildVCard(slug: string): Promise<string> {
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${businessCard.fullName}`,
      businessCard.company ? `ORG:${businessCard.company}` : '',
      businessCard.jobTitle ? `TITLE:${businessCard.jobTitle}` : '',
      businessCard.phone ? `TEL;TYPE=CELL:${businessCard.phone}` : '',
      businessCard.email ? `EMAIL:${businessCard.email}` : '',
      businessCard.website ? `URL:${businessCard.website}` : '',
      businessCard.address ? `ADR:;;${businessCard.address};;;;` : '',
      businessCard.bio ? `NOTE:${businessCard.bio.replace(/\n/g, ' ')}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\r\n');
  }

  async publicLink(slug: string): Promise<string> {
    return `${appUrl().replace(/\/$/, '')}/business-cards/${slug}`;
  }

  async qrDataUrl(slug: string): Promise<string> {
    const link = await this.publicLink(slug);
    return QRCode.toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }

  async publicBusinessCardWithAssets(slug: string) {
    const businessCard = await this.businessCards.findPublicBySlug(slug);
    const [qr, link] = await Promise.all([
      this.qrDataUrl(slug),
      this.publicLink(slug),
    ]);
    return { businessCard, qr, link };
  }
}
