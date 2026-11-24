'use client';

import { useCallback, useEffect, useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import type {
  AdminCatalog,
  AdminWorkspaceRow,
} from './admin-business-modules.types';

/**
 * Per-user view of business workspaces and their module switches. Moved here
 * from the global «ماژول‌های کسب‌وکار» admin panel so an admin manages modules
 * in the context of the user who owns the workspaces.
 */
export function AdminUserBusinessModules({ userId }: { userId: string }) {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    const data = await api.get<AdminWorkspaceRow[]>(
      `/admin/business-modules/workspaces?ownerId=${encodeURIComponent(userId)}`,
    );
    setWorkspaces(data);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [catalogData] = await Promise.all([
          api.get<AdminCatalog>('/admin/business-modules/catalog'),
          loadWorkspaces(),
        ]);
        if (cancelled) return;
        setCatalog(catalogData);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : 'خطا در بارگذاری ماژول‌ها',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWorkspaces]);

  async function toggleModule(
    workspace: AdminWorkspaceRow,
    moduleKey: string,
    enabled: boolean,
  ) {
    setBusy(`${workspace.id}:${moduleKey}`);
    try {
      await api.patch(
        `/admin/business-modules/workspaces/${workspace.id}/modules/${moduleKey}`,
        { enabled },
      );
      await loadWorkspaces();
    } catch {
      // toast already shown by the API client
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="indeed-panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-4 py-3 sm:px-5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <Layers className="size-4 text-brand" aria-hidden />
            ماژول‌های کسب‌وکار
            {workspaces.length > 0 ? (
              <span className="rounded-md bg-soft px-2 py-0.5 text-[11px] text-muted">
                {workspaces.length.toLocaleString('fa-IR')}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted">
            ماژول‌های فعال هر کسب‌وکار این کاربر؛ با کلیک روی هر ماژول
            فعال/غیرفعال می‌شود.
          </p>
        </div>
      </header>
      <div className="p-3 sm:p-5">
        {loading ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            در حال بارگذاری…
          </p>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : workspaces.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">
            این کاربر هنوز کسب‌وکاری ندارد.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {workspaces.map((workspace) => {
              const enabledKeys = new Set(
                workspace.modules
                  .filter((item) => item.enabled)
                  .map((item) => item.moduleKey),
              );
              return (
                <article
                  key={workspace.id}
                  className="rounded-xl border border-[var(--vintage-border)] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {workspace.name}
                        {workspace.isDefault ? (
                          <span className="mr-2 rounded-full bg-brand-light px-2 py-0.5 text-[10px] text-brand">
                            پیش‌فرض
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted">
                        صنف: {workspace.industryKey} ·{' '}
                        {enabledKeys.size.toLocaleString('fa-IR')} ماژول فعال
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(catalog?.modules ?? []).map((module) => {
                      const isOn = enabledKeys.has(module.key);
                      const key = `${workspace.id}:${module.key}`;
                      return (
                        <button
                          key={module.key}
                          type="button"
                          onClick={() =>
                            void toggleModule(workspace, module.key, !isOn)
                          }
                          disabled={busy === key}
                          title={
                            isOn
                              ? 'غیرفعال‌کردن این ماژول برای این کسب‌وکار'
                              : 'فعال‌کردن این ماژول برای این کسب‌وکار'
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50',
                            isOn
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-[var(--vintage-border)] text-muted hover:text-ink',
                          )}
                        >
                          {module.label}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
