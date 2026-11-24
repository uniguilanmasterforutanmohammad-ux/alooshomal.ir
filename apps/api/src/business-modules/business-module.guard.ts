import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthUser } from '../common/decorators/current-user.decorator';
import { OPTIONAL_AUTH_KEY } from '../common/decorators/optional-auth.decorator';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessModulesService } from './business-modules.service';
import { BUSINESS_MODULE_KEY } from './require-module.decorator';

@Injectable()
export class BusinessModuleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly modules: BusinessModulesService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string>(
      BUSINESS_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!moduleKey) return true;

    // Public and optional-auth routes are readable without a workspace; the
    // module gate only protects the owner-facing actions.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic || isOptional) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();
    if (!request.user?.id) {
      throw new UnauthorizedException('برای استفاده از این ماژول باید وارد شوید');
    }
    try {
      await this.modules.assertModuleEnabled(request.user.id, moduleKey);
    } catch (error) {
      // A user who was granted access to someone else's building may use the
      // building modules even if their own workspace has not enabled them; the
      // service still scopes every query to the buildings they can access.
      if (moduleKey.startsWith('building')) {
        const member = await this.prisma.buildingMember.findFirst({
          where: { userId: request.user.id },
          select: { id: true },
        });
        if (member) return true;
      }
      throw error;
    }
    return true;
  }
}
