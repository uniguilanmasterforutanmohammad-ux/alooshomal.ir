import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkChargeDto,
  CreateBuildingDto,
  CreateChargeDto,
  CreateExpenseDto,
  CreatePaymentDto,
  CreateTicketDto,
  CreateUnitDto,
  ReviewPaymentDto,
  UpdateBuildingDto,
  UpdateChargeDto,
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

  private async building(workspaceId: string, buildingId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, workspaceId },
    });
    if (!building) throw new NotFoundException('ساختمان پیدا نشد');
    return building;
  }

  private async unit(workspaceId: string, unitId: string) {
    const unit = await this.prisma.buildingUnit.findFirst({
      where: { id: unitId, building: { workspaceId } },
      include: { building: { select: { id: true, workspaceId: true } } },
    });
    if (!unit) throw new NotFoundException('واحد پیدا نشد');
    return unit;
  }

  // -------------------------------------------------------------------------
  //  Buildings + units
  // -------------------------------------------------------------------------

  async listBuildings(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const rows = await this.prisma.building.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { units: true, tickets: true } } },
    });
    return rows;
  }

  async getBuilding(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const building = await this.prisma.building.findFirst({
      where: { id, workspaceId },
      include: {
        units: { orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }] },
      },
    });
    if (!building) throw new NotFoundException('ساختمان پیدا نشد');
    return building;
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, id);
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, id);
    await this.prisma.building.delete({ where: { id } });
    return { id };
  }

  async createUnit(userId: string, buildingId: string, dto: CreateUnitDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, buildingId);
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
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.buildingCharge.findMany({
      where: {
        building: { workspaceId },
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, dto.buildingId);
    const unit = await this.unit(workspaceId, dto.unitId);
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, dto.buildingId);
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
    const workspaceId = await this.workspaceId(userId);
    const charge = await this.prisma.buildingCharge.findFirst({
      where: { id, building: { workspaceId } },
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
    const workspaceId = await this.workspaceId(userId);
    const charge = await this.prisma.buildingCharge.findFirst({
      where: { id, building: { workspaceId } },
      select: { id: true },
    });
    if (!charge) throw new NotFoundException('شارژ پیدا نشد');
    await this.prisma.buildingCharge.delete({ where: { id } });
    return { id };
  }

  async chargesSummary(userId: string, buildingId: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, buildingId);
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
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.buildingPayment.findMany({
      where: {
        building: { workspaceId },
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, dto.buildingId);
    const unit = await this.unit(workspaceId, dto.unitId);
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
    const workspaceId = await this.workspaceId(userId);
    const payment = await this.prisma.buildingPayment.findFirst({
      where: { id, building: { workspaceId } },
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
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.buildingExpense.findMany({
      where: { building: { workspaceId }, ...(buildingId ? { buildingId } : {}) },
      include: { building: { select: { id: true, name: true } } },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async createExpense(userId: string, dto: CreateExpenseDto) {
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, dto.buildingId);
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
    const workspaceId = await this.workspaceId(userId);
    const expense = await this.prisma.buildingExpense.findFirst({
      where: { id, building: { workspaceId } },
      select: { id: true },
    });
    if (!expense) throw new NotFoundException('هزینه پیدا نشد');
    await this.prisma.buildingExpense.delete({ where: { id } });
    return { id };
  }

  async financeOverview(userId: string, buildingId: string) {
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, buildingId);
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
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.buildingMaintenanceTicket.findMany({
      where: {
        building: { workspaceId },
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
    const workspaceId = await this.workspaceId(userId);
    await this.building(workspaceId, dto.buildingId);
    if (dto.unitId) {
      const unit = await this.unit(workspaceId, dto.unitId);
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
    const workspaceId = await this.workspaceId(userId);
    const ticket = await this.prisma.buildingMaintenanceTicket.findFirst({
      where: { id, building: { workspaceId } },
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
    const workspaceId = await this.workspaceId(userId);
    const ticket = await this.prisma.buildingMaintenanceTicket.findFirst({
      where: { id, building: { workspaceId } },
      select: { id: true },
    });
    if (!ticket) throw new NotFoundException('درخواست پیدا نشد');
    await this.prisma.buildingMaintenanceTicket.delete({ where: { id } });
    return { id };
  }
}
