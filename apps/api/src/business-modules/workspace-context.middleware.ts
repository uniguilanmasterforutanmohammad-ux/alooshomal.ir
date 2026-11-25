import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { workspaceContext } from './workspace-context';

/**
 * Captures the `x-workspace-id` header into an AsyncLocalStorage store.
 *
 * This must run as *middleware* (before guards), not as an interceptor:
 * `BusinessModuleGuard` resolves the active workspace to check module access,
 * and interceptors run after guards, so an interceptor-based context would make
 * the guard always fall back to the user's default workspace.
 */
@Injectable()
export class WorkspaceContextMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction): void {
    const raw = request.headers['x-workspace-id'];
    const workspaceId =
      typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 64) : null;
    workspaceContext.run({ workspaceId }, () => next());
  }
}
