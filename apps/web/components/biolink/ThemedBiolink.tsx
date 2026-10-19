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
  UserRound,
} from 'lucide-react';

import { themeClassName } from '@/lib/themes';
import { spectrumStyleVars } from '@/lib/card-spectrum';
import { InlineEdit } from '@/components/ui/InlineEdit';
import type { TaxonomyItem } from '@/lib/api';

export interface ThemedBiolinkData {
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
  data: ThemedBiolinkData;
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
 * Renders a business biolink using a ready-made theme, mirroring the reference
 * biolink templates: centred layout, a large title, big full-width pill links
 * and English, capitalised social labels. Shared by the live editor preview
 * and the public biolink page so both look identical.
 */
export function ThemedBiolink({
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
  const initials = (data.fullName || '?').trim().slice(0, 2).toUpperCase();

  if (editable) {
    return (
      <EditableBiolink
        themeKey={themeKey}
        data={data}
        compact={compact}
        onFieldChange={onFieldChange}
        cityOptions={cityOptions}
        businessOptions={businessOptions}
      />
    );
  }

  const links: Array<{ key: string; value: string | null | undefined; href: string; Icon: typeof Linkedin; label: string }> = [
    { key: 'phone', value: data.phone, href: `tel:${data.phone ?? ''}`, Icon: Phone, label: 'PHONE' },
    { key: 'mobile', value: data.mobile, href: `tel:${data.mobile ?? ''}`, Icon: Phone, label: 'MOBILE' },
    { key: 'whatsapp', value: data.whatsapp, href: `https://wa.me/${(data.whatsapp ?? '').replace(/[^0-9]/g, '')}`, Icon: MessageCircle, label: 'WHATSAPP' },
    { key: 'email', value: data.email, href: `mailto:${data.email ?? ''}`, Icon: Mail, label: 'EMAIL' },
    { key: 'website', value: data.website, href: socialHref(data.website ?? ''), Icon: Globe, label: 'WEBSITE' },
    { key: 'instagram', value: data.instagram, href: socialHref(data.instagram ?? ''), Icon: Instagram, label: 'INSTAGRAM' },
    { key: 'linkedin', value: data.linkedin, href: socialHref(data.linkedin ?? ''), Icon: Linkedin, label: 'LINKEDIN' },
    { key: 'telegram', value: data.telegram, href: socialHref(data.telegram ?? ''), Icon: Send, label: 'TELEGRAM' },
    { key: 'twitter', value: data.twitter, href: socialHref(data.twitter ?? ''), Icon: Twitter, label: 'TWITTER / X' },
  ];

  const visible = links.filter((link) => link.value);
  const LinkTag = interactive ? 'a' : 'span';

  return (
    <div
      className={`${themeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}
      style={
        {
          ...(themeKey === 'vintage' && data.primaryColor
            ? { ['--biolink-accent' as string]: data.primaryColor }
            : {}),
          ...spectrumStyleVars({ theme: themeKey, primaryColor: data.primaryColor }),
        } as React.CSSProperties
      }
    >
      <div className="theme-body overflow-hidden px-8 pt-8 pb-8 text-center sm:pt-10 sm:pb-8">
        {data.logoUrl ? (
          <Image
            src={data.logoUrl}
            alt={data.company || data.fullName}
            width={72}
            height={72}
            unoptimized
            className="mx-auto mb-4 size-14 object-contain"
          />
        ) : null}
        <div className="theme-avatar mx-auto mb-6 flex size-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold">
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl}
              alt={data.fullName}
              width={96}
              height={96}
              className="size-24 object-cover"
              unoptimized
            />
          ) : (
            initials
          )}
        </div>

        {/* big business / profession title at the top */}
        <h1 className="theme-title theme-fa mx-auto text-[clamp(27px,7vw,34px)] leading-tight font-extrabold">
          {data.company || data.jobTitle || data.fullName || 'نام و نام خانوادگی'}
        </h1>

        {data.company && data.fullName ? (
          <p className="theme-muted theme-fa mt-2 text-base font-semibold">{data.fullName}</p>
        ) : null}

        {!data.company && data.jobTitle && data.fullName ? (
          <p className="theme-muted theme-fa mt-1 flex items-center justify-center gap-1.5 text-sm">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            {data.fullName}
          </p>
        ) : null}

        {(cityName || businessName) ? (
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {cityName ? (
              <span className="theme-chip theme-fa rounded-full px-[18px] py-2 font-bold">
                {cityName}
              </span>
            ) : null}
            {businessName ? (
              <span className="theme-chip theme-fa rounded-full px-[18px] py-2 font-bold">
                {businessName}
              </span>
            ) : null}
          </div>
        ) : null}

        {visible.length > 0 ? (
          <nav className="theme-links mt-7 text-left" aria-label="راه‌های ارتباطی">
            {visible.map((link) => {
              const external = link.href.startsWith('http');
              return (
                <LinkTag
                  key={link.key}
                  {...(interactive
                    ? {
                        href: link.href,
                        target: external ? '_blank' : undefined,
                        rel: external ? 'noreferrer' : undefined,
                      }
                    : {})}
                  className="theme-link flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-3">
                    <link.Icon className="size-5 shrink-0" aria-hidden />
                    <span className="theme-link-label font-semibold">{link.label}</span>
                  </span>
                  <span aria-hidden className="theme-link-arrow text-lg">
                    →
                  </span>
                </LinkTag>
              );
            })}
          </nav>
        ) : null}

        <p className="theme-footer theme-muted mt-6 text-[11px] tracking-[0.12em] uppercase">
          Find me around the web
        </p>
      </div>
    </div>
  );
}

interface EditableProps {
  themeKey: string;
  data: ThemedBiolinkData;
  compact?: boolean;
  onFieldChange?: (key: string, value: string) => void;
  cityOptions?: TaxonomyItem[];
  businessOptions?: TaxonomyItem[];
}

const EDITABLE_LINKS: Array<{
  key: string;
  label: string;
  Icon: typeof Linkedin;
  placeholder: string;
}> = [
  { key: 'phone', label: 'PHONE', Icon: Phone, placeholder: 'تلفن' },
  { key: 'mobile', label: 'MOBILE', Icon: Phone, placeholder: 'تلفن همراه' },
  { key: 'whatsapp', label: 'WHATSAPP', Icon: MessageCircle, placeholder: 'واتساپ' },
  { key: 'email', label: 'EMAIL', Icon: Mail, placeholder: 'ایمیل' },
  { key: 'website', label: 'WEBSITE', Icon: Globe, placeholder: 'وب‌سایت' },
  { key: 'instagram', label: 'INSTAGRAM', Icon: Instagram, placeholder: 'اینستاگرام' },
  { key: 'linkedin', label: 'LINKEDIN', Icon: Linkedin, placeholder: 'لینکدین' },
  { key: 'telegram', label: 'TELEGRAM', Icon: Send, placeholder: 'تلگرام' },
  { key: 'twitter', label: 'TWITTER / X', Icon: Twitter, placeholder: 'ایکس (توییتر)' },
];

/**
 * Editable variant of {@link ThemedBiolink}: renders the very same theme but
 * every value is an inline field and every link row shows all eight contact
 * inputs, so the user fills the card by typing straight onto the preview.
 */
function EditableBiolink({
  themeKey,
  data,
  compact,
  onFieldChange,
  cityOptions,
  businessOptions,
}: EditableProps) {
  const set = (key: string) => (value: string) => onFieldChange?.(key, value);

  return (
    <div
      className={`${themeClassName(themeKey)} ${compact ? 'text-sm' : ''}`}
      style={
        {
          ...(themeKey === 'vintage' && data.primaryColor
            ? { ['--biolink-accent' as string]: data.primaryColor }
            : {}),
          ...spectrumStyleVars({ theme: themeKey, primaryColor: data.primaryColor }),
        } as React.CSSProperties
      }
    >
      <div className="theme-body overflow-hidden px-8 pt-8 pb-8 text-center sm:pt-10 sm:pb-8">
        {data.logoUrl ? (
          <Image
            src={data.logoUrl}
            alt={data.company || data.fullName}
            width={72}
            height={72}
            unoptimized
            className="mx-auto mb-4 size-14 object-contain"
          />
        ) : null}
        <div className="theme-avatar mx-auto mb-6 flex size-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold">
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl}
              alt={data.fullName}
              width={96}
              height={96}
              className="size-24 object-cover"
              unoptimized
            />
          ) : (
            (data.fullName || '?').trim().slice(0, 2).toUpperCase()
          )}
        </div>

        <InlineEdit
          value={data.company ?? ''}
          onChange={set('company')}
          placeholder="نام کسب و کار"
          ariaLabel="نام کسب و کار"
          className="theme-title theme-fa mx-auto block text-[clamp(27px,7vw,34px)] leading-tight font-extrabold"
        />

        <InlineEdit
          value={data.fullName}
          onChange={set('fullName')}
          placeholder="نام و نام خانوادگی"
          ariaLabel="نام و نام خانوادگی"
          className="theme-muted theme-fa mt-2 block text-base font-semibold"
        />

        <InlineEdit
          value={data.jobTitle ?? ''}
          onChange={set('jobTitle')}
          placeholder="عنوان شغلی"
          ariaLabel="عنوان شغلی"
          className="theme-muted theme-fa mt-1 flex items-center justify-center gap-1.5 text-sm"
        />

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          <select
            className="theme-chip theme-fa rounded-full px-[18px] py-2 font-bold"
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
            className="theme-chip theme-fa rounded-full px-[18px] py-2 font-bold"
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

        <InlineEdit
          value={data.bio ?? ''}
          onChange={set('bio')}
          placeholder="درباره من"
          ariaLabel="درباره من"
          multiline
          className="theme-muted theme-fa mt-4 block text-sm leading-7 whitespace-pre-line"
        />

        <nav className="theme-links mt-7 text-left" aria-label="راه‌های ارتباطی">
          {EDITABLE_LINKS.map((link) => (
            <div key={link.key} className="theme-link flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <link.Icon className="size-5 shrink-0" aria-hidden />
                <InlineEdit
                  value={(data[link.key as keyof ThemedBiolinkData] as string | null) ?? ''}
                  onChange={set(link.key)}
                  placeholder={link.placeholder}
                  ariaLabel={link.label}
                  dir="ltr"
                  className="theme-link-label min-w-0 flex-1 font-semibold"
                />
              </span>
              <span aria-hidden className="theme-link-arrow text-lg">
                →
              </span>
            </div>
          ))}
        </nav>

        <InlineEdit
          value={data.address ?? ''}
          onChange={set('address')}
          placeholder="آدرس"
          ariaLabel="آدرس"
          className="theme-muted theme-fa mt-4 block text-xs"
        />

        <p className="theme-footer theme-muted mt-6 text-[11px] tracking-[0.12em] uppercase">
          Find me around the web
        </p>
      </div>
    </div>
  );
}
