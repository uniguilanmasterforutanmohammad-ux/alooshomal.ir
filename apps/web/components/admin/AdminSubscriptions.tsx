'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';

import {
  api,
  type SubscriptionPlan,
  type UserSubscription,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'ACTIVE', label: 'فعال' },
  { value: 'REJECTED', label: 'ردشده' },
];

export function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    maxBiolinks: 1,
    maxBusinessCards: 1,
    showSocialLinks: true,
    features: '',
  });

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await api.get<SubscriptionPlan[]>('/admin/plans'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری اشتراک‌ها');
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(
        await api.get<UserSubscription[]>(`/admin/subscriptions?status=${status}`),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function decide(id: string, decision: 'ACTIVE' | 'REJECTED') {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/subscriptions/${id}`, { status: decision });
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت تصمیم');
    } finally {
      setBusyId(null);
    }
  }

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post('/admin/plans', {
        name: form.name,
        description: form.description || undefined,
        maxBiolinks: Number(form.maxBiolinks),
        maxBusinessCards: Number(form.maxBusinessCards),
        showSocialLinks: form.showSocialLinks,
        features: form.features
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      });
      setForm({
        name: '',
        description: '',
        maxBiolinks: 1,
        maxBusinessCards: 1,
        showSocialLinks: true,
        features: '',
      });
      setShowPlanForm(false);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ساخت اشتراک');
    }
  }

  async function removePlan(id: string) {
    if (!window.confirm('این اشتراک حذف شود؟')) return;
    try {
      await api.delete(`/admin/plans/${id}`);
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف اشتراک ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
          <h3 className="text-sm font-extrabold text-ink">بسته‌های اشتراک</h3>
          <button
            type="button"
            onClick={() => setShowPlanForm((value) => !value)}
            className="indeed-btn indeed-btn-primary py-1.5 text-xs"
          >
            <Plus className="size-3.5" aria-hidden />
            اشتراک جدید
          </button>
        </div>

        {showPlanForm ? (
          <form onSubmit={createPlan} className="grid gap-3 border-b border-dashed border-[var(--vintage-border)] bg-soft/40 p-5 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-bold text-ink">نام *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="indeed-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-bold text-ink">توضیح</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="indeed-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-bold text-ink">حداکثر بیولینک</span>
              <input
                type="number"
                min={0}
                value={form.maxBiolinks}
                onChange={(e) => setForm({ ...form, maxBiolinks: Number(e.target.value) })}
                className="indeed-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-bold text-ink">حداکثر کارت ویزیت</span>
              <input
                type="number"
                min={0}
                value={form.maxBusinessCards}
                onChange={(e) =>
                  setForm({ ...form, maxBusinessCards: Number(e.target.value) })
                }
                className="indeed-input"
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.showSocialLinks}
                onChange={(e) => setForm({ ...form, showSocialLinks: e.target.checked })}
              />
              <span className="font-bold text-ink">
                نمایش لینک‌ها، شبکه‌های اجتماعی و وب‌سایت
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span className="font-bold text-ink">ویژگی‌ها (هر خط یک مورد)</span>
              <textarea
                rows={3}
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                className="indeed-input"
              />
            </label>
            <div className="md:col-span-2">
              <button type="submit" className="indeed-btn indeed-btn-primary py-2 text-sm">
                ذخیره اشتراک
              </button>
            </div>
          </form>
        ) : null}

        <ul className="divide-y divide-[var(--vintage-border)]">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="font-extrabold text-ink">
                  {plan.name}
                  {!plan.isActive ? (
                    <span className="ms-2 text-xs font-bold text-muted">(غیرفعال)</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  {plan.maxBiolinks} بیولینک · {plan.maxBusinessCards} کارت ویزیت ·{' '}
                  {plan.showSocialLinks ? 'نمایش لینک‌ها' : 'بدون لینک'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePlan(plan.id)}
                className="indeed-btn border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600"
              >
                <Trash2 className="size-3.5" aria-hidden />
                حذف
              </button>
            </li>
          ))}
          {plans.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-muted">
              هنوز اشتراکی ساخته نشده است.
            </li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={
                status === filter.value
                  ? 'indeed-btn indeed-btn-primary py-2 text-sm'
                  : 'indeed-btn indeed-btn-secondary py-2 text-sm'
              }
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">در حال بارگذاری...</p>
        ) : requests.length === 0 ? (
          <div className="indeed-panel p-8 text-center text-muted">
            درخواستی در این وضعیت وجود ندارد.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="indeed-panel flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-extrabold text-ink">
                    {request.plan?.name ?? '—'}
                    <span className="ms-2 text-xs font-bold text-muted">
                      {request.user?.fullName ?? request.user?.email}
                    </span>
                  </p>
                  <p dir="ltr" className="text-xs text-muted">
                    {request.user?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === request.id}
                    onClick={() => decide(request.id, 'ACTIVE')}
                    className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
                  >
                    <Check className="size-4" aria-hidden />
                    تأیید و اعمال
                  </button>
                  <button
                    type="button"
                    disabled={busyId === request.id}
                    onClick={() => decide(request.id, 'REJECTED')}
                    className={cn(
                      'indeed-btn indeed-btn-secondary py-2 text-sm disabled:opacity-60',
                    )}
                  >
                    <X className="size-4" aria-hidden />
                    رد
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
