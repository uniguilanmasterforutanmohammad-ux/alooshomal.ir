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

import { BiolinkTemplateCard } from './BiolinkTemplateCard';
import { RecordCard, type RecordIconLink, type RecordRow } from '@/components/ui/RecordCard';
import type { BiolinkFormValues } from './BiolinkForm';
import { biolinkTemplate } from '@/lib/biolink-templates';
import type { TaxonomyItem } from '@/lib/api';
import { socialHref as socialNetworkHref } from '@/lib/social-fields';

interface Props {
  values: BiolinkFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

/** Short glyph per social network for the design card's icon row. */
const SOCIAL_GLYPHS: Record<string, string> = {
  whatsapp: '✆',
  instagram: '◎',
  telegram: '➤',
  linkedin: 'in',
  twitter: 'X',
};

function socialHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Live, real-time preview of the public biolink. It re-renders on every
 * keystroke and whenever the selected display mode changes, and renders the
 * exact same card as `/biolinks/<slug>` (the classic «رکورد» look, or the chosen
 * design), so the builder always shows what visitors will get.
 */
export function LiveBiolinkPreview({
  values,
  cityName,
  businessName,
  compact,
}: Props) {
  const headline =
    values.jobTitle.trim() ||
    values.company.trim() ||
    values.fullName.trim() ||
    'نام کسب‌وکار';
  const subline = values.fullName.trim() ? `به مدیریت ${values.fullName.trim()}` : null;

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
  ].filter((entry): entry is RecordIconLink => Boolean(entry));

  const template = biolinkTemplate(values.template);

  if (!template) {
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
        headingLevel="h2"
      />
    );
  }

  const templateRows = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    href: row.href,
    dir: row.dir,
  }));
  const templateIcons = iconLinks.map((link) => ({
    key: link.key,
    label: link.label,
    href: link.href,
    glyph: SOCIAL_GLYPHS[link.key] ?? '◎',
  }));

  return (
    <BiolinkTemplateCard
      template={template}
      fullName={values.fullName || 'نام و نام خانوادگی'}
      headline={headline}
      subline={subline}
      bio={values.bio}
      cityName={cityName}
      businessName={businessName}
      avatarUrl={values.avatarUrl || null}
      rows={templateRows}
      icons={templateIcons}
      accent={values.primaryColor}
      website={values.website.trim() || null}
      headingLevel="h2"
    />
  );
}
