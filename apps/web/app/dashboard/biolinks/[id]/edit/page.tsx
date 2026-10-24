'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { BiolinkForm, type BiolinkFormValues } from '@/components/biolink/BiolinkForm';
import { api, type Biolink } from '@/lib/api';
import {
  DEFAULT_DARK_TEMPLATE_KEY,
  DEFAULT_LIGHT_TEMPLATE_KEY,
} from '@/lib/biolink-templates';

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

  async function handleSubmit(
    values: BiolinkFormValues,
    options?: { draft?: boolean },
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ''),
      );
      // Send the link explicitly (even when empty) so the user can detach it.
      (payload as Record<string, unknown>).businessCardId = values.businessCardId;
      if (options?.draft) {
        (payload as Record<string, unknown>).draft = true;
      }
      await api.patch<Biolink>(`/biolinks/${params.id}`, payload);
      router.push(options?.draft ? '/dashboard/biolinks' : '/dashboard');
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
        تغییرات را مستقیم روی پیش‌نمایش اعمال کنید؛ با «ذخیره تغییرات» برای تأیید
        مدیر ارسال می‌شود و با «ذخیره به‌عنوان پیش‌نویس» خصوصی می‌ماند.
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
              mobile: biolink.mobile ?? '',
              email: biolink.email ?? '',
              website: biolink.website ?? '',
              address: biolink.address ?? '',
              linkedin: biolink.linkedin ?? '',
              instagram: biolink.instagram ?? '',
              telegram: biolink.telegram ?? '',
              twitter: biolink.twitter ?? '',
              whatsapp: biolink.whatsapp ?? '',
              primaryColor: biolink.primaryColor,
              template: biolink.template ?? DEFAULT_LIGHT_TEMPLATE_KEY,
              templateDark: biolink.templateDark ?? DEFAULT_DARK_TEMPLATE_KEY,
              cityId: biolink.cityId ?? '',
              businessId: biolink.businessId ?? '',
              businessCardId: biolink.businessCard?.id ?? '',
              avatarUrl: biolink.avatarUrl ?? '',
              logoUrl: biolink.logoUrl ?? '',
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
