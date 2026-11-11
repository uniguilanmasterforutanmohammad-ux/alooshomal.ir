'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Moon, Palette, Sun } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  SITE_THEME_OPTIONS,
  isSiteTheme,
  siteThemeDocumentAttrs,
  type SiteTheme,
} from '@/lib/site-theme';
import { cn } from '@/lib/utils';
import { EXTRA_THEME_PREVIEWS } from './theme-previews';

interface SettingsPayload {
  siteTheme?: string;
}

/**
 * «ظاهر سایت» — the admin picks the design every visitor sees.
 *
 * The choice is stored server-side (`siteTheme`) and written on `<html
 * data-theme>` by the root layout, so all public pages, dashboards and the
 * business-card / biolink pages switch together. Dark/light stays a separate
 * per-visitor toggle, so each option shows both modes in its preview.
 */
export function AdminAppearanceSettings() {
  const router = useRouter();
  const { token } = useAuth();
  const [theme, setTheme] = useState<SiteTheme>('vintage');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SiteTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setTheme(isSiteTheme(result.siteTheme) ? result.siteTheme : 'vintage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات ظاهر');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(next: SiteTheme) {
    if (next === theme || busy) return;
    setBusy(next);
    setError(null);
    setMessage(null);
    try {
      // Go through the Next route so it can purge the cached root layout;
      // otherwise the new theme would only appear after the revalidation
      // window even though the API had already saved it.
      // Must stay under `/api/proxy/`: production nginx sends only that prefix
      // to the web app and routes every other `/api/*` path to NestJS.
      const response = await fetch('/api/proxy/site-theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ siteTheme: next }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { data?: SettingsPayload; message?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? 'ذخیره‌ی تم ناموفق بود');
      }
      const savedTheme = payload?.data?.siteTheme;
      const applied = isSiteTheme(savedTheme) ? savedTheme : next;
      setTheme(applied);
      // `router.refresh()` re-renders the RSC tree but Next does not re-apply
      // attributes on <html>, so set them here for instant visual feedback.
      const attrs = siteThemeDocumentAttrs(applied);
      document.documentElement.dataset.theme = attrs.theme;
      if (attrs.skin) {
        document.documentElement.dataset.skin = attrs.skin;
      } else {
        delete document.documentElement.dataset.skin;
      }
      // Re-render the server layout so `data-theme` updates immediately.
      router.refresh();
      const appliedName =
        SITE_THEME_OPTIONS.find((option) => option.key === applied)?.name ??
        applied;
      setMessage(`تم «${appliedName}» برای همه‌ی صفحات فعال شد.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره‌ی تم ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <Palette className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">ظاهر سایت</h3>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        تم سراسری سایت را انتخاب کنید؛ این انتخاب روی همه‌ی صفحات عمومی، داشبورد
        کاربران، کارت ویزیت و بیولینک اعمال می‌شود. حالت روشن/تیره همچنان با
        دکمه‌ی ماه/خورشید برای هر بازدیدکننده جداگانه قابل تغییر است.
      </p>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SITE_THEME_OPTIONS.map((option) => {
          const active = theme === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => choose(option.key)}
              disabled={loading || busy !== null}
              aria-pressed={active}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-3 text-right transition',
                active
                  ? 'border-brand bg-brand-light shadow-sm'
                  : 'border-[var(--vintage-border)] bg-[var(--vintage-surface)] hover:border-brand',
                busy === option.key && 'opacity-70',
              )}
            >
              <ThemePreview variant={option.key} />
              <div className="mt-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-extrabold text-ink">{option.name}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted">
                    {option.description}
                  </p>
                </div>
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition',
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-[var(--vintage-border)] text-transparent',
                  )}
                >
                  <Check className="size-3.5" aria-hidden />
                </span>
              </div>
              {active ? (
                <span className="absolute top-5 left-5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  فعال
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tiny in-place mockups so the admin can compare the available looks. */
function ThemePreview({ variant }: { variant: SiteTheme }) {
  const Extra = EXTRA_THEME_PREVIEWS[variant];
  if (Extra) return <Extra />;

  if (variant === 'bazaar') {
    return (
      <div className="overflow-hidden rounded-xl border-2 border-emerald-900/10 bg-[#fffaf0] p-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-[#062b21] px-2 py-1.5">
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="h-1.5 w-10 rounded-full bg-emerald-200/40" />
          <span className="ms-auto h-3 w-8 rounded-md bg-emerald-500" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-xl border-2 border-emerald-900/10 bg-white p-2 shadow-[0_3px_0_rgba(6,78,59,0.08)]">
            <span className="block size-5 rounded-full bg-gradient-to-br from-emerald-500 to-sky-400" />
            <span className="mt-1.5 block h-1.5 w-12 rounded-full bg-emerald-900/20" />
            <span className="mt-1 block h-1.5 w-9 rounded-full bg-amber-300" />
          </div>
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-emerald-900/10 bg-emerald-50 p-2">
            <span className="text-[14px] leading-none">🦉</span>
            <span className="h-1.5 w-8 rounded-full bg-emerald-900/20" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1 px-1">
          <span className="size-2 rounded-full bg-[#16a34a]" />
          <span className="text-[8px] font-bold text-emerald-900/70">سبز، نعنایی و آفتابی</span>
        </div>
      </div>
    );
  }

  if (variant === 'modern') {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#f4f6fb] p-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm">
          <span className="size-2 rounded-full bg-indigo-500" />
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
          <span className="ms-auto h-3 w-8 rounded-md bg-gradient-to-r from-indigo-500 to-violet-500" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg bg-white p-2 shadow-sm">
            <span className="block size-5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500" />
            <span className="mt-1.5 block h-1.5 w-12 rounded-full bg-slate-300" />
            <span className="mt-1 block h-1.5 w-9 rounded-full bg-slate-200" />
          </div>
          <div className="flex items-center justify-center gap-1 rounded-lg bg-slate-900 p-2">
            <Moon className="size-3 text-indigo-300" aria-hidden />
            <span className="h-1.5 w-8 rounded-full bg-slate-600" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1 px-1">
          <Sun className="size-2.5 text-indigo-500" aria-hidden />
          <span className="text-[8px] font-bold text-slate-500">روشن / تیره</span>
        </div>
      </div>
    );
  }

  if (variant === 'twitter') {
    return (
      <div className="overflow-hidden rounded-xl border border-[#eff3f4] bg-white p-2">
        <div className="flex items-center gap-1.5 border-b border-[#eff3f4] px-1 pb-1.5">
          <span className="flex size-4 items-center justify-center rounded-full bg-[#1d9bf0] text-[8px] font-black text-white">
            X
          </span>
          <span className="h-1.5 w-10 rounded-full bg-[#cfd9de]" />
          <span className="ms-auto h-3 w-8 rounded-full bg-[#1d9bf0]" />
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-start gap-1.5 rounded-lg px-1 py-1">
            <span className="size-4 shrink-0 rounded-full bg-gradient-to-br from-[#1d9bf0] to-[#0ea5e9]" />
            <div className="min-w-0 flex-1">
              <span className="block h-1.5 w-12 rounded-full bg-[#0f1419]/70" />
              <span className="mt-1 block h-1.5 w-full rounded-full bg-[#cfd9de]" />
              <span className="mt-1 block h-1.5 w-2/3 rounded-full bg-[#cfd9de]" />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#0f1419] px-2 py-1.5">
            <span className="size-3 rounded-full bg-[#1d9bf0]" />
            <span className="h-1.5 w-10 rounded-full bg-[#536471]" />
            <span className="ms-auto h-1.5 w-6 rounded-full bg-[#71767b]" />
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1 px-1">
          <span className="size-2 rounded-full bg-[#1d9bf0]" />
          <span className="text-[8px] font-bold text-[#536471]">سفید / مشکی · آبی X</span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#d9c3a9] bg-[#f2e8d9] p-2">
      <div className="flex items-center gap-1.5 rounded-md border border-dashed border-[#8b3a1a] bg-[var(--vintage-surface)] px-2 py-1.5">
        <span className="size-2 rounded-full border-2 border-dashed border-[#8b3a1a]" />
        <span className="h-1.5 w-10 rounded-full bg-[#d9c3a9]" />
        <span className="ms-auto h-3 w-8 rounded-sm bg-[#8b3a1a]" />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-md border border-dashed border-[#8b3a1a] bg-[var(--vintage-surface)] p-2">
          <span className="block size-5 rounded-md border-2 border-dashed border-[#8b3a1a] bg-[#f3e3d3]" />
          <span className="mt-1.5 block h-1.5 w-12 rounded-full bg-[#d9c3a9]" />
          <span className="mt-1 block h-1.5 w-9 rounded-full bg-[#ead7c2]" />
        </div>
        <div className="rounded-md border border-[#d9c3a9] bg-[var(--vintage-surface)] p-1.5">
          <span className="block h-5 rounded-sm bg-gradient-to-br from-[#8b3a1a] to-[#c97a4f]" />
          <span className="mt-1 block h-1 w-full rounded-full bg-[#ead7c2]" />
          <span className="mt-0.5 block h-1 w-2/3 rounded-full bg-[#ead7c2]" />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 px-1">
        <span className="text-[8px] font-bold text-[#8b3a1a]">کاغذی و گرم</span>
      </div>
    </div>
  );
}
