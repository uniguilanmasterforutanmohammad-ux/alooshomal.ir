import { AsyncLocalStorage } from 'node:async_hooks';

export interface ActivityContext {
  actor?: { id: string; email: string; role: string } | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Per-request store. A global interceptor fills it from `request.user` and the
 * HTTP headers, so `ActivityService.log()` can attach the actor and request
 * metadata without every call site having to thread them through.
 */
export const activityContext = new AsyncLocalStorage<ActivityContext>();

export function currentActivityContext(): ActivityContext | undefined {
  return activityContext.getStore();
}
