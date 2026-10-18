import { SetMetadata } from '@nestjs/common';

import { ModeratorScope } from './moderator-scopes';

export const MODERATOR_SCOPE_KEY = 'moderatorScope';

/**
 * Require the caller to hold the given content-moderation scope. Super admins
 * always pass; a `MODERATOR` must have the scope in `User.moderatorScopes`.
 */
export const RequireScope = (scope: ModeratorScope) =>
  SetMetadata(MODERATOR_SCOPE_KEY, scope);
