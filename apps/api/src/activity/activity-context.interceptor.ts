import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import { activityContext, type ActivityContext } from './activity-context';

interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

/**
 * Wraps every request in an AsyncLocalStorage scope holding the acting user and
 * request metadata. This is what lets `ActivityService.log()` record "who /
 * from where" with a one-line call at the business site.
 */
@Injectable()
export class ActivityContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    // Real client IP when behind the CDN / nginx, else the socket address.
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : (request.ip ?? request.socket?.remoteAddress ?? null);

    const store: ActivityContext = {
      actor: request.user
        ? { id: request.user.id, email: request.user.email, role: request.user.role }
        : null,
      ip,
      userAgent: request.headers['user-agent'] ?? null,
    };

    return activityContext.run(store, () => next.handle());
  }
}
