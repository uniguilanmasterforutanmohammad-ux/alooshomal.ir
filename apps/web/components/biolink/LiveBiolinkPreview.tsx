'use client';

import { BiolinkTemplateCard } from './BiolinkTemplateCard';
import type { BiolinkFormValues } from './BiolinkForm';
import { biolinkTemplate } from '@/lib/biolink-templates';
import type { TaxonomyItem } from '@/lib/api';

interface Props {
  values: BiolinkFormValues;
  cityName?: string;
  businessName?: string;
  compact?: boolean;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

/** Short glyph per social network for the template card's icon row. */
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
 * keystroke and whenever the selected theme/colour changes, and renders the
 * exact same vintage «record» card as `/biolinks/<slug>`, so the builder always
 * shows what visitors will get.
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
  // Same order as the public page: نام کسب‌وکار → «به مدیریت …» → شرکت (chip).
  const subline = values.fullName.trim() ? `به مدیریت ${values.fullName.trim()}` : null;

  const rows: import('./BiolinkTemplateCard').TemplateRow[] = [];
  if (values.mobile.trim()) {
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: values.mobile,
      href: `tel:${values.mobile}`,
      dir: 'ltr',
    });
  }
  if (values.phone.trim()) {
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: values.phone,
      href: `tel:${values.phone}`,
      dir: 'ltr',
    });
  }
  if (values.email.trim()) {
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: values.email,
      href: `mailto:${values.email}`,
      dir: 'ltr',
    });
  }
  if (values.website.trim()) {
    rows.push({
      key: 'website',
      label: 'وب‌سایت',
      value: values.website,
      href: socialHref(values.website),
      dir: 'ltr',
    });
  }
  if (values.address.trim()) {
    rows.push({ key: 'address', label: 'آدرس', value: values.address });
  }

  const icons: import('./BiolinkTemplateCard').TemplateIcon[] = [];
  const socials: Array<{ key: string; value: string }> = [
    { key: 'whatsapp', value: values.whatsapp },
    { key: 'instagram', value: values.instagram },
    { key: 'telegram', value: values.telegram },
    { key: 'linkedin', value: values.linkedin },
    { key: 'twitter', value: values.twitter },
  ];
  for (const social of socials) {
    if (!social.value.trim()) continue;
    const href =
      social.key === 'whatsapp'
        ? `https://wa.me/${social.value.replace(/[^0-9]/g, '')}`
        : socialHref(social.value);
    icons.push({
      key: social.key,
      label: social.key,
      href,
      glyph: SOCIAL_GLYPHS[social.key] ?? '◎',
    });
  }

  const template =
    biolinkTemplate(values.template) ??
    biolinkTemplate(values.templateDark) ??
    biolinkTemplate('sunny')!;

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
      rows={rows}
      icons={icons}
      accent={values.primaryColor}
      website={values.website.trim() || null}
      headingLevel="h2"
    />
  );
}
