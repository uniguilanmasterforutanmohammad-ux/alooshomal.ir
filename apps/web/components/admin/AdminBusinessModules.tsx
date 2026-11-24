'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { AdminBusinessModuleDetail } from './AdminBusinessModuleDetail';
import type {
  AdminCatalog,
  AdminCategory,
  AdminManagement,
  AdminModuleRow,
} from './admin-business-modules.types';

function formatToman(amount: number): string {
  return amount.toLocaleString('fa-IR');
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fa-IR');
  } catch {
    return value;
  }
}

export function AdminBusinessModules() {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [managements, setManagements] = useState<AdminManagement[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Record<string, { price: string; isActive: boolean }>
  >({});
  const [discountDraft, setDiscountDraft] = useState<
    Record<string, { 3: string; 6: string; 12: string }>
  >({});
  const [moduleDraft, setModuleDraft] = useState<Record<string, string>>({});
  const [categoryDraft, setCategoryDraft] = useState<Record<string, string[]>>(
    {},
  );
  const [createForm, setCreateForm] = useState({
    key: '',
    label: '',
    categoryIds: [] as string[],
  });
  const [showCreate, setShowCreate] = useState(false);

  const loadCatalog = useCallback(async () => {
    const data = await api.get<AdminCatalog>('/admin/business-modules/catalog');
    setCatalog(data);
    setDraft(
      Object.fromEntries(
        data.modules.map((module) => [
          module.key,
          {
            price: String(module.price),
            isActive: module.priceActive,
          },
        ]),
      ),
    );
  }, []);

  const loadManagements = useCallback(async () => {
    const data = await api.get<AdminManagement[]>(
      '/admin/business-modules/managements',
    );
    setManagements(data);
    setCategoryDraft(
      Object.fromEntries(
        data.map((management) => [
          management.key,
          management.categories.map((category) => category.id),
        ]),
      ),
    );
    setDiscountDraft(
      Object.fromEntries(
        data.map((management) => [
          management.key,
          {
            3: String(management.discounts['3'] ?? 0),
            6: String(management.discounts['6'] ?? 0),
            12: String(management.discounts['12'] ?? 0),
          },
        ]),
      ),
    );
  }, []);

  const loadCategories = useCallback(async () => {
    setCategories(await api.get<AdminCategory[]>('/admin/businesses'));
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadCatalog(),
          loadManagements(),
          loadCategories(),
        ]);
      } catch {
        // toast already shown by the API client
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCatalog, loadManagements, loadCategories]);

  const modulesByGroup = useMemo(() => {
    const groups = new Map<string, AdminModuleRow[]>();
    for (const moduleDef of catalog?.modules ?? []) {
      const list = groups.get(moduleDef.group) ?? [];
      list.push(moduleDef);
      groups.set(moduleDef.group, list);
    }
    return Array.from(groups.entries());
  }, [catalog]);

  async function savePrice(moduleKey: string) {
    const value = draft[moduleKey];
    if (!value) return;
    setBusy(moduleKey);
    try {
      await api.patch(`/admin/business-modules/prices/${moduleKey}`, {
        price: Number(value.price) || 0,
        isActive: value.isActive,
      });
      toast.success('قیمت ماژول ذخیره شد');
      await Promise.all([loadCatalog(), loadManagements()]);
    } finally {
      setBusy(null);
    }
  }

  async function syncManagement(key: string) {
    setBusy(`sync:${key}`);
    try {
      const result = await api.post<{
        packageKey: string;
        label: string;
        terms: Array<{
          months: number;
          price: number;
          productCode: string | null;
          created: boolean;
        }>;
        simulated: boolean;
        syncedAt: string;
      }>(`/admin/business-modules/managements/${key}/sync-payping`, {});
      const created = result.terms.filter((term) => term.created).length;
      const summary = result.terms
        .map(
          (term) =>
            `${term.months} ماهه: ${formatToman(term.price)} تومان${
              term.productCode ? ` (${term.productCode})` : ''
            }`,
        )
        .join(' • ');
      toast.success(
        `همگام‌سازی «${result.label}» انجام شد${
          result.simulated ? ' (شبیه‌ساز)' : ''
        }${created ? ` — ${created} محصول ساخته شد` : ''}${
          summary ? ` — ${summary}` : ''
        }`,
      );
      await loadManagements();
    } catch {
      // toast already shown by the API client
    } finally {
      setBusy(null);
    }
  }

  async function saveDiscounts(key: string) {
    const value = discountDraft[key];
    if (!value) return;
    setBusy(`discount:${key}`);
    try {
      await api.patch(`/admin/business-modules/managements/${key}`, {
        discounts: {
          3: Number(value['3']) || 0,
          6: Number(value['6']) || 0,
          12: Number(value['12']) || 0,
        },
      });
      toast.success('تخفیف دوره‌ها ذخیره شد');
      await loadManagements();
    } finally {
      setBusy(null);
    }
  }

  async function deleteManagement(key: string, label: string) {
    if (
      !window.confirm(
        `مدیریت «${label}» حذف شود؟ کسب‌وکارهای وابسته به مدیریت پایه منتقل می‌شوند.`,
      )
    ) {
      return;
    }
    setBusy(`delete:${key}`);
    try {
      await api.delete(`/admin/business-modules/managements/${key}`);
      toast.success('مدیریت کسب‌وکار حذف شد');
      await loadManagements();
    } finally {
      setBusy(null);
    }
  }

  async function addModule(key: string) {
    const moduleKey = moduleDraft[key];
    if (!moduleKey) return;
    setBusy(`add:${key}`);
    try {
      await api.post(`/admin/business-modules/managements/${key}/modules`, {
        moduleKey,
      });
      setModuleDraft((current) => ({ ...current, [key]: '' }));
      toast.success('ماژول اضافه شد');
      await loadManagements();
    } finally {
      setBusy(null);
    }
  }

  async function removeModule(key: string, moduleKey: string) {
    setBusy(`remove:${key}:${moduleKey}`);
    try {
      await api.delete(
        `/admin/business-modules/managements/${key}/modules/${moduleKey}`,
      );
      toast.success('ماژول حذف شد');
      await loadManagements();
    } finally {
      setBusy(null);
    }
  }

  async function createManagement() {
    if (!createForm.label.trim()) {
      toast.error('نام مدیریت کسب‌وکار را وارد کنید.');
      return;
    }
    if (!createForm.key.trim()) {
      toast.error('کلید انگلیسی یکتا را وارد کنید.');
      return;
    }
    if (createForm.categoryIds.length === 0) {
      toast.error('حداقل یک دسته‌بندی کسب‌وکار را انتخاب کنید.');
      return;
    }
    setBusy('create');
    try {
      await api.post('/admin/business-modules/managements', {
        key: createForm.key.trim(),
        label: createForm.label.trim(),
        available: false,
        categoryIds: createForm.categoryIds,
      });
      toast.success('مدیریت کسب‌وکار ساخته شد');
      setCreateForm({ key: '', label: '', categoryIds: [] });
      setShowCreate(false);
      await loadManagements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ساخت مدیریت ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function saveCategories(key: string) {
    const categoryIds = categoryDraft[key] ?? [];
    if (categoryIds.length === 0) {
      toast.error('حداقل یک دسته‌بندی کسب‌وکار را انتخاب کنید.');
      return;
    }
    setBusy(`categories:${key}`);
    try {
      await api.patch(`/admin/business-modules/managements/${key}`, {
        categoryIds,
      });
      toast.success('دسته‌بندی‌های مدیریت کسب‌وکار ذخیره شد');
      await loadManagements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره دسته‌بندی ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !catalog) {
    return <p className="text-muted">در حال بارگذاری ماژول‌ها…</p>;
  }

  const openModule = openModuleKey
    ? catalog?.modules.find((module) => module.key === openModuleKey)
    : undefined;
  if (openModule) {
    return (
      <AdminBusinessModuleDetail
        key={openModule.key}
        module={openModule}
        managements={managements}
        onBack={() => setOpenModuleKey(null)}
        onChanged={async () => {
          await Promise.all([loadCatalog(), loadManagements()]);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="indeed-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-ink">
              مدیریت‌های کسب‌وکار
            </h3>
            <p className="text-xs leading-6 text-muted">
              هر کارت یک «مدیریت کسب‌وکار» است. قیمت کل، مجموع قیمت ماژول‌های
              همان کارت است و دکمه‌ی همگام‌سازی، همین مبلغ را در پی‌پینگ به‌عنوان
              محصول می‌سازد یا به‌روزرسانی می‌کند.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--vintage-paper)] px-3 py-1 text-xs font-bold text-muted">
              {catalog?.totals.workspaces ?? 0} کسب‌وکار
            </span>
            <button
              type="button"
              onClick={() => setShowCreate((value) => !value)}
              className="indeed-btn indeed-btn-primary py-1.5 text-[11px] disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden />
              {showCreate ? 'بستن فرم' : 'مدیریت جدید'}
            </button>
          </div>
        </div>

        {showCreate ? (
          <div className="mb-4 rounded-xl border border-dashed border-[var(--vintage-border)] bg-[var(--vintage-paper)]/40 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-[11px] font-bold text-muted">
                نام مدیریت *
                <input
                  className="indeed-input mt-1 py-1.5 text-sm"
                  value={createForm.label}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-[11px] font-bold text-muted">
                کلید انگلیسی یکتا *
                <input
                  className="indeed-input mt-1 py-1.5 text-sm"
                  dir="ltr"
                  value={createForm.key}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      key: event.target.value.replace(/[^a-zA-Z0-9_-]/g, ''),
                    }))
                  }
                  placeholder="dailyRental"
                />
              </label>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold text-muted">
                دسته‌بندی‌های کسب‌وکار *
              </p>
              <div className="mt-2 grid max-h-52 gap-1.5 overflow-y-auto rounded-lg border border-[var(--vintage-border)] p-2 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => {
                  const checked = createForm.categoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-[11px]',
                        checked ? 'bg-brand-light text-brand' : 'text-muted',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            categoryIds: event.target.checked
                              ? [...current.categoryIds, category.id]
                              : current.categoryIds.filter(
                                  (id) => id !== category.id,
                                ),
                          }))
                        }
                      />
                      {category.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void createManagement()}
              disabled={busy === 'create'}
              className="indeed-btn indeed-btn-primary mt-3 py-1.5 text-[11px] disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden />
              ساخت مدیریت کسب‌وکار
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {managements.map((management) => {
            const syncBusy = busy === `sync:${management.key}`;
            const billableModules = management.modules.filter(
              (module) => module.billable,
            );
            const availableModules = (catalog?.modules ?? []).filter(
              (module) =>
                !management.modules.some((item) => item.key === module.key),
            );
            const discountValue = discountDraft[management.key];
            return (
              <article
                key={management.key}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="vintage-avatar flex size-9 items-center justify-center">
                      <Layers className="size-4" aria-hidden />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-ink">
                        {management.label}
                      </h4>
                      <p className="text-[10px] text-muted">
                        {management.modules.length} ماژول ·{' '}
                        {billableModules.length} قابل فروش
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        management.available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {management.available ? 'نمایش به کاربر' : 'پنهان'}
                    </span>
                    {!management.isBase ? (
                      <button
                        type="button"
                        onClick={() =>
                          void deleteManagement(management.key, management.label)
                        }
                        disabled={busy === `delete:${management.key}`}
                        className="rounded-md p-1 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="حذف کامل مدیریت"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </div>

                <p className="text-[11px] leading-6 text-muted">
                  {management.description}
                </p>

                <div
                  className={cn(
                    'rounded-lg border p-2.5',
                    management.needsCategory
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-dashed border-[var(--vintage-border)]',
                  )}
                >
                  <p className="text-[10px] font-bold text-muted">
                    دسته‌بندی‌های کسب‌وکار
                    {management.needsCategory ? (
                      <span className="ms-1 text-amber-700">
                        — تکمیل نشده؛ حتماً انتخاب کنید
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1.5 grid max-h-40 gap-1 overflow-y-auto">
                    {categories.map((category) => {
                      const checked = (categoryDraft[management.key] ?? []).includes(
                        category.id,
                      );
                      return (
                        <label
                          key={category.id}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded px-1.5 py-0.5 text-[11px]',
                            checked ? 'bg-brand-light text-brand' : 'text-muted',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setCategoryDraft((current) => {
                                const list = current[management.key] ?? [];
                                return {
                                  ...current,
                                  [management.key]: event.target.checked
                                    ? [...list, category.id]
                                    : list.filter((id) => id !== category.id),
                                };
                              })
                            }
                          />
                          {category.name}
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveCategories(management.key)}
                    disabled={busy === `categories:${management.key}`}
                    className="indeed-btn indeed-btn-secondary mt-2 py-1 text-[10px] disabled:opacity-50"
                  >
                    <Save className="size-3" aria-hidden />
                    ذخیره دسته‌بندی‌ها
                  </button>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {management.modules.map((module) => (
                    <li
                      key={module.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--vintage-border)] px-2.5 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[11px] font-bold text-ink">
                        {module.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-[10px]">
                        {module.defaultEnabled ? (
                          <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-brand">
                            پیش‌فرض
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            'font-bold',
                            module.price > 0 ? 'text-ink' : 'text-muted',
                          )}
                        >
                          {module.price > 0
                            ? `${formatToman(module.price)} تومان`
                            : 'رایگان'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void removeModule(management.key, module.key)
                          }
                          disabled={
                            busy === `remove:${management.key}:${module.key}`
                          }
                          className="rounded p-0.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="حذف ماژول از این مدیریت"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-1.5">
                  <select
                    value={moduleDraft[management.key] ?? ''}
                    onChange={(event) =>
                      setModuleDraft((current) => ({
                        ...current,
                        [management.key]: event.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-[11px] text-ink"
                  >
                    <option value="">افزودن ماژول…</option>
                    {availableModules.map((module) => (
                      <option key={module.key} value={module.key}>
                        {module.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void addModule(management.key)}
                    disabled={
                      !moduleDraft[management.key] ||
                      busy === `add:${management.key}`
                    }
                    className="indeed-btn py-1.5 text-[11px] disabled:opacity-50"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    افزودن
                  </button>
                </div>

                <div className="rounded-lg border border-dashed border-[var(--vintage-border)] p-2.5">
                  <p className="mb-1.5 text-[10px] font-bold text-muted">
                    تخفیف دوره‌ها (٪)
                  </p>
                  <div className="flex items-end gap-1.5">
                    {(['3', '6', '12'] as const).map((months) => (
                      <label
                        key={months}
                        className="flex-1 text-[10px] text-muted"
                      >
                        {months === '12' ? 'یک‌ساله' : `${months} ماهه`}
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={discountValue?.[months] ?? ''}
                          onChange={(event) =>
                            setDiscountDraft((current) => ({
                              ...current,
                              [management.key]: {
                                ...current[management.key],
                                [months]: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1 text-xs text-ink"
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      onClick={() => void saveDiscounts(management.key)}
                      disabled={busy === `discount:${management.key}`}
                      className="indeed-btn indeed-btn-primary py-1.5 text-[11px] disabled:opacity-50"
                    >
                      <Save className="size-3.5" aria-hidden />
                      ذخیره
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {management.terms.map((term) => (
                    <span
                      key={term.months}
                      className="rounded-full border border-[var(--vintage-border)] px-2 py-0.5 text-[10px] text-muted"
                    >
                      {term.months === 1
                        ? '۱ ماهه'
                        : term.months === 12
                          ? 'یک‌ساله'
                          : `${term.months} ماهه`}
                      :{' '}
                      <b className="text-ink">
                        {formatToman(term.price)} تومان
                      </b>
                      {term.discount > 0 ? ` (${term.discount}٪)` : ''}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-[var(--vintage-border)] pt-3">
                  <div>
                    <p className="text-[10px] text-muted">قیمت پایه ماهانه</p>
                    <p className="text-sm font-extrabold text-ink">
                      {management.totalPrice > 0
                        ? `${formatToman(management.totalPrice)} تومان`
                        : 'رایگان'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void syncManagement(management.key)}
                    disabled={syncBusy || management.totalPrice < 1000}
                    className="indeed-btn indeed-btn-primary py-1.5 text-[11px] disabled:opacity-50"
                    title={
                      management.totalPrice < 1000
                        ? 'برای ساخت محصول، مجموع قیمت ماژول‌ها باید حداقل ۱۰۰۰ تومان باشد'
                        : undefined
                    }
                  >
                    <RefreshCw
                      className={cn('size-3.5', syncBusy && 'animate-spin')}
                      aria-hidden
                    />
                    {syncBusy ? 'در حال همگام‌سازی…' : 'همگام‌سازی با پی‌پینگ'}
                  </button>
                </div>

                <div className="rounded-lg bg-[var(--vintage-paper)]/50 px-2.5 py-2 text-[10px] leading-5 text-muted">
                  {Object.keys(management.productCodes).length > 0 ? (
                    <>
                      {Object.entries(management.productCodes).map(
                        ([months, code]) => (
                          <div key={months} className="flex justify-between gap-2">
                            <span>
                              {months === '1'
                                ? '۱ ماهه'
                                : months === '12'
                                  ? 'یک‌ساله'
                                  : `${months} ماهه`}
                            </span>
                            <span className="font-mono text-ink" dir="ltr">
                              {code ?? '—'}
                            </span>
                          </div>
                        ),
                      )}
                      {management.simulated ? 'شبیه‌ساز · ' : ''}
                      آخرین همگام‌سازی: {formatDate(management.lastSyncedAt)}
                    </>
                  ) : (
                    'هنوز محصولی در پی‌پینگ برای این کارت ساخته نشده است.'
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="indeed-panel p-5">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold text-ink">
            ماژول‌ها و قیمت‌گذاری
          </h3>
          <p className="text-xs leading-6 text-muted">
            روی هر ماژول کلیک کنید تا صفحه‌ی مدیریت آن (تنظیمات، قیمت و
            مدیریت‌هایی که شاملش هستند) باز شود. قیمت ۰ یعنی فعال‌سازی رایگان.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {modulesByGroup.map(([group, modules]) => (
            <div key={group}>
              <h4 className="mb-2 text-xs font-extrabold text-brand">{group}</h4>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => {
                  const value = draft[module.key];
                  return (
                    <article
                      key={module.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setOpenModuleKey(module.key)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setOpenModuleKey(module.key);
                        }
                      }}
                      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-3 transition hover:border-brand hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-ink">
                            {module.label}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-5 text-muted">
                            {module.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {module.defaultEnabled ? (
                            <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[9px] font-bold text-brand">
                              پیش‌فرض
                            </span>
                          ) : null}
                          <span className="text-[9px] text-muted">
                            {module.enabledWorkspaces.toLocaleString('fa-IR')}{' '}
                            فعال
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          onClick={(event) => event.stopPropagation()}
                          className="text-[10px] font-bold text-muted"
                        >
                          قیمت ماهانه (تومان)
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
                            className="mt-1 w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-xs text-ink"
                          />
                        </label>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <label
                          onClick={(event) => event.stopPropagation()}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-muted"
                        >
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
                          قابل خرید
                        </label>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void savePrice(module.key);
                          }}
                          disabled={busy === `price:${module.key}`}
                          className="indeed-btn indeed-btn-primary py-1.5 text-[11px] disabled:opacity-50"
                        >
                          <Save className="size-3.5" aria-hidden />
                          ذخیره
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
