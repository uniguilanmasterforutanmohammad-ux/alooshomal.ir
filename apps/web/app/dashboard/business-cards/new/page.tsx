'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { AssetMobileActions } from '@/components/dashboard/AssetMobileActions';
import { ProfileRequiredNotice } from '@/components/dashboard/ProfileRequiredNotice';
import { Alert, isQuotaMessage } from '@/components/ui/Alert';
import { SuccessDialog } from '@/components/ui/SuccessDialog';
import { api, type BusinessCard } from '@/lib/api';
import {
  phonesNeedingInquiry,
  type AssetDefaults,
} from '@/lib/asset-defaults';
import { useProfileStatus } from '@/lib/profile-status';

export default function NewBusinessCardPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BusinessCard | null>(null);
  const [defaults, setDefaults] = useState<AssetDefaults | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [mobile, setMobile] = useState('');
  const [extraMobiles, setExtraMobiles] = useState<string[]>([]);
  const { completed, loading: profileLoading } = useProfileStatus();

  // Reopen the user's most recent unfinished draft (if any) so a saved
  // half-filled builder is not lost when they come back to this page. The
  // verified identity defaults prefill the locked fields.
  useEffect(() => {
    Promise.all([
      api
        .get<BusinessCard | null>('/business-cards/mine/draft')
        .catch(() => null),
      api.get<AssetDefaults>('/profile/asset-defaults').catch(() => null),
    ])
      .then(([draftResult, defaultsResult]) => {
        setDraft(draftResult);
        setDefaults(defaultsResult);
        setMobile(draftResult?.mobile ?? defaultsResult?.mobile ?? '');
      })
      .finally(() => setReady(true));
  }, []);

  const rules = defaults?.config.businessCard;
  // Only lock a field when it actually has a prefilled value; locking an empty
  // business/city would leave the user unable to complete the mandatory field.
  const lockedFields = (rules?.lockedFields ?? []).filter((field) => {
    if (field === 'fullName') return Boolean(defaults?.fullName || draft?.fullName);
    if (field === 'businessId') return Boolean(defaults?.businessId || draft?.businessId);
    if (field === 'cityId') return Boolean(defaults?.cityId || draft?.cityId);
    if (field === 'mobile') return Boolean(mobile);
    return false;
  });
  const shahkarPrice = defaults?.shahkarPrice ?? 0;

  const phonesToVerify = useMemo(
    () => phonesNeedingInquiry(defaults, mobile, extraMobiles),
    [defaults, mobile, extraMobiles],
  );
  const cartTotal = phonesToVerify.length * shahkarPrice;

  async function handleSubmit(
    values: BusinessCardFormValues,
    options?: { draft?: boolean },
  ): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    setQuota(false);
    try {
      // A paid, non-draft submit first runs the Shahkar inquiry for every new
      // number (charged to the wallet), then creates the card. A draft is free.
      if (!options?.draft) {
        for (const phone of phonesToVerify) {
          await api.post('/profile/phones/verify', { phone });
        }
      }
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      // Always send the link explicitly so an empty value clears it.
      (payload as Record<string, unknown>).biolinkId = values.biolinkId;
      (payload as Record<string, unknown>).mobile = mobile || values.mobile;
      (payload as Record<string, unknown>).otherPhones = extraMobiles;
      if (options?.draft) {
        (payload as Record<string, unknown>).draft = true;
      }
      // Continue the existing draft (update) instead of creating a second one.
      if (draft) {
        await api.patch<BusinessCard>(`/business-cards/${draft.id}`, payload);
      } else {
        await api.post<BusinessCard>('/business-cards', payload);
      }
      if (options?.draft) {
        router.push('/dashboard/business-cards');
      } else {
        setSuccessOpen(true);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ذخیره کارت ویزیت ناموفق بود';
      setError(message);
      setQuota(isQuotaMessage(message));
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function discardDraft() {
    if (!draft) return;
    if (!window.confirm('پیش‌نویس فعلی حذف شود و از ابتدا شروع کنید؟')) return;
    try {
      await api.delete(`/business-cards/${draft.id}`);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف پیش‌نویس ناموفق بود');
    }
  }

  if (!profileLoading && !completed) {
    return <ProfileRequiredNotice action="ساخت کارت ویزیت" />;
  }

  const goToCards = () => {
    setSuccessOpen(false);
    router.push('/dashboard/business-cards');
  };
  const goToDashboard = () => {
    setSuccessOpen(false);
    router.push('/dashboard');
  };

  const initial = draft
    ? {
        fullName: draft.fullName,
        jobTitle: draft.jobTitle ?? '',
        company: draft.company ?? '',
        bio: draft.bio ?? '',
        phone: draft.phone ?? '',
        mobile: draft.mobile ?? '',
        email: draft.email ?? '',
        website: draft.website ?? '',
        address: draft.address ?? '',
        linkedin: draft.linkedin ?? '',
        instagram: draft.instagram ?? '',
        telegram: draft.telegram ?? '',
        twitter: draft.twitter ?? '',
        whatsapp: draft.whatsapp ?? '',
        primaryColor: draft.primaryColor,
        template: draft.template ?? undefined,
        cityId: draft.cityId ?? '',
        businessId: draft.businessId ?? '',
        subCategory: draft.subCategory ?? '',
        subSubCategory: draft.subSubCategory ?? '',
        neighborhood: draft.neighborhood ?? '',
        biolinkId: draft.linkedBiolinks?.[0]?.id ?? '',
        avatarUrl: draft.avatarUrl ?? '',
        logoUrl: draft.logoUrl ?? '',
        gallery: draft.gallery ?? [],
        workingHours: draft.workingHours ?? {},
      }
    : defaults
      ? {
          fullName: defaults.fullName,
          mobile: defaults.mobile,
          businessId: defaults.businessId,
          cityId: defaults.cityId,
        }
      : undefined;

  return (
    <div>
      <SuccessDialog
        open={successOpen}
        title="کارت ویزیت شما ساخته شد"
        description="کارت ویزیت ثبت شد و پس از تأیید مدیر در فهرست عمومی نمایش داده می‌شود. می‌توانید همین حالا آن را در پنل ببینید."
        primaryLabel="مشاهده کارت ویزیت‌های من"
        onPrimary={goToCards}
        secondaryLabel="بازگشت به داشبورد"
        onSecondary={goToDashboard}
        onClose={goToCards}
      />
      <h1 className="text-2xl font-extrabold text-ink">
        {draft ? 'ادامه‌ی تکمیل کارت ویزیت' : 'ساخت کارت ویزیت جدید'}
      </h1>
      <p className="text-sm text-muted">
        {draft
          ? 'پیش‌نویس ذخیره‌شده‌ی شما بارگذاری شد؛ آن را تکمیل و برای تأیید ارسال کنید.'
          : 'اطلاعات کارت ویزیت خود را وارد کنید؛ فیلدهای هویتی از استعلام‌های تأییدشده پر شده‌اند.'}
      </p>
      {draft ? (
        <button
          type="button"
          onClick={discardDraft}
          className="mt-2 text-xs font-bold text-red-600 underline hover:text-red-700"
        >
          حذف پیش‌نویس و شروع از ابتدا
        </button>
      ) : null}

      {error ? (
        <Alert
          tone={quota ? 'warning' : 'error'}
          title={quota ? 'محدودیت اشتراک' : 'خطا در ذخیره کارت ویزیت'}
          action={
            quota ? { href: '/dashboard/subscriptions', label: 'مشاهده و ارتقای اشتراک' } : null
          }
        >
          {error}
        </Alert>
      ) : null}

      {cartTotal > 0 ? (
        <div className="mt-4 rounded-xl border border-brand/30 bg-[var(--vintage-surface)] p-3 text-xs">
          <p className="font-extrabold text-ink">سبد خرید استعلام</p>
          <p className="mt-1 text-muted">
            {phonesToVerify.length.toLocaleString('fa-IR')} استعلام شاهکار ×{' '}
            {shahkarPrice.toLocaleString('fa-IR')} تومان ={' '}
            <b className="text-ink">{cartTotal.toLocaleString('fa-IR')} تومان</b>
          </p>
          <p className="mt-1 text-muted">
            مبلغ هنگام «پرداخت و ارسال برای تأیید» از کیف پول کسر می‌شود.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        {!ready ? (
          <p className="text-muted">در حال بارگذاری...</p>
        ) : (
          <BusinessCardForm
            key={draft?.id ?? 'new'}
            initial={initial}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel={rules?.submitLabel}
            lockedFields={lockedFields}
            mobileOverride={mobile}
            mobileActions={
              defaults ? (
                <AssetMobileActions
                  mobile={mobile}
                  verifiedPhones={defaults.verifiedPhones}
                  extraMobiles={extraMobiles}
                  shahkarPrice={shahkarPrice}
                  allowChange={rules?.allowMobileChange ?? true}
                  allowAdd={rules?.allowMobileAdd ?? true}
                  onChangeMobile={(phone) => setMobile(phone)}
                  onAddMobile={(phone) =>
                    setExtraMobiles((prev) =>
                      prev.includes(phone) ? prev : [...prev, phone],
                    )
                  }
                  onRemoveExtra={(phone) =>
                    setExtraMobiles((prev) => prev.filter((p) => p !== phone))
                  }
                />
              ) : null
            }
            inline
            showDraftButton
            linkCurrentId={draft?.id}
            autosaveKey="alooshomal_autosave_business_card_new"
          />
        )}
      </div>
    </div>
  );
}
