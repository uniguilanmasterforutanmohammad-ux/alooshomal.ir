import Image from 'next/image';
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

import { businessCardThemeClassName } from '@/lib/themes';
import { spectrumStyleVars } from '@/lib/card-spectrum';
import { InlineEdit } from '@/components/ui/InlineEdit';
import type { TaxonomyItem } from '@/lib/api';

export interface ThemedBusinessCardData {
  fullName: string;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
  mobile?: string | null;
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

  // Bottom rows: mobile, landline and address are written out in full, in that
  // order (see the card spec).
  const rows: Array<{ key: string; label: string; value: string; href: string; Icon: typeof Phone }> = [
    { key: 'mobile', label: 'تلفن همراه', value: data.mobile ?? '', href: `tel:${data.mobile ?? ''}`, Icon: Smartphone },
    { key: 'phone', label: 'تلفن ثابت', value: data.phone ?? '', href: `tel:${data.phone ?? ''}`, Icon: Phone },
    { key: 'address', label: 'آدرس', value: data.address ?? '', href: '', Icon: MapPin },
  ].filter((entry) => entry.value);

  // Every remaining way to reach the owner is shown icon-only: email, website,
  // whatsapp and the social networks.
  const iconLinks = [
    { key: 'email', value: data.email, href: `mailto:${data.email ?? ''}`, label: 'ایمیل', Icon: Mail },
    { key: 'website', value: data.website, href: socialHref(data.website ?? ''), label: 'وب‌سایت', Icon: Globe },
    { key: 'whatsapp', value: data.whatsapp, href: `https://wa.me/${(data.whatsapp ?? '').replace(/[^0-9]/g, '')}`, label: 'واتساپ', Icon: MessageCircle },
    { key: 'linkedin', value: data.linkedin, href: socialHref(data.linkedin ?? ''), label: 'LinkedIn', Icon: Linkedin },
    { key: 'twitter', value: data.twitter, href: socialHref(data.twitter ?? ''), label: 'X', Icon: Twitter },
    { key: 'instagram', value: data.instagram, href: socialHref(data.instagram ?? ''), label: 'Instagram', Icon: Instagram },
    { key: 'telegram', value: data.telegram, href: socialHref(data.telegram ?? ''), label: 'Telegram', Icon: Send },
  ].filter((entry) => entry.value);

  const LinkTag = interactive ? 'a' : 'span';
  const company = data.company || cityName;

