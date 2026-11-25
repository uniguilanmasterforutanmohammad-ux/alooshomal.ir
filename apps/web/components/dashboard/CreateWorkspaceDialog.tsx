'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, X } from 'lucide-react';

import { api, type TaxonomyItem } from '@/lib/api';
import type { BusinessWorkspaceSummary } from '@/lib/api/types/business-modules';
import { toast } from '@/lib/toast';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

/**
 * Modal for creating a new business workspace. Both the name and the business
 * category are required: the category decides which «مدیریت کسب‌وکار» the
 * workspace is offered, so it can no longer be left blank.
 */
export function CreateWorkspaceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (list: BusinessWorkspaceSummary[], createdId: string) => void;
}) {
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setCategoryId('');
    api
      .get<TaxonomyItem[]>('/businesses')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open]);

  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error('نام کسب‌وکار را وارد کنید.');
      return;
    }
    if (!categoryId) {
      toast.error('دسته‌بندی کسب‌وکار را انتخاب کنید.');
      return;
    }
    setBusy(true);
    try {
      const list = await api.post<BusinessWorkspaceSummary[]>(
        '/business-modules/workspaces',
        { name: name.trim(), categoryId },
      );
      const created = list.find(
        (item) => item.name === name.trim() && !item.isDefault,
      );
      const createdId =
        created?.id ??
        list.find((item) => item.name === name.trim())?.id ??
        list[list.length - 1]?.id ??
        '';
      toast.success('کسب‌وکار جدید ساخته شد');
      onCreated(list, createdId);
    } catch {
      // API client already surfaced the error
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
            <Building2 className="size-4 text-brand" aria-hidden />
            کسب‌وکار جدید
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:bg-[var(--vintage-paper)]"
            aria-label="بستن"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-6 text-muted">
          دسته‌بندی کسب‌وکار مشخص می‌کند کدام «مدیریت کسب‌وکار» به شما پیشنهاد
          شود؛ پس از خرید مدیریت، دسته‌بندی قابل تغییر نیست.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            نام کسب‌وکار
            <input
              className={field}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثلاً فروشگاه گل محمدی"
              maxLength={120}
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            دسته‌بندی کسب‌وکار
            <select
              className={field}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">انتخاب دسته‌بندی…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="indeed-btn">
            انصراف
          </button>
          <button
            type="submit"
            disabled={busy}
            className="indeed-btn indeed-btn-primary disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            ساخت کسب‌وکار
          </button>
        </div>
      </form>
    </div>
  );
}
