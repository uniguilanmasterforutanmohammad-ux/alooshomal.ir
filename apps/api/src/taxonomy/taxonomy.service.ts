import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';

type Delegate = {
  findMany: (args?: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
};

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  private model(kind: 'city' | 'business'): Delegate {
    return (
      kind === 'city' ? this.prisma.city : this.prisma.businessCategory
    ) as unknown as Delegate;
  }

  list(kind: 'city' | 'business', onlyActive = false) {
    return this.model(kind).findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
  }

  async create(kind: 'city' | 'business', dto: CreateTaxonomyDto) {
    const name = dto.name.trim();
    const existing = await this.model(kind).findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('این مورد قبلاً ثبت شده است');
    }
    return this.model(kind).create({
      data: { name },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
  }

  async update(kind: 'city' | 'business', id: string, dto: UpdateTaxonomyDto) {
    const record = await this.model(kind).findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('مورد یافت نشد');
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.model(kind).update({
      where: { id },
      data,
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
  }

  async remove(kind: 'city' | 'business', id: string) {
    const record = await this.model(kind).findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('مورد یافت نشد');
    }
    await this.model(kind).delete({ where: { id } });
    return { deleted: true };
  }
}
