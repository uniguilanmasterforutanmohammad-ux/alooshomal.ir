import { ContentDecisionKind, NotificationScope } from '@prisma/client';

import { ModeratorScope } from './moderator-scopes';

/** Notification scope a moderator scope is allowed to receive. */
export const SCOPE_TO_NOTIFICATION: Record<ModeratorScope, NotificationScope> = {
  BIOLINK: NotificationScope.BIOLINK,
  BUSINESS_CARD: NotificationScope.BUSINESS_CARD,
  FEED: NotificationScope.FEED,
  NEWS: NotificationScope.NEWS,
  SUBSCRIPTION_REQUESTS: NotificationScope.SUBSCRIPTION,
  AD_REQUESTS: NotificationScope.AD,
  DIRECTORY_AD_REQUESTS: NotificationScope.DIRECTORY_AD,
  BOOST_REQUESTS: NotificationScope.BOOST,
};

/** The decision-trail kind for a content scope (request scopes have no item). */
export const CONTENT_SCOPE_TO_DECISION: Partial<
  Record<ModeratorScope, ContentDecisionKind>
> = {
  BIOLINK: ContentDecisionKind.BIOLINK,
  BUSINESS_CARD: ContentDecisionKind.BUSINESS_CARD,
  FEED: ContentDecisionKind.FEED,
  NEWS: ContentDecisionKind.NEWS,
};

/** Notification scopes an admin with the given moderator scopes may see. */
export function allowedNotificationScopes(
  scopes: ModeratorScope[],
): NotificationScope[] {
  return scopes.map((scope) => SCOPE_TO_NOTIFICATION[scope]);
}
