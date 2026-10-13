import Image from 'next/image';
import {
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Twitter,
} from 'lucide-react';

import { businessCardThemeClassName } from '@/lib/themes';
import { InlineEdit } from '@/components/ui/InlineEdit';
import type { TaxonomyItem } from '@/lib/api';

export interface ThemedBusinessCardData {
  fullName: string;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  logoUrl?: string | null;
  cityId?: string | null;
  businessId?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  whatsapp?: string | null;
  primaryColor?: string | null;
}

interface Props {
  themeKey: string;
  data: ThemedBusinessCardData;
  cityName?: string;
  businessName?: string;
  interactive?: boolean;
  compact?: boolean;
  /** when true every field becomes editable directly on the card */
  editable?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

function socialHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/**
 * Landscape "business card" renderer, mirroring the reference templates in
 * `businescard/`: a header with avatar + name/role, a divider, contact rows,
 * a row of social circles and the primary actions. Shared by the live editor
 * preview and the public business-card page so both look identical.
 */
export function ThemedBusinessCard({
  themeKey,
  data,
  cityName,
  businessName,
  interactive,
  compact,
  editable,
  onFieldChange,
  cityOptions,
  businessOptions,
}: Props) {
  if (editable) {
    return (
      <EditableBusinessCard
        themeKey={themeKey}
        data={data}
        compact={compact}
        onFieldChange={onFieldChange}
        cityOptions={cityOptions}
        businessOptions={businessOptions}
      />
    );
  }

  const initials = (data.fullName || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toUpperCase();

  const contacts: Array<{
    key: string;
    value: string;
    href: string;
    Icon: typeof Mail;
  }> = [
    { key: 'email', value: data.email ?? '', href: `mailto:${data.email ?? ''}`, Icon: Mail },
    { key: 'phone', value: data.phone ?? '', href: `tel:${data.phone ?? ''}`, Icon: Phone },
    { key: 'website', value: data.website ?? '', href: socialHref(data.website ?? ''), Icon: Globe },
    { key: 'whatsapp', value: data.whatsapp ?? '', href: `https://wa.me/${(data.whatsapp ?? '').replace(/[^0-9]/g, '')}`, Icon: MessageCircle },
  ].filter((entry) => entry.value);

  const socials: Array<{
    key: string;
    value: string;
    href: string;
    label: string;
    Icon: typeof Linkedin;
  }> = [
    { key: 'linkedin', value: data.linkedin ?? '', href: socialHref(data.linkedin ?? ''), label: 'LinkedIn', Icon: Linkedin },
    { key: 'twitter', value: data.twitter ?? '', href: socialHref(data.twitter ?? ''), label: 'X', Icon: Twitter },
    { key: 'instagram', value: data.instagram ?? '', href: socialHref(data.instagram ?? ''), label: 'Instagram', Icon: Instagram },
    { key: 'telegram', value: data.telegram ?? '', href: socialHref(data.telegram ?? ''), label: 'Telegram', Icon: Send },
  ].filter((entry) => entry.value);

  const LinkTag = interactive ? 'a' : 'span';
  const company = data.company || cityName;

  return (
    <div className={`${businessCardThemeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}>
      <div className="bc-card relative w-full p-6 sm:p-8">
        <div className="relative z-[1]">
          <header className="flex items-start gap-4">
            <div className="bc-avatar flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold">
              {data.avatarUrl ? (
                <Image
                  src={data.avatarUrl}
                  alt={data.fullName}
                  width={72}
                  height={72}
                  unoptimized
                  className="size-[72px] object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {data.logoUrl ? (
                  <Image
                    src={data.logoUrl}
                    alt={data.company || data.fullName}
                    width={40}
                    height={40}
                    unoptimized
                    className="size-8 shrink-0 object-contain"
                  />
                ) : null}
                <h1 className="bc-name bc-fa truncate text-[clamp(24px,6vw,32px)] leading-tight font-extrabold">
                  {data.fullName || 'نام و نام خانوادگی'}
                </h1>
              </div>
              {data.jobTitle ? (
                <p className="bc-role bc-fa mt-1.5 text-sm font-semibold">
                  {data.jobTitle}
                </p>
              ) : null}
              {company ? (
                <p className="bc-muted bc-fa mt-0.5 text-xs font-semibold">
                  {company}
                  {businessName ? ` · ${businessName}` : ''}
                </p>
              ) : null}
            </div>
          </header>

          <div className="bc-rule my-5 h-px w-full" />

          {contacts.length > 0 ? (
            <div className="bc-contact flex flex-wrap justify-between gap-x-4 gap-y-2 text-[13px]">
              {contacts.map((entry) => (
                <LinkTag
                  key={entry.key}
                  {...(interactive
                    ? {
                        href: entry.href,
                        target: entry.href.startsWith('http') ? '_blank' : undefined,
                        rel: entry.href.startsWith('http') ? 'noreferrer' : undefined,
                      }
                    : {})}
                  className="flex min-w-0 items-center gap-2"
                >
                  <entry.Icon className="size-[17px] shrink-0" aria-hidden />
                  <span dir="ltr" className="truncate">
                    {entry.value}
                  </span>
                </LinkTag>
              ))}
            </div>
          ) : null}

          <footer className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {socials.length > 0 ? (
              <div className="flex items-center gap-2.5">
                {socials.map((entry) => (
                  <LinkTag
                    key={entry.key}
                    {...(interactive
                      ? {
                          href: entry.href,
                          target: '_blank',
                          rel: 'noreferrer',
                          'aria-label': entry.label,
                        }
                      : {})}
                    className="bc-social flex size-9 items-center justify-center"
                  >
                    <entry.Icon className="size-[17px]" aria-hidden />
                  </LinkTag>
                ))}
              </div>
            ) : (
              <span />
            )}

            <div className="flex gap-3">
              {data.phone ? (
                <a
                  href={`tel:${data.phone}`}
                  className="bc-btn bc-fa inline-flex min-h-[44px] flex-1 items-center justify-center px-5 text-[13px] font-bold"
                >
                  تماس
                </a>
              ) : null}
              {data.email ? (
                <a
                  href={`mailto:${data.email}`}
                  className="bc-btn bc-fa inline-flex min-h-[44px] flex-1 items-center justify-center px-5 text-[13px] font-bold"
                >
                  ایمیل
                </a>
              ) : null}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

interface EditableProps {
  themeKey: string;
  data: ThemedBusinessCardData;
  compact?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

const EDITABLE_CONTACTS: Array<{ key: string; placeholder: string; Icon: typeof Mail }> = [
  { key: 'email', placeholder: 'ایمیل', Icon: Mail },
  { key: 'phone', placeholder: 'تلفن', Icon: Phone },
  { key: 'website', placeholder: 'وب‌سایت', Icon: Globe },
  { key: 'whatsapp', placeholder: 'واتساپ', Icon: MessageCircle },
];

const EDITABLE_SOCIALS: Array<{ key: string; label: string; Icon: typeof Linkedin }> = [
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
  { key: 'twitter', label: 'X', Icon: Twitter },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'telegram', label: 'Telegram', Icon: Send },
];

/**
 * Editable variant of {@link ThemedBusinessCard}: the landscape card renders
 * with the selected theme, but name / role / company and every contact row are
 * inline fields so the user edits straight on top of the preview.
 */
function EditableBusinessCard({
  themeKey,
  data,
  compact,
  onFieldChange,
  cityOptions,
  businessOptions,
}: EditableProps) {
  const set = (key: string) => (value: string) => onFieldChange?.(key, value);

  const initials = (data.fullName || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toUpperCase();

  return (
    <div className={`${businessCardThemeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}>
      <div className="bc-card relative w-full p-6 sm:p-8">
        <div className="relative z-[1]">
          <header className="flex items-start gap-4">
            <div className="bc-avatar flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold">
              {data.avatarUrl ? (
                <Image
                  src={data.avatarUrl}
                  alt={data.fullName}
                  width={72}
                  height={72}
                  unoptimized
                  className="size-[72px] object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {data.logoUrl ? (
                  <Image
                    src={data.logoUrl}
                    alt={data.company || data.fullName}
                    width={40}
                    height={40}
                    unoptimized
                    className="size-8 shrink-0 object-contain"
                  />
                ) : null}
                <InlineEdit
                  value={data.fullName}
                  onChange={set('fullName')}
                  placeholder="نام و نام خانوادگی"
                  ariaLabel="نام و نام خانوادگی"
                  className="bc-name bc-fa block text-[clamp(24px,6vw,32px)] leading-tight font-extrabold"
                />
              </div>
              <InlineEdit
                value={data.jobTitle ?? ''}
                onChange={set('jobTitle')}
                placeholder="عنوان شغلی"
                ariaLabel="عنوان شغلی"
                className="bc-role bc-fa mt-1.5 block text-sm font-semibold"
              />
              <div className="bc-muted bc-fa mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <InlineEdit
                  value={data.company ?? ''}
                  onChange={set('company')}
                  placeholder="شرکت"
                  ariaLabel="شرکت"
                  className="inline-edit"
                />
                <span aria-hidden>·</span>
                <select
                  className="bc-select bc-fa"
                  value={data.cityId ?? ''}
                  onChange={(event) => onFieldChange?.('cityId', event.target.value)}
                  aria-label="شهر"
                >
                  <option value="">شهر...</option>
                  {(cityOptions ?? []).map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                <select
                  className="bc-select bc-fa"
                  value={data.businessId ?? ''}
                  onChange={(event) => onFieldChange?.('businessId', event.target.value)}
                  aria-label="کسب و کار"
                >
                  <option value="">کسب و کار...</option>
                  {(businessOptions ?? []).map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          <div className="bc-rule my-5 h-px w-full" />

          <div className="bc-contact flex flex-wrap justify-between gap-x-4 gap-y-2 text-[13px]">
            {EDITABLE_CONTACTS.map((entry) => (
              <div key={entry.key} className="flex min-w-0 items-center gap-2">
                <entry.Icon className="size-[17px] shrink-0" aria-hidden />
                <InlineEdit
                  value={(data[entry.key as keyof ThemedBusinessCardData] as string | null) ?? ''}
                  onChange={set(entry.key)}
                  placeholder={entry.placeholder}
                  ariaLabel={entry.placeholder}
                  dir="ltr"
                  className="min-w-0 truncate"
                />
              </div>
            ))}
          </div>

          <InlineEdit
            value={data.bio ?? ''}
            onChange={set('bio')}
            placeholder="درباره من"
            ariaLabel="درباره من"
            multiline
            className="bc-muted bc-fa mt-4 block text-xs leading-6 whitespace-pre-line"
          />

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {EDITABLE_SOCIALS.map((entry) => (
              <div key={entry.key} className="flex min-w-0 items-center gap-2 text-[13px]">
                <span className="bc-social flex size-8 shrink-0 items-center justify-center">
                  <entry.Icon className="size-[15px]" aria-hidden />
                </span>
                <InlineEdit
                  value={(data[entry.key as keyof ThemedBusinessCardData] as string | null) ?? ''}
                  onChange={set(entry.key)}
                  placeholder={entry.label}
                  ariaLabel={entry.label}
                  dir="ltr"
                  className="min-w-0 flex-1 truncate"
                />
              </div>
            ))}
          </div>

          <InlineEdit
            value={data.address ?? ''}
            onChange={set('address')}
            placeholder="آدرس"
            ariaLabel="آدرس"
            className="bc-muted bc-fa mt-3 block text-xs"
          />
        </div>
      </div>
    </div>
  );
}