  return (
    <div
      className={`${businessCardThemeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}
      style={spectrumStyleVars({ theme: themeKey, primaryColor: data.primaryColor })}
    >
      <div className="bc-card relative w-full p-6 sm:p-8">
        <div className="relative z-[1]">
          <header className="bc-header flex items-center gap-4">
            <div
              className="bc-avatar flex size-[72px] shrink-0 items-center justify-center overflow-hidden text-2xl font-extrabold"
              style={{ borderRadius: 'var(--bc-radius)' }}
            >
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
            <div className="bc-header-text min-w-0 flex-1">
              {data.jobTitle ? (
                <h1 className="bc-name bc-fa text-[clamp(20px,5vw,26px)] leading-tight font-extrabold">
                  {data.jobTitle}
                </h1>
              ) : null}
              <p className="bc-manager bc-fa mt-1 text-sm font-semibold">
                به مدیریت {data.fullName || '—'}
              </p>
              {company ? (
                <p className="bc-muted bc-fa mt-0.5 text-xs font-semibold">
                  {company}
                  {businessName ? ` · ${businessName}` : ''}
                </p>
              ) : null}
            </div>
          </header>

          <div className="bc-rule my-5 h-px w-full" />

          {rows.length > 0 ? (
            <ul className="bc-rows mt-4 flex flex-col gap-2 text-[13px]">
              {rows.map((row) => (
                <li key={row.key} className="flex items-start gap-2.5">
                  <row.Icon className="mt-0.5 size-[17px] shrink-0 bc-role" aria-hidden />
                  <span className="shrink-0 text-xs bc-muted">{row.label}:</span>
                  {row.href && interactive ? (
                    <a
                      href={row.href}
                      dir={row.key === 'address' ? 'rtl' : 'ltr'}
                      className="bc-contact-value min-w-0 flex-1"
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span
                      dir={row.key === 'address' ? 'rtl' : 'ltr'}
                      className="bc-contact-value min-w-0 flex-1"
                    >
                      {row.value}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}

          {data.bio ? (
            <p className="bc-muted bc-fa mt-3 text-xs leading-6 whitespace-pre-line">
              {data.bio}
            </p>
          ) : null}

          {/* All contact links as icon-only buttons (email, website, whatsapp
              and the social networks), centred together. */}
          {iconLinks.length > 0 ? (
            <div className="bc-iconbar mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {iconLinks.map((entry) => (
                <LinkTag
                  key={entry.key}
                  {...(interactive
                    ? {
                        href: entry.href,
                        target: entry.href.startsWith('http') ? '_blank' : undefined,
                        rel: entry.href.startsWith('http') ? 'noreferrer' : undefined,
                        'aria-label': entry.label,
                      }
                    : { 'aria-label': entry.label })}
                  className="bc-social flex size-9 items-center justify-center"
                >
                  <entry.Icon className="size-[17px]" aria-hidden />
                </LinkTag>
              ))}
            </div>
          ) : null}
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

/** Bottom rows of the editable card, in the order the card spec asks for. */
const EDITABLE_ROWS: Array<{ key: string; label: string; placeholder: string; Icon: typeof Phone }> = [
  { key: 'mobile', label: 'تلفن همراه', placeholder: 'تلفن همراه', Icon: Smartphone },
  { key: 'phone', label: 'تلفن ثابت', placeholder: 'تلفن ثابت', Icon: Phone },
  { key: 'address', label: 'آدرس', placeholder: 'آدرس', Icon: MapPin },
];

/** Icon-only fields edited on the card: email, website, whatsapp and socials. */
const EDITABLE_ICONS: Array<{ key: string; label: string; Icon: typeof Linkedin }> = [
  { key: 'email', label: 'ایمیل', Icon: Mail },
  { key: 'website', label: 'وب‌سایت', Icon: Globe },
  { key: 'whatsapp', label: 'واتساپ', Icon: MessageCircle },
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
    <div
      className={`${businessCardThemeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}
      style={spectrumStyleVars({ theme: themeKey, primaryColor: data.primaryColor })}
    >
      <div className="bc-card relative w-full p-6 sm:p-8">
        <div className="relative z-[1]">
          <header className="bc-header flex items-center gap-4">
            <div
              className="bc-avatar flex size-[72px] shrink-0 items-center justify-center overflow-hidden text-2xl font-extrabold"
              style={{ borderRadius: 'var(--bc-radius)' }}
            >
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
            <div className="bc-header-text min-w-0 flex-1">
              <InlineEdit
                value={data.jobTitle ?? ''}
                onChange={set('jobTitle')}
                placeholder="نام کسب‌وکار (عنوان شغلی)"
                ariaLabel="نام کسب‌وکار"
                className="bc-name bc-fa block text-[clamp(20px,5vw,26px)] leading-tight font-extrabold"
              />
              <div className="bc-manager bc-fa mt-1 flex items-center gap-1.5 text-sm font-semibold">
                <span aria-hidden>به مدیریت</span>
                <InlineEdit
                  value={data.fullName}
                  onChange={set('fullName')}
                  placeholder="نام و نام خانوادگی"
                  ariaLabel="به مدیریت"
                  className="inline-edit"
                />
              </div>
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

          {/* Bottom rows, in order: mobile, landline, address. */}
          <div className="bc-rows mt-4 flex flex-col gap-2 text-[13px]">
            {EDITABLE_ROWS.map((entry) => (
              <div key={entry.key} className="flex items-start gap-2.5">
                <entry.Icon className="mt-0.5 size-[17px] shrink-0 bc-role" aria-hidden />
                <span className="shrink-0 text-xs bc-muted">{entry.label}:</span>
                <InlineEdit
                  value={(data[entry.key as keyof ThemedBusinessCardData] as string | null) ?? ''}
                  onChange={set(entry.key)}
                  placeholder={entry.placeholder}
                  ariaLabel={entry.label}
                  dir={entry.key === 'address' ? 'rtl' : 'ltr'}
                  className="bc-contact-value min-w-0 flex-1"
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

          {/* Icon-only editable links: email, website, whatsapp and socials. */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {EDITABLE_ICONS.map((entry) => (
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
        </div>
      </div>
    </div>
  );
}
