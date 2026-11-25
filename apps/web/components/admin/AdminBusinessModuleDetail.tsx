'use client';

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Layers,
  Loader2,
  Save,
} from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import { AdminRetailSettings } from './AdminRetailSettings';
import type {
  AdminManagement,
  AdminModuleRow,
} from './admin-business-modules.types';

function formatToman(amount: number): string {
  return amount.toLocaleString('fa-IR');
}

/**
 * Dedicated management view for one business module: its metadata, pricing
 * settings and the «مدیریت‌های کسب‌وکار» that include it. Per-workspace
 * enablement lives in the user detail panel instead.
 */
export function AdminBusinessModuleDetail({
  module,
  managements,
  onBack,
  onChanged,
}: {
  module: AdminModuleRow;
  managements: AdminManagement[];
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [price, setPrice] = useState(String(module.price));
  const [isActive, setIsActive] = useState(module.priceActive);
  const [description, setDescription] = useState(module.priceDescription ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const includedIn = useMemo(
    () =>
      new Set(
        managements
          .filter((management) =>
            management.modules.some((item) => item.key === module.key),
          )
          .map((management) => management.key),
      ),
    [managements, module.key],
  );

  async function saveSettings() {
    setBusy('settings');
    try {
      await api.patch(`/admin/business-modules/prices/${module.key}`, {
        price: Number(price) || 0,
        isActive,
        description: description.trim(),
      });
      toast.success('تنظیمات ماژول ذخیره شد');
      await onChanged();
    } catch {
      // toast already shown by the API client
    } finally {
      setBusy(null);
    }
  }

  async function toggleManagement(management: AdminManagement, include: boolean) {
    setBusy(`management:${management.key}`);
    try {
      if (include) {
        await api.post(
          `/admin/business-modules/managements/${management.key}/modules`,
          { moduleKey: module.key },
        );
      } else {
        await api.delete(
          `/admin/business-modules/managements/${management.key}/modules/${module.key}`,
        );
      }
      toast.success(
        include
          ? `ماژول به «${management.label}» اضافه شد`
          : `ماژول از «${management.label}» حذف شد`,
      );
      await onChanged();
    } catch {
      // toast already shown by the API client
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="indeed-btn indeed-btn-secondary py-2 text-sm"
        >
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به فهرست ماژول‌ها
        </button>
        <span className="rounded-full bg-[var(--vintage-paper)] px-3 py-1 text-xs font-bold text-muted">
          {formatToman(module.enabledWorkspaces)} کسب‌وکار فعال
        </span>
      </div>

      <section className="indeed-panel p-5">
        <div className="flex items-start gap-3">
          <span className="vintage-avatar flex size-11 shrink-0 items-center justify-center">
            <Layers className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-extrabold text-ink">{module.label}</h3>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand">
                {module.group}
              </span>
              {module.defaultEnabled ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  پیش‌فرض
                </span>
              ) : null}
              {module.billable ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  قابل فروش
                </span>
              ) : (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                  رایگان
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {module.description}
            </p>
          </div>
        </div>

        {module.capabilities && module.capabilities.length > 0 ? (
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {module.capabilities.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--vintage-border)] px-2.5 py-1.5 text-xs text-ink"
              >
                <Check className="size-3.5 text-emerald-600" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-[var(--vintage-paper)]/60 px-3 py-2">
            <dt className="text-[10px] font-bold text-muted">کلید فنی</dt>
            <dd className="mt-0.5 font-mono text-ink" dir="ltr">
              {module.key}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--vintage-paper)]/60 px-3 py-2">
            <dt className="text-[10px] font-bold text-muted">اعمال سمت سرور</dt>
            <dd className="mt-0.5 font-bold text-ink">
              {module.enforced ? 'فعال' : 'غیرفعال'}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--vintage-paper)]/60 px-3 py-2">
            <dt className="text-[10px] font-bold text-muted">سوئیچ ویژگی</dt>
            <dd className="mt-0.5 font-mono text-ink" dir="ltr">
              {module.featureFlag ?? '—'}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--vintage-paper)]/60 px-3 py-2">
            <dt className="text-[10px] font-bold text-muted">وابستگی‌ها</dt>
            <dd className="mt-0.5 font-mono text-ink" dir="ltr">
              {module.dependsOn?.length ? module.dependsOn.join(', ') : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {module.nav ? (
            <a
              href={module.nav.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 font-bold text-brand hover:bg-soft"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              پنل کاربری: {module.nav.label}
            </a>
          ) : null}
          {(module.publicRoutes ?? []).map((route) => (
            <a
              key={route}
              href={route}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--vintage-border)] bg-white px-2 py-1 font-bold text-muted hover:bg-soft"
              dir="ltr"
            >
              {route}
            </a>
          ))}
        </div>
      </section>

      <section className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">تنظیمات ماژول</h4>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          قیمت ماهانه و وضعیت فروش این ماژول را تعیین کنید. قیمت ۰ یعنی
          فعال‌سازی رایگان.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-[11px] font-bold text-muted">
            قیمت ماهانه (تومان)
            <input
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-sm text-ink"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-[11px] font-bold text-muted">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            قابل خرید در پنل کاربر
          </label>
        </div>
        <label className="mt-3 block text-[11px] font-bold text-muted">
          توضیح قیمت (اختیاری)
          <textarea
            value={description}
            maxLength={400}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2 py-1.5 text-sm text-ink"
          />
        </label>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={busy === 'settings'}
          className="indeed-btn indeed-btn-primary mt-3 py-1.5 text-xs disabled:opacity-50"
        >
          {busy === 'settings' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-3.5" aria-hidden />
          )}
          ذخیره تنظیمات
        </button>
      </section>

      <section className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">
          مدیریت‌های کسب‌وکار شامل این ماژول
        </h4>
        <p className="mt-0.5 text-xs leading-6 text-muted">
          با انتخاب هر مدیریت، این ماژول به بسته‌ی آن اضافه یا از آن حذف می‌شود.
          برای فعال/غیرفعال‌کردن ماژول برای یک کسب‌وکار مشخص، از بخش «کاربران»
          و صفحه‌ی همان کاربر استفاده کنید.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {managements.map((management) => {
            const included = includedIn.has(management.key);
            const key = `management:${management.key}`;
            return (
              <label
                key={management.key}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs',
                  included
                    ? 'border-brand bg-brand-light text-brand'
                    : 'border-[var(--vintage-border)] text-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={included}
                    disabled={busy === key}
                    onChange={(event) =>
                      void toggleManagement(management, event.target.checked)
                    }
                  />
                  <span className="font-bold">{management.label}</span>
                </span>
                {busy === key ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
              </label>
            );
          })}
        </div>
      </section>

      {module.key === 'retailCatalog' ? <AdminRetailSettings /> : null}
    </div>
  );
}
