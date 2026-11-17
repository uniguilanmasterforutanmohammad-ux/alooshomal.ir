import { AsyncLocalStorage } from 'node:async_hooks';

export interface WorkspaceContext {
  /** Workspace explicitly selected by the client via `x-workspace-id`. */
  workspaceId?: string | null;
}

/**
 * Per-request store for the active business workspace. The web panel sends the
 * selected workspace in the `x-workspace-id` header; a global interceptor puts
 * it here so every module service (accommodations, CRM, …) resolves the same
 * workspace without threading the id through each call.
 */
export const workspaceContext = new AsyncLocalStorage<WorkspaceContext>();

export function currentWorkspaceId(): string | null | undefined {
  return workspaceContext.getStore()?.workspaceId;
}
