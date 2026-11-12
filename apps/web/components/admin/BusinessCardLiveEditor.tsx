'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Check, Sparkles, X } from 'lucide-react';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { api, type BusinessCard } from '@/lib/api';

interface AdminBusinessCardFull extends BusinessCard {
  city?: { id: string; name: string } | null;
  business?: { id: string; name: string } | null;
  isClaimedImport?: boolean;
  importBatchId?: string | null;
  importBatch?: {
    id: string;
    label: string;
    source: string | null;
    createdAt: string;
  } | null;
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
  ownerPlan?: {
    name: string;
    showSocialLinks: boolean;
    hiddenFields: string[];
    hiddenLabels: string[];
    maxBiolinks: number;
    maxBusinessCards: number;
  };
}

interface Props {
  businessCardId: string;
  onClose: () => void;
  onModerated: () => void;
  /** Override the admin routes for the limited moderator panel. */
  routes?: { item: (id: string) => string; decide: (id: string) => string };
}

const ADMIN_ROUTES = {
  item: (id: string) => `/admin/business-cards/${id}`,
  decide: (id: string) => `/admin/business-cards/${id}/moderate`,
};

const toFormValues = (businessCard: AdminBusinessCardFull): BusinessCardFormValues => ({
  fullName: businessCard.fullName ?? '',
  jobTitle: businessCard.jobTitle ?? '',
  company: businessCard.company ?? '',
  bio: businessCard.bio ?? '',
  phone: businessCard.phone ?? '',
  mobile: businessCard.mobile ?? '',
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
  subCategory: businessCard.subCategory ?? '',
  subSubCategory: businessCard.subSubCategory ?? '',
  neighborhood: businessCard.neighborhood ?? '',
  biolinkId: '',
  avatarUrl: businessCard.avatarUrl ?? '',
  logoUrl: businessCard.logoUrl ?? '',
  gallery: businessCard.gallery ?? [],
  workingHours: businessCard.workingHours ?? {},
});

export function BusinessCardLiveEditor({
  businessCardId,
  onClose,
  onModerated,
  routes = ADMIN_ROUTES,
}: Props) {
  const [businessCard, setBusinessCard] = useState<AdminBusinessCardFull | null>(null);
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminBusinessCardFull>(routes.item(businessCardId))
      .then(setBusinessCard)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا'));
  }, [businessCardId, routes]);

  async function save(values: BusinessCardFormValues) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      const updated = await api.patch<AdminBusinessCardFull>(routes.item(businessCardId), payload);
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
      await api.patch(routes.decide(businessCardId), { decision, reason });
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

      {businessCard.isClaimedImport ? (
        <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
          <p className="flex items-center gap-1.5 font-extrabold">
            <BadgeCheck className="size-4" aria-hidden />
            این کارت از کارت‌های ایمپورت‌شده است و صاحبش آن را تصاحب کرده
          </p>
          <p className="mt-1">
            دسته‌ی ایمپورت: {businessCard.importBatch?.label ?? '—'}
            {businessCard.user?.email ? (
              <>
                {' '}
                — صاحب فعلی:{' '}
                <span dir="ltr" className="font-bold">
                  {businessCard.user.email}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-1">
            {businessCard.status === 'PENDING'
              ? 'ویرایش صاحب کارت در انتظار بررسی است؛ با تأیید، مالکیت و نمایش اطلاعات همان صاحب کارت اعمال می‌شود.'
              : 'مالکیت این کارت به صاحبش منتقل شده و نمایش اطلاعات آن از اشتراک همین کاربر پیروی می‌کند.'}
          </p>
        </div>
      ) : null}

      {businessCard.ownerPlan ? (
        <div className="mx-4 mt-3 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-3 text-xs leading-6 text-muted">
          <p className="flex items-center gap-1.5 font-extrabold text-ink">
            <Sparkles className="size-4 text-brand" aria-hidden />
            نمایش پس از تأیید مطابق اشتراک «{businessCard.ownerPlan.name}»
          </p>
          <p className="mt-1">
            {businessCard.ownerPlan.hiddenLabels.length
              ? `این فیلدها در صفحه‌ی عمومی نمایش داده نمی‌شوند: ${businessCard.ownerPlan.hiddenLabels.join('، ')}`
              : 'همه‌ی فیلدهای ثبت‌شده در صفحه‌ی عمومی نمایش داده می‌شوند.'}
          </p>
        </div>
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

      <div className="sticky bottom-0 flex flex-wrap gap-3 border-t-2 border-dashed border-[var(--vintage-accent-hover)] bg-[var(--vintage-surface)] p-4">
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
