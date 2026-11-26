import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { RateLimitService } from '../common/rate-limit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RetailService } from '../retail/retail.service';
import { SettingsService } from '../settings/settings.service';
import { IgnoreTransactionDto, LinkTransactionDto } from './dto/link-transaction.dto';
import { PairDeviceDto } from './dto/pair-device.dto';
import { ReportSmsTransactionDto } from './dto/report-transaction.dto';
import { SmsDeviceHeartbeatDto } from './dto/heartbeat.dto';
import { SmsDeviceContext, hashDeviceToken } from './sms-device.guard';
import { parseStatementFile } from './statement/statement-parser';

const FEATURE_KEY = 'featureSmsGateway';
const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
const MATCH_WINDOW_DAYS = 7;
const PAIRING_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const TRANSACTION_STATUSES = [
  'UNMATCHED',
  'AMBIGUOUS',
  'AUTO_APPROVED',
  'MANUALLY_LINKED',
  'IGNORED',
] as const;

type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

interface MatchCandidate {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  payerCardLast4: string | null;
  createdAt: Date;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += PAIRING_ALPHABET[bytes[index] % PAIRING_ALPHABET.length];
  }
  return out;
}

function maskCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.length >= 8
    ? `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`
    : digits;
}

@Injectable()
export class SmsGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly retail: RetailService,
    private readonly rateLimit: RateLimitService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  private async assertEnabled(): Promise<void> {
    await this.settings.assertFeatureEnabled(
      FEATURE_KEY,
      'دروازه‌ی پیامک موقتاً توسط مدیر غیرفعال شده است.',
    );
  }

  private async activeAccount(workspaceId: string) {
    const account = await this.prisma.cardToCardAccount.findUnique({
      where: { workspaceId },
    });
    if (!account || !account.isActive) {
      throw new BadRequestException(
        'ابتدا شماره کارت کسب‌وکار را در بخش «کارت به کارت» ثبت و فعال کنید.',
      );
    }
    return account;
  }

  // -------------------------------------------------------------------------
  //  Owner panel
  // -------------------------------------------------------------------------

  async overview(userId: string) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const [workspace, account, devices, transactions, counts] =
      await Promise.all([
        this.prisma.businessWorkspace.findUnique({
          where: { id: workspaceId },
          select: { id: true, name: true },
        }),
        this.prisma.cardToCardAccount.findUnique({ where: { workspaceId } }),
        this.prisma.smsGatewayDevice.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            platform: true,
            appVersion: true,
            status: true,
            lastSeenAt: true,
            lastSmsAt: true,
            pairedAt: true,
          },
        }),
        this.listTransactions(workspaceId, undefined, 20),
        this.prisma.smsGatewayTransaction.groupBy({
          by: ['status'],
          where: { workspaceId },
          _count: { _all: true },
        }),
      ]);

    const stats: Record<string, number> = {};
    for (const row of counts) {
      stats[row.status] = row._count._all;
    }
    return {
      enabled: true,
      workspace,
      account: account
        ? {
            cardNumber: maskCard(account.cardNumber),
            cardLast4: account.cardNumber.slice(-4),
            holderName: account.holderName,
            bankName: account.bankName,
            isActive: account.isActive,
          }
        : null,
      devices,
      transactions,
      stats,
    };
  }

  async createPairingCode(userId: string, request: Request) {
    await this.assertEnabled();
    await this.rateLimit.hit(
      { bucket: 'sms-pairing-code', limit: 10, windowSeconds: 300 },
      userId,
    );
    const workspaceId = await this.workspaceId(userId);
    const account = await this.activeAccount(workspaceId);
    const code = randomCode(8);
    const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.smsGatewayPairingCode.updateMany({
        where: { workspaceId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.smsGatewayPairingCode.create({
        data: {
          workspaceId,
          codeHash: sha256(code),
          expiresAt,
          createdBy: userId,
        },
      }),
    ]);
    const host = request.get('host') ?? 'localhost:4000';
    return {
      code,
      expiresAt,
      cardLast4: account.cardNumber.slice(-4),
      apiBaseUrl: `${request.protocol}://${host}/api`,
    };
  }

  async revokeDevice(userId: string, id: string) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const result = await this.prisma.smsGatewayDevice.updateMany({
      where: { id, workspaceId },
      data: { status: 'REVOKED' },
    });
    if (result.count === 0) throw new NotFoundException('دستگاه پیدا نشد');
    return { revoked: true };
  }

  async listTransactions(
    workspaceId: string,
    status?: string,
    take = 100,
  ) {
    const rows = await this.prisma.smsGatewayTransaction.findMany({
      where: {
        workspaceId,
        ...(status && TRANSACTION_STATUSES.includes(status as TransactionStatus)
          ? { status }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 200),
      include: { device: { select: { id: true, name: true } } },
    });
    const orderIds = rows
      .map((row) => row.orderId)
      .filter((value): value is string => Boolean(value));
    const orders = orderIds.length
      ? await this.prisma.retailOrder.findMany({
          where: { id: { in: orderIds }, workspaceId },
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            totalAmount: true,
            status: true,
            paymentStatus: true,
          },
        })
      : [];
    const byId = new Map(orders.map((order) => [order.id, order]));
    return rows.map((row) => ({
      ...row,
      order: row.orderId ? byId.get(row.orderId) ?? null : null,
    }));
  }

  async ownerTransactions(userId: string, status?: string) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    return this.listTransactions(workspaceId, status);
  }

  async linkTransaction(userId: string, id: string, dto: LinkTransactionDto) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const transaction = await this.prisma.smsGatewayTransaction.findFirst({
      where: { id, workspaceId },
    });
    if (!transaction) throw new NotFoundException('پیامک پیدا نشد');
    if (
      transaction.status === 'AUTO_APPROVED' ||
      transaction.status === 'MANUALLY_LINKED'
    ) {
      throw new BadRequestException('این پیامک قبلاً به یک سفارش وصل شده است');
    }
    const order = await this.prisma.retailOrder.findFirst({
      where: { id: dto.orderId, workspaceId },
      select: { id: true, orderNumber: true },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');

    const result = await this.approveOrder(
      workspaceId,
      order.id,
      transaction,
      userId,
      dto.note,
    );
    const updated = await this.prisma.smsGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'MANUALLY_LINKED',
        orderId: order.id,
        cardPaymentId: result.paymentId,
        note: dto.note?.trim() || 'تطبیق دستی توسط مدیر کسب‌وکار',
      },
    });
    return { transaction: updated, orderNumber: order.orderNumber };
  }

  async transactionCandidates(userId: string, id: string) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const transaction = await this.prisma.smsGatewayTransaction.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        amount: true,
        sourceCard: true,
        sourceCardLast4: true,
      },
    });
    if (!transaction) throw new NotFoundException('پیامک پیدا نشد');
    const orders = await this.prisma.retailOrder.findMany({
      where: {
        workspaceId,
        paymentMethod: 'CARD_TO_CARD',
        status: { in: ['PENDING', 'CONFIRMED'] },
        paymentStatus: { in: ['UNPAID', 'PENDING_REVIEW'] },
        totalAmount: transaction.amount,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        payerCardLast4: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
    });
    const payerLast4 =
      transaction.sourceCardLast4 ?? transaction.sourceCard?.slice(-4) ?? null;
    // Surface orders that declared the same payer card first so manual linking
    // is a one-click choice in the common case.
    const sorted = payerLast4
      ? [...orders].sort((a, b) => {
          const aMatch = a.payerCardLast4 === payerLast4 ? 1 : 0;
          const bMatch = b.payerCardLast4 === payerLast4 ? 1 : 0;
          return bMatch - aMatch;
        })
      : orders;
    return { amount: transaction.amount, payerLast4, orders: sorted };
  }

  async rematchTransaction(userId: string, id: string) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const transaction = await this.prisma.smsGatewayTransaction.findFirst({
      where: { id, workspaceId },
    });
    if (!transaction) throw new NotFoundException('پیامک پیدا نشد');
    if (
      transaction.status === 'AUTO_APPROVED' ||
      transaction.status === 'MANUALLY_LINKED'
    ) {
      throw new BadRequestException('این پیامک قبلاً تأیید شده است');
    }
    const account = await this.activeAccount(workspaceId);
    const evaluation = await this.evaluate(transaction, account);
    const updated = await this.prisma.smsGatewayTransaction.update({
      where: { id: transaction.id },
      data: evaluation.data,
    });
    return { transaction: updated, matched: evaluation.matched };
  }

  async ignoreTransaction(userId: string, id: string, dto: IgnoreTransactionDto) {
    await this.assertEnabled();
    const workspaceId = await this.workspaceId(userId);
    const transaction = await this.prisma.smsGatewayTransaction.findFirst({
      where: { id, workspaceId },
    });
    if (!transaction) throw new NotFoundException('پیامک پیدا نشد');
    if (
      transaction.status === 'AUTO_APPROVED' ||
      transaction.status === 'MANUALLY_LINKED'
    ) {
      throw new BadRequestException('این پیامک قبلاً تأیید شده است');
    }
    return this.prisma.smsGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'IGNORED',
        note: dto.note?.trim() || 'توسط مدیر نادیده گرفته شد',
      },
    });
  }

  // -------------------------------------------------------------------------
  //  Android device
  // -------------------------------------------------------------------------

  async pairDevice(dto: PairDeviceDto, ip: string) {
    await this.assertEnabled();
    await this.rateLimit.hit(
      { bucket: 'sms-pair-device', limit: 20, windowSeconds: 300 },
      ip || 'unknown',
    );
    const code = dto.code.trim().toUpperCase();
    const codeHash = sha256(code);
    await this.rateLimit.hit(
      { bucket: 'sms-pair-device-code', limit: 15, windowSeconds: 300 },
      codeHash,
    );
    const pairing = await this.prisma.smsGatewayPairingCode.findUnique({
      where: { codeHash },
    });
    if (!pairing || pairing.usedAt || pairing.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'کد اتصال نامعتبر یا منقضی شده است؛ از پنل کد تازه بگیرید.',
      );
    }
    const workspace = await this.prisma.businessWorkspace.findUnique({
      where: { id: pairing.workspaceId },
      select: { id: true, name: true, status: true },
    });
    if (!workspace || workspace.status !== 'ACTIVE') {
      throw new ForbiddenException('کسب‌وکار فعال نیست');
    }
    const account = await this.activeAccount(pairing.workspaceId);
    const token = randomBytes(32).toString('base64url');
    const [device] = await this.prisma.$transaction([
      this.prisma.smsGatewayDevice.create({
        data: {
          workspaceId: pairing.workspaceId,
          name: dto.deviceName.trim(),
          tokenHash: hashDeviceToken(token),
          tokenPrefix: token.slice(0, 8),
          platform: dto.platform?.trim() || 'ANDROID',
          appVersion: dto.appVersion?.trim() || null,
        },
        select: { id: true, name: true, pairedAt: true },
      }),
      this.prisma.smsGatewayPairingCode.update({
        where: { id: pairing.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return {
      token,
      device,
      workspace: { id: workspace.id, name: workspace.name },
      card: {
        cardNumber: maskCard(account.cardNumber),
        cardLast4: account.cardNumber.slice(-4),
        holderName: account.holderName,
      },
    };
  }

  async deviceInfo(device: SmsDeviceContext) {
    await this.assertEnabled();
    const [workspace, account, pendingOrders, recent] = await Promise.all([
      this.prisma.businessWorkspace.findUnique({
        where: { id: device.workspaceId },
        select: { id: true, name: true },
      }),
      this.prisma.cardToCardAccount.findUnique({
        where: { workspaceId: device.workspaceId },
      }),
      this.prisma.retailOrder.count({
        where: {
          workspaceId: device.workspaceId,
          paymentMethod: 'CARD_TO_CARD',
          status: { in: ['PENDING', 'CONFIRMED'] },
          paymentStatus: { in: ['UNPAID', 'PENDING_REVIEW'] },
        },
      }),
      this.deviceTransactions(device, 20),
    ]);
    return {
      device: { id: device.id, name: device.name },
      workspace,
      card: account
        ? {
            cardNumber: maskCard(account.cardNumber),
            cardLast4: account.cardNumber.slice(-4),
            holderName: account.holderName,
          }
        : null,
      pendingOrders,
      transactions: recent,
    };
  }

  async deviceTransactions(device: SmsDeviceContext, take = 20) {
    const rows = await this.prisma.smsGatewayTransaction.findMany({
      where: { workspaceId: device.workspaceId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 50),
      select: {
        id: true,
        amount: true,
        status: true,
        bankName: true,
        orderId: true,
        createdAt: true,
        note: true,
      },
    });
    const orderIds = rows
      .map((row) => row.orderId)
      .filter((value): value is string => Boolean(value));
    const orders = orderIds.length
      ? await this.prisma.retailOrder.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, orderNumber: true },
        })
      : [];
    const byId = new Map(orders.map((order) => [order.id, order.orderNumber]));
    return rows.map((row) => ({
      ...row,
      orderNumber: row.orderId ? byId.get(row.orderId) ?? null : null,
    }));
  }

  async heartbeat(device: SmsDeviceContext, dto: SmsDeviceHeartbeatDto) {
    await this.assertEnabled();
    await this.prisma.smsGatewayDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        ...(dto.appVersion?.trim() ? { appVersion: dto.appVersion.trim() } : {}),
      },
    });
    return { ok: true };
  }

  /**
   * Imports a bank statement export (Excel/CSV) uploaded by the owner. Every
   * deposit to the registered card is stored as a gateway transaction and run
   * through the same matching engine as SMS, so end-of-day statements approve
   * pending card-to-card orders without the Android phone being online.
   */
  async importStatement(userId: string, file: Express.Multer.File) {
    await this.assertEnabled();
    if (!file?.buffer?.length) {
      throw new BadRequestException('فایلی ارسال نشده است');
    }
    const workspaceId = await this.workspaceId(userId);
    const account = await this.activeAccount(workspaceId);
    const registered = account.cardNumber.replace(/\D/g, '');
    const parsed = await parseStatementFile(file.buffer);

    const result = {
      totalRows: parsed.rows.length,
      deposits: 0,
      imported: 0,
      duplicates: 0,
      otherCard: 0,
      invalid: 0,
      autoApproved: 0,
      ambiguous: 0,
      unmatched: 0,
      accountNumber: parsed.accountNumber,
      bankName: parsed.bankName,
      errors: [] as string[],
    };

    for (const row of parsed.rows) {
      if (row.type === 'WITHDRAWAL') continue;
      if (!row.destinationCard) {
        result.invalid += 1;
        result.errors.push(
          `ردیف ${row.rowNumber}: شماره کارت مقصد در توضیح تراکنش پیدا نشد.`,
        );
        continue;
      }
      if (row.destinationCard.slice(-4) !== registered.slice(-4)) {
        result.otherCard += 1;
        continue;
      }
      result.deposits += 1;

      const dedupeKey = sha256(
        [
          'statement',
          row.trackingNumber ?? '',
          row.description,
          row.occurredAt?.toISOString() ?? '',
          String(row.amountRial),
        ].join('|'),
      );
      const existing = await this.prisma.smsGatewayTransaction.findUnique({
        where: { workspaceId_dedupeKey: { workspaceId, dedupeKey } },
        select: { id: true },
      });
      if (existing) {
        result.duplicates += 1;
        continue;
      }

      const transaction = await this.prisma.smsGatewayTransaction.create({
        data: {
          workspaceId,
          deviceId: null,
          dedupeKey,
          rawText: row.description,
          amount: row.amountToman,
          bankName: parsed.bankName ?? account.bankName ?? null,
          destinationLast4: row.destinationCard.slice(-4),
          destinationCard: row.destinationCard,
          sourceCard: row.sourceCard,
          sourceCardLast4: row.sourceCard?.slice(-4) ?? null,
          trackingNumber: row.trackingNumber,
          smsReceivedAt: row.occurredAt,
          note: 'از فایل صورت‌حساب بانکی',
        },
      });
      result.imported += 1;

      const evaluation = await this.evaluate(transaction, account);
      const updated = await this.prisma.smsGatewayTransaction.update({
        where: { id: transaction.id },
        data: evaluation.data,
      });
      if (updated.status === 'AUTO_APPROVED') result.autoApproved += 1;
      else if (updated.status === 'AMBIGUOUS') result.ambiguous += 1;
      else result.unmatched += 1;
    }

    return result;
  }

  async reportTransaction(
    device: SmsDeviceContext,
    dto: ReportSmsTransactionDto,
  ) {
    await this.assertEnabled();
    const account = await this.activeAccount(device.workspaceId);
    const destinationCard = dto.destinationCard?.trim() || null;
    const destinationLast4 =
      dto.destinationLast4?.trim() || destinationCard?.slice(-4) || null;
    const smsReceivedAt = dto.smsReceivedAt ? new Date(dto.smsReceivedAt) : null;
    const dedupeKey = sha256(
      [
        device.id,
        dto.smsId?.trim() || '',
        dto.rawText.trim(),
        smsReceivedAt?.toISOString() || '',
      ].join('|'),
    );

    const existing = await this.prisma.smsGatewayTransaction.findUnique({
      where: {
        workspaceId_dedupeKey: {
          workspaceId: device.workspaceId,
          dedupeKey,
        },
      },
    });
    if (existing) {
      return {
        duplicate: true,
        status: existing.status,
        orderId: existing.orderId,
        message: 'این پیامک قبلاً ثبت شده است.',
      };
    }

    const transaction = await this.prisma.smsGatewayTransaction.create({
      data: {
        workspaceId: device.workspaceId,
        deviceId: device.id,
        dedupeKey,
        rawText: dto.rawText.trim(),
        amount: dto.amount,
        bankName: dto.bankName?.trim() || null,
        senderName: dto.senderName?.trim() || null,
        destinationLast4,
        destinationCard,
        sourceCard: dto.sourceCard?.trim() || null,
        sourceCardLast4:
          dto.sourceCardLast4?.trim() || dto.sourceCard?.trim().slice(-4) || null,
        trackingNumber: dto.trackingNumber?.trim() || null,
        smsReceivedAt,
        note: dto.note?.trim() || null,
      },
    });
    await this.prisma.smsGatewayDevice.update({
      where: { id: device.id },
      data: {
        lastSmsAt: smsReceivedAt ?? new Date(),
        // A reported deposit also proves the phone is online right now.
        lastSeenAt: new Date(),
      },
    });

    const evaluation = await this.evaluate(transaction, account);
    const updated = await this.prisma.smsGatewayTransaction.update({
      where: { id: transaction.id },
      data: evaluation.data,
    });
    return {
      duplicate: false,
      id: updated.id,
      status: updated.status,
      orderId: updated.orderId,
      orderNumber: evaluation.orderNumber ?? null,
      message: evaluation.message,
    };
  }

  // -------------------------------------------------------------------------
  //  Matching engine
  // -------------------------------------------------------------------------

  private async evaluate(
    transaction: {
      id: string;
      workspaceId: string;
      amount: number;
      destinationLast4: string | null;
      destinationCard: string | null;
      sourceCard?: string | null;
      sourceCardLast4?: string | null;
      trackingNumber: string | null;
      smsReceivedAt: Date | null;
      note: string | null;
    },
    account: { cardNumber: string },
  ) {
    const registered = account.cardNumber.replace(/\D/g, '');
    const last4 = transaction.destinationCard?.slice(-4) ??
      transaction.destinationLast4;
    if (!last4) {
      return {
        matched: false,
        data: {
          status: 'UNMATCHED' as TransactionStatus,
          note: 'کارت مقصد در متن پیامک شناسایی نشد؛ تطبیق دستی لازم است.',
        },
        message: 'کارت مقصد شناسایی نشد.',
      };
    }
    if (last4 !== registered.slice(-4)) {
      return {
        matched: false,
        data: {
          status: 'UNMATCHED' as TransactionStatus,
          note: `کارت مقصد (${last4}) با کارت ثبت‌شده (${registered.slice(-4)}) مطابقت ندارد.`,
        },
        message: 'واریز به کارت ثبت‌شده انجام نشده است.',
      };
    }
    if (
      transaction.destinationCard &&
      transaction.destinationCard !== registered
    ) {
      return {
        matched: false,
        data: {
          status: 'UNMATCHED' as TransactionStatus,
          note: 'شماره کارت کامل با کارت ثبت‌شده مطابقت ندارد.',
        },
        message: 'شماره کارت مقصد مطابقت ندارد.',
      };
    }

    // Anchor the window at the deposit time so a statement uploaded days later
    // still matches the orders that were pending when the transfer happened.
    const reference = transaction.smsReceivedAt ?? new Date();
    const since = new Date(
      reference.getTime() - MATCH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const candidates: MatchCandidate[] = await this.prisma.retailOrder.findMany({
      where: {
        workspaceId: transaction.workspaceId,
        paymentMethod: 'CARD_TO_CARD',
        status: { in: ['PENDING', 'CONFIRMED'] },
        paymentStatus: { in: ['UNPAID', 'PENDING_REVIEW'] },
        totalAmount: transaction.amount,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalAmount: true,
        payerCardLast4: true,
        createdAt: true,
      },
    });

    // The customer tells us the last 4 digits of their own card at checkout.
    // When the bank message/statement also reveals the payer card, that is a
    // strong signal: prefer orders whose declared payer card matches, and never
    // auto-approve an order that declared a *different* card.
    const payerLast4 =
      transaction.sourceCardLast4 ??
      transaction.sourceCard?.slice(-4) ??
      null;
    let pool = candidates;
    let payerNote = '';
    if (payerLast4) {
      const strong = candidates.filter(
        (candidate) => candidate.payerCardLast4 === payerLast4,
      );
      if (strong.length) {
        pool = strong;
        payerNote = ` (کارت پرداخت‌کننده ${payerLast4} مطابق سفارش)`;
      } else {
        pool = candidates.filter((candidate) => !candidate.payerCardLast4);
      }
    }

    if (pool.length === 1) {
      const order = pool[0];
      const result = await this.approveOrder(
        transaction.workspaceId,
        order.id,
        transaction,
        null,
        'تأیید خودکار از پیامک بانکی',
      );
      return {
        matched: true,
        orderNumber: order.orderNumber,
        data: {
          status: 'AUTO_APPROVED' as TransactionStatus,
          orderId: order.id,
          cardPaymentId: result.paymentId,
          note: `تأیید خودکار سفارش ${order.orderNumber}${payerNote}`,
        },
        message: `پرداخت سفارش ${order.orderNumber} به‌صورت خودکار تأیید شد.`,
      };
    }
    if (pool.length > 1) {
      return {
        matched: false,
        data: {
          status: 'AMBIGUOUS' as TransactionStatus,
          candidates: pool.map((candidate) => ({
            orderId: candidate.id,
            orderNumber: candidate.orderNumber,
            customerName: candidate.customerName,
            totalAmount: candidate.totalAmount,
            createdAt: candidate.createdAt.toISOString(),
          })),
          note: `${pool.length} سفارش هم‌مبلغ پیدا شد؛ تطبیق دستی لازم است.`,
        },
        message: 'چند سفارش هم‌مبلغ وجود دارد؛ از پنل تطبیق دهید.',
      };
    }
    if (candidates.length && !pool.length) {
      return {
        matched: false,
        data: {
          status: 'UNMATCHED' as TransactionStatus,
          note: `سفارش هم‌مبلغ هست، اما کارت پرداخت‌کننده (${payerLast4}) با کارت اعلام‌شده در سفارش‌ها نمی‌خواند؛ تطبیق دستی لازم است.`,
        },
        message: 'کارت پرداخت‌کننده با سفارش‌های هم‌مبلغ مطابقت ندارد.',
      };
    }
    return {
      matched: false,
      data: {
        status: 'UNMATCHED' as TransactionStatus,
        note: 'سفارش هم‌مبلغِ در انتظار پرداخت پیدا نشد.',
      },
      message: 'سفارش متناظر پیدا نشد.',
    };
  }

  private async approveOrder(
    workspaceId: string,
    orderId: string,
    transaction: {
      id: string;
      amount: number;
      trackingNumber: string | null;
      smsReceivedAt: Date | null;
    },
    actorId: string | null,
    reviewNote?: string,
  ) {
    const order = await this.prisma.retailOrder.findFirst({
      where: { id: orderId, workspaceId },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        status: true,
        paymentStatus: true,
      },
    });
    if (!order) throw new NotFoundException('سفارش پیدا نشد');
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('این سفارش لغو شده است');
    }

    let paymentId: string | null = null;
    if (order.paymentStatus !== 'PAID') {
      const pending = await this.prisma.cardToCardPayment.findFirst({
        where: {
          workspaceId,
          referenceType: 'ORDER',
          referenceId: order.id,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
      const paymentData = {
        amount: transaction.amount,
        expectedAmount: order.totalAmount,
        paidAt: transaction.smsReceivedAt ?? new Date(),
        trackingNumber: transaction.trackingNumber ?? pending?.trackingNumber ?? null,
        status: 'APPROVED',
        source: 'SMS_GATEWAY',
        smsTransactionId: transaction.id,
        reviewNote: reviewNote?.trim() || 'تأیید خودکار از پیامک بانکی',
        reviewedAt: new Date(),
        reviewedBy: actorId,
      };
      const payment = pending
        ? await this.prisma.cardToCardPayment.update({
            where: { id: pending.id },
            data: paymentData,
          })
        : await this.prisma.cardToCardPayment.create({
            data: {
              workspaceId,
              referenceType: 'ORDER',
              referenceId: order.id,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              receiptUrl: 'sms-gateway',
              ...paymentData,
            },
          });
      paymentId = payment.id;
      await this.retail.settleOrderPaid(order.id, workspaceId, actorId ?? undefined);
    } else {
      const existing = await this.prisma.cardToCardPayment.findFirst({
        where: {
          workspaceId,
          referenceType: 'ORDER',
          referenceId: order.id,
          source: 'SMS_GATEWAY',
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      paymentId = existing?.id ?? null;
    }
    return { paymentId, orderNumber: order.orderNumber };
  }
}
