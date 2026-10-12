import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthUser } from '../common/decorators/current-user.decorator';
import { PERMISSION_KEY } from './permissions.decorator';
import { PermissionSubject } from './permissions';
import { PermissionsService } from './permissions.service';

/**
 * Enforces the role→permission matrix on routes marked with
 * `@RequirePermission('SUBJECT')`. Registered globally, but a no-op unless the
 * metadata is present, so it composes with the JWT guard and the RolesGuard.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const subject = this.reflector.getAllAndOverride<PermissionSubject>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!subject) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) return false;
    return this.permissions.can(user.role, subject);
  }
}
