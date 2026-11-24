import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateContractDto,
  CreateLeadDto,
  CreatePropertyFileDto,
  CreateVisitDto,
  UpdateContractDto,
  UpdateLeadDto,
  UpdatePropertyFileDto,
  UpdateVisitDto,
} from './dto/realestate.dto';

const STALE_DAYS = 30;

/** Convert an optional UI number into a Prisma `BigInt` money value. */
const big = (value: number | null | undefined): bigint | null =>
  value == null ? null : BigInt(Math.trunc(value));

/** Convert a Prisma money value (number or BigInt) back to a plain number. */
const num = (value: number | bigint | null | undefined): number =>
  value == null ? 0 : Number(value);

@Injectable()
export class RealEstateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
  ) {}

  private workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  private async property(workspaceId: string, id: string) {
    const row = await this.prisma.propertyFile.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException('فایل ملکی پیدا نشد');
    return row;
  }

  private async lead(workspaceId: string, id: string) {
    const row = await this.prisma.propertyLead.findFirst({
      where: { id, workspaceId },
    });
    if (!row) throw new NotFoundException('تقاضای مشتری پیدا نشد');
    return row;
  }

  // -------------------------------------------------------------------------
  //  Property files
  // -------------------------------------------------------------------------

  async listPropertyFiles(
    userId: string,
    filters: { status?: string; dealType?: string; q?: string; neighborhood?: string },
  ) {
    const workspaceId = await this.workspaceId(userId);
    const q = filters.q?.trim();
    return this.prisma.propertyFile.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.dealType ? { dealType: filters.dealType } : {}),
        ...(filters.neighborhood ? { neighborhood: filters.neighborhood } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
                { neighborhood: { contains: q, mode: 'insensitive' } },
                { ownerName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 400,
    });
  }

  async getPropertyFile(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.propertyFile.findFirst({
      where: { id, workspaceId },
      include: {
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
          include: { lead: { select: { id: true, name: true, phone: true } } },
        },
        contracts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!row) throw new NotFoundException('فایل ملکی پیدا نشد');
    return row;
  }

  async createPropertyFile(userId: string, dto: CreatePropertyFileDto) {
    const workspaceId = await this.workspaceId(userId);
    if (dto.code?.trim()) {
      const dup = await this.prisma.propertyFile.findFirst({
        where: { workspaceId, code: dto.code.trim() },
        select: { id: true },
      });
      if (dup) throw new ConflictException('این کد فایل قبلاً ثبت شده است');
    }
    return this.prisma.propertyFile.create({
      data: {
        workspaceId,
        createdById: userId,
        code: dto.code?.trim() || null,
        dealType: dto.dealType ?? 'SALE',
        propertyKind: dto.propertyKind ?? 'APARTMENT',
        title: dto.title.trim(),
        city: dto.city?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
        area: dto.area ?? null,
        rooms: dto.rooms ?? null,
        floor: dto.floor?.trim() || null,
        price: big(dto.price),
        deposit: big(dto.deposit),
        rent: big(dto.rent),
        features: dto.features ?? [],
        ownerName: dto.ownerName?.trim() || null,
        ownerPhone: dto.ownerPhone?.trim() || null,
        internalNote: dto.internalNote?.trim() || null,
        status: dto.status ?? 'PENDING',
        published: dto.published ?? false,
        source: dto.source ?? 'AGENT',
        assignedToId: dto.assignedToId ?? null,
      },
    });
  }

  async updatePropertyFile(userId: string, id: string, dto: UpdatePropertyFileDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.property(workspaceId, id);
    return this.prisma.propertyFile.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.dealType !== undefined ? { dealType: dto.dealType } : {}),
        ...(dto.propertyKind !== undefined ? { propertyKind: dto.propertyKind } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.neighborhood !== undefined
          ? { neighborhood: dto.neighborhood.trim() || null }
          : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.rooms !== undefined ? { rooms: dto.rooms } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor.trim() || null } : {}),
        ...(dto.price !== undefined ? { price: big(dto.price) } : {}),
        ...(dto.deposit !== undefined ? { deposit: big(dto.deposit) } : {}),
        ...(dto.rent !== undefined ? { rent: big(dto.rent) } : {}),
        ...(dto.features !== undefined ? { features: dto.features } : {}),
        ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName.trim() || null } : {}),
        ...(dto.ownerPhone !== undefined
          ? { ownerPhone: dto.ownerPhone.trim() || null }
          : {}),
        ...(dto.internalNote !== undefined
          ? { internalNote: dto.internalNote.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId || null } : {}),
        ...(dto.verify ? { lastVerifiedAt: new Date() } : {}),
      },
    });
  }

  async removePropertyFile(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.property(workspaceId, id);
    await this.prisma.propertyFile.delete({ where: { id } });
    return { id };
  }

  /** Files that look like the same property (same owner phone or address). */
  async findDuplicates(
    userId: string,
    params: { ownerPhone?: string; address?: string; excludeId?: string },
  ) {
    const workspaceId = await this.workspaceId(userId);
    const ownerPhone = params.ownerPhone?.trim();
    const address = params.address?.trim();
    if (!ownerPhone && !address) {
      throw new BadRequestException('شماره مالک یا نشانی برای بررسی تکراری لازم است');
    }
    return this.prisma.propertyFile.findMany({
      where: {
        workspaceId,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
        OR: [
          ...(ownerPhone ? [{ ownerPhone }] : []),
          ...(address ? [{ address: { contains: address, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: {
        id: true,
        code: true,
        title: true,
        neighborhood: true,
        address: true,
        ownerPhone: true,
        status: true,
        createdAt: true,
      },
      take: 50,
    });
  }

  /**
   * Merge a duplicate into the target file: archive the duplicate, link it to
   * the target and move its visits/contracts so history is not lost.
   */
  async mergePropertyFiles(userId: string, targetId: string, duplicateId: string) {
    const workspaceId = await this.workspaceId(userId);
    if (targetId === duplicateId) {
      throw new BadRequestException('فایل مبدأ و مقصد یکسان است');
    }
    await this.property(workspaceId, targetId);
    await this.property(workspaceId, duplicateId);
    return this.prisma.$transaction(async (tx) => {
      await tx.propertyVisit.updateMany({
        where: { propertyId: duplicateId },
        data: { propertyId: targetId },
      });
      await tx.propertyContract.updateMany({
        where: { propertyId: duplicateId },
        data: { propertyId: targetId },
      });
      return tx.propertyFile.update({
        where: { id: duplicateId },
        data: { status: 'ARCHIVED', duplicateOfId: targetId, published: false },
      });
    });
  }

  /** Active leads that fit a property file. */
  async matchLeadsForProperty(userId: string, propertyId: string) {
    const workspaceId = await this.workspaceId(userId);
    const property = await this.property(workspaceId, propertyId);
    const kind = property.dealType === 'SALE' ? 'BUY' : 'RENT';
    const leads = await this.prisma.propertyLead.findMany({
      where: {
        workspaceId,
        kind,
        status: { in: ['NEW', 'ACTIVE', 'VISIT'] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });
    return leads.filter((lead) => this.leadFitsProperty(lead, property));
  }

  /** Active property files that fit a lead. */
  async matchPropertiesForLead(userId: string, leadId: string) {
    const workspaceId = await this.workspaceId(userId);
    const lead = await this.lead(workspaceId, leadId);
    const dealType = lead.kind === 'BUY' ? 'SALE' : 'RENT';
    const files = await this.prisma.propertyFile.findMany({
      where: { workspaceId, dealType, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 400,
    });
    return files.filter((file) => this.leadFitsProperty(lead, file));
  }

  private leadFitsProperty(
    lead: {
      neighborhoods: string[];
      budgetMin: number | bigint | null;
      budgetMax: number | bigint | null;
      depositMax: number | bigint | null;
      rentMax: number | bigint | null;
      minArea: number | null;
      rooms: number | null;
      kind: string;
    },
    file: {
      neighborhood: string | null;
      price: number | bigint | null;
      deposit: number | bigint | null;
      rent: number | bigint | null;
      area: number | null;
      rooms: number | null;
    },
  ): boolean {
    if (
      lead.neighborhoods.length > 0 &&
      (!file.neighborhood || !lead.neighborhoods.includes(file.neighborhood))
    ) {
      return false;
    }
    if (lead.minArea != null && (file.area ?? 0) < lead.minArea) return false;
    if (lead.rooms != null && (file.rooms ?? 0) < lead.rooms) return false;
    if (lead.kind === 'BUY') {
      if (lead.budgetMin != null && num(file.price) < num(lead.budgetMin)) return false;
      if (lead.budgetMax != null && num(file.price) > num(lead.budgetMax)) return false;
    } else {
      if (lead.depositMax != null && num(file.deposit) > num(lead.depositMax)) return false;
      if (lead.rentMax != null && num(file.rent) > num(lead.rentMax)) return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  //  Leads (CRM demands)
  // -------------------------------------------------------------------------

  async listLeads(userId: string, filters: { status?: string; kind?: string; q?: string }) {
    const workspaceId = await this.workspaceId(userId);
    const q = filters.q?.trim();
    return this.prisma.propertyLead.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { notes: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 400,
    });
  }

  async getLead(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const row = await this.prisma.propertyLead.findFirst({
      where: { id, workspaceId },
      include: {
        visits: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
          include: { property: { select: { id: true, title: true, neighborhood: true } } },
        },
        contracts: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!row) throw new NotFoundException('تقاضای مشتری پیدا نشد');
    return row;
  }

  async createLead(userId: string, dto: CreateLeadDto) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.propertyLead.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        kind: dto.kind ?? 'BUY',
        budgetMin: big(dto.budgetMin),
        budgetMax: big(dto.budgetMax),
        depositMax: big(dto.depositMax),
        rentMax: big(dto.rentMax),
        neighborhoods: dto.neighborhoods ?? [],
        minArea: dto.minArea ?? null,
        rooms: dto.rooms ?? null,
        requiredFeatures: dto.requiredFeatures ?? [],
        notes: dto.notes?.trim() || null,
        status: dto.status ?? 'NEW',
        source: dto.source?.trim() || null,
        assignedToId: dto.assignedToId ?? null,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null,
      },
    });
  }

  async updateLead(userId: string, id: string, dto: UpdateLeadDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.lead(workspaceId, id);
    return this.prisma.propertyLead.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.budgetMin !== undefined ? { budgetMin: big(dto.budgetMin) } : {}),
        ...(dto.budgetMax !== undefined ? { budgetMax: big(dto.budgetMax) } : {}),
        ...(dto.depositMax !== undefined ? { depositMax: big(dto.depositMax) } : {}),
        ...(dto.rentMax !== undefined ? { rentMax: big(dto.rentMax) } : {}),
        ...(dto.neighborhoods !== undefined ? { neighborhoods: dto.neighborhoods } : {}),
        ...(dto.minArea !== undefined ? { minArea: dto.minArea } : {}),
        ...(dto.rooms !== undefined ? { rooms: dto.rooms } : {}),
        ...(dto.requiredFeatures !== undefined
          ? { requiredFeatures: dto.requiredFeatures }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.source !== undefined ? { source: dto.source.trim() || null } : {}),
        ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId || null } : {}),
        ...(dto.nextActionAt !== undefined
          ? { nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : null }
          : {}),
      },
    });
  }

  async removeLead(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.lead(workspaceId, id);
    await this.prisma.propertyLead.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Visits
  // -------------------------------------------------------------------------

  async listVisits(userId: string, filters: { status?: string; propertyId?: string; leadId?: string }) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.propertyVisit.findMany({
      where: {
        workspaceId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
        ...(filters.leadId ? { leadId: filters.leadId } : {}),
      },
      include: {
        property: { select: { id: true, title: true, neighborhood: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ scheduledAt: 'desc' }],
      take: 300,
    });
  }

  async createVisit(userId: string, dto: CreateVisitDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.property(workspaceId, dto.propertyId);
    await this.lead(workspaceId, dto.leadId);
    return this.prisma.propertyVisit.create({
      data: {
        workspaceId,
        propertyId: dto.propertyId,
        leadId: dto.leadId,
        scheduledAt: new Date(dto.scheduledAt),
        status: dto.status ?? 'SCHEDULED',
        feedback: dto.feedback?.trim() || null,
        offeredPrice: big(dto.offeredPrice),
        agentId: dto.agentId ?? null,
      },
    });
  }

  async updateVisit(userId: string, id: string, dto: UpdateVisitDto) {
    const workspaceId = await this.workspaceId(userId);
    const visit = await this.prisma.propertyVisit.findFirst({
      where: { id, workspaceId },
    });
    if (!visit) throw new NotFoundException('بازدید پیدا نشد');
    return this.prisma.propertyVisit.update({
      where: { id },
      data: {
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: new Date(dto.scheduledAt) }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome.trim() || null } : {}),
        ...(dto.feedback !== undefined ? { feedback: dto.feedback.trim() || null } : {}),
        ...(dto.offeredPrice !== undefined ? { offeredPrice: big(dto.offeredPrice) } : {}),
        ...(dto.agentId !== undefined ? { agentId: dto.agentId || null } : {}),
      },
    });
  }

  async removeVisit(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const visit = await this.prisma.propertyVisit.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!visit) throw new NotFoundException('بازدید پیدا نشد');
    await this.prisma.propertyVisit.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Contracts + commission
  // -------------------------------------------------------------------------

  async listContracts(userId: string, filters: { status?: string }) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.propertyContract.findMany({
      where: { workspaceId, ...(filters.status ? { status: filters.status } : {}) },
      include: {
        property: { select: { id: true, title: true, neighborhood: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: [{ contractDate: 'desc' }],
      take: 300,
    });
  }

  async createContract(userId: string, dto: CreateContractDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.property(workspaceId, dto.propertyId);
    if (dto.leadId) await this.lead(workspaceId, dto.leadId);
    return this.prisma.propertyContract.create({
      data: {
        workspaceId,
        propertyId: dto.propertyId,
        leadId: dto.leadId ?? null,
        agentId: dto.agentId ?? null,
        kind: dto.kind ?? 'SALE',
        contractDate: dto.contractDate ? new Date(dto.contractDate) : new Date(),
        price: big(dto.price),
        deposit: big(dto.deposit),
        rent: big(dto.rent),
        commissionExpected: dto.commissionExpected ?? 0,
        commissionCollected: dto.commissionCollected ?? 0,
        basis: dto.basis ?? 'AGREED',
        officeShare: dto.officeShare ?? 0,
        agentShare: dto.agentShare ?? 0,
        referrerShare: dto.referrerShare ?? 0,
        referrerName: dto.referrerName?.trim() || null,
        status: dto.status ?? 'DRAFT',
        documentUrl: dto.documentUrl?.trim() || null,
        note: dto.note?.trim() || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async updateContract(userId: string, id: string, dto: UpdateContractDto) {
    const workspaceId = await this.workspaceId(userId);
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id, workspaceId },
    });
    if (!contract) throw new NotFoundException('قرارداد پیدا نشد');
    return this.prisma.propertyContract.update({
      where: { id },
      data: {
        ...(dto.agentId !== undefined ? { agentId: dto.agentId || null } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.contractDate !== undefined
          ? { contractDate: new Date(dto.contractDate) }
          : {}),
        ...(dto.price !== undefined ? { price: big(dto.price) } : {}),
        ...(dto.deposit !== undefined ? { deposit: big(dto.deposit) } : {}),
        ...(dto.rent !== undefined ? { rent: big(dto.rent) } : {}),
        ...(dto.commissionExpected !== undefined
          ? { commissionExpected: dto.commissionExpected }
          : {}),
        ...(dto.commissionCollected !== undefined
          ? { commissionCollected: dto.commissionCollected }
          : {}),
        ...(dto.basis !== undefined ? { basis: dto.basis } : {}),
        ...(dto.officeShare !== undefined ? { officeShare: dto.officeShare } : {}),
        ...(dto.agentShare !== undefined ? { agentShare: dto.agentShare } : {}),
        ...(dto.referrerShare !== undefined ? { referrerShare: dto.referrerShare } : {}),
        ...(dto.referrerName !== undefined
          ? { referrerName: dto.referrerName.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.documentUrl !== undefined
          ? { documentUrl: dto.documentUrl.trim() || null }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
      },
    });
  }

  async removeContract(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const contract = await this.prisma.propertyContract.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!contract) throw new NotFoundException('قرارداد پیدا نشد');
    await this.prisma.propertyContract.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Performance dashboard
  // -------------------------------------------------------------------------

  async reportsOverview(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000);

    const [files, leads, visits, contracts] = await Promise.all([
      this.prisma.propertyFile.findMany({
        where: { workspaceId },
        select: {
          status: true,
          neighborhood: true,
          source: true,
          lastVerifiedAt: true,
        },
      }),
      this.prisma.propertyLead.findMany({
        where: { workspaceId },
        select: { status: true, nextActionAt: true },
      }),
      this.prisma.propertyVisit.findMany({
        where: { workspaceId },
        select: { status: true, scheduledAt: true },
      }),
      this.prisma.propertyContract.findMany({
        where: { workspaceId, status: { not: 'CANCELLED' } },
        select: {
          status: true,
          agentId: true,
          commissionExpected: true,
          commissionCollected: true,
        },
      }),
    ]);

    const activeFiles = files.filter((row) => row.status === 'ACTIVE');
    const staleFiles = activeFiles.filter(
      (row) => !row.lastVerifiedAt || row.lastVerifiedAt < staleBefore,
    );
    const leadsWithoutFollowUp = leads.filter(
      (row) =>
        ['NEW', 'ACTIVE', 'VISIT'].includes(row.status) &&
        (!row.nextActionAt || row.nextActionAt < now),
    );
    const visitsDone = visits.filter((row) => row.status === 'DONE').length;
    const visitsScheduled = visits.filter(
      (row) => row.status === 'SCHEDULED' && row.scheduledAt >= now,
    ).length;
    const signedContracts = contracts.filter((row) =>
      ['SIGNED', 'SETTLED'].includes(row.status),
    );
    const expected = contracts.reduce((sum, row) => sum + num(row.commissionExpected), 0);
    const collected = contracts.reduce((sum, row) => sum + num(row.commissionCollected), 0);

    const byNeighborhood = this.groupCount(
      activeFiles.map((row) => row.neighborhood || 'نامشخص'),
    );
    const bySource = this.groupCount(files.map((row) => row.source || 'AGENT'));
    const byAgentMap = new Map<string, { expected: number; collected: number; contracts: number }>();
    for (const contract of contracts) {
      const key = contract.agentId || 'بدون مشاور';
      const bucket = byAgentMap.get(key) ?? { expected: 0, collected: 0, contracts: 0 };
      bucket.expected += num(contract.commissionExpected);
      bucket.collected += num(contract.commissionCollected);
      bucket.contracts += 1;
      byAgentMap.set(key, bucket);
    }

    return {
      activeFiles: activeFiles.length,
      pendingFiles: files.filter((row) => row.status === 'PENDING').length,
      staleFiles: staleFiles.length,
      leadsWithoutFollowUp: leadsWithoutFollowUp.length,
      visitsScheduled,
      visitsDone,
      signedContracts: signedContracts.length,
      conversion: visitsDone > 0 ? signedContracts.length / visitsDone : 0,
      commissionExpected: expected,
      commissionCollected: collected,
      commissionOutstanding: expected - collected,
      byNeighborhood,
      bySource,
      byAgent: [...byAgentMap.entries()].map(([agentId, value]) => ({
        agentId,
        ...value,
      })),
    };
  }

  private groupCount(values: string[]) {
    const map = new Map<string, number>();
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
    return [...map.entries()].map(([label, count]) => ({ label, count }));
  }
}
