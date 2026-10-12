import { SetMetadata } from '@nestjs/common';

import { PermissionSubject } from './permissions';

export const PERMISSION_KEY = 'permission';

/** Require a role to hold the given permission subject (admins always pass). */
export const RequirePermission = (subject: PermissionSubject) =>
  SetMetadata(PERMISSION_KEY, subject);
