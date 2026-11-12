import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTaxonomyRequestDto } from './dto/create-taxonomy-request.dto';
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
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
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
   * Search the deeper taxonomy levels for the builders' single search box.
   *
   * With `level = ANY` (the default) the walk starts at the most specific level
   * and only falls back when nothing matched: «زیرشاخه» (`TAG`) first, then
   * «زیردسته» (`SUB`). Each hit carries its `level` and — for tags — the parent
   * sub-category name, so the builder can label the pick and store both fields.
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
    const take = Math.min(Math.max(query.limit ?? 20, 1), 50);

    if (!query.level || query.level === 'ANY') {
      const tags = await this.findNodes('TAG', {
        categoryId,
        parentId,
        q,
        take,
      });
      if (tags.length > 0) return this.withParentNames(tags);
      const subs = await this.findNodes('SUB', { categoryId, q, take });
      return subs.map((node) => ({ ...node, parentName: null }));
    }

    const rows = await this.findNodes(query.level, {
      categoryId,
      parentId,
      q,
      take,
    });
    return query.level === 'TAG'
      ? this.withParentNames(rows)
      : rows.map((node) => ({ ...node, parentName: null }));
  }

  private findNodes(
    level: 'SUB' | 'TAG',
    params: {
      categoryId?: string;
      parentId?: string;
      q?: string;
      take: number;
    },
  ) {
    return this.prisma.businessTaxonomyNode.findMany({
      where: {
        level,
        isActive: true,
        // `TAG` nodes are anchored to their `SUB` parent when known, else to
        // their main category; `SUB` nodes to their main category. This keeps
        // the quick-pick list short.
        ...(level === 'TAG'
          ? params.parentId
            ? { parentId: params.parentId }
            : params.categoryId
              ? { categoryId: params.categoryId }
              : {}
          : params.categoryId
            ? { categoryId: params.categoryId }
            : {}),
        // A text query is still honoured even without a parent (the box only
        // sends one once the user has typed something).
        ...(params.q
          ? { name: { contains: params.q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: params.take,
      select: {
        id: true,
        name: true,
        level: true,
        parentId: true,
        categoryId: true,
      },
    });
  }

  /** Adds the parent «زیردسته» name to each tag hit (one extra query). */
  private async withParentNames<
    T extends { parentId: string | null },
  >(rows: T[]): Promise<Array<T & { parentName: string | null }>> {
    const parentIds = [
      ...new Set(rows.map((row) => row.parentId).filter((id): id is string => !!id)),
    ];
    if (parentIds.length === 0) return rows.map((row) => ({ ...row, parentName: null }));
    const parents = await this.prisma.businessTaxonomyNode.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, name: true },
    });
    const byId = new Map(parents.map((parent) => [parent.id, parent.name]));
    return rows.map((row) => ({
      ...row,
      parentName: row.parentId ? (byId.get(row.parentId) ?? null) : null,
    }));
  }

  /**
   * Records a taxonomy term the user searched for and that matched no level at
   * all. The term is forwarded to the admin team (so the taxonomy can grow) and
   * logged; the builder then shows the user «سایر».
   */
  async requestNode(user: AuthUser, dto: CreateTaxonomyRequestDto) {
    const term = dto.q.trim();
    const categoryId = dto.categoryId?.trim() || undefined;
    const category = categoryId
      ? await this.prisma.businessCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true },
        })
      : null;

    await this.notifications.notifyAdmins({
      category: 'TAXONOMY',
      title: 'درخواست زیردسته/زیرشاخه‌ی تازه',
      body: category
        ? `کاربر «${user.email ?? user.id}» عبارت «${term}» را در دسته‌ی «${category.name}» پیدا نکرد.`
        : `کاربر «${user.email ?? user.id}» عبارت «${term}» را در دسته‌بندی‌ها پیدا نکرد.`,
      link: '/admin?section=notifications',
      actorId: user.id,
    });

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'TAXONOMY_NODE_REQUESTED',
      summary: `درخواست زیردسته/زیرشاخه‌ی تازه: ${term}`,
      entityType: 'BUSINESS_TAXONOMY_NODE',
      entityId: category?.id ?? null,
    });

    return { term, categoryId: category?.id ?? null, other: true };
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
