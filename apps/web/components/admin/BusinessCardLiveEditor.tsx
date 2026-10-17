'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { api, type BusinessCard, type TaxonomyItem } from '@/lib/api';

interface AdminBusinessCardFull extends BusinessCard {
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
}

interface Props {
  businessCardId: string;
  onClose: () => void;
  onModerated: () => void;
}

const toFormValues = (businessCard: AdminBusinessCardFull): BusinessCardFormValues => ({
  fullName: businessCard.fullName ?? '',
  jobTitle: businessCard.jobTitle ?? '',
  company: businessCard.company ?? '',
  bio: businessCard.bio ?? '',
  phone: businessCard.phone ?? '',
  email: businessCard.email ?? '',
  website: businessCard.website ?? '',
  address: businessCard.address ?? '',
  linkedin: businessCard.linkedin ?? '',
  instagram: businessCard.instagram ?? '',
  telegram: businessCard.telegram ?? '',
  twitter: businessCard.twitter ?? '',
  whatsapp: businessCard.whatsapp ?? '',
  primaryColor: businessCard.primaryColor ?? '#8B3A1A',
  template: businessCard.template ?? 'glassmorphism',
  cityId: businessCard.cityId ?? '',
  businessId: businessCard.businessId ?? '',
  biolinkId: '',
  avatarUrl: businessCard.avatarUrl ?? '',
  logoUrl: businessCard.logoUrl ?? '',
});

export function BusinessCardLiveEditor({ businessCardId, onClose, onModerated }: Props) {
  const [businessCard, setBusinessCard] = useState<AdminBusinessCardFull | null>(null);
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminBusinessCardFull>(`/admin/business-cards/${businessCardId}`)
      .then(setBusinessCard)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا'));
  }, [businessCardId]);

  async function save(values: BusinessCardFormValues) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      const updated = await api.patch<AdminBusinessCardFull>(`/admin/business-cards/${businessCardId}`, payload);
      setBusinessCard(updated);
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
      reason = window.prompt('دلیل رد کارت ویزیت:') ?? undefined;
    }
    setModerating(true);
    setError(null);
    try {
      await api.patch(`/admin/business-cards/${businessCardId}/moderate`, { decision, reason });
      onModerated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود');
    } finally {
      setModerating(false);
    }
  }

  if (!businessCard && !error) {
    return <p className="p-8 text-center text-muted">در حال بارگذاری کارت ویزیت...</p>;
  }

  if (!businessCard) {
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
            بررسی و ویرایش زنده: {businessCard.fullName}
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
        <BusinessCardForm
          initial={toFormValues(businessCard)}
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
          رد کارت ویزیت
        </button>
      </div>
    </div>
  );
}
