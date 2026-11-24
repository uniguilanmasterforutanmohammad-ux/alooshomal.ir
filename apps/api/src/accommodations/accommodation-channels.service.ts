import { Injectable, NotFoundException } from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { assertPublicHttpUrl } from '../common/outbound-url';
import { PrismaService } from '../prisma/prisma.service';
import { AccommodationsService } from './accommodations.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class AccommodationChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly accommodations: AccommodationsService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  async list(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.accommodationChannel.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { bookings: true } } },
    });
  }

  async create(userId: string, dto: CreateChannelDto) {
    const workspaceId = await this.workspaceId(userId);
    if (dto.icalUrl) await assertPublicHttpUrl(dto.icalUrl);
    return this.prisma.accommodationChannel.create({
      data: {
        workspaceId,
        name: dto.name,
        kind: dto.kind ?? 'OTA',
        url: dto.url,
        icalUrl: dto.icalUrl,
        accountRef: dto.accountRef,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateChannelDto) {
    await this.assertOwned(userId, id);
    if (dto.icalUrl) await assertPublicHttpUrl(dto.icalUrl);
    return this.prisma.accommodationChannel.update({
      where: { id },
      data: {
        name: dto.name,
        kind: dto.kind,
        url: dto.url,
        icalUrl: dto.icalUrl,
        accountRef: dto.accountRef,
        notes: dto.notes,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.accommodationChannel.delete({ where: { id } });
    return { id };
  }

  async sync(userId: string, id: string, propertyId?: string) {
    await this.assertOwned(userId, id);
    return this.accommodations.syncChannel(userId, id, propertyId);
  }

  private async assertOwned(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const channel = await this.prisma.accommodationChannel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!channel) throw new NotFoundException('کانال رزرو پیدا نشد');
    return channel;
  }
}
