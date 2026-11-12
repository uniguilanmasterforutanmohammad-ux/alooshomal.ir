import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { SearchTaxonomyNodeDto } from './dto/search-taxonomy-node.dto';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  private invalidateFacets(): void {
    this.facetsCache.invalidate();
  }

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

  /**
   * Search the deeper taxonomy levels («زیردسته» / «زیرشاخه») for the builders'
   * type-ahead pickers. `SUB` nodes hang off a main category; `TAG` nodes hang
   * off a `SUB` node, identified either by `parentId` or by the pair
   * (`categoryId`, `parentName`) when editing a record that only stored names.
   */
  async searchNodes(query: SearchTaxonomyNodeDto) {
    const categoryId = query.categoryId?.trim() || undefined;
    const q = query.q?.trim();
    let parentId = query.parentId?.trim() || undefined;
    // The edit forms only hold the parent's *name*, so resolve the `SUB` node
    // id from the (category, name) pair before filtering its tags.
    if (!parentId && query.level === 'TAG' && categoryId && query.parentName) {
      const parent = await this.prisma.businessTaxonomyNode.findFirst({
        where: { level: 'SUB', categoryId, name: query.parentName.trim() },
        select: { id: true },
      });
      parentId = parent?.id ?? '__missing__';
    }
    return this.prisma.businessTaxonomyNode.findMany({
      where: {
        level: query.level,
        isActive: true,
        // `TAG` nodes are anchored to their `SUB` parent when known, else to
        // their main category; `SUB` nodes to their main category. This keeps
        // the quick-pick list short.
        ...(query.level === 'TAG'
          ? parentId
            ? { parentId }
            : categoryId
              ? { categoryId }
              : {}
          : categoryId
            ? { categoryId }
            : {}),
        // A text query is still honoured even without a parent (the pickers
        // only send one once the user has typed something).
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(query.limit ?? 20, 1), 50),
      select: { id: true, name: true, parentId: true, categoryId: true },
    });
  }

  async create(kind: 'city' | 'business', dto: CreateTaxonomyDto) {
    const name = dto.name.trim();
    const existing = await this.model(kind).findUnique({ where: { name } });
    if (existing) {
      throw new ConflictException('این مورد قبلاً ثبت شده است');
    }
    const created = await this.model(kind).create({
      data: { name },
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
    this.invalidateFacets();
    return created;
  }

  async update(kind: 'city' | 'business', id: string, dto: UpdateTaxonomyDto) {
    const record = await this.model(kind).findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('مورد یافت نشد');
    }
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    const updated = await this.model(kind).update({
      where: { id },
      data,
      select: { id: true, name: true, isActive: true, createdAt: true },
    });
    this.invalidateFacets();
    return updated;
  }

  async remove(kind: 'city' | 'business', id: string) {
    const record = await this.model(kind).findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('مورد یافت نشد');
    }
    await this.model(kind).delete({ where: { id } });
    this.invalidateFacets();
    return { deleted: true };
  }
}
