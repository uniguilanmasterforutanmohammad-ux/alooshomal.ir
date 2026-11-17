'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
  ArrowUpLeft,
  Check,
  Lock,
  Plus,
  Power,
  Save,
  ShoppingCart,
} from 'lucide-react';

import { BusinessPanelNav, moduleIcon } from '@/components/business/BusinessPanelNav';
import { api, WORKSPACE_STORAGE_KEY } from '@/lib/api';
import type {
  BusinessWorkspace,
  BusinessWorkspaceSummary,
  ResolvedBusinessModule,
} from '@/lib/api/types/business-modules';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface PurchaseResult {
  url?: string;
  activated?: boolean;
  free?: boolean;
  amount?: number;
}

function formatToman(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

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
    const purchase = searchParams.get('purchase');
    if (purchase === 'success') {
      toast.success('پرداخت تأیید شد و ماژول فعال شد');
      void reload();
    } else if (purchase === 'failed') {
      toast.error('پرداخت انجام نشد یا لغو شد');
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

  async function toggleModule(key: string, nextEnabled: boolean) {
    setBusy(key);
    try {
      const next = await api.patch<BusinessWorkspace>(
        `/business-modules/my/${key}`,
        { enabled: nextEnabled },
      );
      setWorkspace(next);
      toast.success(nextEnabled ? 'ماژول فعال شد' : 'ماژول غیرفعال شد');
    } finally {
      setBusy(null);
    }
  }

  async function purchaseModule(module: ResolvedBusinessModule) {
    setBusy(module.key);
    try {
      const result = await api.post<PurchaseResult>(
        `/business-modules/my/${module.key}/purchase`,
        { returnTo: '/dashboard/business' },
      );
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      toast.success('ماژول فعال شد');
      await reload();
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
            هر قابلیت یک ماژول مستقل است؛ فقط مدیریت‌هایی را فعال یا خریداری کنید
            که کسب‌وکارتان به آن‌ها نیاز دارد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              disabled={busy === 'industry'}
              className="w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              {workspace.industries.map((industry) => (
                <option key={industry.key} value={industry.key}>
                  {industry.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">{workspace.industry.description}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">مدیریت‌های کسب‌وکار</h2>
          <span className="text-xs text-muted">
            {activeModules.length} مدیریت فعال
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.modules.map((module) => {
            const Icon = moduleIcon(module.icon);
            const needsPurchase = module.billable && module.price > 0 && !module.purchased;
            return (
              <article
                key={module.key}
                className={cn(
                  'indeed-panel flex flex-col gap-3 p-5 transition',
                  module.enabled ? 'border-brand/40' : 'opacity-90',
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
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      module.enabled
                        ? 'bg-emerald-50 text-emerald-700'
                        : needsPurchase
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {module.enabled
                      ? 'فعال'
                      : needsPurchase
                        ? 'نیازمند خرید'
                        : 'غیرفعال'}
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
                {module.billable ? (
                  <p className="text-[11px] font-bold text-ink">
                    {module.price > 0
                      ? `${formatToman(module.price)} / ${module.months > 0 ? `${module.months} ماه` : 'دائمی'}`
                      : 'رایگان (با تعیین قیمت توسط مدیر قابل فروش می‌شود)'}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  {module.nav && module.enabled ? (
                    <Link
                      href={module.nav.href}
                      prefetch={false}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                    >
                      ورود به ماژول
                      <ArrowUpLeft className="size-3" aria-hidden />
                    </Link>
                  ) : (
                    <span />
                  )}
                  {module.enabled ? (
                    <button
                      type="button"
                      onClick={() => void toggleModule(module.key, false)}
                      disabled={busy === module.key}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <Power className="size-3.5" aria-hidden />
                      غیرفعال‌کردن
                    </button>
                  ) : needsPurchase ? (
                    <button
                      type="button"
                      onClick={() => void purchaseModule(module)}
                      disabled={busy === module.key}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      <ShoppingCart className="size-3.5" aria-hidden />
                      خرید و فعال‌سازی
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggleModule(module.key, true)}
                      disabled={busy === module.key}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {module.billable ? (
                        <Lock className="size-3.5" aria-hidden />
                      ) : (
                        <Power className="size-3.5" aria-hidden />
                      )}
                      فعال‌کردن
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
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
