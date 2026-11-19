'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type StepKind =
  | 'welcome'
  | 'identity'
  | 'business'
  | 'documents'
  | 'plan'
  | 'approval'
  | 'module'
  | 'custom';

interface EditableStep {
  id?: string;
  kind: StepKind;
  title: string;
  description: string;
  href?: string;
  moduleKey?: string;
  enabled: boolean;
  optional?: boolean;
}

interface ModuleOption {
  key: string;
  type: 'zohal' | 'apiir' | 'plan' | 'management' | 'biolink' | 'businessCard';
  group: string;
  label: string;
  description: string;
  href: string;
  enabled: boolean;
  price: number;
  fields?: Array<{
    name: string;
    label: string;
    required?: boolean;
    type?: 'text' | 'date' | 'boolean' | 'file';
  }>;
}

const KIND_LABEL: Record<StepKind, string> = {
  welcome: 'خوش‌آمدگویی (تیک دستی کاربر)',
  identity: 'استعلام هویت (خودکار)',
  business: 'ساخت کسب‌وکار (خودکار)',
  documents: 'ارسال مدارک/تیک آبی (خودکار)',
  plan: 'انتخاب اشتراک (خودکار)',
  approval: 'تأیید مدیر (خودکار)',
  module: 'ماژول/محصول انتخابی (تیک دستی)',
  custom: 'سفارشی (تیک دستی کاربر)',
};

const KIND_OPTIONS: StepKind[] = [
  'welcome',
  'identity',
  'business',
  'documents',
  'plan',
  'approval',
  'module',
  'custom',
];

/**
 * Admin editor for the «شروع آسان» onboarding steps. The list order is the
 * order the user sees; steps can be enabled/disabled, reordered, removed and
 * extended with manual (`custom`) steps.
 */
