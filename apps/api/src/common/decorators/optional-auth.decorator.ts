import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_AUTH_KEY = 'optionalAuth';

/**
 * Marks a route as publicly accessible, but still attaches the authenticated
 * user when a valid bearer token is present. Used by the public directory
 * endpoints so they can report the current user's liked/saved state without
 * requiring a login.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
