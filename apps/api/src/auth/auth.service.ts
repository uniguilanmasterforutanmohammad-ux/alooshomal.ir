import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly activity: ActivityService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('این ایمیل قبلاً ثبت شده است');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, fullName: dto.fullName },
      select: { id: true, email: true, fullName: true, role: true },
    });

    // Brand-new accounts start on the free plan so the panel shows
    // «اشتراک فعلی شما» instead of an «درخواست اشتراک» button.
    await this.subscriptions.assignDefaultPlan(user.id);

    await this.notifications.notifyAdmins({
      category: 'NEW_USER',
      title: 'کاربر جدید ثبت‌نام کرد',
      body: `${user.fullName ?? user.email} به پلتفرم پیوست.`,
      link: '/admin?section=users',
      actorId: user.id,
    });

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_REGISTERED',
      summary: `ثبت‌نام کاربر جدید: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('ایمیل یا رمز عبور اشتباه است');
    }

    await this.activity.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'USER_LOGIN',
      summary: `ورود به حساب: ${user.fullName ?? user.email}`,
      entityType: 'USER',
      entityId: user.id,
    });

    return this.buildAuthResponse({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName?: string | null;
    role: 'USER' | 'ADMIN';
  }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName ?? null,
        role: user.role,
      },
    };
  }
}
