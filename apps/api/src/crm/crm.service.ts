import { Injectable, NotFoundException } from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CrmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  async list(userId: string, q?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.crmCustomer.findMany({
      where: {
        workspaceId,
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { bookings: true, interactions: true } },
      },
      orderBy: [{ lastInteractionAt: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async find(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const customer = await this.prisma.crmCustomer.findFirst({
      where: { id, workspaceId },
      include: {
        interactions: { orderBy: { occurredAt: 'desc' }, take: 100 },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { property: { select: { id: true, title: true } } },
        },
      },
    });
    if (!customer) throw new NotFoundException('مشتری پیدا نشد');
    return customer;
  }

  async create(userId: string, dto: CreateCustomerDto) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.crmCustomer.create({
      data: {
        workspaceId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        tags: dto.tags ?? [],
        source: dto.source ?? 'MANUAL',
        lastInteractionAt: new Date(),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCustomerDto) {
    await this.assertOwned(userId, id);
    return this.prisma.crmCustomer.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        notes: dto.notes,
        tags: dto.tags,
        source: dto.source,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.crmCustomer.delete({ where: { id } });
    return { id };
  }

  async addInteraction(
    userId: string,
    customerId: string,
    dto: CreateInteractionDto,
  ) {
    const workspaceId = await this.workspaceId(userId);
    await this.assertOwned(userId, customerId);
    return this.prisma.$transaction(async (tx) => {
      const interaction = await tx.crmInteraction.create({
        data: {
          workspaceId,
          customerId,
          kind: dto.kind ?? 'NOTE',
          note: dto.note,
        },
      });
      await tx.crmCustomer.update({
        where: { id: customerId },
        data: { lastInteractionAt: new Date() },
      });
      return interaction;
    });
  }

  private async assertOwned(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const customer = await this.prisma.crmCustomer.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('مشتری پیدا نشد');
    return customer;
  }
}
