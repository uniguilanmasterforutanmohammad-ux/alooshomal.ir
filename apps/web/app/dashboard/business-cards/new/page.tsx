'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { BusinessCardForm, type BusinessCardFormValues } from '@/components/businesscard/BusinessCardForm';
import { Alert, isQuotaMessage } from '@/components/ui/Alert';
import { api, type BusinessCard } from '@/lib/api';

export default function NewBusinessCardPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  async function handleSubmit(
    values: BusinessCardFormValues,
    options?: { draft?: boolean },
  ) {
    setSubmitting(true);
    setError(null);
    setQuota(false);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      if (options?.draft) {
        (payload as Record<string, unknown>).draft = true;
      }
      await api.post<BusinessCard>('/business-cards', payload);
      router.push(options?.draft ? '/dashboard/business-cards' : '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ذخیره کارت ویزیت ناموفق بود';
      setError(message);
      setQuota(isQuotaMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink">ساخت کارت ویزیت جدید</h1>
      <p className="text-sm text-muted">اطلاعات کارت ویزیت خود را وارد کنید.</p>

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
        <BusinessCardForm
          onSubmit={handleSubmit}
          submitting={submitting}
          inline
          showDraftButton
        />
      </div>
    </div>
  );
}
