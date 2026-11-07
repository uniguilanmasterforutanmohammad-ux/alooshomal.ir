'use client';

import { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, List, Save } from 'lucide-react';

import { api } from '@/lib/api';

type DisplayMode = 'PAGINATION' | 'INFINITE';
type ViewKey = 'list' | 'tiles' | 'notebook';

const VIEW_LABELS: Record<ViewKey, string> = {
  list: 'لیست',
  tiles: 'کاشی',
  notebook: 'دفترچه',
};
const CARD_VIEWS: ViewKey[] = ['list', 'tiles', 'notebook'];
const BIOLINK_VIEWS: ViewKey[] = ['list', 'tiles'];

interface SettingsPayload {
  directoryPageSize: number;
  directoryDisplayMode: DisplayMode;
  adminListPageSize: number;
  myListPageSize: number;
  boostDurationDays: number;
  businessCardDirectoryViews?: ViewKey[];
  biolinkDirectoryViews?: ViewKey[];
}

/**
 * Lets the admin control how many cards each directory page shows. The value is
 * persisted in the `Setting` table and consumed by the public directory
 * endpoints, which fetch only that many rows per page (server-side pagination).
 */
export function AdminDirectorySettings() {
  const [value, setValue] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('PAGINATION');
  const [adminValue, setAdminValue] = useState('');
  const [myValue, setMyValue] = useState('');
  const [boostDays, setBoostDays] = useState('');
  const [cardViews, setCardViews] = useState<ViewKey[]>(CARD_VIEWS);
  const [biolinkViews, setBiolinkViews] = useState<ViewKey[]>(BIOLINK_VIEWS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<SettingsPayload>('/admin/settings');
      setValue(String(result.directoryPageSize));
      setDisplayMode(
        result.directoryDisplayMode === 'INFINITE' ? 'INFINITE' : 'PAGINATION',
      );
      setAdminValue(String(result.adminListPageSize));
      setMyValue(String(result.myListPageSize));
      setBoostDays(String(result.boostDurationDays));
      setCardViews(
        (result.businessCardDirectoryViews ?? CARD_VIEWS).filter((view) =>
          CARD_VIEWS.includes(view),
        ),
      );
      setBiolinkViews(
        (result.biolinkDirectoryViews ?? BIOLINK_VIEWS).filter((view) =>
          BIOLINK_VIEWS.includes(view),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleView(
    list: ViewKey[],
    setList: (value: ViewKey[]) => void,
    key: ViewKey,
  ) {
    setList(
      list.includes(key) ? list.filter((view) => view !== key) : [...list, key],
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    const parsedAdmin = Number(adminValue);
    if (!Number.isInteger(parsedAdmin) || parsedAdmin < 1 || parsedAdmin > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    const parsedMy = Number(myValue);
    if (!Number.isInteger(parsedMy) || parsedMy < 1 || parsedMy > 100) {
      setError('عدد باید بین ۱ تا ۱۰۰ باشد');
      return;
    }
    const parsedBoost = Number(boostDays);
    if (!Number.isInteger(parsedBoost) || parsedBoost < 1 || parsedBoost > 365) {
      setError('مدت پله باید بین ۱ تا ۳۶۵ روز باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SettingsPayload>('/admin/settings', {
        directoryPageSize: parsed,
        directoryDisplayMode: displayMode,
        adminListPageSize: parsedAdmin,
        myListPageSize: parsedMy,
        boostDurationDays: parsedBoost,
        businessCardDirectoryViews: cardViews.length ? cardViews : ['list'],
        biolinkDirectoryViews: biolinkViews.length ? biolinkViews : ['list'],
      });
      setValue(String(result.directoryPageSize));
      setDisplayMode(
        result.directoryDisplayMode === 'INFINITE' ? 'INFINITE' : 'PAGINATION',
      );
      setAdminValue(String(result.adminListPageSize));
      setMyValue(String(result.myListPageSize));
      setBoostDays(String(result.boostDurationDays));
      setCardViews(
        (result.businessCardDirectoryViews ?? CARD_VIEWS).filter((view) =>
          CARD_VIEWS.includes(view),
        ),
      );
      setBiolinkViews(
        (result.biolinkDirectoryViews ?? BIOLINK_VIEWS).filter((view) =>
          BIOLINK_VIEWS.includes(view),
        ),
      );
      setMessage('تنظیمات ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5 lg:col-span-2">
      <div className="flex items-center gap-2">
        <LayoutGrid className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">نمایش دایرکتوری</h3>
      </div>
      <p className="mt-1 text-xs text-muted">
        تعداد کارت‌ها و بیولینک‌های نمایش‌داده‌شده در هر صفحه از دایرکتوری‌های عمومی،
        فهرست‌های پنل مدیریت و فهرست‌های «کارت‌های من / ذخیره‌شده‌ها / افزایش بازدید».
        فقط همین تعداد از سرور خوانده می‌شود تا صفحات سریع بمانند.
      </p>

      <div className="mt-4">
        <p className="flex items-center gap-1 text-xs font-bold text-muted">
          <List className="size-4" aria-hidden />
          حالت نمایش دایرکتوری‌های عمومی
        </p>
        <div className="mt-2 inline-flex overflow-hidden rounded-lg border border-[var(--vintage-border)]">
          {(
            [
              ['PAGINATION', 'صفحه‌بندی (قبلی/بعدی)'],
              ['INFINITE', 'اسکرول بی‌نهایت (لود با اسکرول)'],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDisplayMode(mode)}
              aria-pressed={displayMode === mode}
              className={`px-4 py-2 text-xs font-bold transition ${
                displayMode === mode
                  ? 'bg-brand text-white'
                  : 'bg-white text-ink hover:bg-soft'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          در حالت اسکرول بی‌نهایت، نتایج هنگام رسیدن به انتهای فهرست به‌صورت خودکار
          بارگذاری می‌شوند؛ در حالت صفحه‌بندی، دکمه‌های قبلی/بعدی نمایش داده می‌شوند.
        </p>
      </div>

      <div className="mt-4 grid gap-4 border-t border-[var(--vintage-border)] pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-muted">حالت‌های نمایش کارت ویزیت</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {CARD_VIEWS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-xs font-bold text-muted"
              >
                <input
                  type="checkbox"
                  checked={cardViews.includes(key)}
                  onChange={() => toggleView(cardViews, setCardViews, key)}
                  className="size-4 accent-[var(--vintage-accent)]"
                />
                {VIEW_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">حالت‌های نمایش بیولینک</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {BIOLINK_VIEWS.map((key) => (
              <label
                key={key}
                className="flex items-center gap-2 text-xs font-bold text-muted"
              >
                <input
                  type="checkbox"
                  checked={biolinkViews.includes(key)}
                  onChange={() => toggleView(biolinkViews, setBiolinkViews, key)}
                  className="size-4 accent-[var(--vintage-accent)]"
                />
                {VIEW_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        هر حالت خاموش‌شده از کلید «حالت نمایش» در دایرکتوری عمومی پنهان می‌شود؛
        حداقل یک حالت باید فعال بماند.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه دایرکتوری
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه پنل مدیریت
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={adminValue}
              onChange={(event) => setAdminValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            تعداد هر صفحه «کارت‌های من»
            <input
              type="number"
              min={1}
              max={100}
              dir="ltr"
              value={myValue}
              onChange={(event) => setMyValue(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            مدت هر پله (روز)
            <input
              type="number"
              min={1}
              max={365}
              dir="ltr"
              value={boostDays}
              onChange={(event) => setBoostDays(event.target.value)}
              className="w-32 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-brand"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
        </form>
      )}

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
