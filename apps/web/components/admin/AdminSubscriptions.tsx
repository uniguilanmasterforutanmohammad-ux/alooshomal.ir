'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';

import {
  api,
  type SubscriptionPlan,
  type UserSubscription,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminDataTable, type AdminColumn } from './AdminDataTable';

type Tab = 'requests' | 'plans';

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'در انتظار' },
  { value: 'ACTIVE', label: 'فعال' },
  { value: 'REJECTED', label: 'ردشده' },
];

interface PlanField {
  key: string;
  label: string;
}

interface PlanFormState {
  name: string;
  description: string;
  price: number;
  maxBiolinks: number;
  maxBusinessCards: number;
  isActive: boolean;
  /** keys hidden on this plan (a field is shown unless it is listed here) */
  hidden: string[];
}

const EMPTY_FORM: PlanFormState = {
  name: '',
  description: '',
  price: 0,
  maxBiolinks: 1,
  maxBusinessCards: 1,
  isActive: true,
  hidden: [],
};

/**
 * Admin «اشتراک‌ها» panel. Split into two tabs — user requests (approve/reject)
 * and plan management (create/edit/delete). Each plan carries a per-field
 * on/off list: a disabled field is masked for every item owned by a user on
 * that plan, instead of the single legacy «نمایش لینک‌ها» checkbox.
 */
