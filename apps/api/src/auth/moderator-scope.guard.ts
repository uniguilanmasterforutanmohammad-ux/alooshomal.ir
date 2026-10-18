import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { MODERATOR_SCOPE_KEY } from './moderator-scope.decorator';
import { ModeratorScope } from './moderator-scopes';

/**
 * Enforces `@RequireScope('...')` on the moderator review endpoints. A super
 * admin (`ADMIN`) always passes; a `MODERATOR` passes only when the scope is
 * stored on their account. Any other role is rejected.
 */
@Injectable()
export class ModeratorScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<ModeratorScope>(
      MODERATOR_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role !== 'MODERATOR') return false;

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { moderatorScopes: true, isActive: true },
    });
    if (!record || !record.isActive) return false;
    return record.moderatorScopes.includes(scope);
  }
}
