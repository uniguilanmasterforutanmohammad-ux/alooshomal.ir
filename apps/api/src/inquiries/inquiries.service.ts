import { Injectable } from '@nestjs/common';
import { InquiryProvider, Prisma } from '@prisma/client';

import { clampLimit } from '../common/pagination-meta';
import { PrismaService } from '../prisma/prisma.service';

export interface InquiryLogRow {
  id: string;
  provider: InquiryProvider;
  serviceKey: string;
  ok: boolean;
  resultCode: number | null;
  httpStatus: number | null;
  message: string | null;
  errorCode: string | null;
  latencyMs: number | null;
  nationalCode: string | null;
  phone: string | null;
  createdAt: string;
  user: { id: string; fullName: string | null; phone: string | null } | null;
}

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: {
    provider?: string;
    q?: string;
    take?: number;
  }): Promise<{ items: InquiryLogRow[]; total: number }> {
    const provider =
      params.provider === 'ZOHAL' || params.provider === 'APIIR'
        ? (params.provider as InquiryProvider)
        : undefined;
    const q = params.q?.trim();
    const take = clampLimit(params.take, 100, 300);
    const where: Prisma.InquiryLogWhereInput = {
      ...(provider ? { provider } : {}),
      ...(q
        ? {
            OR: [
              { serviceKey: { contains: q, mode: 'insensitive' } },
              { nationalCode: { contains: q } },
              { phone: { contains: q } },
              { message: { contains: q, mode: 'insensitive' } },
              { user: { is: { fullName: { contains: q, mode: 'insensitive' } } } },
              { user: { is: { phone: { contains: q } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.inquiryLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
        },
      }),
      this.prisma.inquiryLog.count({ where }),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        id: row.id,
        provider: row.provider,
        serviceKey: row.serviceKey,
        ok: row.ok,
        resultCode: row.resultCode,
        httpStatus: row.httpStatus,
        message: row.message,
        errorCode: row.errorCode,
        latencyMs: row.latencyMs,
        nationalCode: row.nationalCode,
        phone: row.phone,
        createdAt: row.createdAt.toISOString(),
        user: row.user,
      })),
    };
  }
}
