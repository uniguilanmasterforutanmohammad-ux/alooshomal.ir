'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { Alert, isQuotaMessage } from '@/components/ui/Alert';
import { api, type BusinessCard } from '@/lib/api';

export default function NewBusinessCardPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BusinessCard | null>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  // Reopen the user's most recent unfinished draft (if any) so a saved
  // half-filled builder is not lost when they come back to this page.
  useEffect(() => {
    api
      .get<BusinessCard | null>('/business-cards/mine/draft')
      .then(setDraft)
      .catch(() => setDraft(null))
      .finally(() => setReady(true));
  }, []);

  async function handleSubmit(
    values: BusinessCardFormValues,
    options?: { draft?: boolean },
  ): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    setQuota(false);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      // Always send the link explicitly so an empty value clears it.
      (payload as Record<string, unknown>).biolinkId = values.biolinkId;
      if (options?.draft) {
        (payload as Record<string, unknown>).draft = true;
      }
      // Continue the existing draft (update) instead of creating a second one.
      if (draft) {
        await api.patch<BusinessCard>(`/business-cards/${draft.id}`, payload);
      } else {
        await api.post<BusinessCard>('/business-cards', payload);
      }
      router.push(options?.draft ? '/dashboard/business-cards' : '/dashboard');
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

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink">
        {draft ? 'ادامه‌ی تکمیل کارت ویزیت' : 'ساخت کارت ویزیت جدید'}
      </h1>
      <p className="text-sm text-muted">
        {draft
          ? 'پیش‌نویس ذخیره‌شده‌ی شما بارگذاری شد؛ آن را تکمیل و برای تأیید ارسال کنید.'
          : 'اطلاعات کارت ویزیت خود را وارد کنید.'}
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

      <div className="mt-6">
        {!ready ? (
          <p className="text-muted">در حال بارگذاری...</p>
        ) : (
          <BusinessCardForm
            key={draft?.id ?? 'new'}
            initial={
              draft
                ? {
                    fullName: draft.fullName,
                    jobTitle: draft.jobTitle ?? '',
                    company: draft.company ?? '',
                    bio: draft.bio ?? '',
                    phone: draft.phone ?? '',
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
                    biolinkId: draft.linkedBiolinks?.[0]?.id ?? '',
                    avatarUrl: draft.avatarUrl ?? '',
                    logoUrl: draft.logoUrl ?? '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            submitting={submitting}
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
