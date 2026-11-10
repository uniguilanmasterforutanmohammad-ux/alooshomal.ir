import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationType,
  PaymentStatus,
  WalletEntryKind,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { ActivityService } from '../activity/activity.service';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** One debt to record on a wallet (negative = owed, the ledger stores it negative). */
export interface WalletChargeInput {
  userId: string;
  kind: WalletEntryKind;
  /** Toman amount; 0 (or the feature being off) records nothing. */
  amount: number;
  title: string;
  sourceType?: string;
  sourceId?: string;
  /**
   * Optional stable key (e.g. `boost:<requestId>`). A retry of the same paid
   * action is a no-op instead of a second debt.
   */
  idempotencyKey?: string;
}

/**
 * «کیف پول» — a running tab per user.
 *
 * Every billable action (identity inquiry, blue-tick phone match, subscription)
 * is recorded as a *negative* ledger entry, so the user owes the accumulated
 * amount instead of paying at each step. The first charge of a cycle sets a due
 * date (`walletSettlementDays` from settings); when it passes the user is
 * reminded, and the whole balance is settled with a single gateway payment.
 *
 * When the `featureWallet` switch is off every `charge()` becomes a no-op, so
 * the wallet flow stays optional and defeats into the legacy «free» behaviour.
 */
@Injectable()
export class WalletService implements OnModuleInit {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
    private readonly finance: FinanceService,
  ) {}

  /**
   * Wallets created before the national-code columns existed carry `null`, so
   * we stamp them once from the owner's account. Guarded by a marker setting so
   * it only ever runs once (and stays idempotent if it is re-run).
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.backfillNationalCodes();
    } catch {
      // the table may not exist on a first boot; a later boot retries
    }
  }

  private async backfillNationalCodes(): Promise<void> {
    const markerKey = 'walletNationalCodeBackfillV1';
    const marker = await this.prisma.setting.findUnique({
      where: { key: markerKey },
    });
    if (marker) return;

    const users = await this.prisma.user.findMany({
      where: { nationalCode: { not: null } },
      select: { id: true, nationalCode: true },
    });
    for (const user of users) {
      if (!user.nationalCode) continue;
      await this.prisma.$transaction([
        this.prisma.userWallet.updateMany({
          where: { userId: user.id, nationalCode: null },
          data: { nationalCode: user.nationalCode },
        }),
        this.prisma.walletEntry.updateMany({
          where: {
            nationalCode: null,
            wallet: { userId: user.id },
          },
          data: { nationalCode: user.nationalCode },
        }),
        this.prisma.walletPayment.updateMany({
          where: { userId: user.id, nationalCode: null },
          data: { nationalCode: user.nationalCode },
        }),
        this.prisma.invoice.updateMany({
          where: { customerUserId: user.id, customerNationalCode: null },
          data: { customerNationalCode: user.nationalCode },
        }),
      ]);
    }

    await this.prisma.setting.upsert({
      where: { key: markerKey },
      create: { key: markerKey, value: new Date().toISOString() },
      update: {},
    });
  }

  /** The owner's national code, used to stamp every ledger/payment row. */
  private async nationalCodeOf(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { nationalCode: true },
    });
    return user?.nationalCode ?? null;
  }

  private appUrl(): string {
    return (
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  private gatewayAvailable(): boolean {
    return this.payping.configured || this.simulator.isEnabled;
  }

  // -------------------------------------------------------------------------
  //  Charges (the user's running tab)
  // -------------------------------------------------------------------------

  /**
   * Append a debt to the user's tab. Returns the amount charged (0 when the
   * wallet feature is off or the price is zero, so callers can stay agnostic).
   */
  async charge(input: WalletChargeInput): Promise<number> {
    const amount = Math.floor(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (!(await this.settings.isFeatureEnabled('featureWallet'))) return 0;
    const days = await this.settings.getWalletSettlementDays();
    const nationalCode = await this.nationalCodeOf(input.userId);

    let charged = false;
    try {
      await this.prisma.$transaction(async (tx) => {
        if (input.idempotencyKey) {
          const existing = await tx.walletEntry.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            select: { id: true },
          });
          if (existing) return;
        }
        const wallet = await tx.userWallet.upsert({
          where: { userId: input.userId },
          create: { userId: input.userId, nationalCode },
          update: nationalCode ? { nationalCode } : {},
        });
        // A settled wallet starts a fresh cycle: reset the due date (and let a
        // new reminder fire once it passes).
        const startsCycle = wallet.balance >= 0;
        await tx.walletEntry.create({
          data: {
            walletId: wallet.id,
            kind: input.kind,
            nationalCode,
            idempotencyKey: input.idempotencyKey ?? null,
            amount: -amount,
            title: input.title,
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
          },
        });
        await tx.userWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: amount },
            ...(startsCycle
              ? { dueAt: new Date(Date.now() + days * DAY_MS), reminderSentAt: null }
              : {}),
          },
        });
        charged = true;
      });
    } catch (error) {
      // A concurrent retry won the unique-key race: the debt already exists.
      if ((error as { code?: string }).code === 'P2002') return 0;
      throw error;
    }
    return charged ? amount : 0;
  }

  /** Current balance (negative = debt). */
  async balanceOf(userId: string): Promise<number> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return wallet?.balance ?? 0;
  }

  /**
   * Throws while the user still owes money. Content creation and the final
   * application of paid requests call this so a negative tab can never be
   * carried forward silently. When the wallet feature is off it is a no-op.
   */
  async assertSettled(
    userId: string,
    message = 'برای ادامه، ابتدا بدهی کیف پول خود را تسویه کنید.',
  ): Promise<void> {
    if (!(await this.settings.isFeatureEnabled('featureWallet'))) return;
    const balance = await this.balanceOf(userId);
    if (balance < 0) {
      throw new ForbiddenException({
        code: 'WALLET_DEBT',
        message: `${message} (بدهی فعلی: ${Math.abs(balance).toLocaleString('fa-IR')} تومان)`,
      });
    }
  }

  /** The current user's tab: balance, due date and the full ledger. */
  async getMine(userId: string) {
    const settlementDays = await this.settings.getWalletSettlementDays();
    const wallet = await this.prisma.userWallet.findUnique({
      where: { userId },
    });
    const nationalCode =
      wallet?.nationalCode ?? (await this.nationalCodeOf(userId));
    if (!wallet) {
      return {
        nationalCode,
        balance: 0,
        dueAt: null,
        overdue: false,
        settlementDays,
        entries: [],
        payments: [],
      };
    }
    const now = new Date();
    const overdue = Boolean(wallet.balance < 0 && wallet.dueAt && wallet.dueAt <= now);
    if (overdue && !wallet.reminderSentAt) {
      await this.sendDueReminder(wallet.id);
    }
    const [entries, payments] = await Promise.all([
      this.prisma.walletEntry.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.walletPayment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);
    return {
      nationalCode,
      balance: wallet.balance,
      dueAt: wallet.dueAt,
      overdue,
      settlementDays,
      entries,
      payments,
    };
  }

  /** Notify the user (once) that the wallet due date has passed. */
  private async sendDueReminder(walletId: string): Promise<void> {
    const claimed = await this.prisma.userWallet.updateMany({
      where: { id: walletId, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count === 0) return;
    const wallet = await this.prisma.userWallet.findUnique({
      where: { id: walletId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!wallet) return;
    await this.notifications.notify({
      userId: wallet.userId,
      type: NotificationType.WARNING,
      title: 'سررسید کیف پول',
      body: `مهلت تسویه بدهی ${Math.abs(wallet.balance).toLocaleString('fa-IR')} تومانی کیف پول شما رسیده است؛ از بخش کیف پول یک‌جا پرداخت کنید.`,
      link: '/dashboard/wallet',
    });
    await this.notifications.notifyAdmins({
      category: 'SYSTEM',
      title: 'سررسید کیف پول کاربر',
      body: `${wallet.user?.fullName ?? 'کاربر'} بدهی سررسیدشده‌ی ${Math.abs(wallet.balance).toLocaleString('fa-IR')} تومانی دارد.`,
      type: NotificationType.WARNING,
      link: '/admin?section=wallets',
      actorId: wallet.userId,
    });
  }

  // -------------------------------------------------------------------------
  //  Settlement (one payment for the whole balance)
  // -------------------------------------------------------------------------

  /** Open the single gateway payment that clears the whole outstanding balance. */
  async checkout(userId: string) {
    await this.settings.assertFeatureEnabled('featureWallet');
    const wallet = await this.prisma.userWallet.findUnique({ where: { userId } });
    const balance = wallet?.balance ?? 0;
    if (balance >= 0) {
      throw new BadRequestException('بدهی فعالی برای پرداخت وجود ندارد.');
    }
    if (!this.gatewayAvailable()) {
      throw new ServiceUnavailableException(
        'درگاه پرداخت در حال حاضر فعال نیست؛ لطفاً بعداً تلاش کنید.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, email: true, fullName: true, nationalCode: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const amount = -balance;
    const clientRefId = randomBytes(16).toString('hex');
    // One live attempt at a time; a retry supersedes the previous open order.
    await this.prisma.walletPayment.updateMany({
      where: { userId, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.CANCELED,
        failureReason: 'پرداخت جدید جایگزین شد',
      },
    });
    const payment = await this.prisma.walletPayment.create({
      data: {
        userId,
        amount,
        clientRefId,
        nationalCode: user.nationalCode ?? null,
      },
    });

    const returnUrl = `${this.appUrl()}/api/wallet/payments/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount,
            returnUrl,
            clientRefId,
            description: 'تسویه کیف پول — شمالی‌کارت',
          })
        : ((await this.payping.createPayment({
            amount,
            returnUrl,
            payerIdentity: user.phone ?? user.email ?? undefined,
            payerName: user.fullName ?? undefined,
            description: 'تسویه کیف پول — شمالی‌کارت',
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      await this.prisma.walletPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason:
            error instanceof Error
              ? error.message.slice(0, 300)
              : 'ساخت پرداخت ناموفق بود',
        },
      });
      throw error;
    }
    if (!result?.paymentCode || !result?.url) {
      await this.prisma.walletPayment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: 'پاسخ نامعتبر از درگاه',
        },
      });
      throw new BadGatewayException('ساخت پرداخت در درگاه ناموفق بود');
    }
    const updated = await this.prisma.walletPayment.update({
      where: { id: payment.id },
      data: { paymentCode: result.paymentCode, gatewayUrl: result.url },
    });
    return {
      paymentId: updated.id,
      amount: updated.amount,
      paymentCode: updated.paymentCode,
      url: updated.gatewayUrl,
    };
  }

  /**
   * Handle the gateway's browser redirect. Always returns a redirect target so
   * the user lands on a friendly page even when verification fails.
   */
  async handleCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
  }) {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const refId = params.refId?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;

    const payment = paymentCode
      ? await this.prisma.walletPayment.findUnique({ where: { paymentCode } })
      : clientRefId
        ? await this.prisma.walletPayment.findUnique({ where: { clientRefId } })
        : null;

    if (!payment) {
      return this.result('failed', 'پرداخت موردنظر پیدا نشد.');
    }
    if (payment.status === PaymentStatus.PAID) {
      return this.result('success', 'این پرداخت قبلاً تأیید شده است.');
    }
    if (payment.status === PaymentStatus.CANCELED) {
      return this.result('failed', 'این پرداخت لغو شده است.');
    }
    if (!refId || !payment.paymentCode) {
      await this.markFailed(payment.id, 'اطلاعات بازگشتی درگاه ناقص است');
      return this.result(
        'failed',
        'اطلاعات بازگشتی درگاه ناقص بود؛ در صورت کسر وجه با پشتیبانی تماس بگیرید.',
      );
    }

    type VerifyResult = {
      amount?: number;
      clientRefId?: string;
      paymentRefId?: number;
      payedDate?: string;
    };
    let verified: VerifyResult | null = null;
    try {
      verified = this.simulator.handles(payment.paymentCode)
        ? this.simulator.verifyPayment({
            paymentCode: payment.paymentCode,
            amount: payment.amount,
            clientRefId: payment.clientRefId,
          })
        : ((await this.payping.verifyPayment({
            paymentRefId: Number(refId),
            paymentCode: payment.paymentCode,
            amount: payment.amount,
          })) as VerifyResult);
    } catch (error) {
      const current = await this.prisma.walletPayment.findUnique({
        where: { id: payment.id },
      });
      if (current?.status === PaymentStatus.PAID) {
        return this.result('success', 'پرداخت شما تأیید شد.');
      }
      const upstreamStatus = (error as { paypingStatus?: number }).paypingStatus;
      const status =
        upstreamStatus ??
        (error instanceof HttpException ? error.getStatus() : 500);
      const message =
        error instanceof Error ? error.message : 'تأیید پرداخت ناموفق بود';
      if (status === 409) {
        // PayPing code 110: already verified (e.g. duplicated callback).
        await this.applyPayment(payment.id, refId, null);
        return this.result('success', 'پرداخت شما تأیید شد.');
      }
      if (status >= 500) {
        return this.result(
          'pending',
          'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد صفحه را دوباره باز کنید.',
        );
      }
      await this.markFailed(payment.id, message);
      return this.result('failed', message);
    }

    if (
      typeof verified?.amount === 'number' &&
      verified.amount !== payment.amount
    ) {
      await this.markFailed(
        payment.id,
        `مبلغ پرداخت‌شده (${verified.amount}) با مبلغ سفارش (${payment.amount}) مطابقت ندارد`,
      );
      return this.result(
        'failed',
        'مبلغ پرداخت‌شده با مبلغ بدهی مطابقت ندارد؛ با پشتیبانی تماس بگیرید.',
      );
    }
    if (verified?.clientRefId && verified.clientRefId !== payment.clientRefId) {
      await this.markFailed(payment.id, 'شناسه پرداخت با سفارش مطابقت ندارد');
      return this.result('failed', 'شناسه پرداخت با سفارش مطابقت ندارد.');
    }

    await this.applyPayment(payment.id, refId, verified);
    return this.result('success', 'بدهی کیف پول شما تسویه شد.');
  }

  private result(status: 'success' | 'pending' | 'failed', message: string) {
    return {
      status,
      message,
      redirectUrl: `${this.appUrl()}/dashboard/wallet?payment=${status}`,
    };
  }

  private async markFailed(id: string, reason: string): Promise<void> {
    await this.prisma.walletPayment.updateMany({
      where: { id, status: { not: PaymentStatus.PAID } },
      data: { status: PaymentStatus.FAILED, failureReason: reason.slice(0, 300) },
    });
  }

  /**
   * Credit the paid amount back onto the wallet and clear the cycle when the
   * balance reaches zero. Safe to call twice: a PAID payment is returned as-is.
   */
  private async applyPayment(
    paymentId: string,
    refId: string,
    verified: { payedDate?: string } | null,
  ): Promise<void> {
    const payment = await this.prisma.walletPayment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { fullName: true, email: true, nationalCode: true } },
      },
    });
    if (!payment || payment.status === PaymentStatus.PAID) return;
    const nationalCode =
      payment.nationalCode ?? payment.user?.nationalCode ?? null;

    const now = new Date();
    const paidAt = verified?.payedDate ? new Date(verified.payedDate) : now;
    const paidAtSafe = Number.isNaN(paidAt.getTime()) ? now : paidAt;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, nationalCode },
        update: nationalCode ? { nationalCode } : {},
      });
      const newBalance = wallet.balance + payment.amount;
      await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          kind: WalletEntryKind.PAYMENT,
          nationalCode,
          amount: payment.amount,
          title: 'تسویه کیف پول',
          sourceType: 'WALLET_PAYMENT',
          sourceId: payment.id,
        },
      });
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ...(newBalance >= 0 ? { dueAt: null, reminderSentAt: null } : {}),
        },
      });
      await tx.walletPayment.update({
        where: { id: payment.id },
        data: {
          nationalCode,
          status: PaymentStatus.PAID,
          refId,
          paidAt: paidAtSafe,
          verifiedAt: now,
          failureReason: null,
        },
      });
      await tx.walletPayment.updateMany({
        where: {
          userId: payment.userId,
          status: PaymentStatus.PENDING,
          id: { not: payment.id },
        },
        data: {
          status: PaymentStatus.CANCELED,
          failureReason: 'پرداخت دیگری تأیید شد',
        },
      });
    });

    await this.notifications.notify({
      userId: payment.userId,
      type: NotificationType.SUCCESS,
      title: 'بدهی کیف پول تسویه شد',
      body: `پرداخت ${payment.amount.toLocaleString('fa-IR')} تومانی انجام شد و حساب کیف پول شما تسویه شد.`,
      link: '/dashboard/wallet',
    });
    await this.activity.log({
      action: 'WALLET_PAID',
      summary: `تسویه کیف پول به مبلغ ${payment.amount.toLocaleString('fa-IR')} تومان`,
      entityType: 'WALLET',
      entityId: payment.id,
    });
    try {
      await this.finance.recordSale({
        sourceType: FINANCE_SOURCE_TYPES.WALLET,
        sourceId: payment.id,
        title: 'تسویه کیف پول',
        amount: payment.amount,
        paidAt: paidAtSafe,
        userId: payment.userId,
        customerName: payment.user?.fullName ?? null,
        customerEmail: payment.user?.email ?? null,
        metadata: { refId },
      });
    } catch (error) {
      this.logger.warn(
        `invoice creation failed for wallet payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // -------------------------------------------------------------------------
  //  Admin
  // -------------------------------------------------------------------------

  /** Every wallet with an open balance or a pending due date. */
  async listAdmin() {
    const wallets = await this.prisma.userWallet.findMany({
      where: { OR: [{ balance: { not: 0 } }, { dueAt: { not: null } }] },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            nationalCode: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    const now = Date.now();
    // Opportunistic sweep: opening the panel also fires any pending reminders,
    // so an overdue wallet is never left un-notified between user visits.
    await Promise.all(
      wallets
        .filter(
          (wallet) =>
            wallet.balance < 0 &&
            wallet.dueAt &&
            wallet.dueAt.getTime() <= now &&
            !wallet.reminderSentAt,
        )
        .map((wallet) => this.sendDueReminder(wallet.id)),
    );
    return {
      settlementDays: await this.settings.getWalletSettlementDays(),
      totalDebt: wallets.reduce(
        (sum, wallet) => sum + (wallet.balance < 0 ? -wallet.balance : 0),
        0,
      ),
      wallets: wallets.map((wallet) => ({
        ...wallet,
        nationalCode: wallet.nationalCode ?? wallet.user?.nationalCode ?? null,
        overdue: Boolean(
          wallet.balance < 0 && wallet.dueAt && wallet.dueAt.getTime() <= now,
        ),
      })),
    };
  }

  /**
   * The whole money trail for one national code: wallet balance, every ledger
   * change, every gateway payment and every invoice. This is the lookup the
   * admin panel uses to tie the wallet (and its history) to the person.
   */
  async historyByNationalCode(nationalCode: string) {
    const code = nationalCode.trim();
    if (!code) throw new BadRequestException('کد ملی را وارد کنید.');

    const [wallets, entries, payments, invoices] = await Promise.all([
      this.prisma.userWallet.findMany({
        where: { nationalCode: code },
        include: {
          user: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      }),
      this.prisma.walletEntry.findMany({
        where: { nationalCode: code },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.walletPayment.findMany({
        where: { nationalCode: code },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.invoice.findMany({
        where: { customerNationalCode: code },
        orderBy: { issuedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      nationalCode: code,
      balance: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
      wallets,
      entries,
      payments,
      invoices,
    };
  }

  /** Admin correction: positive adds debt, negative credits the user. */
  async adjust(adminId: string, userId: string, amount: number, title?: string) {
    const value = Math.floor(amount);
    if (!Number.isFinite(value) || value === 0) {
      throw new BadRequestException('مبلغ تنظیم باید مخالف صفر باشد.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, nationalCode: true },
    });
    if (!user) throw new NotFoundException('کاربر یافت نشد');
    const days = await this.settings.getWalletSettlementDays();
    const entryAmount = -value;
    const nationalCode = user.nationalCode ?? null;

    await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.userWallet.upsert({
        where: { userId },
        create: { userId, nationalCode },
        update: nationalCode ? { nationalCode } : {},
      });
      const newBalance = wallet.balance + entryAmount;
      await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          kind: WalletEntryKind.ADJUSTMENT,
          nationalCode,
          amount: entryAmount,
          title:
            title?.trim() ||
            (value > 0 ? 'افزایش بدهی توسط مدیر' : 'بستانکاری توسط مدیر'),
          sourceType: 'ADMIN',
          sourceId: adminId,
        },
      });
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          ...(wallet.balance >= 0 && entryAmount < 0
            ? {
                dueAt: new Date(Date.now() + days * DAY_MS),
                reminderSentAt: null,
              }
            : {}),
          ...(newBalance >= 0 ? { dueAt: null, reminderSentAt: null } : {}),
        },
      });
    });
    await this.activity.log({
      actor: { id: adminId },
      action: 'WALLET_ADJUSTED',
      summary: `تنظیم کیف پول «${user.fullName ?? userId}» به مبلغ ${value.toLocaleString('fa-IR')} تومان`,
      entityType: 'WALLET',
      entityId: userId,
    });
    await this.notifications.notify({
      userId,
      type: NotificationType.INFO,
      title: 'تغییر در کیف پول',
      body: `مدیر مبلغ ${Math.abs(value).toLocaleString('fa-IR')} تومان را ${value > 0 ? 'به بدهی شما افزود' : 'از بدهی شما کسر کرد'}.`,
      link: '/dashboard/wallet',
    });
    return this.getMine(userId);
  }
}
