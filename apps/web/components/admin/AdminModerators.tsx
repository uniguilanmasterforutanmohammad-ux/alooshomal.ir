'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';

import { api, type ModeratorAccount, type ModeratorScope } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface ScopeMeta {
  scope: ModeratorScope;
  group: string;
  label: string;
  hint: string;
}

interface Draft {
  email: string;
  password: string;
  fullName: string;
  scopes: ModeratorScope[];
}

const EMPTY_DRAFT: Draft = { email: '', password: '', fullName: '', scopes: [] };

/**
 * Super-admin panel for creating and managing limited «کاربر ادمین» accounts.
 * The admin picks which content queues (biolinks, business cards, feeds, news)
 * the reviewer may moderate; that choice is stored per account and enforced by
 * the API on every moderator request.
 */
export function AdminModerators() {
  const [items, setItems] = useState<ModeratorAccount[]>([]);
  const [scopeMeta, setScopeMeta] = useState<ScopeMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ModeratorAccount | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: ModeratorAccount[]; scopeMeta: ScopeMeta[] }>(
        '/admin/moderators',
      );
      setItems(data.items);
      setScopeMeta(data.scopeMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleScope(list: ModeratorScope[], scope: ModeratorScope): ModeratorScope[] {
    return list.includes(scope)
      ? list.filter((value) => value !== scope)
      : [...list, scope];
  }

  async function create() {
    if (!draft.email.trim() || draft.password.length < 8) {
      toast.error('ایمیل معتبر و رمز عبور حداقل ۸ کاراکتری وارد کنید.');
      return;
    }
    if (draft.scopes.length === 0) {
      toast.error('حداقل یک سطح دسترسی انتخاب کنید.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/moderators', {
        email: draft.email.trim(),
        password: draft.password,
        fullName: draft.fullName.trim() || undefined,
        scopes: draft.scopes,
      });
      toast.success('کاربر ادمین ساخته شد.');
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ساخت کاربر ناموفق بود');
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit(account: ModeratorAccount, scopes: ModeratorScope[]) {
    try {
      await api.patch(`/admin/moderators/${account.id}`, { scopes });
      toast.success('سطوح دسترسی به‌روزرسانی شد.');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    }
  }

  async function toggleActive(account: ModeratorAccount) {
    try {
      await api.patch(`/admin/moderators/${account.id}`, { isActive: !account.isActive });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    }
  }

  async function remove(account: ModeratorAccount) {
    if (
      !window.confirm(
        `حذف کامل کاربر ادمین «${account.fullName ?? account.email}»؟ این عملیات بازگشت‌پذیر نیست.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/admin/moderators/${account.id}`);
      toast.success('کاربر ادمین حذف شد.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="vintage-avatar flex size-10 items-center justify-center">
          <UserCog className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-ink">کاربران ادمین محدود</h3>
          <p className="text-xs text-muted">
            حساب‌هایی که فقط تأیید، ویرایش و رد محتوای انتخاب‌شده را انجام می‌دهند.
          </p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">ساخت کاربر ادمین جدید</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold text-muted">
            ایمیل
            <input
              className="indeed-input mt-1"
              dir="ltr"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              placeholder="moderator@example.com"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            رمز عبور
            <input
              className="indeed-input mt-1"
              dir="ltr"
              type="password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              placeholder="حداقل ۸ کاراکتر"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            نام (اختیاری)
            <input
              className="indeed-input mt-1"
              value={draft.fullName}
              onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
            />
          </label>
        </div>

        <ScopePicker
          meta={scopeMeta}
          selected={draft.scopes}
          onToggle={(scope) => setDraft({ ...draft, scopes: toggleScope(draft.scopes, scope) })}
        />

        <button
          onClick={create}
          disabled={creating}
          className="indeed-btn indeed-btn-primary mt-4"
        >
          <Plus className="size-4" aria-hidden />
          {creating ? 'در حال ساخت...' : 'ساخت کاربر ادمین'}
        </button>
      </div>

      <div className="indeed-panel overflow-hidden">
        <div className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
          <h4 className="text-sm font-extrabold text-ink">
            فهرست کاربران ادمین ({items.length.toLocaleString('fa-IR')})
          </h4>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-muted">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted">
            هنوز کاربر ادمین محدودی ساخته نشده است.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--vintage-border)]">
            {items.map((account) => (
              <li key={account.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink">
                      {account.fullName ?? '—'}
                      {!account.isActive ? (
                        <span className="ms-2 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          غیرفعال
                        </span>
                      ) : null}
                    </p>
                    <p dir="ltr" className="mt-0.5 text-right text-xs text-muted">
                      {account.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {account.moderatorScopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full border border-[var(--vintage-border)] bg-brand-light px-2.5 py-0.5 text-[11px] font-bold text-brand"
                        >
                          {scopeMeta.find((meta) => meta.scope === scope)?.label ?? scope}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing(editing?.id === account.id ? null : account)}
                      className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                    >
                      <ShieldCheck className="size-3.5" aria-hidden />
                      سطوح دسترسی
                    </button>
                    <button
                      onClick={() => toggleActive(account)}
                      className={cn(
                        'indeed-btn py-1.5 text-xs',
                        account.isActive
                          ? 'indeed-btn-secondary text-amber-700'
                          : 'indeed-btn-secondary text-emerald-700',
                      )}
                    >
                      {account.isActive ? 'غیرفعال' : 'فعال'}
                    </button>
                    <button
                      onClick={() => remove(account)}
                      className="flex size-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label="حذف"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {editing?.id === account.id ? (
                  <div className="mt-3 rounded-lg border border-dashed border-[var(--vintage-border)] p-3">
                    <ScopePicker
                      meta={scopeMeta}
                      selected={account.moderatorScopes}
                      onToggle={(scope) =>
                        setEditing({
                          ...account,
                          moderatorScopes: toggleScope(account.moderatorScopes, scope),
                        })
                      }
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => saveEdit(account, editing.moderatorScopes)}
                        className="indeed-btn indeed-btn-primary py-1.5 text-xs"
                      >
                        ذخیره
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
                      >
                        لغو
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScopePicker({
  meta,
  selected,
  onToggle,
}: {
  meta: ScopeMeta[];
  selected: ModeratorScope[];
  onToggle: (scope: ModeratorScope) => void;
}) {
  const groups = meta.reduce<Record<string, ScopeMeta[]>>((acc, item) => {
    const key = item.group ?? 'عمومی';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="mt-4">
      <p className="text-xs font-bold text-muted">سطح دسترسی‌ها</p>
      {Object.entries(groups).map(([group, items]) => (
        <div key={group} className="mt-3">
          <p className="text-[11px] font-extrabold text-brand">{group}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const active = selected.includes(item.scope);
              return (
                <button
                  key={item.scope}
                  type="button"
                  onClick={() => onToggle(item.scope)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 text-right transition',
                    active
                      ? 'border-brand bg-brand-light'
                      : 'border-[var(--vintage-border)] bg-white',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
                      active ? 'border-brand bg-brand text-white' : 'border-[var(--vintage-border)]',
                    )}
                  >
                    {active ? '✓' : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{item.label}</span>
                    <span className="block text-[11px] text-muted">{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
