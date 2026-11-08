import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, SocialAccount } from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { decryptSecret, encryptSecret } from '../common/secret-box';
import { PrismaService } from '../prisma/prisma.service';
import {
  SOCIAL_ACCOUNT_ACTIONS,
  SOCIAL_PLATFORMS,
  socialPlatformLabel,
} from './social-accounts.constants';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';

/** What the API returns for an account: everything except the password. */
export interface SocialAccountView {
  id: string;
  platform: string;
  platformLabel: string;
  title: string;
  username: string;
  email: string | null;
  phone: string | null;
  url: string | null;
  notes: string | null;
  isActive: boolean;
  hasPassword: boolean;
  lastRotatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SocialAccountsService {
  private readonly logger = new Logger(SocialAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  /** Platform registry consumed by the admin form (label + hint per network). */
  platforms() {
    return SOCIAL_PLATFORMS;
  }

  private toView(row: SocialAccount): SocialAccountView {
    return {
      id: row.id,
      platform: row.platform,
      platformLabel: socialPlatformLabel(row.platform),
      title: row.title,
      username: row.username,
      email: row.email,
      phone: row.phone,
      url: row.url,
      notes: row.notes,
      isActive: row.isActive,
      hasPassword: Boolean(row.passwordEnc),
      lastRotatedAt: row.lastRotatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list() {
    const rows = await this.prisma.socialAccount.findMany({
      orderBy: [{ platform: 'asc' }, { title: 'asc' }],
    });
    return { items: rows.map((row) => this.toView(row)), platforms: SOCIAL_PLATFORMS };
  }

  async create(dto: CreateSocialAccountDto, actor: AuthUser | null) {
    const data: Prisma.SocialAccountCreateInput = {
      platform: dto.platform,
      title: dto.title.trim(),
      username: dto.username.trim(),
      passwordEnc: this.encrypt(dto.password),
      email: this.clean(dto.email),
      phone: this.clean(dto.phone),
      url: this.clean(dto.url),
      notes: this.clean(dto.notes),
      isActive: dto.isActive ?? true,
      lastRotatedAt: new Date(),
      createdById: actor?.id ?? null,
    };

    const row = await this.runOrConflict(() =>
      this.prisma.socialAccount.create({ data }),
    );

    await this.activity.log({
      actor,
      action: SOCIAL_ACCOUNT_ACTIONS.created,
      summary: `حساب ${socialPlatformLabel(row.platform)} «${row.username}» اضافه شد`,
      entityType: 'SocialAccount',
      entityId: row.id,
    });
    return this.toView(row);
  }

  async update(id: string, dto: UpdateSocialAccountDto, actor: AuthUser | null) {
    await this.findOrFail(id);

    const data: Prisma.SocialAccountUpdateInput = {};
    if (dto.platform !== undefined) data.platform = dto.platform;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.username !== undefined) data.username = dto.username.trim();
    if (dto.email !== undefined) data.email = this.clean(dto.email);
    if (dto.phone !== undefined) data.phone = this.clean(dto.phone);
    if (dto.url !== undefined) data.url = this.clean(dto.url);
    if (dto.notes !== undefined) data.notes = this.clean(dto.notes);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const passwordChanged = Boolean(dto.password);
    if (passwordChanged) {
      data.passwordEnc = this.encrypt(dto.password as string);
      data.lastRotatedAt = new Date();
    }

    const row = await this.runOrConflict(() =>
      this.prisma.socialAccount.update({ where: { id }, data }),
    );

    await this.activity.log({
      actor,
      action: SOCIAL_ACCOUNT_ACTIONS.updated,
      summary: passwordChanged
        ? `رمز حساب ${socialPlatformLabel(row.platform)} «${row.username}» تغییر کرد`
        : `اطلاعات حساب ${socialPlatformLabel(row.platform)} «${row.username}» ویرایش شد`,
      entityType: 'SocialAccount',
      entityId: row.id,
    });
    return this.toView(row);
  }

  async remove(id: string, actor: AuthUser | null) {
    const current = await this.findOrFail(id);
    await this.prisma.socialAccount.delete({ where: { id } });
    await this.activity.log({
      actor,
      action: SOCIAL_ACCOUNT_ACTIONS.deleted,
      summary: `حساب ${socialPlatformLabel(current.platform)} «${current.username}» حذف شد`,
      entityType: 'SocialAccount',
      entityId: current.id,
    });
    return { id: current.id };
  }

  /**
   * Decrypt one stored password. Deliberately a POST with a reason so the
   * reveal is never cached and always leaves an audit trail.
   */
  async reveal(id: string, reason: string | undefined, actor: AuthUser | null) {
    const row = await this.findOrFail(id);
    let password: string;
    try {
      password = decryptSecret(row.passwordEnc);
    } catch (error) {
      // A wrong/rotated key is a configuration problem, not a client error.
      this.logger.error(
        `failed to decrypt social account ${row.id}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'رمز این حساب قابل رمزگشایی نیست؛ کلید رمزنگاری (SOCIAL_CREDENTIALS_KEY/JWT_SECRET) تغییر کرده است.',
      );
    }

    await this.activity.log({
      actor,
      action: SOCIAL_ACCOUNT_ACTIONS.revealed,
      summary: `رمز حساب ${socialPlatformLabel(row.platform)} «${row.username}» مشاهده شد${
        reason ? ` — دلیل: ${reason}` : ''
      }`,
      entityType: 'SocialAccount',
      entityId: row.id,
    });
    return { id: row.id, username: row.username, password };
  }

  private async findOrFail(id: string): Promise<SocialAccount> {
    const row = await this.prisma.socialAccount.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('حساب شبکه‌ی اجتماعی یافت نشد.');
    return row;
  }

  private encrypt(plain: string): string {
    try {
      return encryptSecret(plain);
    } catch (error) {
      this.logger.error(`cannot encrypt social credential: ${(error as Error).message}`);
      throw new ServiceUnavailableException(
        'رمزنگاری اعتبارنامه ممکن نیست؛ SOCIAL_CREDENTIALS_KEY یا JWT_SECRET را تنظیم کنید.',
      );
    }
  }

  /** Empty form fields arrive as `""`; store them as NULL so the UI shows them blank. */
  private clean(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async runOrConflict<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'این نام کاربری برای این شبکه‌ی اجتماعی قبلاً ثبت شده است.',
        );
      }
      throw error;
    }
  }
}