export function AdminSubscriptions() {
  const [tab, setTab] = useState<Tab>('requests');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [fields, setFields] = useState<PlanField[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);

  const loadPlans = useCallback(async () => {
    try {
      setPlans(await api.get<SubscriptionPlan[]>('/admin/plans'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری اشتراک‌ها');
    }
  }, []);

  const loadFields = useCallback(async () => {
    try {
      setFields(await api.get<PlanField[]>('/admin/plan-fields'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری فیلدها');
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
    void loadFields();
  }, [loadPlans, loadFields]);

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

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowPlanForm(false);
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowPlanForm(true);
  }

  function startEdit(plan: SubscriptionPlan) {
    setForm({
      name: plan.name,
      description: plan.description ?? '',
      price: plan.price,
      maxBiolinks: plan.maxBiolinks,
      maxBusinessCards: plan.maxBusinessCards,
      isActive: plan.isActive,
      hidden: plan.hiddenFields ?? [],
    });
    setEditingId(plan.id);
    setShowPlanForm(true);
  }

  function toggleField(key: string) {
    setForm((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key)
        ? prev.hidden.filter((item) => item !== key)
        : [...prev.hidden, key],
    }));
  }

  async function savePlan(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        price: Number(form.price),
        maxBiolinks: Number(form.maxBiolinks),
        maxBusinessCards: Number(form.maxBusinessCards),
        isActive: form.isActive,
        hiddenFields: form.hidden,
      };
      if (editingId) {
        await api.patch(`/admin/plans/${editingId}`, payload);
      } else {
        await api.post('/admin/plans', payload);
      }
      resetForm();
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره اشتراک');
    }
  }

  async function removePlan(id: string) {
    if (!window.confirm('این اشتراک حذف شود؟')) return;
    try {
      await api.delete(`/admin/plans/${id}`);
      if (editingId === id) resetForm();
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف اشتراک ناموفق بود');
    }
  }

  const fieldsByKey = useMemo(
    () => new Map(fields.map((field) => [field.key, field.label])),
    [fields],
  );

  const planColumns: Array<AdminColumn<SubscriptionPlan>> = [
    {
      key: 'name',
      label: 'نام بسته',
      render: (plan) => (
        <div>
          <p className="font-extrabold text-ink">
            {plan.name}
            {!plan.isActive ? (
              <span className="ms-2 text-xs font-bold text-muted">(غیرفعال)</span>
            ) : null}
          </p>
          {plan.description ? (
            <p className="mt-0.5 text-xs text-muted">{plan.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'limits',
      label: 'محدودیت‌ها',
      render: (plan) => (
        <span className="text-xs text-muted">
          {plan.maxBiolinks} بیولینک · {plan.maxBusinessCards} کارت ویزیت
        </span>
      ),
    },
    {
      key: 'fields',
      label: 'فیلدهای نمایش‌داده‌شده',
      render: (plan) => {
        const hidden = plan.hiddenFields ?? [];
        const hiddenLabels = hidden
          .map((key) => fieldsByKey.get(key) ?? key)
          .join('، ');
        return (
          <span className="text-xs text-muted">
            {hidden.length === 0 ? 'همه‌ی فیلدها' : `مخفی: ${hiddenLabels}`}
          </span>
        );
      },
    },
    {
      key: 'price',
      label: 'قیمت (تومان)',
      render: (plan) => (
        <span className="text-xs text-muted">{plan.price.toLocaleString('fa-IR')}</span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (plan) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startEdit(plan)}
            className="indeed-btn indeed-btn-secondary px-3 py-1.5 text-xs"
          >
            <Pencil className="size-3.5" aria-hidden />
            ویرایش
          </button>
          <button
            type="button"
            onClick={() => removePlan(plan.id)}
            className="indeed-btn border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600"
          >
            <Trash2 className="size-3.5" aria-hidden />
            حذف
          </button>
        </div>
      ),
    },
  ];

  const requestColumns: Array<AdminColumn<UserSubscription>> = [
    {
      key: 'plan',
      label: 'بسته',
      render: (request) => (
        <span className="font-extrabold text-ink">{request.plan?.name ?? '—'}</span>
      ),
    },
    {
      key: 'user',
      label: 'کاربر',
      render: (request) => (
        <div>
          <p className="text-sm font-semibold text-ink">
            {request.user?.fullName ?? '—'}
          </p>
          <span dir="ltr" className="text-xs text-muted">
            {request.user?.email}
          </span>
        </div>
      ),
    },
    {
      key: 'requestedAt',
      label: 'تاریخ درخواست',
      render: (request) => (
        <span className="text-xs text-muted">
          {new Date(request.requestedAt).toLocaleDateString('fa-IR')}
        </span>
      ),
    },
    {
      key: 'note',
      label: 'یادداشت',
      render: (request) => (
        <span className="text-xs text-muted">{request.note ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      render: (request) =>
        request.status === 'PENDING' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => decide(request.id, 'ACTIVE')}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-60"
            >
              <Check className="size-3.5" aria-hidden />
              تأیید و اعمال
            </button>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => decide(request.id, 'REJECTED')}
              className="indeed-btn indeed-btn-secondary py-1.5 text-xs disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden />
              رد
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted">بررسی‌شده</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['requests', 'درخواست‌ها'],
            ['plans', 'مدیریت بسته‌ها'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
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

      {tab === 'plans' ? (
        <div className="indeed-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-dashed border-[var(--vintage-border)] px-5 py-3">
            <h3 className="text-sm font-extrabold text-ink">بسته‌های اشتراک</h3>
            <button
              type="button"
              onClick={() => (showPlanForm ? resetForm() : startCreate())}
              className="indeed-btn indeed-btn-primary py-1.5 text-xs"
            >
              <Plus className="size-3.5" aria-hidden />
              {showPlanForm ? 'بستن فرم' : 'اشتراک جدید'}
            </button>
          </div>

          {showPlanForm ? (
            <form
              onSubmit={savePlan}
              className="flex flex-col gap-4 border-b border-dashed border-[var(--vintage-border)] bg-soft/40 p-5"
            >
              <p className="text-sm font-extrabold text-ink">
                {editingId ? 'ویرایش بسته' : 'بسته‌ی جدید'}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
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
                  <span className="font-bold text-ink">قیمت (تومان)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="indeed-input"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-bold text-ink">حداکثر بیولینک</span>
                    <input
                      type="number"
                      min={0}
                      value={form.maxBiolinks}
                      onChange={(e) =>
                        setForm({ ...form, maxBiolinks: Number(e.target.value) })
                      }
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
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span className="font-bold text-ink">این بسته فعال باشد</span>
              </label>

              <div className="rounded-lg border border-dashed border-[var(--vintage-border)] p-4">
                <p className="text-sm font-extrabold text-ink">
                  فیلدهای قابل نمایش
                </p>
                <p className="mt-1 text-xs text-muted">
                  هر فیلدی که برای این بسته غیرفعال باشد، در کارت ویزیت و بیولینک
                  کاربران این بسته نمایش داده نمی‌شود.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((field) => {
                    const enabled = !form.hidden.includes(field.key);
                    return (
                      <label
                        key={field.key}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
                          enabled
                            ? 'border-brand bg-brand-light/50'
                            : 'border-[var(--vintage-border)] bg-white',
                        )}
                      >
                        <span className="font-bold text-ink">{field.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => toggleField(field.key)}
                          className={cn(
                            'relative h-6 w-11 shrink-0 rounded-full transition',
                            enabled ? 'bg-brand' : 'bg-[var(--vintage-border)]',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                              enabled ? 'right-0.5' : 'right-[1.375rem]',
                            )}
                          />
                        </button>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="indeed-btn indeed-btn-primary py-2 text-sm"
                >
                  {editingId ? 'ذخیره تغییرات' : 'ذخیره اشتراک'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="indeed-btn indeed-btn-secondary py-2 text-sm"
                >
                  انصراف
                </button>
              </div>
            </form>
          ) : null}

          <AdminDataTable
            columns={planColumns}
            rows={plans}
            rowKey={(plan) => plan.id}
            empty="هنوز اشتراکی ساخته نشده است."
            minWidthClass="min-w-[52rem]"
          />
        </div>
      ) : (
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
          ) : (
            <AdminDataTable
              columns={requestColumns}
              rows={requests}
              rowKey={(request) => request.id}
              empty="درخواستی در این وضعیت وجود ندارد."
            />
          )}
        </div>
      )}
    </div>
  );
}
