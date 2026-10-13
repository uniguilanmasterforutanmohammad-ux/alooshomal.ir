'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { BiolinkForm, type BiolinkFormValues } from '@/components/biolink/BiolinkForm';
import { Alert, isQuotaMessage } from '@/components/ui/Alert';
import { api, type Biolink } from '@/lib/api';

export default function NewBiolinkPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState(false);

  async function handleSubmit(
    values: BiolinkFormValues,
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
      await api.post<Biolink>('/biolinks', payload);
      router.push(options?.draft ? '/dashboard/biolinks' : '/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ذخیره بیولینک ناموفق بود';
      setError(message);
      setQuota(isQuotaMessage(message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink">ساخت بیولینک جدید</h1>
      <p className="text-sm text-muted">اطلاعات حرفه‌ای خود را وارد کنید.</p>

      {error ? (
        <Alert
          tone={quota ? 'warning' : 'error'}
          title={quota ? 'محدودیت اشتراک' : 'خطا در ذخیره بیولینک'}
          action={
            quota ? { href: '/dashboard/subscriptions', label: 'مشاهده و ارتقای اشتراک' } : null
          }
        >
          {error}
        </Alert>
      ) : null}

      <div className="mt-6">
        <BiolinkForm
          onSubmit={handleSubmit}
          submitting={submitting}
          inline
          showDraftButton
        />
      </div>
    </div>
  );
}
