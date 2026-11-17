'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowUpLeft, Check, Power, Save } from 'lucide-react';

import { BusinessPanelNav, moduleIcon } from '@/components/business/BusinessPanelNav';
import { api, type BusinessWorkspace } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export default function BusinessPanelPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace, setWorkspace, loading, error, reload } =
    useBusinessWorkspace(enabled);
  const [busy, setBusy] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login?next=/dashboard/business');
  }, [hydrated, token, router]);

  useEffect(() => {
    if (workspace) setName(workspace.name);
  }, [workspace]);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">پنل کسب‌وکار</h1>
        <p className="mt-1 text-sm text-muted">
          صنف خود را انتخاب کنید و فقط ماژول‌هایی را فعال نگه دارید که کسب‌وکارتان
          به آن‌ها نیاز دارد.
        </p>
      </div>

      <BusinessPanelNav modules={workspace.modules} />

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
          <h2 className="text-lg font-extrabold text-ink">ماژول‌های کسب‌وکار</h2>
          <span className="text-xs text-muted">
            {workspace.modules.filter((item) => item.enabled).length} ماژول فعال
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspace.modules.map((module) => {
            const Icon = moduleIcon(module.icon);
            return (
              <article
                key={module.key}
                className={cn(
                  'indeed-panel flex flex-col gap-3 p-5 transition',
                  module.enabled ? 'border-brand/40' : 'opacity-80',
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
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {module.enabled ? 'فعال' : 'غیرفعال'}
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
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
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
                  <button
                    type="button"
                    onClick={() => void toggleModule(module.key, !module.enabled)}
                    disabled={busy === module.key}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50',
                      module.enabled
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                    )}
                  >
                    <Power className="size-3.5" aria-hidden />
                    {module.enabled ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
