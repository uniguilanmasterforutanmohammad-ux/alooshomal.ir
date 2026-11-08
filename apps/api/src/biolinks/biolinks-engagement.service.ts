import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

import { appUrl } from '../common/app-url';
import { paginationMeta } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { BiolinksService } from './biolinks.service';

/**
 * Public engagement and share assets of a biolink: view counters, like/save
 * toggles and summaries, the visitor's saved list, and the vCard / QR /
 * share-link assets of the public page. Split out of `BiolinksService` so the
 * CRUD/moderation surface stays focused.
 */
@Injectable()
export class BiolinksEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly biolinks: BiolinksService,
  ) {}

  async recordScan(
    biolinkId: string,
    meta: { ipHash?: string; userAgent?: string; referer?: string },
  ) {
    await this.prisma.scanEvent.create({
      data: {
        biolinkId,
        ipHash: meta.ipHash,
        userAgent: meta.userAgent?.slice(0, 500),
        referer: meta.referer?.slice(0, 500),
      },
    });
  }

  /**
   * Toggle a like from an anonymous visitor (identified by a hashed visitor
   * key). Returns the fresh like count for the biolink.
   */

  async toggleLike(slug: string, visitorKey: string) {
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const existing = await this.prisma.biolinkLike.findUnique({
      where: {
        biolinkId_visitorKey: { biolinkId: biolink.id, visitorKey },
      },
    });
    if (existing) {
      await this.prisma.biolinkLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.biolinkLike.create({
        data: { biolinkId: biolink.id, visitorKey },
      });
    }
    const likeCount = await this.prisma.biolinkLike.count({
      where: { biolinkId: biolink.id },
    });
    return { liked: !existing, likeCount };
  }

  async likeSummary(slug: string, visitorKey?: string) {
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const likeCount = await this.prisma.biolinkLike.count({
      where: { biolinkId: biolink.id },
    });
    const liked = visitorKey
      ? Boolean(
          await this.prisma.biolinkLike.findUnique({
            where: {
              biolinkId_visitorKey: { biolinkId: biolink.id, visitorKey },
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
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const existing = await this.prisma.biolinkSave.findUnique({
      where: { userId_biolinkId: { userId, biolinkId: biolink.id } },
    });
    if (existing) {
      await this.prisma.biolinkSave.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.biolinkSave.create({
        data: { userId, biolinkId: biolink.id },
      });
    }
    return { saved: !existing };
  }

  /**
   * Whether the current visitor has saved this biolink. Anonymous visitors
   * (no `userId`) always get `saved: false`, so the public page can render the
   * save button without requiring a login.
   */

  async saveSummary(slug: string, userId?: string) {
    if (!userId) return { saved: false };
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const existing = await this.prisma.biolinkSave.findUnique({
      where: { userId_biolinkId: { userId, biolinkId: biolink.id } },
    });
    return { saved: Boolean(existing) };
  }

  /**
   * Published biolinks a user has saved, newest save first, paginated with the
   * admin-controlled `myListPageSize` setting.
   */

  async findMySaved(userId: string, page = 1, limitOverride?: number) {
    const limit = limitOverride ?? (await this.settings.getMyListPageSize());
    const currentPage = Math.max(1, page);
    const [saves, total] = await Promise.all([
      this.prisma.biolinkSave.findMany({
        where: { userId },
        include: {
          biolink: {
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
      this.prisma.biolinkSave.count({ where: { userId } }),
    ]);
    return {
      items: saves
        .filter((save) => save.biolink)
        .map((save) => ({
          id: save.biolink.id,
          slug: save.biolink.slug,
          fullName: save.biolink.fullName,
          jobTitle: save.biolink.jobTitle,
          company: save.biolink.company,
          avatarUrl: save.biolink.avatarUrl,
          primaryColor: save.biolink.primaryColor,
          template: save.biolink.template,
          likeCount: save.biolink._count.likes,
          savedAt: save.createdAt,
        })),
      meta: paginationMeta(currentPage, limit, total),
    };
  }

  /**
   * 1-based rank of a biolink inside its published directory (ordered by the
   * default "newest" sort), plus the page it lands on with the current page
   * size. Used by the "افزایش بازدید" panel to show a position like 55 / page 3.
   */

  async buildVCard(slug: string): Promise<string> {
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${biolink.fullName}`,
      biolink.company ? `ORG:${biolink.company}` : '',
      biolink.jobTitle ? `TITLE:${biolink.jobTitle}` : '',
      biolink.phone ? `TEL;TYPE=CELL:${biolink.phone}` : '',
      biolink.email ? `EMAIL:${biolink.email}` : '',
      biolink.website ? `URL:${biolink.website}` : '',
      biolink.address ? `ADR:;;${biolink.address};;;;` : '',
      biolink.bio ? `NOTE:${biolink.bio.replace(/\n/g, ' ')}` : '',
      'END:VCARD',
    ].filter(Boolean);
    return lines.join('\r\n');
  }

  async publicLink(slug: string): Promise<string> {
    return `${appUrl().replace(/\/$/, '')}/biolinks/${slug}`;
  }

  async qrDataUrl(slug: string): Promise<string> {
    const link = await this.publicLink(slug);
    return QRCode.toDataURL(link, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 512,
    });
  }

  async publicBiolinkWithAssets(slug: string) {
    const biolink = await this.biolinks.findPublicBySlug(slug);
    const [qr, link] = await Promise.all([
      this.qrDataUrl(slug),
      this.publicLink(slug),
    ]);
    return { biolink, qr, link };
  }
}
