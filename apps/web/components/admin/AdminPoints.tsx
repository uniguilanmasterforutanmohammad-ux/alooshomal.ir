'use client';

import { useCallback, useEffect, useState } from 'react';
import { Coins, Pencil, Plus, Save, Trash2 } from 'lucide-react';

import {
  api,
  type AdminPointsOverview,
  type Reward,
  type RewardKind,
  type SubscriptionPlan,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type Tab = 'rewards' | 'settings' | 'overview';

const KIND_LABELS: Record<RewardKind, string> = {
  SUBSCRIPTION: 'اشتراک',
  AD_HOME: 'تبلیغ صفحه اصلی',
  AD_DIRECTORY: 'تبلیغ دایرکتوری',
};

const EMPTY_FORM = {
  id: '',
  title: '',
  description: '',
  kind: 'SUBSCRIPTION' as RewardKind,
  points: '',
  planId: '',
  isActive: true,
};

/**
 * Admin «امتیاز» panel: manage the reward catalogue (create/edit/delete), set
 * the points awarded per approved news item, and review balances/redemptions.
 */
export function AdminPoints() {
  const [tab, setTab] = useState<Tab>('rewards');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['rewards', 'جوایز'],
            ['settings', 'تنظیمات'],
            ['overview', 'کاربران و دریافت‌ها'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-lg border px-4 py-2 text-sm font-bold transition',
              tab === key
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-white text-muted hover:border-brand',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'rewards' ? <RewardsManager /> : null}
      {tab === 'settings' ? <PointsSettings /> : null}
      {tab === 'overview' ? <PointsOverviewPanel /> : null}
    </div>
  );
}

function RewardsManager() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rewardList, planList] = await Promise.all([
        api.get<Reward[]>('/admin/points/rewards'),
        api.get<SubscriptionPlan[]>('/subscriptions/plans').catch(() => []),
      ]);
      setRewards(rewardList);
      setPlans(planList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const points = Number(form.points);
    if (!form.title.trim()) {
      setError('عنوان جایزه الزامی است');
      return;
    }
    if (!Number.isInteger(points) || points < 0) {
      setError('هزینه امتیاز باید عددی نامنفی باشد');
      return;
    }
    if (form.kind === 'SUBSCRIPTION' && !form.planId) {
      setError('برای جایزه اشتراک، انتخاب پلن الزامی است');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        kind: form.kind,
        points,
        planId: form.kind === 'SUBSCRIPTION' ? form.planId : undefined,
        isActive: form.isActive,
      };
      if (form.id) {
        await api.patch(`/admin/points/rewards/${form.id}`, payload);
      } else {
        await api.post('/admin/points/rewards', payload);
      }
      setForm({ ...EMPTY_FORM });
      setMessage('جایزه ذخیره شد.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره جایزه ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این جایزه حذف شود؟')) return;
    try {
      await api.delete(`/admin/points/rewards/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  function edit(reward: Reward) {
    setForm({
      id: reward.id,
      title: reward.title,
      description: reward.description ?? '',
      kind: reward.kind,
      points: String(reward.points),
      planId: reward.planId ?? '',
      isActive: reward.isActive,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>
      ) : null}

      <form onSubmit={save} className="indeed-panel flex flex-col gap-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Plus className="size-4 text-brand" aria-hidden />
          {form.id ? 'ویرایش جایزه' : 'افزودن جایزه'}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            عنوان
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            هزینه (امتیاز)
            <input
              type="number"
              min={0}
              dir="ltr"
              value={form.points}
              onChange={(event) => setForm({ ...form, points: event.target.value })}
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            نوع جایزه
            <select
              value={form.kind}
              onChange={(event) =>
                setForm({ ...form, kind: event.target.value as RewardKind })
              }
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            >
              {(Object.keys(KIND_LABELS) as RewardKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>
          {form.kind === 'SUBSCRIPTION' ? (
            <label className="flex flex-col gap-1 text-xs font-bold text-muted">
              پلن اشتراک
              <select
                value={form.planId}
                onChange={(event) => setForm({ ...form, planId: event.target.value })}
                className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">— انتخاب پلن —</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-bold text-muted md:col-span-2">
            توضیح
            <input
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
            />
            فعال
          </label>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={() => setForm({ ...EMPTY_FORM })}
              className="indeed-btn indeed-btn-secondary py-2 text-sm"
            >
              انصراف
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-muted">در حال بارگذاری...</p>
      ) : rewards.length === 0 ? (
        <div className="indeed-panel p-8 text-center text-muted">
          هنوز جایزه‌ای تعریف نشده است.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-ink">{reward.title}</h4>
                  <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-muted">
                    {KIND_LABELS[reward.kind]}
                  </span>
                  {!reward.isActive ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      غیرفعال
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {reward.points.toLocaleString('fa-IR')} امتیاز
                  {reward.plan ? ` • پلن: ${reward.plan.name}` : ''}
                  {reward.description ? ` • ${reward.description}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => edit(reward)}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  <Pencil className="size-4" aria-hidden />
                  ویرایش
                </button>
                <button
                  onClick={() => remove(reward.id)}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600"
                >
                  <Trash2 className="size-4" aria-hidden />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PointsSettings() {
  const [perNews, setPerNews] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ pointsPerNews: number }>('/admin/settings');
      setPerNews(String(result.pointsPerNews));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(perNews);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
      setError('امتیاز هر خبر باید بین ۰ تا ۱۰۰۰۰۰ باشد');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<{ pointsPerNews: number }>('/admin/settings', {
        pointsPerNews: parsed,
      });
      setPerNews(String(result.pointsPerNews));
      setMessage('تنظیمات امتیاز ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <Coins className="size-5 text-brand" aria-hidden />
        امتیاز هر خبر
      </h3>
      <p className="mt-1 text-xs text-muted">
        به ازای تأیید هر خبر در «نبض شهر»، این مقدار امتیاز به حساب نویسنده واریز می‌شود.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            امتیاز هر خبر
            <input
              type="number"
              min={0}
              max={100000}
              dir="ltr"
              value={perNews}
              onChange={(event) => setPerNews(event.target.value)}
              className="w-40 rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
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
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </form>
      )}
    </div>
  );
}

