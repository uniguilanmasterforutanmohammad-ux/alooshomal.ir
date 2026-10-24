'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

import { BiolinkForm, type BiolinkFormValues } from '@/components/biolink/BiolinkForm';
import { api, type Biolink, type TaxonomyItem } from '@/lib/api';

interface AdminBiolinkFull extends Biolink {
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
}

interface Props {
  biolinkId: string;
  onClose: () => void;
  onModerated: () => void;
  /**
   * Where to load/save/decide this item. Defaults to the super-admin routes;
   * the limited «کاربر ادمین» panel passes its own `/moderator/...` routes so
   * the exact same editor is reused with a narrower permission set.
   */
  routes?: { item: (id: string) => string; decide: (id: string) => string };
}

const ADMIN_ROUTES = {
  item: (id: string) => `/admin/biolinks/${id}`,
  decide: (id: string) => `/admin/biolinks/${id}/moderate`,
};

const toFormValues = (biolink: AdminBiolinkFull): BiolinkFormValues => ({
  fullName: biolink.fullName ?? '',
  jobTitle: biolink.jobTitle ?? '',
  company: biolink.company ?? '',
  bio: biolink.bio ?? '',
  phone: biolink.phone ?? '',
  mobile: biolink.mobile ?? '',
  email: biolink.email ?? '',
  website: biolink.website ?? '',
  address: biolink.address ?? '',
  linkedin: biolink.linkedin ?? '',
  instagram: biolink.instagram ?? '',
  telegram: biolink.telegram ?? '',
  twitter: biolink.twitter ?? '',
  whatsapp: biolink.whatsapp ?? '',
  primaryColor: biolink.primaryColor ?? '#8B3A1A',
  template: biolink.template ?? 'sunny',
  templateDark: biolink.templateDark ?? 'aria',
  cityId: biolink.cityId ?? '',
  businessId: biolink.businessId ?? '',
  businessCardId: '',
  avatarUrl: biolink.avatarUrl ?? '',
  logoUrl: biolink.logoUrl ?? '',
});

export function BiolinkLiveEditor({
  biolinkId,
  onClose,
  onModerated,
  routes = ADMIN_ROUTES,
}: Props) {
  const [biolink, setBiolink] = useState<AdminBiolinkFull | null>(null);
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminBiolinkFull>(routes.item(biolinkId))
      .then(setBiolink)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا'));
  }, [biolinkId, routes]);

  async function save(values: BiolinkFormValues) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      const updated = await api.patch<AdminBiolinkFull>(routes.item(biolinkId), payload);
      setBiolink(updated);
      setMessage('تغییرات ذخیره شد. اکنون می‌توانید تأیید یا رد کنید.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  async function moderate(decision: 'APPROVED' | 'REJECTED') {
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      reason = window.prompt('دلیل رد بیولینک:') ?? undefined;
    }
    setModerating(true);
    setError(null);
    try {
      await api.patch(routes.decide(biolinkId), { decision, reason });
      onModerated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  if (!biolink && !error) {
    return <p className="p-8 text-center text-muted">در حال بارگذاری بیولینک...</p>;
  }

  if (!biolink) {
    return (
      <div className="p-8">
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
        <button onClick={onClose} className="indeed-btn indeed-btn-secondary mt-4">
          بستن
        </button>
      </div>
    );
  }

  return (
    <div className="indeed-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[var(--vintage-accent-hover)] p-4">
        <div>
          <h3 className="text-base font-extrabold text-ink">
            بررسی و ویرایش زنده: {biolink.fullName}
          </h3>
          <p className="text-xs text-muted">
            هر فیلد را همین‌جا تغییر دهید و پیش‌نمایش را ببینید، سپس تأیید یا رد کنید.
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full text-ink hover:bg-soft"
          aria-label="بستن"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {error ? (
        <p className="mx-4 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="mx-4 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="p-4">
        <BiolinkForm
          initial={toFormValues(biolink)}
          onSubmit={save}
          submitting={saving}
          submitLabel="ذخیره تغییرات"
          hideLink
        />
      </div>

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[#fbf3e9] p-4">
        <button
          onClick={() => moderate('APPROVED')}
          disabled={moderating}
          className="indeed-btn indeed-btn-primary flex-1"
        >
          <Check className="size-4" aria-hidden />
          تأیید و انتشار
        </button>
        <button
          onClick={() => moderate('REJECTED')}
          disabled={moderating}
          className="indeed-btn border-red-300 flex-1 text-red-600"
        >
          <X className="size-4" aria-hidden />
          رد بیولینک
        </button>
      </div>
    </div>
  );
}
