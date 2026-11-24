import { ForbiddenException } from '@nestjs/common';

/**
 * Throws 403 unless `ownerId` belongs to the signed-in user.
 *
 * Every ownership check must compare the row's owner with the *session* user
 * (never a body/query id). Centralising the comparison keeps the error shape
 * and the null-owner handling identical across modules.
 */
export function assertOwned(
  ownerId: string | null | undefined,
  userId: string,
  message = 'دسترسی به این مورد مجاز نیست',
): void {
  if (!ownerId || ownerId !== userId) {
    throw new ForbiddenException(message);
  }
}