function PointsOverviewPanel() {
  const [data, setData] = useState<AdminPointsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminPointsOverview>('/admin/points')
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری'),
      );
  }, []);

  if (error) {
    return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }
  if (!data) return <p className="text-muted">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-ink">
          کاربران دارای امتیاز ({data.topUsers.length.toLocaleString('fa-IR')})
        </h3>
        {data.topUsers.length ? (
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {data.topUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="font-bold text-ink">
                  {user.fullName ?? '—'}
                  <span dir="ltr" className="ms-2 text-xs text-muted">
                    {user.email}
                  </span>
                </span>
                <span className="font-extrabold text-brand">
                  {user.pointsBalance.toLocaleString('fa-IR')} امتیاز
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="indeed-panel p-4 text-sm text-muted">هنوز کاربری امتیاز ندارد.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-extrabold text-ink">آخرین دریافت جوایز</h3>
        {data.redemptions.length ? (
          <div className="indeed-panel divide-y divide-[var(--vintage-border)]">
            {data.redemptions.map((redemption) => (
              <div
                key={redemption.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
              >
                <span className="text-ink">
                  {redemption.user?.fullName ?? redemption.user?.email ?? '—'}
                </span>
                <span className="text-muted">{redemption.reward?.title ?? 'جایزه'}</span>
                <span className="text-xs text-muted">
                  {new Date(redemption.createdAt).toLocaleDateString('fa-IR')}
                </span>
                <span className="text-xs font-bold text-red-600">
                  -{redemption.pointsSpent.toLocaleString('fa-IR')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="indeed-panel p-4 text-sm text-muted">هنوز جایزه‌ای دریافت نشده است.</p>
        )}
      </section>
    </div>
  );
}
