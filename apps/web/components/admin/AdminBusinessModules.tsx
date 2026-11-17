'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Search } from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface AdminModuleRow {
  key: string;
  label: string;
  description: string;
  group: string;
  billable: boolean;
  defaultEnabled: boolean;
  price: number;
  months: number;
  priceActive: boolean;
  priceDescription: string | null;
  enabledWorkspaces: number;
}

interface AdminCatalog {
  modules: AdminModuleRow[];
  totals: { workspaces: number };
}

interface AdminWorkspaceRow {
  id: string;
  name: string;
  industryKey: string;
  isDefault: boolean;
  createdAt: string;
  owner: { id: string; fullName: string | null; email: string | null; phone: string | null };
  modules: Array<{ moduleKey: string; enabled: boolean; paidUntil: string | null }>;
}

function formatToman(amount: number): string {
  return amount.toLocaleString('fa-IR');
}

export function AdminBusinessModules() {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Record<string, { price: string; months: string; isActive: boolean }>
  >({});

  const loadCatalog = useCallback(async () => {
    const data = await api.get<AdminCatalog>('/admin/business-modules/catalog');
    setCatalog(data);
    setDraft(
      Object.fromEntries(
        data.modules.map((module) => [
          module.key,
          {
            price: String(module.price),
            months: String(module.months),
            isActive: module.priceActive,
          },
        ]),
      ),
    );
  }, []);

  const loadWorkspaces = useCallback(async (q: string) => {
    const data = await api.get<AdminWorkspaceRow[]>(
      `/admin/business-modules/workspaces?take=80${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    );
    setWorkspaces(data);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([loadCatalog(), loadWorkspaces('')]);
      } catch {
        // toast already shown by the API client
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCatalog, loadWorkspaces]);

  async function savePrice(moduleKey: string) {
    const value = draft[moduleKey];
    if (!value) return;
    setBusy(moduleKey);
    try {
      await api.patch(`/admin/business-modules/prices/${moduleKey}`, {
        price: Number(value.price) || 0,
        months: Number(value.months) || 0,
        isActive: value.isActive,
      });
      toast.success('قیمت ماژول ذخیره شد');
      await loadCatalog();
    } finally {
      setBusy(null);
    }
  }

  async function toggleWorkspaceModule(
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
      setWorkspaces((rows) =>
        rows.map((row) =>
          row.id === workspace.id
            ? {
                ...row,
                modules: [
                  ...row.modules.filter((item) => item.moduleKey !== moduleKey),
                  { moduleKey, enabled, paidUntil: null },
                ],
              }
            : row,
        ),
      );
    } finally {
      setBusy(null);
    }
  }

  if (loading && !catalog) {
    return <p className="text-muted">در حال بارگذاری ماژول‌ها…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="indeed-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-ink">
              ماژول‌ها و قیمت‌گذاری
            </h3>
            <p className="text-xs text-muted">
              هر «مدیریت کسب‌وکار» یک ماژول است؛ قیمت هر ماژول را اینجا تعیین
              کنید. قیمت ۰ یعنی فعال‌سازی رایگان.
            </p>
          </div>
          <span className="rounded-full bg-[var(--vintage-paper)] px-3 py-1 text-xs font-bold text-muted">
            {catalog?.totals.workspaces ?? 0} کسب‌وکار
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--vintage-border)] text-right text-xs text-muted">
                <th className="py-2">ماژول</th>
                <th className="py-2">قیمت (تومان)</th>
                <th className="py-2">مدت (ماه)</th>
                <th className="py-2">فعال</th>
                <th className="py-2">کسب‌وکارهای فعال</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(catalog?.modules ?? []).map((module) => {
                const value = draft[module.key];
                return (
                  <tr
                    key={module.key}
                    className="border-b border-dashed border-[var(--vintage-border)]"
                  >
                    <td className="py-3">
                      <p className="font-bold text-ink">{module.label}</p>
                      <p className="text-[11px] text-muted">
                        {module.group}
                        {module.defaultEnabled ? ' · پیش‌فرض' : ''}
                      </p>
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        min={0}
                        value={value?.price ?? ''}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [module.key]: {
                              ...current[module.key],
                              price: event.target.value,
                            },
                          }))
                        }
                        className="w-28 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-2 py-1.5 text-sm"
                      />
                      <p className="mt-1 text-[10px] text-muted">
                        {formatToman(Number(value?.price) || 0)}
                      </p>
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        min={0}
                        value={value?.months ?? ''}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [module.key]: {
                              ...current[module.key],
                              months: event.target.value,
                            },
                          }))
                        }
                        className="w-20 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={value?.isActive ?? false}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            [module.key]: {
                              ...current[module.key],
                              isActive: event.target.checked,
                            },
                          }))
                        }
                      />
                    </td>
                    <td className="py-3 text-xs text-muted">
                      {module.enabledWorkspaces.toLocaleString('fa-IR')}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => void savePrice(module.key)}
                        disabled={busy === module.key}
                        className="indeed-btn indeed-btn-primary text-xs disabled:opacity-50"
                      >
                        <Save className="size-3.5" aria-hidden />
                        ذخیره
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="indeed-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-ink">
            ماژول‌های هر کسب‌وکار
          </h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loadWorkspaces(query.trim());
            }}
            className="flex items-center gap-2"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جست‌وجوی نام کسب‌وکار یا مالک"
              className="rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-1.5 text-xs"
            />
            <button type="submit" className="indeed-btn text-xs">
              <Search className="size-3.5" aria-hidden />
              جست‌وجو
            </button>
          </form>
        </div>
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
                      {workspace.owner.fullName ?? '—'} ·{' '}
                      {workspace.owner.email ?? workspace.owner.phone ?? '—'} ·{' '}
                      {workspace.industryKey}
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
                          void toggleWorkspaceModule(workspace, module.key, !isOn)
                        }
                        disabled={busy === key}
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
          {workspaces.length === 0 ? (
            <p className="text-sm text-muted">کسب‌وکاری پیدا نشد.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
