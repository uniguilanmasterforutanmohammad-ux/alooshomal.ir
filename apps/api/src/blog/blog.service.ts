import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsStatus, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  ListBlogQueryDto,
  normalizeAparatId,
  slugifyTitle,
  UpdateBlogPostDto,
} from './dto/blog.dto';

const blogInclude = {
  category: { select: { id: true, name: true, slug: true } },
  author: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.BlogPostInclude;

/**
 * «بلاگ» — long-form posts with a directly-embedded Aparat video.
 *
 * Unlike the user-generated feed, the blog is written by the admin team, so
 * there is no moderation queue: drafts live with `isPublished = false` and go
 * live when an admin publishes them. Public reads only ever see published
 * posts.
 */
@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  // ------------------------------------------------------------------
  //  Public
  // ------------------------------------------------------------------

  async publicList(query: ListBlogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 9;
    const where: Prisma.BlogPostWhereInput = {
      isPublished: true,
      status: NewsStatus.APPROVED,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.featured === 'true' ? { isFeatured: true } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { excerpt: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
              { tags: { has: query.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: blogInclude,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async publicBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, isPublished: true, status: NewsStatus.APPROVED },
      include: blogInclude,
    });
    if (!post) throw new NotFoundException('مطلب بلاگ یافت نشد');
    // Best-effort view counter; never block the read on it.
    this.prisma.blogPost
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => undefined);
    return post;
  }

  async publicCategories() {
    return this.prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** The newest published posts for the home-page «بلاگ» strip. */
  async publicLatest(limit = 3) {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true, status: NewsStatus.APPROVED },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 12),
      include: blogInclude,
    });
  }

  // ------------------------------------------------------------------
  //  Admin
  // ------------------------------------------------------------------

  async adminList(query: ListBlogQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.BlogPostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: blogInclude,
      }),
      this.prisma.blogPost.count({ where }),
    ]);
    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async adminById(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: blogInclude,
    });
    if (!post) throw new NotFoundException('مطلب بلاگ یافت نشد');
    return post;
  }

  private async uniqueSlug(desired: string, ignoreId?: string): Promise<string> {
    const base = slugifyTitle(desired);
    let candidate = base;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === ignoreId) return candidate;
      counter += 1;
      candidate = `${base}-${counter}`;
    }
  }

  async create(adminId: string, dto: CreateBlogPostDto) {
    const slug = await this.uniqueSlug(dto.slug?.trim() || dto.title);
    const videoId = normalizeAparatId(dto);
    if ((dto.videoId || dto.videoUrl) && !videoId) {
      throw new BadRequestException('شناسه یا آدرس ویدیوی آپارات نامعتبر است');
    }
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    const published = Boolean(dto.isPublished);
    const post = await this.prisma.blogPost.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt?.trim() || null,
        content: dto.content?.trim() || null,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        categoryId: dto.categoryId ?? null,
        tags: dto.tags ?? [],
        videoProvider: videoId ? (dto.videoProvider ?? 'APARAT') : null,
        videoId,
        videoUrl: dto.videoUrl?.trim() || null,
        isFeatured: Boolean(dto.isFeatured),
        status: published ? NewsStatus.APPROVED : NewsStatus.PENDING,
        isPublished: published,
        publishedAt: published ? new Date() : null,
        createdById: adminId,
        authorId: adminId,
      },
      include: blogInclude,
    });
    await this.activity.log({
      action: 'BLOG_POST_CREATED',
      summary: `ثبت مطلب بلاگ «${post.title}»`,
      entityType: 'BLOG',
      entityId: post.id,
    });
    return post;
  }

  async update(adminId: string, id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('مطلب بلاگ یافت نشد');
    if (dto.categoryId) await this.assertCategory(dto.categoryId);

    const slug =
      dto.slug && dto.slug.trim() && dto.slug.trim() !== existing.slug
        ? await this.uniqueSlug(dto.slug, id)
        : existing.slug;

    const touchesVideo = dto.videoId !== undefined || dto.videoUrl !== undefined;
    const videoId = touchesVideo
      ? normalizeAparatId(dto)
      : existing.videoId;
    if (touchesVideo && (dto.videoId || dto.videoUrl) && !videoId) {
      throw new BadRequestException('شناسه یا آدرس ویدیوی آپارات نامعتبر است');
    }

    const published = dto.isPublished ?? existing.isPublished;
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        title: dto.title?.trim() ?? existing.title,
        slug,
        excerpt: dto.excerpt !== undefined ? dto.excerpt.trim() || null : existing.excerpt,
        content: dto.content !== undefined ? dto.content.trim() || null : existing.content,
        coverImageUrl:
          dto.coverImageUrl !== undefined
            ? dto.coverImageUrl.trim() || null
            : existing.coverImageUrl,
        categoryId: dto.categoryId !== undefined ? dto.categoryId || null : existing.categoryId,
        tags: dto.tags ?? existing.tags,
        videoProvider: videoId ? (dto.videoProvider ?? 'APARAT') : null,
        videoId,
        videoUrl:
          dto.videoUrl !== undefined ? dto.videoUrl.trim() || null : existing.videoUrl,
        isFeatured: dto.isFeatured ?? existing.isFeatured,
        status: dto.status ?? (published ? NewsStatus.APPROVED : existing.status),
        isPublished: published,
        publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
      },
      include: blogInclude,
    });
    await this.activity.log({
      action: 'BLOG_POST_UPDATED',
      summary: `ویرایش مطلب بلاگ «${post.title}»`,
      entityType: 'BLOG',
      entityId: post.id,
    });
    return post;
  }

  async remove(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('مطلب بلاگ یافت نشد');
    await this.prisma.blogPost.delete({ where: { id } });
    await this.activity.log({
      action: 'BLOG_POST_DELETED',
      summary: `حذف مطلب بلاگ «${post.title}»`,
      entityType: 'BLOG',
      entityId: id,
    });
    return { removed: true };
  }

  async setPublished(adminId: string, id: string, published: boolean) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('مطلب بلاگ یافت نشد');
    const updated = await this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: published,
        status: published ? NewsStatus.APPROVED : post.status,
        publishedAt: published ? (post.publishedAt ?? new Date()) : null,
      },
      include: blogInclude,
    });
    if (published && post.authorId && post.authorId !== adminId) {
      await this.notifications.notify({
        userId: post.authorId,
        scope: 'ALL',
        title: 'مطلب بلاگ شما منتشر شد',
        body: `«${post.title}» روی بلاگ منتشر شد.`,
        type: NotificationType.SUCCESS,
        link: `/blog/${updated.slug}`,
        actorId: adminId,
      });
    }
    return updated;
  }

  // ------------------------------------------------------------------
  //  Categories
  // ------------------------------------------------------------------

  async listCategories(onlyActive = true) {
    return this.prisma.blogCategory.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { posts: true } } },
    });
  }

  async createCategory(dto: CreateBlogCategoryDto) {
    const slug = await this.uniqueCategorySlug(dto.slug?.trim() || dto.name);
    return this.prisma.blogCategory.create({
      data: { name: dto.name.trim(), slug },
    });
  }

  async updateCategory(id: string, data: { name?: string; isActive?: boolean }) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('دسته‌بندی یافت نشد');
    return this.prisma.blogCategory.update({
      where: { id },
      data: {
        name: data.name?.trim() || existing.name,
        isActive: data.isActive ?? existing.isActive,
      },
    });
  }

  async removeCategory(id: string) {
    const existing = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('دسته‌بندی یافت نشد');
    await this.prisma.blogCategory.delete({ where: { id } });
    return { removed: true };
  }

  private async uniqueCategorySlug(desired: string): Promise<string> {
    const base = slugifyTitle(desired);
    let candidate = base;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.blogCategory.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      counter += 1;
      candidate = `${base}-${counter}`;
    }
  }

  private async assertCategory(id: string) {
    const category = await this.prisma.blogCategory.findUnique({ where: { id } });
    if (!category) throw new BadRequestException('دسته‌بندی انتخاب‌شده معتبر نیست');
  }
}
