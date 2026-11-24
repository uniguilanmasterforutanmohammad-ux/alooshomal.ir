import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkChargeDto,
  CreateBudgetDto,
  CreateBuildingDto,
  CreateBuildingMemberDto,
  CreateChargeDto,
  CreateContractorDto,
  CreateExpenseDto,
  CreateMeetingDto,
  CreatePaymentDto,
  CreateTicketDto,
  CreateUnitDto,
  ResidentPaymentDto,
  ReviewPaymentDto,
  UpdateBudgetDto,
  UpdateBuildingDto,
  UpdateChargeDto,
  UpdateContractorDto,
  UpdateMeetingDto,
  UpdateTicketDto,
  UpdateUnitDto,
} from './dto/buildings.dto';

@Injectable()
export class BuildingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
  ) {}

  private workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  /** Buildings the user owns (via the workspace) or was granted access to. */
  private async accessibleBuildingIds(userId: string): Promise<string[]> {
    const workspaceId = await this.workspaceId(userId);
    const rows = await this.prisma.building.findMany({
      where: { OR: [{ workspaceId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async buildingForUser(userId: string, buildingId: string) {
    const workspaceId = await this.workspaceId(userId);
    const building = await this.prisma.building.findFirst({
      where: {
        id: buildingId,
        OR: [{ workspaceId }, { members: { some: { userId } } }],
      },
    });
    if (!building) throw new NotFoundException('ساختمان پیدا نشد');
    return building;
  }

  /** Owner-only guard for destructive/sharing actions. */
  private async ownedBuilding(userId: string, buildingId: string) {
    const workspaceId = await this.workspaceId(userId);
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, workspaceId },
    });
    if (!building) throw new NotFoundException('ساختمان پیدا نشد');
    return building;
  }

  private async unit(userId: string, unitId: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const unit = await this.prisma.buildingUnit.findFirst({
      where: { id: unitId, buildingId: { in: ids } },
      include: { building: { select: { id: true, workspaceId: true } } },
    });
    if (!unit) throw new NotFoundException('واحد پیدا نشد');
    return unit;
  }

  // -------------------------------------------------------------------------
  //  Buildings + units
  // -------------------------------------------------------------------------

  async listBuildings(userId: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const rows = await this.prisma.building.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { units: true, tickets: true } } },
    });
    return rows;
  }

  async getBuilding(userId: string, id: string) {
    await this.buildingForUser(userId, id);
    return this.prisma.building.findUnique({
      where: { id },
      include: {
        units: { orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }] },
      },
    });
  }

  async createBuilding(userId: string, dto: CreateBuildingDto) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.building.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        managerName: dto.managerName?.trim() || null,
        managerPhone: dto.managerPhone?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateBuilding(userId: string, id: string, dto: UpdateBuildingDto) {
    await this.buildingForUser(userId, id);
    return this.prisma.building.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.managerName !== undefined
          ? { managerName: dto.managerName.trim() || null }
          : {}),
        ...(dto.managerPhone !== undefined
          ? { managerPhone: dto.managerPhone.trim() || null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
      },
    });
  }

  async removeBuilding(userId: string, id: string) {
    await this.ownedBuilding(userId, id);
    await this.prisma.building.delete({ where: { id } });
    return { id };
  }

  async createUnit(userId: string, buildingId: string, dto: CreateUnitDto) {
    await this.buildingForUser(userId, buildingId);
    const exists = await this.prisma.buildingUnit.findUnique({
      where: { buildingId_unitNumber: { buildingId, unitNumber: dto.unitNumber.trim() } },
      select: { id: true },
    });
    if (exists) throw new ConflictException('این شماره واحد قبلاً ثبت شده است');
    return this.prisma.buildingUnit.create({
      data: {
        buildingId,
        unitNumber: dto.unitNumber.trim(),
        floor: dto.floor?.trim() || null,
        area: dto.area ?? null,
        ownerName: dto.ownerName?.trim() || null,
        ownerPhone: dto.ownerPhone?.trim() || null,
        residentName: dto.residentName?.trim() || null,
        residentPhone: dto.residentPhone?.trim() || null,
        occupancyStart: dto.occupancyStart ? new Date(dto.occupancyStart) : null,
        occupancyEnd: dto.occupancyEnd ? new Date(dto.occupancyEnd) : null,
        status: dto.status ?? 'OCCUPIED',
      },
    });
  }

  async updateUnit(userId: string, unitId: string, dto: UpdateUnitDto) {
    await this.unit(userId, unitId);
    return this.prisma.buildingUnit.update({
      where: { id: unitId },
      data: {
        ...(dto.unitNumber !== undefined ? { unitNumber: dto.unitNumber.trim() } : {}),
        ...(dto.floor !== undefined ? { floor: dto.floor.trim() || null } : {}),
        ...(dto.area !== undefined ? { area: dto.area } : {}),
        ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName.trim() || null } : {}),
        ...(dto.ownerPhone !== undefined ? { ownerPhone: dto.ownerPhone.trim() || null } : {}),
        ...(dto.residentName !== undefined
          ? { residentName: dto.residentName.trim() || null }
          : {}),
        ...(dto.residentPhone !== undefined
          ? { residentPhone: dto.residentPhone.trim() || null }
          : {}),
        ...(dto.occupancyStart !== undefined
          ? { occupancyStart: dto.occupancyStart ? new Date(dto.occupancyStart) : null }
          : {}),
        ...(dto.occupancyEnd !== undefined
          ? { occupancyEnd: dto.occupancyEnd ? new Date(dto.occupancyEnd) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async removeUnit(userId: string, unitId: string) {
    await this.unit(userId, unitId);
    await this.prisma.buildingUnit.delete({ where: { id: unitId } });
    return { id: unitId };
  }

  // -------------------------------------------------------------------------
  //  Charges
  // -------------------------------------------------------------------------

  async listCharges(userId: string, buildingId?: string, status?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    return this.prisma.buildingCharge.findMany({
      where: {
        buildingId: { in: ids },
        ...(buildingId ? { buildingId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        unit: { select: { id: true, unitNumber: true, floor: true, residentName: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 400,
    });
  }

  async createCharge(userId: string, dto: CreateChargeDto) {
    await this.buildingForUser(userId, dto.buildingId);
    const unit = await this.unit(userId, dto.unitId);
    if (unit.buildingId !== dto.buildingId) {
      throw new BadRequestException('واحد به این ساختمان تعلق ندارد');
    }
    return this.prisma.buildingCharge.create({
      data: {
        buildingId: dto.buildingId,
        unitId: dto.unitId,
        title: dto.title.trim(),
        period: dto.period?.trim() || null,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        note: dto.note?.trim() || null,
      },
    });
  }

  /** Issue the same charge for every unit of a building (fixed or per-sqm). */
  async issueBulkCharge(userId: string, dto: BulkChargeDto) {
    await this.buildingForUser(userId, dto.buildingId);
    if (dto.amountPerUnit === undefined && dto.amountPerSqm === undefined) {
      throw new BadRequestException('یکی از مبلغ ثابت یا مبلغ به ازای متر مربع لازم است');
    }
    const units = await this.prisma.buildingUnit.findMany({
      where: { buildingId: dto.buildingId, status: 'OCCUPIED' },
      select: { id: true, area: true },
    });
    if (units.length === 0) {
      throw new BadRequestException('این ساختمان واحد فعالی ندارد');
    }
    const period = dto.period?.trim() || null;
    const existing = await this.prisma.buildingCharge.findMany({
      where: {
        buildingId: dto.buildingId,
        title: dto.title.trim(),
        ...(period ? { period } : {}),
      },
      select: { unitId: true },
    });
    const skip = new Set(existing.map((row) => row.unitId));
    const rows = units
      .filter((unit) => !skip.has(unit.id))
      .map((unit) => ({
        buildingId: dto.buildingId,
        unitId: unit.id,
        title: dto.title.trim(),
        period,
        amount:
          dto.amountPerUnit ??
          (dto.amountPerSqm ?? 0) * (unit.area ?? 0),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      }))
      .filter((row) => row.amount > 0);
    if (rows.length === 0) {
      return { created: 0, skipped: units.length };
    }
    await this.prisma.buildingCharge.createMany({ data: rows });
    return { created: rows.length, skipped: units.length - rows.length };
  }

  async updateCharge(userId: string, id: string, dto: UpdateChargeDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const charge = await this.prisma.buildingCharge.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!charge) throw new NotFoundException('شارژ پیدا نشد');
    return this.prisma.buildingCharge.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.dueDate !== undefined
          ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }
          : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async removeCharge(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const charge = await this.prisma.buildingCharge.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!charge) throw new NotFoundException('شارژ پیدا نشد');
    await this.prisma.buildingCharge.delete({ where: { id } });
    return { id };
  }

  async chargesSummary(userId: string, buildingId: string) {
    await this.buildingForUser(userId, buildingId);
    const charges = await this.prisma.buildingCharge.findMany({
      where: { buildingId, status: { not: 'CANCELLED' } },
      select: { amount: true, paidAmount: true, status: true },
    });
    const total = charges.reduce((sum, row) => sum + row.amount, 0);
    const paid = charges.reduce((sum, row) => sum + row.paidAmount, 0);
    return {
      total,
      paid,
      outstanding: total - paid,
      unpaidCount: charges.filter((row) => row.status === 'UNPAID').length,
      partialCount: charges.filter((row) => row.status === 'PARTIAL').length,
    };
  }

  // -------------------------------------------------------------------------
  //  Payments (receipt is not settlement)
  // -------------------------------------------------------------------------

  async listPayments(userId: string, buildingId?: string, status?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    return this.prisma.buildingPayment.findMany({
      where: {
        buildingId: { in: ids },
        ...(buildingId ? { buildingId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        unit: { select: { id: true, unitNumber: true } },
        charge: { select: { id: true, title: true, amount: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    await this.buildingForUser(userId, dto.buildingId);
    const unit = await this.unit(userId, dto.unitId);
    if (unit.buildingId !== dto.buildingId) {
      throw new BadRequestException('واحد به این ساختمان تعلق ندارد');
    }
    if (dto.chargeId) {
      const charge = await this.prisma.buildingCharge.findFirst({
        where: { id: dto.chargeId, buildingId: dto.buildingId },
        select: { id: true },
      });
      if (!charge) throw new BadRequestException('شارژ مرتبط پیدا نشد');
    }
    const trackingNumber = dto.trackingNumber?.trim() || null;
    if (trackingNumber) {
      const duplicate = await this.prisma.buildingPayment.findFirst({
        where: {
          buildingId: dto.buildingId,
          trackingNumber,
          status: { not: 'REJECTED' },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('این شماره پیگیری قبلاً ثبت شده است');
      }
    }
    return this.prisma.buildingPayment.create({
      data: {
        buildingId: dto.buildingId,
        unitId: dto.unitId,
        chargeId: dto.chargeId ?? null,
        amount: dto.amount,
        method: dto.method ?? 'CARD_TO_CARD',
        trackingNumber,
        receiptUrl: dto.receiptUrl?.trim() || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
      },
    });
  }

  async reviewPayment(userId: string, id: string, dto: ReviewPaymentDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const payment = await this.prisma.buildingPayment.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!payment) throw new NotFoundException('پرداخت پیدا نشد');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('این پرداخت قبلاً بررسی شده است');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.buildingPayment.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNote: dto.reviewNote?.trim() || null,
        },
      });
      if (dto.status === 'APPROVED' && payment.chargeId) {
        const charge = await tx.buildingCharge.findUnique({
          where: { id: payment.chargeId },
          include: { payments: { where: { status: 'APPROVED' } } },
        });
        if (charge && charge.status !== 'CANCELLED') {
          const paid = charge.payments.reduce((sum, row) => sum + row.amount, 0);
          await tx.buildingCharge.update({
            where: { id: charge.id },
            data: {
              paidAmount: paid,
              status: paid >= charge.amount ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
            },
          });
        }
      }
      return updated;
    });
  }

  // -------------------------------------------------------------------------
  //  Expenses + finance overview
  // -------------------------------------------------------------------------

  async listExpenses(userId: string, buildingId?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    return this.prisma.buildingExpense.findMany({
      where: { buildingId: { in: ids }, ...(buildingId ? { buildingId } : {}) },
      include: { building: { select: { id: true, name: true } } },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async createExpense(userId: string, dto: CreateExpenseDto) {
    await this.buildingForUser(userId, dto.buildingId);
    return this.prisma.buildingExpense.create({
      data: {
        buildingId: dto.buildingId,
        title: dto.title.trim(),
        category: dto.category?.trim() || null,
        amount: dto.amount,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        vendor: dto.vendor?.trim() || null,
        receiptUrl: dto.receiptUrl?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });
  }

  async removeExpense(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const expense = await this.prisma.buildingExpense.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!expense) throw new NotFoundException('هزینه پیدا نشد');
    await this.prisma.buildingExpense.delete({ where: { id } });
    return { id };
  }

  async financeOverview(userId: string, buildingId: string) {
    await this.buildingForUser(userId, buildingId);
    const [charges, expenses] = await Promise.all([
      this.prisma.buildingCharge.findMany({
        where: { buildingId, status: { not: 'CANCELLED' } },
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.buildingExpense.findMany({
        where: { buildingId },
        select: { amount: true, category: true },
      }),
    ]);
    const charged = charges.reduce((sum, row) => sum + row.amount, 0);
    const collected = charges.reduce((sum, row) => sum + row.paidAmount, 0);
    const spent = expenses.reduce((sum, row) => sum + row.amount, 0);
    const byCategory = new Map<string, number>();
    for (const expense of expenses) {
      const key = expense.category || 'سایر';
      byCategory.set(key, (byCategory.get(key) ?? 0) + expense.amount);
    }
    return {
      charged,
      collected,
      outstanding: charged - collected,
      spent,
      balance: collected - spent,
      expensesByCategory: [...byCategory.entries()].map(([category, amount]) => ({
        category,
        amount,
      })),
    };
  }

  // -------------------------------------------------------------------------
  //  Maintenance tickets
  // -------------------------------------------------------------------------

  async listTickets(userId: string, buildingId?: string, status?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    return this.prisma.buildingMaintenanceTicket.findMany({
      where: {
        buildingId: { in: ids },
        ...(buildingId ? { buildingId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        unit: { select: { id: true, unitNumber: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { reportedAt: 'desc' }],
      take: 300,
    });
  }

  async createTicket(userId: string, dto: CreateTicketDto) {
    await this.buildingForUser(userId, dto.buildingId);
    if (dto.unitId) {
      const unit = await this.unit(userId, dto.unitId);
      if (unit.buildingId !== dto.buildingId) {
        throw new BadRequestException('واحد به این ساختمان تعلق ندارد');
      }
    }
    return this.prisma.buildingMaintenanceTicket.create({
      data: {
        buildingId: dto.buildingId,
        unitId: dto.unitId ?? null,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        priority: dto.priority ?? 'NORMAL',
        assignee: dto.assignee?.trim() || null,
        photoUrl: dto.photoUrl?.trim() || null,
      },
    });
  }

  async updateTicket(userId: string, id: string, dto: UpdateTicketDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const ticket = await this.prisma.buildingMaintenanceTicket.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!ticket) throw new NotFoundException('درخواست پیدا نشد');
    return this.prisma.buildingMaintenanceTicket.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assignee !== undefined ? { assignee: dto.assignee.trim() || null } : {}),
        ...(dto.cost !== undefined ? { cost: dto.cost } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.status === 'DONE' ? { resolvedAt: new Date() } : {}),
      },
    });
  }

  async removeTicket(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const ticket = await this.prisma.buildingMaintenanceTicket.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('درخواست پیدا نشد');
    await this.prisma.buildingMaintenanceTicket.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Members / roles
  // -------------------------------------------------------------------------

  async listMembers(userId: string, buildingId: string) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingMember.findMany({
      where: { buildingId },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(userId: string, buildingId: string, dto: CreateBuildingMemberDto) {
    await this.ownedBuilding(userId, buildingId);
    const email = dto.email.trim().toLowerCase();
    const target = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!target) {
      throw new BadRequestException('کاربری با این ایمیل پیدا نشد');
    }
    return this.prisma.buildingMember.upsert({
      where: { buildingId_userId: { buildingId, userId: target.id } },
      update: { role: dto.role ?? 'MANAGER' },
      create: { buildingId, userId: target.id, role: dto.role ?? 'MANAGER' },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
      },
    });
  }

  async removeMember(userId: string, buildingId: string, memberId: string) {
    await this.ownedBuilding(userId, buildingId);
    const member = await this.prisma.buildingMember.findFirst({
      where: { id: memberId, buildingId },
      select: { id: true },
    });
    if (!member) throw new NotFoundException('عضو پیدا نشد');
    await this.prisma.buildingMember.delete({ where: { id: memberId } });
    return { id: memberId };
  }

  // -------------------------------------------------------------------------
  //  Budgets
  // -------------------------------------------------------------------------

  async listBudgets(userId: string, buildingId: string, year?: number) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingBudget.findMany({
      where: { buildingId, ...(year ? { year } : {}) },
      orderBy: [{ year: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createBudget(userId: string, buildingId: string, dto: CreateBudgetDto) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingBudget.create({
      data: {
        buildingId,
        year: dto.year,
        title: dto.title.trim(),
        category: dto.category?.trim() || null,
        amount: BigInt(dto.amount ?? 0),
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateBudget(userId: string, id: string, dto: UpdateBudgetDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingBudget.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!row) throw new NotFoundException('ردیف بودجه پیدا نشد');
    return this.prisma.buildingBudget.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() || null } : {}),
        ...(dto.amount !== undefined ? { amount: BigInt(dto.amount) } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
  }

  async removeBudget(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingBudget.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('ردیف بودجه پیدا نشد');
    await this.prisma.buildingBudget.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Meetings
  // -------------------------------------------------------------------------

  async listMeetings(userId: string, buildingId: string) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingMeeting.findMany({
      where: { buildingId },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async createMeeting(userId: string, buildingId: string, dto: CreateMeetingDto) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingMeeting.create({
      data: {
        buildingId,
        title: dto.title.trim(),
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location?.trim() || null,
        agenda: dto.agenda?.trim() || null,
      },
    });
  }

  async updateMeeting(userId: string, id: string, dto: UpdateMeetingDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingMeeting.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!row) throw new NotFoundException('جلسه پیدا نشد');
    return this.prisma.buildingMeeting.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: new Date(dto.scheduledAt) }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location.trim() || null } : {}),
        ...(dto.agenda !== undefined ? { agenda: dto.agenda.trim() || null } : {}),
        ...(dto.minutes !== undefined ? { minutes: dto.minutes.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async removeMeeting(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingMeeting.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('جلسه پیدا نشد');
    await this.prisma.buildingMeeting.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Contractors
  // -------------------------------------------------------------------------

  async listContractors(userId: string, buildingId: string) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingContractor.findMany({
      where: { buildingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createContractor(userId: string, buildingId: string, dto: CreateContractorDto) {
    await this.buildingForUser(userId, buildingId);
    return this.prisma.buildingContractor.create({
      data: {
        buildingId,
        name: dto.name.trim(),
        specialty: dto.specialty?.trim() || null,
        phone: dto.phone?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });
  }

  async updateContractor(userId: string, id: string, dto: UpdateContractorDto) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingContractor.findFirst({
      where: { id, buildingId: { in: ids } },
    });
    if (!row) throw new NotFoundException('پیمانکار پیدا نشد');
    return this.prisma.buildingContractor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.specialty !== undefined ? { specialty: dto.specialty.trim() || null } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
      },
    });
  }

  async removeContractor(userId: string, id: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const row = await this.prisma.buildingContractor.findFirst({
      where: { id, buildingId: { in: ids } },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('پیمانکار پیدا نشد');
    await this.prisma.buildingContractor.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Reminders + exports
  // -------------------------------------------------------------------------

  /** Charges due within the next 7 days or already overdue. */
  async reminders(userId: string, buildingId?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.buildingCharge.findMany({
      where: {
        buildingId: buildingId ? buildingId : { in: ids },
        status: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { not: null, lte: soon },
      },
      include: {
        unit: { select: { id: true, unitNumber: true, residentName: true, residentPhone: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 300,
    });
  }

  async exportChargesCsv(userId: string, buildingId?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const rows = await this.prisma.buildingCharge.findMany({
      where: { buildingId: buildingId ? buildingId : { in: ids } },
      include: {
        unit: { select: { unitNumber: true } },
        building: { select: { name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    return this.toCsv(
      ['ساختمان', 'واحد', 'عنوان', 'دوره', 'مبلغ', 'پرداخت‌شده', 'وضعیت', 'سررسید'],
      rows.map((row) => [
        row.building?.name ?? '',
        row.unit?.unitNumber ?? '',
        row.title,
        row.period ?? '',
        String(row.amount),
        String(row.paidAmount),
        row.status,
        row.dueDate ? row.dueDate.toISOString().slice(0, 10) : '',
      ]),
    );
  }

  async exportPaymentsCsv(userId: string, buildingId?: string) {
    const ids = await this.accessibleBuildingIds(userId);
    const rows = await this.prisma.buildingPayment.findMany({
      where: { buildingId: buildingId ? buildingId : { in: ids } },
      include: {
        unit: { select: { unitNumber: true } },
        building: { select: { name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    return this.toCsv(
      ['ساختمان', 'واحد', 'مبلغ', 'روش', 'شماره پیگیری', 'وضعیت', 'تاریخ'],
      rows.map((row) => [
        row.building?.name ?? '',
        row.unit?.unitNumber ?? '',
        String(row.amount),
        row.method,
        row.trackingNumber ?? '',
        row.status,
        row.createdAt.toISOString().slice(0, 10),
      ]),
    );
  }

  private toCsv(headers: string[], rows: string[][]): string {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return '\uFEFF' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  }

  // -------------------------------------------------------------------------
  //  Resident self-service panel (token based)
  // -------------------------------------------------------------------------

  async ensureResidentToken(userId: string, unitId: string) {
    const unit = await this.unit(userId, unitId);
    if (unit.residentToken) return { token: unit.residentToken };
    const token = randomUUID();
    await this.prisma.buildingUnit.update({
      where: { id: unitId },
      data: { residentToken: token },
    });
    return { token };
  }

  async residentPanel(token: string) {
    const unit = await this.prisma.buildingUnit.findUnique({
      where: { residentToken: token },
      include: {
        building: { select: { id: true, name: true, city: true } },
        charges: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        payments: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!unit) throw new NotFoundException('واحد پیدا نشد');
    return {
      building: unit.building,
      unit: {
        id: unit.id,
        unitNumber: unit.unitNumber,
        floor: unit.floor,
        residentName: unit.residentName,
        status: unit.status,
      },
      charges: unit.charges.map((row) => ({
        id: row.id,
        title: row.title,
        period: row.period,
        amount: row.amount,
        paidAmount: row.paidAmount,
        status: row.status,
        dueDate: row.dueDate,
      })),
      payments: unit.payments.map((row) => ({
        id: row.id,
        amount: row.amount,
        status: row.status,
        trackingNumber: row.trackingNumber,
        createdAt: row.createdAt,
      })),
    };
  }

  async createResidentPayment(token: string, dto: ResidentPaymentDto) {
    const unit = await this.prisma.buildingUnit.findUnique({
      where: { residentToken: token },
      select: { id: true, buildingId: true },
    });
    if (!unit) throw new NotFoundException('واحد پیدا نشد');
    if (dto.chargeId) {
      const charge = await this.prisma.buildingCharge.findFirst({
        where: { id: dto.chargeId, unitId: unit.id },
        select: { id: true },
      });
      if (!charge) throw new BadRequestException('شارژ مرتبط پیدا نشد');
    }
    const trackingNumber = dto.trackingNumber?.trim() || null;
    if (trackingNumber) {
      const dup = await this.prisma.buildingPayment.findFirst({
        where: {
          buildingId: unit.buildingId,
          trackingNumber,
          status: { not: 'REJECTED' },
        },
        select: { id: true },
      });
      if (dup) throw new ConflictException('این شماره پیگیری قبلاً ثبت شده است');
    }
    return this.prisma.buildingPayment.create({
      data: {
        buildingId: unit.buildingId,
        unitId: unit.id,
        chargeId: dto.chargeId ?? null,
        amount: dto.amount,
        method: 'CARD_TO_CARD',
        trackingNumber,
        receiptUrl: dto.receiptUrl?.trim() || null,
      },
    });
  }
}
