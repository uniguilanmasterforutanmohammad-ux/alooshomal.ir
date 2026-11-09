import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  BoostTargetKind,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
  RequestPaymentTarget,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { jalaliParts } from '../common/jalali';
import { PrismaService } from '../prisma/prisma.service';
import { resolveBoostTargetLabels } from '../boosts/boosts-targets';
import {
  DEFAULT_FINANCE_PAGE_SIZE,
  FINANCE_SOURCE_LABELS,
  FINANCE_SOURCE_TYPES,
} from './finance.constants';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateManualInvoiceDto } from './dto/create-manual-invoice.dto';
import { ListFinanceDto } from './dto/list-finance.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

/** Input for the one central sale-recording entry point. */
export interface RecordSaleInput {
  /** Stable source id from `FINANCE_SOURCE_TYPES`. */
  sourceType: string;
  /** Id of the originating payment/request/post (null for a manual sale). */
  sourceId?: string | null;
  title: string;
  description?: string | null;
  /** Pre-tax amount in Toman. */
  amount: number;
  taxAmount?: number | null;
  issuedAt?: Date | null;
  paidAt?: Date | null;
  userId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  metadata?: Prisma.InputJsonValue;
  createdById?: string | null;
}

interface DateRange {
  gte?: Date;
  lte?: Date;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Central finance/tax archive.
 *
 * Every settled sale is stored as an `Invoice` row. `sourceType + sourceId` is
 * unique, so payment callbacks can retry safely. A future paid feature only has
 * to call `recordSale()` once its payment is PAID; it then automatically gets
 * an archived, numbered invoice and appears in the tax reports.
 */
@Injectable()
export class FinanceService implements OnModuleInit {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /**
   * On boot, archive any paid transaction that predates this module (or whose
   * payment callback failed to write its invoice). Idempotent and best-effort;
   * the admin panel also exposes the same operation as a button.
   */
  onModuleInit(): void {
    // Fire-and-forget so a large backlog never delays API startup.
    void this.backfill()
      .then((result) => {
        if (result.created > 0) {
          this.logger.log(
            `finance backfill created ${result.created} missing invoice(s)`,
          );
        }
      })
      .catch((error) => {
        this.logger.warn(
          `finance backfill on boot failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  // ------------------------------------------------------------------
  //  Sales / invoices
  // ------------------------------------------------------------------

  /**
   * Idempotently archive one sale. Returns `null` for a zero/free amount (no
   * money changed hands, so there is nothing to invoice).
   */
  async recordSale(input: RecordSaleInput) {
    const amount = Math.floor(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const sourceId = input.sourceId ?? null;
    if (sourceId) {
      const existing = await this.prisma.invoice.findUnique({
        where: {
          sourceType_sourceId: {
            sourceType: input.sourceType,
            sourceId,
          },
        },
      });
      if (existing) return existing;
    }

    const customer = await this.resolveCustomer(input);
    const taxAmount = Math.max(0, Math.floor(input.taxAmount ?? 0));
    const subtotal = amount;
    const total = subtotal + taxAmount;

    try {
      const invoice = await this.prisma.$transaction(async (tx) => {
        const number = await this.nextInvoiceNumber(tx);
        return tx.invoice.create({
          data: {
            number,
            sourceType: input.sourceType,
            sourceId,
            title: input.title,
            description: input.description ?? null,
            customerUserId: input.userId ?? null,
            customerName: customer.name,
            customerPhone: customer.phone,
            customerEmail: customer.email,
            subtotal,
            taxAmount,
            total,
            issuedAt: input.issuedAt ?? new Date(),
            paidAt: input.paidAt ?? null,
            metadata: input.metadata,
            createdById: input.createdById ?? null,
            items: {
              create: [
                {
                  description: input.title,
                  quantity: 1,
                  unitPrice: subtotal,
                  total: subtotal,
                },
              ],
            },
          },
        });
      });

      await this.activity.log({
        actor: input.createdById ? { id: input.createdById } : null,
        action: 'INVOICE_ISSUED',
        summary: `صدور فاکتور ${invoice.number} به مبلغ ${total.toLocaleString('fa-IR')} تومان`,
        entityType: 'INVOICE',
        entityId: invoice.id,
      });
      return invoice;
    } catch (error) {
      // A concurrent callback may have created the same source invoice first.
      if (
        sourceId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.prisma.invoice.findUnique({
          where: {
            sourceType_sourceId: {
              sourceType: input.sourceType,
              sourceId,
            },
          },
        });
      }
      throw error;
    }
  }

  private async resolveCustomer(input: RecordSaleInput) {
    if (
      input.customerName ||
      input.customerPhone ||
      input.customerEmail ||
      !input.userId
    ) {
      return {
        name: input.customerName ?? null,
        phone: input.customerPhone ?? null,
        email: input.customerEmail ?? null,
      };
    }
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { fullName: true, phone: true, email: true },
    });
    return {
      name: user?.fullName ?? null,
      phone: user?.phone ?? null,
      email: user?.email ?? null,
    };
  }

  /** Atomic per-Jalali-year invoice number (`INV-1405-000042`). */
  private async nextInvoiceNumber(tx: Prisma.TransactionClient) {
    const year = jalaliParts(new Date()).year;
    const key = `invoice:${year}`;
    const counter = await tx.financeCounter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });
    return `INV-${year}-${String(counter.value).padStart(6, '0')}`;
  }

  async listInvoices(query: ListFinanceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_FINANCE_PAGE_SIZE;
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.sourceType) where.sourceType = query.sourceType;
    const range = this.dateRange(query.from, query.to);
    if (range) where.issuedAt = range;
    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, meta: this.pagination(page, limit, total) };
  }

  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        customer: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException('فاکتور یافت نشد');
    return invoice;
  }

  async createManualInvoice(adminId: string, dto: CreateManualInvoiceDto) {
    const invoice = await this.recordSale({
      sourceType: FINANCE_SOURCE_TYPES.MANUAL,
      sourceId: null,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      amount: dto.amount,
      taxAmount: dto.taxAmount ?? 0,
      customerName: dto.customerName?.trim() || null,
      customerPhone: dto.customerPhone?.trim() || null,
      customerEmail: dto.customerEmail?.trim() || null,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
      createdById: adminId,
      metadata: { manual: true },
    });
    if (!invoice) {
      throw new BadRequestException('مبلغ فاکتور باید بزرگ‌تر از صفر باشد');
    }
    return invoice;
  }

  async voidInvoice(id: string, reason?: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('فاکتور یافت نشد');
    if (invoice.status === InvoiceStatus.VOID) return invoice;
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
        voidReason: reason?.trim() || null,
      },
    });
    await this.activity.log({
      action: 'INVOICE_VOIDED',
      summary: `ابطال فاکتور ${updated.number}${reason ? ` — ${reason}` : ''}`,
      entityType: 'INVOICE',
      entityId: updated.id,
    });
    return updated;
  }

  /** Void the invoice of one source, if it exists (e.g. a rejected feed tag). */
  async voidBySource(sourceType: string, sourceId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { sourceType_sourceId: { sourceType, sourceId } },
    });
    if (!invoice) return null;
    return this.voidInvoice(invoice.id, reason);
  }

  // ------------------------------------------------------------------
  //  Expenses
  // ------------------------------------------------------------------

  async listExpenses(query: ListFinanceDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? DEFAULT_FINANCE_PAGE_SIZE;
    const where: Prisma.ExpenseWhereInput = {};
    if (query.category) where.category = query.category;
    const range = this.dateRange(query.from, query.to);
    if (range) where.spentAt = range;
    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { spentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, meta: this.pagination(page, limit, total) };
  }

  async createExpense(adminId: string, dto: CreateExpenseDto) {
    const spentAt = dto.spentAt ? new Date(dto.spentAt) : new Date();
    if (Number.isNaN(spentAt.getTime())) {
      throw new BadRequestException('تاریخ هزینه معتبر نیست');
    }
    const expense = await this.prisma.expense.create({
      data: {
        title: dto.title.trim(),
        category: dto.category.trim(),
        amount: dto.amount,
        taxAmount: dto.taxAmount ?? 0,
        spentAt,
        vendor: dto.vendor?.trim() || null,
        reference: dto.reference?.trim() || null,
        description: dto.description?.trim() || null,
        attachmentUrl: dto.attachmentUrl?.trim() || null,
        createdById: adminId,
      },
    });
    await this.activity.log({
      actor: { id: adminId },
      action: 'EXPENSE_CREATED',
      summary: `ثبت هزینه «${expense.title}» به مبلغ ${expense.amount.toLocaleString('fa-IR')} تومان`,
      entityType: 'EXPENSE',
      entityId: expense.id,
    });
    return expense;
  }

  async updateExpense(adminId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('هزینه یافت نشد');
    if (existing.voidedAt) {
      throw new BadRequestException('هزینه‌ی ابطال‌شده قابل ویرایش نیست');
    }
    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.category !== undefined) data.category = dto.category.trim();
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.taxAmount !== undefined) data.taxAmount = dto.taxAmount;
    if (dto.spentAt !== undefined) {
      const spentAt = new Date(dto.spentAt);
      if (Number.isNaN(spentAt.getTime())) {
        throw new BadRequestException('تاریخ هزینه معتبر نیست');
      }
      data.spentAt = spentAt;
    }
    if (dto.vendor !== undefined) data.vendor = dto.vendor?.trim() || null;
    if (dto.reference !== undefined) data.reference = dto.reference?.trim() || null;
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.attachmentUrl !== undefined) {
      data.attachmentUrl = dto.attachmentUrl?.trim() || null;
    }
    const updated = await this.prisma.expense.update({ where: { id }, data });
    await this.activity.log({
      actor: { id: adminId },
      action: 'EXPENSE_UPDATED',
      summary: `ویرایش هزینه «${updated.title}»`,
      entityType: 'EXPENSE',
      entityId: updated.id,
    });
    return updated;
  }

  /** Soft-void an expense so the tax archive keeps its history. */
  async voidExpense(adminId: string, id: string, reason?: string) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('هزینه یافت نشد');
    if (existing.voidedAt) return existing;
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { voidedAt: new Date(), voidReason: reason?.trim() || null },
    });
    await this.activity.log({
      actor: { id: adminId },
      action: 'EXPENSE_VOIDED',
      summary: `ابطال هزینه «${updated.title}»`,
      entityType: 'EXPENSE',
      entityId: updated.id,
    });
    return updated;
  }

  // ------------------------------------------------------------------
  //  Reports
  // ------------------------------------------------------------------

  async summary(from?: string, to?: string) {
    const range = this.dateRange(from, to);
    const [invoices, expenses] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.ISSUED,
          ...(range ? { issuedAt: range } : {}),
        },
        select: {
          total: true,
          subtotal: true,
          taxAmount: true,
          sourceType: true,
          issuedAt: true,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          voidedAt: null,
          ...(range ? { spentAt: range } : {}),
        },
        select: {
          amount: true,
          taxAmount: true,
          category: true,
          spentAt: true,
        },
      }),
    ]);

    const sales = invoices.reduce((sum, row) => sum + row.total, 0);
    const salesSubtotal = invoices.reduce((sum, row) => sum + row.subtotal, 0);
    const salesTax = invoices.reduce((sum, row) => sum + row.taxAmount, 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
    const expenseTax = expenses.reduce((sum, row) => sum + row.taxAmount, 0);

    const monthly = new Map<
      string,
      {
        year: number;
        month: number;
        sales: number;
        expenses: number;
        profit: number;
      }
    >();
    const bucketOf = (date: Date) => {
      const { year, month } = jalaliParts(date);
      const key = `${year}-${month}`;
      let row = monthly.get(key);
      if (!row) {
        row = { year, month, sales: 0, expenses: 0, profit: 0 };
        monthly.set(key, row);
      }
      return row;
    };
    for (const invoice of invoices) {
      bucketOf(invoice.issuedAt).sales += invoice.total;
    }
    for (const expense of expenses) {
      bucketOf(expense.spentAt).expenses += expense.amount;
    }
    const monthlyRows = Array.from(monthly.values())
      .map((row) => ({ ...row, profit: row.sales - row.expenses }))
      .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

    const yearlyMap = new Map<
      number,
      { year: number; sales: number; expenses: number; profit: number }
    >();
    for (const row of monthlyRows) {
      let year = yearlyMap.get(row.year);
      if (!year) {
        year = { year: row.year, sales: 0, expenses: 0, profit: 0 };
        yearlyMap.set(row.year, year);
      }
      year.sales += row.sales;
      year.expenses += row.expenses;
      year.profit += row.profit;
    }
    const yearly = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);

    const bySourceMap = new Map<
      string,
      { sourceType: string; label: string; count: number; total: number }
    >();
    for (const invoice of invoices) {
      const row = bySourceMap.get(invoice.sourceType) ?? {
        sourceType: invoice.sourceType,
        label: FINANCE_SOURCE_LABELS[invoice.sourceType] ?? invoice.sourceType,
        count: 0,
        total: 0,
      };
      row.count += 1;
      row.total += invoice.total;
      bySourceMap.set(invoice.sourceType, row);
    }

    const byExpenseMap = new Map<
      string,
      { category: string; count: number; total: number }
    >();
    for (const expense of expenses) {
      const row = byExpenseMap.get(expense.category) ?? {
        category: expense.category,
        count: 0,
        total: 0,
      };
      row.count += 1;
      row.total += expense.amount;
      byExpenseMap.set(expense.category, row);
    }

    return {
      totals: {
        sales,
        salesSubtotal,
        salesTax,
        expenses: expenseTotal,
        expensesTax: expenseTax,
        netProfit: sales - expenseTotal,
        invoiceCount: invoices.length,
        expenseCount: expenses.length,
      },
      monthly: monthlyRows,
      yearly,
      bySource: Array.from(bySourceMap.values()).sort((a, b) => b.total - a.total),
      byExpenseCategory: Array.from(byExpenseMap.values()).sort(
        (a, b) => b.total - a.total,
      ),
    };
  }

  // ------------------------------------------------------------------
  //  Backfill (existing paid transactions before this module shipped)
  // ------------------------------------------------------------------

  /**
   * Create invoices for every already-PAID transaction that has none yet.
   * Safe to run repeatedly; `recordSale` is idempotent per source.
   */
  async backfill() {
    let created = 0;
    let skipped = 0;
    const ensure = async (input: RecordSaleInput) => {
      if (input.sourceId) {
        const existing = await this.prisma.invoice.findUnique({
          where: {
            sourceType_sourceId: {
              sourceType: input.sourceType,
              sourceId: input.sourceId,
            },
          },
          select: { id: true },
        });
        if (existing) {
          skipped += 1;
          return;
        }
      }
      const invoice = await this.recordSale(input);
      if (invoice) created += 1;
    };

    const [subscriptions, requestPayments, feedTags] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where: { status: PaymentStatus.PAID },
        include: {
          plan: { select: { name: true } },
          user: { select: { fullName: true, email: true, phone: true } },
        },
      }),
      this.prisma.requestPayment.findMany({
        where: { status: PaymentStatus.PAID },
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          boostRequest: true,
          adRequest: true,
        },
      }),
      this.prisma.feedPost.findMany({
        where: { tagPaid: true, tagKind: { not: null } },
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      }),
    ]);

    for (const payment of subscriptions) {
      const paidAt = payment.paidAt ?? payment.verifiedAt ?? payment.createdAt;
      await ensure({
        sourceType: FINANCE_SOURCE_TYPES.SUBSCRIPTION,
        sourceId: payment.id,
        title: `خرید اشتراک «${payment.plan.name}»`,
        amount: payment.amount,
        issuedAt: paidAt,
        paidAt,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerPhone: payment.user?.phone ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: { planId: payment.planId, refId: payment.refId },
      });
    }

    const requestTargets = requestPayments
      .map((payment) => payment.boostRequest ?? payment.adRequest)
      .filter((request): request is NonNullable<typeof request> => Boolean(request));
    const labels = await resolveBoostTargetLabels(
      this.prisma,
      requestTargets.map((request) => ({
        kind: request.kind as BoostTargetKind,
        targetId: request.targetId,
      })),
    );
    for (const payment of requestPayments) {
      const request = payment.boostRequest ?? payment.adRequest;
      if (!request) continue;
      const label = labels.get(request.targetId)?.fullName ?? '—';
      const isBoost = payment.target === RequestPaymentTarget.BOOST;
      const isDirectory = payment.target === RequestPaymentTarget.AD_DIRECTORY;
      const sourceType = isBoost
        ? FINANCE_SOURCE_TYPES.BOOST
        : isDirectory
          ? FINANCE_SOURCE_TYPES.AD_DIRECTORY
          : FINANCE_SOURCE_TYPES.AD_HOME;
      const title = isBoost
        ? `پله (افزایش بازدید) — ${label}`
        : isDirectory
          ? `تبلیغ در دایرکتوری — ${label}`
          : `تبلیغ در صفحه اصلی — ${label}`;
      const paidAt = payment.paidAt ?? payment.verifiedAt ?? payment.createdAt;
      await ensure({
        sourceType,
        sourceId: payment.id,
        title,
        amount: payment.amount,
        issuedAt: paidAt,
        paidAt,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerPhone: payment.user?.phone ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: {
          targetKind: request.kind,
          targetId: request.targetId,
          refId: payment.refId,
        },
      });
    }

    for (const post of feedTags) {
      const decidedAt = post.tagDecidedAt ?? post.createdAt;
      await ensure({
        sourceType: FINANCE_SOURCE_TYPES.FEED_TAG,
        sourceId: `${post.id}:${decidedAt.getTime()}`,
        title: 'تگ کارت/بیولینک روی پست فید',
        amount: post.tagPrice ?? 0,
        issuedAt: decidedAt,
        paidAt: decidedAt,
        userId: post.userId,
        customerName: post.user?.fullName ?? null,
        customerPhone: post.user?.phone ?? null,
        customerEmail: post.user?.email ?? null,
        metadata: { postId: post.id, tagKind: post.tagKind },
      });
    }

    if (created > 0) {
      await this.activity.log({
        action: 'FINANCE_BACKFILLED',
        summary: `همگام‌سازی فاکتورها: ${created} فاکتور جدید، ${skipped} مورد از قبل موجود`,
        entityType: 'INVOICE',
      });
    }
    return { created, skipped };
  }

  // ------------------------------------------------------------------
  //  CSV exports (tax-office hand-off)
  // ------------------------------------------------------------------

  async exportInvoicesCsv(query: ListFinanceDto) {
    const where: Prisma.InvoiceWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.sourceType) where.sourceType = query.sourceType;
    const range = this.dateRange(query.from, query.to);
    if (range) where.issuedAt = range;
    const rows = await this.prisma.invoice.findMany({
      where,
      orderBy: { issuedAt: 'asc' },
    });
    const header = [
      'شماره فاکتور',
      'تاریخ صدور',
      'وضعیت',
      'نوع فروش',
      'عنوان',
      'مشتری',
      'موبایل',
      'ایمیل',
      'مبلغ قبل از مالیات',
      'مالیات',
      'مبلغ کل',
      'واحد',
    ];
    const lines = rows.map((row) =>
      [
        row.number,
        row.issuedAt.toISOString(),
        row.status === InvoiceStatus.VOID ? 'ابطال‌شده' : 'صادرشده',
        FINANCE_SOURCE_LABELS[row.sourceType] ?? row.sourceType,
        row.title,
        row.customerName,
        row.customerPhone,
        row.customerEmail,
        row.subtotal,
        row.taxAmount,
        row.total,
        row.currency,
      ]
        .map(csvCell)
        .join(','),
    );
    return '\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n');
  }

  async exportExpensesCsv(query: ListFinanceDto) {
    const where: Prisma.ExpenseWhereInput = {};
    if (query.category) where.category = query.category;
    const range = this.dateRange(query.from, query.to);
    if (range) where.spentAt = range;
    const rows = await this.prisma.expense.findMany({
      where,
      orderBy: { spentAt: 'asc' },
    });
    const header = [
      'تاریخ',
      'عنوان',
      'دسته',
      'فروشنده',
      'شماره سند',
      'مبلغ',
      'مالیات',
      'وضعیت',
      'توضیحات',
    ];
    const lines = rows.map((row) =>
      [
        row.spentAt.toISOString(),
        row.title,
        row.category,
        row.vendor,
        row.reference,
        row.amount,
        row.taxAmount,
        row.voidedAt ? 'ابطال‌شده' : 'ثبت‌شده',
        row.description,
      ]
        .map(csvCell)
        .join(','),
    );
    return '\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n');
  }

  // ------------------------------------------------------------------
  //  Helpers
  // ------------------------------------------------------------------

  private dateRange(from?: string, to?: string): DateRange | undefined {
    const start = from ? new Date(from) : undefined;
    const end = to ? new Date(to) : undefined;
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(to ?? '')) {
      end.setHours(23, 59, 59, 999);
    }
    if (start && Number.isNaN(start.getTime())) {
      throw new BadRequestException('تاریخ شروع معتبر نیست');
    }
    if (end && Number.isNaN(end.getTime())) {
      throw new BadRequestException('تاریخ پایان معتبر نیست');
    }
    if (!start && !end) return undefined;
    return { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
  }

  private pagination(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }
}
