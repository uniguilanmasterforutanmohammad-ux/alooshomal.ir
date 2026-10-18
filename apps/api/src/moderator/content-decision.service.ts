import { Injectable } from '@nestjs/common';
import { ContentDecisionKind } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Tracks who approved/rejected each piece of content, so the limited
 * «کاربر ادمین» panel can show «تأییدشده / ردشده» scoped to just that
 * reviewer. One row per item (unique on `kind + itemId`); a re-decision
 * overwrites the previous one.
 */
@Injectable()
export class ContentDecisionService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    kind: ContentDecisionKind;
    itemId: string;
    adminId: string;
    approved: boolean;
    reason?: string | null;
  }) {
    const { kind, itemId, adminId, approved, reason } = params;
    await this.prisma.contentDecision.upsert({
      where: { kind_itemId: { kind, itemId } },
      update: { adminId, approved, reason: reason ?? null },
      create: { kind, itemId, adminId, approved, reason: reason ?? null },
    });
  }

  /**
   * Ids of items in `kind` decided (approved or rejected) by this reviewer.
   * `approved` narrows it to one outcome.
   */
  async decidedItemIds(
    kind: ContentDecisionKind,
    adminId: string,
    approved: boolean,
  ): Promise<string[]> {
    const rows = await this.prisma.contentDecision.findMany({
      where: { kind, adminId, approved },
      select: { itemId: true },
    });
    return rows.map((row) => row.itemId);
  }

  async counts(kind: ContentDecisionKind, adminId: string) {
    const [approved, rejected] = await this.prisma.$transaction([
      this.prisma.contentDecision.count({ where: { kind, adminId, approved: true } }),
      this.prisma.contentDecision.count({ where: { kind, adminId, approved: false } }),
    ]);
    return { approved, rejected };
  }
}
