import { NotificationType } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';

/**
 * Thin wrapper used by the admin services to notify a single user. Kept in one
 * place so `AdminService` and `AdminUsersService` share identical defaults.
 */
export function notifyUser(
  notifications: NotificationsService,
  userId: string,
  title: string,
  body: string,
  type: NotificationType = NotificationType.INFO,
  link: string | null = null,
  actorId: string | null = null,
) {
  return notifications.notify({ userId, title, body, type, link, actorId });
}
