'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { BiolinkForm, type BiolinkFormValues } from '@/components/biolink/BiolinkForm';
import { api, type Biolink } from '@/lib/api';

export default function EditBiolinkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [biolink, setBiolink] = useState<Biolink | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Biolink>(`/biolinks/id/${params.id}`)
      .then(setBiolink)
      .catch((err) => setError(err instanceof Error ? err.message : 'خطا'));
  }, [params.id]);

  async function handleSubmit(values: BiolinkFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      await api.patch<Biolink>(`/biolinks/${params.id}`, payload);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره بیولینک ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink">ویرایش بیولینک</h1>
      <p className="text-sm text-muted">
        با هر ویرایش، بیولینک دوباره برای تأیید مدیر ارسال می‌شود.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : null}

      {biolink ? (
        <div className="mt-6">
          <BiolinkForm
            initial={{
              fullName: biolink.fullName,
              jobTitle: biolink.jobTitle ?? '',
              company: biolink.company ?? '',
              bio: biolink.bio ?? '',
              phone: biolink.phone ?? '',
              email: biolink.email ?? '',
              website: biolink.website ?? '',
              address: biolink.address ?? '',
              linkedin: biolink.linkedin ?? '',
              instagram: biolink.instagram ?? '',
              telegram: biolink.telegram ?? '',
              twitter: biolink.twitter ?? '',
              whatsapp: biolink.whatsapp ?? '',
              primaryColor: biolink.primaryColor,
              template: biolink.template ?? 'vintage',
              cityId: biolink.cityId ?? '',
              businessId: biolink.businessId ?? '',
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="ذخیره تغییرات"
          />
        </div>
      ) : (
        !error && <p className="mt-8 text-muted">در حال بارگذاری...</p>
      )}
    </div>
  );
}
