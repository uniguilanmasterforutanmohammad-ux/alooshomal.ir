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
 * Blocks actions that need a verified identity (creating biolinks/cards/posts,
 * paid requests, plan purchase, …) until the user has completed the two-step
 * identity flow on `/dashboard/profile`: Shahkar phone↔national-code match and
 * the paid Zohal identity inquiry.
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
      select: {
        firstName: true,
        lastName: true,
        nationalCode: true,
        birthDate: true,
        phoneMatchVerifiedAt: true,
        identityVerifiedAt: true,
      },
    });
    if (row && isProfileComplete(row)) return true;

    throw new ForbiddenException(
      'برای انجام این کار ابتدا استعلام هویت را کامل کنید: تطبیق کد ملی با شماره موبایل (شاهکار) و سپس استعلام اطلاعات هویتی.',
    );
  }
}
