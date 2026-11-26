import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.userAddress.count({ where: { userId } });
    // The first saved address is always the default; an explicit request to
    // make it default clears the previous one.
    const makeDefault = count === 0 || dto.isDefault === true;
    if (makeDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.userAddress.create({
      data: {
        userId,
        title: dto.title?.trim() || 'آدرس من',
        receiverName: dto.receiverName.trim(),
        phone: dto.phone.trim(),
        province: dto.province?.trim() || null,
        city: dto.city?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address.trim(),
        postalCode: dto.postalCode?.trim() || null,
        isDefault: makeDefault,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('آدرس یافت نشد.');

    if (dto.isDefault === true) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.userAddress.update({
      where: { id },
      data: {
        ...(dto.title !== undefined
          ? { title: dto.title.trim() || 'آدرس من' }
          : {}),
        ...(dto.receiverName !== undefined
          ? { receiverName: dto.receiverName.trim() }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() } : {}),
        ...(dto.province !== undefined
          ? { province: dto.province.trim() || null }
          : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.neighborhood !== undefined
          ? { neighborhood: dto.neighborhood.trim() || null }
          : {}),
        ...(dto.address !== undefined
          ? { address: dto.address.trim() }
          : {}),
        ...(dto.postalCode !== undefined
          ? { postalCode: dto.postalCode.trim() || null }
          : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.userAddress.findFirst({
      where: { id, userId },
      select: { id: true, isDefault: true },
    });
    if (!existing) throw new NotFoundException('آدرس یافت نشد.');
    await this.prisma.userAddress.delete({ where: { id } });
    // Promote another address to default so the book never loses its default.
    if (existing.isDefault) {
      const next = await this.prisma.userAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) {
        await this.prisma.userAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { ok: true };
  }
}