export function AdminOnboardingSteps() {
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [moduleQuery, setModuleQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, catalog] = await Promise.all([
        api.get<{ steps: EditableStep[] }>('/admin/onboarding/steps'),
        api.get<{ items: ModuleOption[] }>('/admin/onboarding/modules'),
      ]);
      setSteps(result.steps ?? []);
      setModules(catalog.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری مراحل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moduleGroups = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    const map = new Map<string, ModuleOption[]>();
    for (const item of modules) {
      if (
        query &&
        !`${item.label} ${item.description} ${item.key}`
          .toLowerCase()
          .includes(query)
      ) {
        continue;
      }
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [modules, moduleQuery]);

  function update(index: number, patch: Partial<EditableStep>) {
    setSteps((prev) =>
      prev.map((step, position) => (position === index ? { ...step, ...patch } : step)),
    );
    setMessage(null);
  }

  function move(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMessage(null);
  }

  function remove(index: number) {
    setSteps((prev) => prev.filter((_, position) => position !== index));
    setMessage(null);
  }

  function addStep() {
    const used = new Set(steps.map((step) => step.kind));
    const nextKind = KIND_OPTIONS.find(
      (kind) =>
        kind !== 'custom' &&
        kind !== 'welcome' &&
        kind !== 'module' &&
        !used.has(kind),
    );
    setSteps((prev) => [
      ...prev,
      {
        kind: nextKind ?? 'custom',
        title: nextKind ? KIND_LABEL[nextKind].split(' (')[0] : 'مرحله جدید',
        description: '',
        href: '',
        enabled: true,
        optional: false,
      },
    ]);
    setMessage(null);
  }

  function addModuleStep(item: ModuleOption) {
    setSteps((prev) => [
      ...prev,
      {
        kind: 'module',
        moduleKey: item.key,
        title: item.label,
        description: item.description,
        href: item.href,
        enabled: true,
        optional: false,
      },
    ]);
    setMessage(null);
  }

  function changeModule(index: number, key: string) {
    const item = modules.find((entry) => entry.key === key);
    update(index, {
      moduleKey: key,
      ...(item
        ? { title: item.label, description: item.description, href: item.href }
        : {}),
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = steps.map((step) => ({
        ...(step.id ? { id: step.id } : {}),
        kind: step.kind,
        title: step.title.trim(),
        description: step.description.trim(),
        ...(step.href && step.href.trim() ? { href: step.href.trim() } : {}),
        ...(step.kind === 'module' && step.moduleKey
          ? { moduleKey: step.moduleKey }
          : {}),
        enabled: step.enabled,
        optional: step.optional === true,
      }));
      const result = await api.put<{ steps: EditableStep[] }>(
        '/admin/onboarding/steps',
        { steps: payload },
      );
      setSteps(result.steps ?? []);
      setMessage('مراحل «شروع آسان» ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="indeed-panel flex items-center gap-2 p-5 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        در حال بارگذاری مراحل...
      </div>
    );
  }

  return (
    <div className="indeed-panel flex flex-col gap-4 p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <Sparkles className="size-4 text-brand" aria-hidden />
          مراحل «شروع آسان»
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addStep}
            className="indeed-btn indeed-btn-secondary py-2 text-xs"
          >
            <Plus className="size-4" aria-hidden />
            افزودن مرحله
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-xs"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            ذخیره
          </button>
        </div>
      </div>
      <p className="text-xs leading-6 text-muted">
        ترتیب این فهرست، ترتیب نمایش مراحل در داشبورد کاربر است. مراحل «خودکار» با
        انجام همان کار توسط کاربر تیک می‌خورند؛ مراحل «سفارشی» را خود کاربر تیک
        می‌زند. با «غیرفعال» کردن یک مرحله، از داشبورد پنهان می‌شود ولی پیکربندی‌اش
        می‌ماند.
      </p>

      <div className="rounded-xl border border-[var(--vintage-border)] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-extrabold text-ink">
            کتابخانه‌ی ماژول‌ها و محصولات
          </h4>
          <input
            className="indeed-input w-56 py-1 text-xs"
            placeholder="جستجو در ماژول‌ها..."
            value={moduleQuery}
            onChange={(event) => setModuleQuery(event.target.value)}
          />
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          هر مورد را به‌عنوان یک مرحله اضافه کنید؛ سپس می‌توانید جای آن را در
          فهرست تغییر دهید. این مراحل با تیک دستی کاربر تکمیل می‌شوند.
        </p>
        <div className="mt-3 flex max-h-80 flex-col gap-3 overflow-auto pe-1">
          {moduleGroups.map(([group, items]) => (
            <div key={group}>
              <p className="text-[11px] font-bold text-muted">{group}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => addModuleStep(item)}
                    title={item.description}
                    className="flex items-center gap-1 rounded-full border border-[var(--vintage-border)] bg-[var(--vintage-paper)] px-2.5 py-1 text-[11px] text-ink hover:border-brand/50 hover:text-brand"
                  >
                    <Plus className="size-3" aria-hidden />
                    {item.label}
                    {item.price > 0 ? (
                      <span className="text-[10px] text-muted">
                        {item.price.toLocaleString('fa-IR')}
                      </span>
                    ) : null}
                    {!item.enabled ? (
                      <span className="text-[10px] text-amber-600">
                        (غیرفعال)
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {moduleGroups.length === 0 ? (
            <p className="text-[11px] text-muted">موردی یافت نشد.</p>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
          {message}
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li
            key={`${step.id ?? 'new'}-${index}`}
            className={cn(
              'rounded-xl border border-[var(--vintage-border)] bg-white p-3',
              !step.enabled && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-light text-[11px] font-extrabold text-brand">
                {(index + 1).toLocaleString('fa-IR')}
              </span>
              <select
                value={step.kind}
                onChange={(event) =>
                  update(index, { kind: event.target.value as StepKind })
                }
                className="indeed-input max-w-[240px] py-1.5 text-xs"
              >
                {KIND_OPTIONS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABEL[kind]}
                  </option>
                ))}
              </select>
              <div className="ms-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title="انتقال به بالا"
                  className="rounded-md border border-[var(--vintage-border)] p-1.5 text-muted hover:text-ink disabled:opacity-40"
                >
                  <ArrowUp className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  title="انتقال به پایین"
                  className="rounded-md border border-[var(--vintage-border)] p-1.5 text-muted hover:text-ink disabled:opacity-40"
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                </button>
                <label className="flex items-center gap-1 text-[11px] font-bold text-muted">
                  <input
                    type="checkbox"
                    checked={step.enabled}
                    onChange={(event) => update(index, { enabled: event.target.checked })}
                  />
                  فعال
                </label>
                <label
                  className="flex items-center gap-1 text-[11px] font-bold text-muted"
                  title="مرحله‌ی اختیاری مانع رفتن به مرحله‌ی بعد نمی‌شود"
                >
                  <input
                    type="checkbox"
                    checked={step.optional === true}
                    onChange={(event) =>
                      update(index, { optional: event.target.checked })
                    }
                  />
                  اختیاری
                </label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  title="حذف مرحله"
                  className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-[11px] font-bold text-muted">
                عنوان
                <input
                  className="indeed-input mt-1 py-1.5 text-xs"
                  value={step.title}
                  onChange={(event) => update(index, { title: event.target.value })}
                />
              </label>
              <label className="text-[11px] font-bold text-muted">
                لینک ادامه (اختیاری)
                <input
                  className="indeed-input mt-1 py-1.5 text-xs"
                  dir="ltr"
                  value={step.href ?? ''}
                  onChange={(event) => update(index, { href: event.target.value })}
                  placeholder="/dashboard/business-cards"
                />
              </label>
            </div>
            {step.kind === 'module' ? (
              <div className="mt-2">
                <label className="block text-[11px] font-bold text-muted">
                  ماژول/محصول متصل
                  <select
                    className="indeed-input mt-1 py-1.5 text-xs"
                    value={step.moduleKey ?? ''}
                    onChange={(event) => changeModule(index, event.target.value)}
                  >
                    <option value="">— انتخاب ماژول —</option>
                    {modules.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.group} — {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                {(() => {
                  const selected = modules.find(
                    (item) => item.key === step.moduleKey,
                  );
                  const fields = selected?.fields ?? [];
                  return fields.length > 0 ? (
                    <p className="mt-1.5 rounded-lg bg-brand-light/40 px-2 py-1.5 text-[11px] leading-5 text-muted">
                      اطلاعاتی که از کاربر گرفته می‌شود:{' '}
                      <b className="text-ink">
                        {fields
                          .map(
                            (field) =>
                              `${field.label}${field.required ? ' *' : ''}`,
                          )
                          .join('، ')}
                      </b>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] leading-5 text-muted">
                      این ماژول فرم ورودی ندارد؛ کاربر فقط لینک را باز می‌کند و
                      مرحله را تیک می‌زند.
                    </p>
                  );
                })()}
              </div>
            ) : null}
            <label className="mt-2 block text-[11px] font-bold text-muted">
              توضیح
              <textarea
                className="indeed-input mt-1 py-1.5 text-xs"
                rows={2}
                value={step.description}
                onChange={(event) => update(index, { description: event.target.value })}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
