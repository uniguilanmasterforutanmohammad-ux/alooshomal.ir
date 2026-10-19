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

import {
  BusinessCardFace,
  type BizCardRow,
  type BizCardSocial,
} from '@/components/businesscard/BusinessCardFace';
import type { BusinessCardFormValues } from './BusinessCardForm';
import type { TaxonomyItem } from '@/lib/api';
import { socialHref as socialNetworkHref } from '@/lib/social-fields';

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
 * exact same landscape business-card face as `/business-cards/<slug>`, so the
 * builder always shows what visitors will get.
 */
export function LiveBusinessCardPreview({
  values,
  cityName,
  businessName,
  compact,
}: Props) {
  const rows: BizCardRow[] = [];
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

  const socials: BizCardSocial[] = [
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
          href: socialNetworkHref('instagram', values.instagram),
          Icon: Instagram,
        }
      : null,
    values.telegram
      ? {
          key: 'telegram',
          label: 'تلگرام',
          href: socialNetworkHref('telegram', values.telegram),
          Icon: Send,
        }
      : null,
    values.linkedin
      ? {
          key: 'linkedin',
          label: 'لینکدین',
          href: socialNetworkHref('linkedin', values.linkedin),
          Icon: Linkedin,
        }
      : null,
    values.twitter
      ? {
          key: 'twitter',
          label: 'ایکس',
          href: socialNetworkHref('twitter', values.twitter),
          Icon: Twitter,
        }
      : null,
  ].filter((entry): entry is BizCardSocial => Boolean(entry));

  return (
    <BusinessCardFace
      fullName={values.fullName || 'نام و نام خانوادگی'}
      jobTitle={values.jobTitle || null}
      bio={values.bio}
      cityName={cityName}
      businessName={businessName}
      avatarUrl={values.avatarUrl || null}
      rows={rows}
      socials={socials}
      accent={values.primaryColor}
      compact={compact}
    />
  );
}
