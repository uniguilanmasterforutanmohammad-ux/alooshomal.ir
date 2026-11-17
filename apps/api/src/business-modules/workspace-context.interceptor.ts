import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

import { workspaceContext, type WorkspaceContext } from './workspace-context';

/**
 * Captures the `x-workspace-id` header for the lifetime of the request. Only
 * the id is stored here; ownership is validated by `BusinessModulesService`
 * before it is trusted.
 */
@Injectable()
export class WorkspaceContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const raw = request.headers['x-workspace-id'];
    const workspaceId =
      typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 64) : null;
    const store: WorkspaceContext = { workspaceId };
    return workspaceContext.run(store, () => next.handle());
  }
}
