/**
 * Public surface of the browser API client.
 *
 * The fetch/refresh implementation lives in `lib/api/client.ts` and the
 * response types are grouped per domain under `lib/api/types/*`. This barrel
 * keeps the historical `@/lib/api` import path working for every consumer
 * while the code itself stays modular.
 */
export * from './api/client';
export * from './api/types/common';
export * from './api/types/catalog';
export * from './api/types/subscriptions';
export * from './api/types/boosts';
export * from './api/types/ads';
export * from './api/types/notifications';
export * from './api/types/moderation';
export * from './api/types/points';
export * from './api/types/feeds';
export * from './api/types/social';
export * from './api/types/finance';
