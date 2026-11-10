'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';

export default function OnboardingPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const { isFeatureVisible, loaded } = useFeatures();
  const disabled = loaded && !isFeatureVisible('featureOnboarding');

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--vintage-border)] bg-brand-light text-brand">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink">شروع آسان</h1>
          <p className="text-sm text-muted">
            مرحله‌به‌مرحله از استعلام هویت تا ساخت کسب‌وکار و دریافت تأیید مدیر
          </p>
        </div>
      </div>

      {disabled ? (
        <div className="indeed-panel p-8 text-center text-sm leading-7 text-muted">
          بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.
          <Link
            href="/dashboard"
            className="indeed-btn indeed-btn-secondary mt-4 w-fit py-2 text-xs"
          >
            بازگشت به داشبورد
          </Link>
        </div>
      ) : (
        <OnboardingWizard />
      )}
    </div>
  );
}
