'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';

import { OnboardingWizard } from '@/components/dashboard/OnboardingWizard';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import './onboarding.css';

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
    <div className="onboarding-behtarino mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="onboarding-hero">
        <div className="onboarding-hero-row">
          <div className="onboarding-brand">
            <span className="onboarding-brand-mark">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <span className="onboarding-brand-text">
              <strong>شروع آسان</strong>
              <small>پنل کسب‌وکار</small>
            </span>
          </div>
        </div>
        <p className="onboarding-hero-sub">
          مرحله‌به‌مرحله از استعلام هویت تا ساخت کسب‌وکار و دریافت تأیید مدیر
        </p>
        <div className="onboarding-benefits">
          <span>
            <Check className="size-3.5" aria-hidden />
            دیده‌شدن بین مشتریان محلی
          </span>
          <span>
            <Check className="size-3.5" aria-hidden />
            مدیریت آسان کسب‌وکار
          </span>
          <span>
            <Check className="size-3.5" aria-hidden />
            تأیید سریع مدیر
          </span>
        </div>
      </header>

      {disabled ? (
        <div className="onboarding-disabled">
          بخش «شروع آسان» موقتاً توسط مدیر غیرفعال شده است.
          <Link
            href="/dashboard"
            className="mt-4 inline-flex w-fit items-center gap-1 text-xs font-bold text-brand underline underline-offset-4"
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
