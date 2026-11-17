import { SetMetadata } from '@nestjs/common';

export const BUSINESS_MODULE_KEY = 'business:module';

/**
 * Marks a route as belonging to a business module. `BusinessModuleGuard`
 * rejects the request with 403 `MODULE_DISABLED` when the signed-in user's
 * workspace has not enabled that module.
 */
export const RequireModule = (moduleKey: string) =>
  SetMetadata(BUSINESS_MODULE_KEY, moduleKey);
