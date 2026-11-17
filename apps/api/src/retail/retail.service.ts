import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  CreateProductDto,
  RetailProductStatus,
} from './dto/create-product.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class RetailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  private async uniqueSlug(base: string): Promise<string> {
    const cleaned =
      base
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'product';
    let candidate = cleaned;
    for (let index = 2; index < 1000; index += 1) {
      const exists = await this.prisma.retailProduct.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${cleaned}-${index}`;
    }
    return `${cleaned}-${Date.now()}`;
  }

  private publishedAt(status: string, current: Date | null): Date | null {
    if (status !== 'PUBLISHED') return current;
    return current ?? new Date();
  }

  // -------------------------------------------------------------------------
  //  Products (owner)
  // -------------------------------------------------------------------------

  async listProducts(userId: string, q?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.retailProduct.findMany({
      where: {
        workspaceId,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { sku: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 300,
    });
  }

  async createProduct(userId: string, dto: CreateProductDto) {
    const workspaceId = await this.workspaceId(userId);
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const status: RetailProductStatus = dto.status ?? 'DRAFT';
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.retailProduct.create({
        data: {
          workspaceId,
          slug,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          sku: dto.sku,
          price: dto.price ?? 0,
          compareAtPrice: dto.compareAtPrice,
          stock: dto.stock ?? 0,
          lowStockThreshold: dto.lowStockThreshold ?? 0,
          unit: dto.unit ?? 'عدد',
          imageUrl: dto.imageUrl,
          gallery: dto.gallery ?? [],
          status,
          publishedAt: this.publishedAt(status, null),
        },
      });
      if (product.stock > 0) {
        await tx.retailStockMovement.create({
          data: {
            workspaceId,
            productId: product.id,
            kind: 'IN',
            quantity: product.stock,
            note: 'موجودی اولیه',
          },
        });
      }
      return product;
    });
  }

  async updateProduct(userId: string, id: string, dto: UpdateProductDto) {
    const workspaceId = await this.workspaceId(userId);
    const product = await this.prisma.retailProduct.findFirst({
      where: { id, workspaceId },
    });
    if (!product) throw new NotFoundException('محصول پیدا نشد');
    const status = dto.status ?? product.status;
    return this.prisma.retailProduct.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.sku !== undefined ? { sku: dto.sku } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.compareAtPrice !== undefined
          ? { compareAtPrice: dto.compareAtPrice }
          : {}),
        ...(dto.lowStockThreshold !== undefined
          ? { lowStockThreshold: dto.lowStockThreshold }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.gallery !== undefined ? { gallery: dto.gallery } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        status,
        publishedAt: this.publishedAt(status, product.publishedAt),
      },
    });
  }

  async removeProduct(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const product = await this.prisma.retailProduct.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('محصول پیدا نشد');
    await this.prisma.retailProduct.delete({ where: { id } });
    return { id };
  }

  // -------------------------------------------------------------------------
  //  Orders (owner)
  // -------------------------------------------------------------------------

  async listOrders(userId: string, status?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.retailOrder.findMany({
      where: {
        workspaceId,
        ...(status ? { status } : {}),
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOrder(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const order = await this.prisma.retailOrder.findFirst({
      where: { id, workspaceId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    return order;
  }

  async updateOrder(userId: string, id: string, dto: UpdateOrderDto) {
    const workspaceId = await this.workspaceId(userId);
    const order = await this.prisma.retailOrder.findFirst({
      where: { id, workspaceId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');

    const cancelling =
      dto.status === 'CANCELLED' && order.status !== 'CANCELLED';
    const restoring =
      order.status === 'CANCELLED' && dto.status !== 'CANCELLED';

    return this.prisma.$transaction(async (tx) => {
      if (cancelling) {
        for (const item of order.items) {
          if (!item.productId) continue;
          await tx.retailProduct.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.retailStockMovement.create({
            data: {
              workspaceId,
              productId: item.productId,
              kind: 'IN',
              quantity: item.quantity,
              note: `بازگشت موجودی سفارش ${order.orderNumber}`,
            },
          });
        }
      }
      if (restoring) {
        for (const item of order.items) {
          if (!item.productId) continue;
          const product = await tx.retailProduct.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (!product || product.stock < item.quantity) {
            throw new ConflictException(
              `موجودی کافی برای بازگرداندن سفارش «${item.title}» نیست`,
            );
          }
          await tx.retailProduct.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
          await tx.retailStockMovement.create({
            data: {
              workspaceId,
              productId: item.productId,
              kind: 'OUT',
              quantity: item.quantity,
              note: `فعال‌سازی مجدد سفارش ${order.orderNumber}`,
            },
          });
        }
      }
      return tx.retailOrder.update({
        where: { id },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.paymentStatus ? { paymentStatus: dto.paymentStatus } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
        },
        include: { items: true },
      });
    });
  }

  // -------------------------------------------------------------------------
  //  Inventory (owner)
  // -------------------------------------------------------------------------

  async inventory(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const [products, movements] = await Promise.all([
      this.prisma.retailProduct.findMany({
        where: { workspaceId },
        orderBy: [{ stock: 'asc' }, { title: 'asc' }],
      }),
      this.prisma.retailStockMovement.findMany({
        where: { workspaceId },
        include: { product: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      products: products.map((product) => ({
        ...product,
        lowStock: product.stock <= product.lowStockThreshold,
      })),
      movements,
      lowStockCount: products.filter(
        (product) => product.stock <= product.lowStockThreshold,
      ).length,
    };
  }

  async addMovement(userId: string, dto: StockMovementDto) {
    const workspaceId = await this.workspaceId(userId);
    const product = await this.prisma.retailProduct.findFirst({
      where: { id: dto.productId, workspaceId },
    });
    if (!product) throw new NotFoundException('محصول پیدا نشد');
    if (dto.kind === 'OUT' && product.stock < dto.quantity) {
      throw new ConflictException('موجودی محصول برای خروج کافی نیست');
    }
    const nextStock =
      dto.kind === 'IN'
        ? product.stock + dto.quantity
        : dto.kind === 'OUT'
          ? product.stock - dto.quantity
          : dto.quantity;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.retailProduct.update({
        where: { id: product.id },
        data: { stock: nextStock },
      });
      await tx.retailStockMovement.create({
        data: {
          workspaceId,
          productId: product.id,
          kind: dto.kind,
          quantity: dto.quantity,
          note: dto.note,
        },
      });
      return updated;
    });
  }

  // -------------------------------------------------------------------------
  //  Public storefront
  // -------------------------------------------------------------------------

  private async resolveShop(slug: string) {
    const workspace = await this.modules.findWorkspaceByPublicSlug(slug);
    if (!workspace || workspace.status !== 'ACTIVE') {
      throw new NotFoundException('فروشگاه پیدا نشد');
    }
    const enabled = await this.modules.isModuleEnabledForWorkspace(
      workspace.id,
      'retailCatalog',
    );
    if (!enabled) throw new NotFoundException('فروشگاه پیدا نشد');
    return workspace;
  }

  async publicShop(slug: string) {
    await this.settings.assertFeatureEnabled('featureRetailCatalog');
    const workspace = await this.resolveShop(slug);
    const [products, card] = await Promise.all([
      this.prisma.retailProduct.findMany({
        where: { workspaceId: workspace.id, status: 'PUBLISHED' },
        orderBy: [{ createdAt: 'desc' }],
        take: 200,
      }),
      this.modules.isModuleEnabledForWorkspace(workspace.id, 'cardToCard').then(
        (enabled) =>
          enabled
            ? this.prisma.cardToCardAccount.findUnique({
                where: { workspaceId: workspace.id },
              })
            : null,
      ),
    ]);
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        publicSlug: workspace.publicSlug,
      },
      products,
      card:
        card && card.isActive
          ? {
              cardNumber: card.cardNumber,
              holderName: card.holderName,
              bankName: card.bankName,
              instructions: card.instructions,
            }
          : null,
    };
  }

  async publicOrder(slug: string, dto: CreateOrderDto) {
    await this.settings.assertFeatureEnabled('featureRetailCatalog');
    const workspace = await this.resolveShop(slug);
    const ordersEnabled = await this.modules.isModuleEnabledForWorkspace(
      workspace.id,
      'retailOrders',
    );
    if (!ordersEnabled) {
      throw new BadRequestException('ثبت سفارش برای این فروشگاه فعال نیست');
    }

    const ids = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.retailProduct.findMany({
      where: { id: { in: ids }, workspaceId: workspace.id, status: 'PUBLISHED' },
    });
    const byId = new Map(products.map((product) => [product.id, product]));
    if (products.length !== ids.length) {
      throw new BadRequestException('یکی از محصولات انتخاب‌شده معتبر نیست');
    }
    for (const item of dto.items) {
      const product = byId.get(item.productId)!;
      if (product.stock < item.quantity) {
        throw new ConflictException(
          `موجودی «${product.title}» کافی نیست (${product.stock} ${product.unit})`,
        );
      }
    }

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const items = dto.items.map((item) => {
      const product = byId.get(item.productId)!;
      return {
        productId: product.id,
        title: product.title,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
      };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const customer = await this.upsertCustomer(
      workspace.id,
      dto.customerName,
      dto.customerPhone,
    );

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.retailOrder.create({
        data: {
          workspaceId: workspace.id,
          orderNumber,
          customerId: customer?.id,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          customerAddress: dto.customerAddress,
          note: dto.note,
          paymentMethod: dto.paymentMethod ?? 'CARD_TO_CARD',
          totalAmount,
          items: { create: items },
        },
        include: { items: true },
      });
      for (const item of items) {
        await tx.retailProduct.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.retailStockMovement.create({
          data: {
            workspaceId: workspace.id,
            productId: item.productId,
            kind: 'OUT',
            quantity: item.quantity,
            note: `سفارش ${orderNumber}`,
          },
        });
      }
      if (customer) {
        await tx.crmInteraction.create({
          data: {
            workspaceId: workspace.id,
            customerId: customer.id,
            kind: 'ORDER',
            note: `سفارش ${orderNumber} به مبلغ ${totalAmount.toLocaleString('fa-IR')} تومان`,
          },
        });
      }
      return order;
    });
  }

  private async upsertCustomer(
    workspaceId: string,
    fullName: string,
    phone: string,
  ) {
    try {
      return await this.prisma.crmCustomer.upsert({
        where: { workspaceId_phone: { workspaceId, phone } },
        update: { lastInteractionAt: new Date() },
        create: {
          workspaceId,
          fullName,
          phone,
          source: 'PUBLIC_ORDER',
          lastInteractionAt: new Date(),
        },
      });
    } catch {
      return null;
    }
  }
}
