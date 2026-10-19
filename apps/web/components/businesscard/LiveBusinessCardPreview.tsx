'use client';

import {
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Twitter,
} from 'lucide-react';

import { RecordCard, type RecordIconLink, type RecordRow } from '@/components/ui/RecordCard';
import type { BusinessCardFormValues } from './BusinessCardForm';
import type { TaxonomyItem } from '@/lib/api';

interface Props {
  values: BusinessCardFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

function socialHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Live, real-time preview of the public business card. It re-renders on every
 * keystroke and whenever the selected theme/colour changes, and renders the
 * exact same vintage «record» card as `/business-cards/<slug>`, so the builder
 * always shows what visitors will get.
 */
export function LiveBusinessCardPreview({
  values,
  cityName,
  businessName,
  compact,
}: Props) {
  const headline =
    values.jobTitle.trim() || values.fullName.trim() || 'نام کسب‌وکار';
  const subline = `به مدیریت ${values.fullName.trim() || '—'}`;

  const rows: RecordRow[] = [];
  if (values.mobile.trim()) {
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: values.mobile,
      href: `tel:${values.mobile}`,
      dir: 'ltr',
      Icon: Smartphone,
    });
  }
  if (values.phone.trim()) {
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: values.phone,
      href: `tel:${values.phone}`,
      dir: 'ltr',
      Icon: Phone,
    });
  }
  if (values.email.trim()) {
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: values.email,
      href: `mailto:${values.email}`,
      dir: 'ltr',
      Icon: Mail,
    });
  }
  if (values.website.trim()) {
    rows.push({
      key: 'website',
      label: 'وب‌سایت',
      value: values.website,
      href: socialHref(values.website),
      dir: 'ltr',
      Icon: Globe,
    });
  }
  if (values.address.trim()) {
    rows.push({
      key: 'address',
      label: 'آدرس',
      value: values.address,
      Icon: MapPin,
    });
  }

  const iconLinks: RecordIconLink[] = [
    values.whatsapp
      ? {
          key: 'whatsapp',
          label: 'واتساپ',
          href: `https://wa.me/${values.whatsapp.replace(/[^0-9]/g, '')}`,
          Icon: MessageCircle,
        }
      : null,
    values.instagram
      ? {
          key: 'instagram',
          label: 'اینستاگرام',
          href: socialHref(values.instagram),
          Icon: Instagram,
        }
      : null,
    values.telegram
      ? { key: 'telegram', label: 'تلگرام', href: socialHref(values.telegram), Icon: Send }
      : null,
    values.linkedin
      ? { key: 'linkedin', label: 'لینکدین', href: socialHref(values.linkedin), Icon: Linkedin }
      : null,
    values.twitter
      ? { key: 'twitter', label: 'ایکس', href: socialHref(values.twitter), Icon: Twitter }
      : null,
  ].filter((entry): entry is RecordIconLink => Boolean(entry));

  return (
    <RecordCard
      fullName={values.fullName || 'نام و نام خانوادگی'}
      headline={headline}
      subline={subline}
      bio={values.bio}
      companyName={values.company || null}
      cityName={cityName}
      businessName={businessName}
      avatarUrl={values.avatarUrl || null}
      rows={rows}
      iconLinks={iconLinks}
      accent={values.primaryColor}
      compact={compact}
    />
  );
}
