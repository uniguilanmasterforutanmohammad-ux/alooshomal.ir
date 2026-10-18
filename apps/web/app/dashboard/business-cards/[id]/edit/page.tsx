'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { api, type BusinessCard } from '@/lib/api';

export default function EditBiolinkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<BusinessCard>(`/business-cards/id/${params.id}`)
      .then(setBusinessCard)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا'));
  }, [params.id]);

  async function handleSubmit(
    values: BusinessCardFormValues,
    options?: { draft?: boolean },
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      // Send the link explicitly (even when empty) so the user can detach it.
      (payload as Record<string, unknown>).biolinkId = values.biolinkId;
      if (options?.draft) {
        (payload as Record<string, unknown>).draft = true;
      }
      await api.patch<BusinessCard>(`/business-cards/${params.id}`, payload);
      router.push(options?.draft ? '/dashboard/business-cards' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره کارت ویزیت ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink">ویرایش کارت ویزیت</h1>
      <p className="text-sm text-muted">
        تغییرات را مستقیم روی پیش‌نمایش اعمال کنید؛ با «ذخیره تغییرات» برای تأیید
        مدیر ارسال می‌شود و با «ذخیره به‌عنوان پیش‌نویس» خصوصی می‌ماند.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {businessCard ? (
        <div className="mt-6">
          <BusinessCardForm
            initial={{
              fullName: businessCard.fullName,
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
              primaryColor: businessCard.primaryColor,
              template: businessCard.template ?? 'glassmorphism',
              cityId: businessCard.cityId ?? '',
              businessId: businessCard.businessId ?? '',
              biolinkId: businessCard.linkedBiolinks?.[0]?.id ?? '',
              avatarUrl: businessCard.avatarUrl ?? '',
              logoUrl: businessCard.logoUrl ?? '',
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="ذخیره تغییرات"
            inline
            showDraftButton
            linkCurrentId={params.id}
          />
        </div>
      ) : (
        !error && <p className="mt-8 text-muted">در حال بارگذاری...</p>
      )}
    </div>
  );
}
