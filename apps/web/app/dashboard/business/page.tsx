'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  ArrowUpLeft,
  Check,
  Layers,
  Plus,
  Save,
  ShoppingCart,
} from 'lucide-react';

import { BusinessPanelNav, moduleIcon } from '@/components/business/BusinessPanelNav';
import { api, WORKSPACE_STORAGE_KEY } from '@/lib/api';
import type {
  BusinessWorkspace,
  BusinessWorkspaceSummary,
  ManagementPackage,
} from '@/lib/api/types/business-modules';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { formatJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

function BusinessPanelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace, setWorkspace, loading, error, reload } =
    useBusinessWorkspace(enabled);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [workspaces, setWorkspaces] = useState<BusinessWorkspaceSummary[]>([]);
  const [managements, setManagements] = useState<ManagementPackage[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<
    Record<string, 1 | 3 | 6 | 12>
  >({});

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/dashboard/business');
  }, [hydrated, token, router]);

  useEffect(() => {
    if (workspace) setName(workspace.name);
  }, [workspace]);

  useEffect(() => {
    if (!enabled) return;
    void api
      .get<BusinessWorkspaceSummary[]>('/business-modules/workspaces')
      .then(setWorkspaces)
      .catch(() => undefined);
  }, [enabled, workspace?.id]);

  useEffect(() => {
    if (!enabled) return;
    void api
      .get<ManagementPackage[]>('/business-modules/managements')
      .then(setManagements)
      .catch(() => undefined);
  }, [enabled, workspace?.id]);

  useEffect(() => {
    const purchase = searchParams.get('purchase');
    if (purchase === 'success') {
      toast.success('پرداخت تأیید شد و ماژول فعال شد');
      void reload();
    } else if (purchase === 'failed') {
      toast.error('پرداخت انجام نشد یا لغو شد');
    } else if (purchase === 'pending') {
      toast.info(
        'تأیید پرداخت در حال پردازش است؛ چند لحظه بعد صفحه را دوباره باز کنید.',
      );
    }
  }, [searchParams, reload]);

  async function changeIndustry(industryKey: string) {
    setBusy('industry');
    try {
      const next = await api.patch<BusinessWorkspace>(
        '/business-modules/my/industry',
        { industryKey },
      );
      setWorkspace(next);
      toast.success('بسته‌ی صنف به‌روزرسانی شد');
    } finally {
      setBusy(null);
    }
  }

  async function saveName() {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      const next = await api.patch<BusinessWorkspace>('/business-modules/my', {
        name: name.trim(),
      });
      setWorkspace(next);
      toast.success('نام کسب‌وکار ذخیره شد');
    } finally {
      setSavingName(false);
    }
  }

  async function makeDefault() {
    if (!workspace) return;
    setBusy('default');
    try {
      await api.patch(`/business-modules/workspaces/${workspace.id}`, {
        isDefault: true,
      });
      toast.success('این کسب‌وکار پیش‌فرض شد');
      await reload();
    } finally {
      setBusy(null);
    }
  }

  async function addWorkspace() {
    const nextName = window.prompt('نام کسب‌وکار جدید:');
    if (!nextName?.trim()) return;
    setBusy('create');
    try {
      const list = await api.post<BusinessWorkspaceSummary[]>(
        '/business-modules/workspaces',
        { name: nextName.trim() },
      );
      const created = list.find((item) => item.name === nextName.trim());
      if (created) {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, created.id);
        window.dispatchEvent(new Event('alooshomal:workspace-changed'));
      }
      setWorkspaces(list);
      toast.success('کسب‌وکار جدید ساخته شد');
      await reload();
    } catch {
      // The API already surfaced the plan-limit message.
    } finally {
      setBusy(null);
    }
  }

  async function buyManagement(packageKey: string, months: 1 | 3 | 6 | 12) {
    setBusy(`buy:${packageKey}`);
    try {
      const result = await api.post<
        | { url?: string; free?: boolean; wallet?: boolean }
        | { url?: string }
      >(`/business-modules/managements/${packageKey}/purchase`, {
        months,
        returnTo: '/dashboard/business',
      });
      if (result && 'url' in result && result.url) {
        window.location.href = result.url;
        return;
      }
      toast.success('مدیریت کسب‌وکار فعال شد');
      await reload();
      const next = await api.get<ManagementPackage[]>(
        '/business-modules/managements',
      );
      setManagements(next);
    } catch {
      // The API already surfaced the error message.
    } finally {
      setBusy(null);
    }
  }

  if (loading && !workspace) {
    return <p className="text-muted">در حال بارگذاری پنل کسب‌وکار…</p>;
  }
  if (error && !workspace) {
    return (
      <div className="indeed-panel p-6">
        <p className="text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => void reload()} className="indeed-btn mt-4">
          تلاش دوباره
        </button>
      </div>
    );
  }
  if (!workspace) return null;

  const activeModules = workspace.modules.filter((item) => item.enabled);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">مدیریت کسب‌وکار</h1>
          <p className="mt-1 text-sm text-muted">
            در این بخش مدیریت‌های فعال کسب‌وکار خود را می‌بینید. فعال‌سازی یا
            غیرفعال‌سازی ماژول‌ها توسط مدیر سامانه انجام می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {workspace.subscriptionPaidUntil ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              اعتبار مدیریت تا {formatJalali(workspace.subscriptionPaidUntil)}
            </span>
          ) : null}
          <span className="rounded-full border border-[var(--vintage-border)] px-3 py-1.5 text-xs font-bold text-muted">
            {workspace.capacity.used} از {workspace.capacity.max} کسب‌وکار
          </span>
          <button
            type="button"
            onClick={() => void addWorkspace()}
            disabled={busy === 'create'}
            className="indeed-btn indeed-btn-primary disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            کسب‌وکار جدید
          </button>
        </div>
      </div>

      <BusinessPanelNav modules={workspace.modules} />

      {workspaces.length > 1 ? (
        <section className="indeed-panel p-4">
          <p className="mb-2 text-xs font-bold text-muted">کسب‌وکارهای من</p>
          <div className="flex flex-wrap gap-2">
            {workspaces.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, item.id);
                  window.dispatchEvent(new Event('alooshomal:workspace-changed'));
                  void reload();
                }}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-bold transition',
                  item.id === workspace.id
                    ? 'border-brand bg-brand-light text-brand'
                    : 'border-[var(--vintage-border)] text-muted hover:text-ink',
                )}
              >
                {item.name}
                {item.isDefault ? ' · پیش‌فرض' : ''}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="indeed-panel p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <label className="mb-1 block text-xs font-bold text-muted">
              نام نمایشی کسب‌وکار
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                maxLength={120}
              />
              <button
                type="button"
                onClick={() => void saveName()}
                disabled={savingName || name.trim() === workspace.name}
                className="indeed-btn indeed-btn-primary shrink-0 disabled:opacity-50"
              >
                <Save className="size-4" aria-hidden />
                ذخیره
              </button>
            </div>
            {!workspace.isDefault ? (
              <button
                type="button"
                onClick={() => void makeDefault()}
                disabled={busy === 'default'}
                className="mt-2 text-xs font-bold text-brand disabled:opacity-50"
              >
                این کسب‌وکار پیش‌فرض من باشد
              </button>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-muted">
              بسته‌ی صنف
            </label>
            <select
              value={workspace.industryKey}
              onChange={(event) => void changeIndustry(event.target.value)}
              disabled={busy === 'industry' || workspace.industryLocked}
              className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              {workspace.industries.map((industry) => (
                <option key={industry.key} value={industry.key}>
                  {industry.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              {workspace.industryLocked
                ? 'پس از خرید «مدیریت کسب‌وکار»، صنف این کسب‌وکار ثابت است و قابل تغییر نیست. برای صنف دیگر یک کسب‌وکار جدید بسازید.'
                : workspace.industry.description}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink">
              مدیریت کسب‌وکارها
            </h2>
            <p className="text-xs text-muted">
              {workspace.industryLocked
                ? 'این کسب‌وکار بسته‌ی صنف خود را انتخاب کرده است؛ برای راه‌اندازی صنف دیگری یک کسب‌وکار جدید بسازید.'
                : 'هر «مدیریت کسب‌وکار» مجموعه‌ای از ماژول‌هاست. قیمت پایه، مجموع قیمت ماهانه‌ی ماژول‌هاست و دوره‌های ۱/۳/۶/۱۲ ماهه با تخفیف قابل خریدند.'}
            </p>
          </div>
          <span className="text-xs text-muted">
            {managements.length} مدیریت قابل انتخاب
          </span>
        </div>
        {managements.length === 0 ? (
          <div className="indeed-panel p-6 text-center text-sm text-muted">
            در حال بارگذاری مدیریت‌های کسب‌وکار…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {managements.map((item) => {
              const busyKey = `buy:${item.key}`;
              const isCurrent = workspace.industryKey === item.key;
              const paidModules = item.modules.filter((module) => module.billable);
              const term = selectedTerm[item.key] ?? 1;
              const selectedTermData = item.terms.find(
                (option) => option.months === term,
              );
              const payable = Math.round(
                item.remainingPrice *
                  term *
                  (1 - (selectedTermData?.discount ?? 0) / 100),
              );
              return (
                <article
                  key={item.key}
                  className={cn(
                    'indeed-panel flex flex-col gap-3 p-5',
                    isCurrent && 'border-brand/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="vintage-avatar flex size-10 items-center justify-center">
                        <Layers className="size-5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-sm font-extrabold text-ink">
                          {item.label}
                        </h3>
                        <p className="text-[11px] text-muted">
                          {item.activeModules} از {item.moduleCount} ماژول فعال
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-bold',
                        item.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {item.active ? 'فعال' : 'قابل خرید'}
                    </span>
                  </div>
                  {item.paidUntil ? (
                    <p className="text-[11px] font-bold text-emerald-700">
                      اعتبار دوره تا {formatJalali(item.paidUntil)}
                    </p>
                  ) : null}
                  <p className="text-xs leading-6 text-muted">
                    {item.description}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {item.modules.map((module) => (
                      <li
                        key={module.key}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          module.enabled
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-[var(--vintage-border)] text-muted',
                        )}
                      >
                        {module.label}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <div className="flex flex-wrap gap-1.5">
                      {item.terms.map((option) => {
                        const active = option.months === term;
                        const optionPrice = Math.round(
                          item.remainingPrice *
                            option.months *
                            (1 - option.discount / 100),
                        );
                        return (
                          <button
                            key={option.months}
                            type="button"
                            onClick={() =>
                              setSelectedTerm((current) => ({
                                ...current,
                                [item.key]: option.months,
                              }))
                            }
                            className={cn(
                              'flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-[10px] transition',
                              active
                                ? 'border-brand bg-brand-light text-brand'
                                : 'border-[var(--vintage-border)] text-muted hover:text-ink',
                            )}
                          >
                            <span className="font-bold">
                              {option.months === 1
                                ? '۱ ماهه'
                                : option.months === 12
                                  ? 'یک‌ساله'
                                  : `${option.months} ماهه`}
                            </span>
                            <span>
                              {optionPrice > 0
                                ? `${optionPrice.toLocaleString('fa-IR')} تومان`
                                : 'رایگان'}
                            </span>
                            {option.discount > 0 ? (
                              <span className="text-[9px] text-emerald-700">
                                {option.discount}٪ تخفیف
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="text-xs">
                        <p className="font-bold text-ink">
                          قیمت پایه ماهانه:{' '}
                          {item.totalPrice > 0
                            ? `${item.totalPrice.toLocaleString('fa-IR')} تومان`
                            : 'رایگان'}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          مبلغ قابل پرداخت:{' '}
                          {payable > 0
                            ? `${payable.toLocaleString('fa-IR')} تومان`
                            : 'رایگان'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void buyManagement(item.key, term)}
                        disabled={
                          busy === busyKey ||
                          (item.active && item.remainingPrice === 0)
                        }
                        className="indeed-btn indeed-btn-primary shrink-0 py-2 text-xs disabled:opacity-50"
                      >
                        <ShoppingCart className="size-4" aria-hidden />
                        {item.active
                          ? 'فعال‌شده'
                          : item.remainingPrice > 0
                            ? 'خرید و فعال‌سازی'
                            : 'فعال‌سازی'}
                      </button>
                    </div>
                  </div>
                  {paidModules.length > 0 && !item.active ? (
                    <p className="text-[10px] text-muted">
                      فقط ماژول‌های خریداری‌نشده محاسبه می‌شود.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-ink">
              مدیریت‌های فعال کسب‌وکار
            </h2>
            <p className="text-xs text-muted">
              فعال یا غیرفعال‌کردن ماژول‌ها توسط مدیر سامانه انجام می‌شود؛ در این
              بخش فقط مدیریت‌های فعال کسب‌وکار شما نمایش داده می‌شود.
            </p>
          </div>
          <span className="text-xs text-muted">
            {activeModules.length} مدیریت فعال
          </span>
        </div>
        {activeModules.length === 0 ? (
          <div className="indeed-panel p-8 text-center text-sm text-muted">
            هنوز هیچ مدیریتی برای این کسب‌وکار فعال نشده است. برای فعال‌سازی با
            پشتیبانی در ارتباط باشید.
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeModules.map((module) => {
            const Icon = moduleIcon(module.icon);
            return (
              <article
                key={module.key}
                className={cn(
                  'indeed-panel flex flex-col gap-3 border-brand/40 p-5 transition',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="vintage-avatar flex size-10 items-center justify-center">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-ink">{module.label}</h3>
                      <p className="text-[11px] text-muted">{module.group}</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                  >
                    فعال
                  </span>
                </div>
                <p className="text-xs leading-6 text-muted">{module.description}</p>
                <ul className="flex flex-col gap-1 text-[11px] text-muted">
                  {module.capabilities.map((capability) => (
                    <li key={capability} className="flex items-center gap-1.5">
                      <Check className="size-3 text-brand" aria-hidden />
                      {capability}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-2">
                  {module.nav ? (
                    <Link
                      href={module.nav.href}
                      prefetch={false}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                    >
                      ورود به ماژول
                      <ArrowUpLeft className="size-3" aria-hidden />
                    </Link>
                  ) : (
                    <span className="text-[11px] text-muted">
                      این مدیریت صفحه‌ی اختصاصی ندارد.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}

export default function BusinessPanelPage() {
  return (
    <Suspense fallback={<p className="text-muted">در حال بارگذاری…</p>}>
      <BusinessPanelContent />
    </Suspense>
  );
}
