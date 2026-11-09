import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { isProfileComplete } from '../national-code';

/**
 * Blocks actions that need a real identity (creating biolinks/cards/posts,
 * paid requests, …) until the user has filled in first name, last name and
 * national code on `/dashboard/profile`.
 */
@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return true;

    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, nationalCode: true },
    });
    if (row && isProfileComplete(row)) return true;

    throw new ForbiddenException(
      'برای انجام این کار ابتدا پروفایل خود را تکمیل کنید: نام، نام خانوادگی و کد ملی.',
    );
  }
}
