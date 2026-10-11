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

export interface ThemedBiolinkData {
  fullName: string;
  jobTitle?: string | null;
  company?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
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
}: Props) {
  const initials = (data.fullName || '?').trim().slice(0, 2).toUpperCase();

  const links: Array<{ key: string; value: string | null | undefined; href: string; Icon: typeof Linkedin; label: string }> = [
    { key: 'phone', value: data.phone, href: `tel:${data.phone ?? ''}`, Icon: Phone, label: 'PHONE' },
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
        themeKey === 'vintage' && data.primaryColor
          ? ({ ['--biolink-accent' as string]: data.primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      <div className="theme-body overflow-hidden px-8 pt-8 pb-8 text-center sm:pt-10 sm:pb-8">
        <div className="theme-avatar mx-auto mb-6 flex size-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold">
          {data.avatarUrl ? (
            <Image
              src={data.avatarUrl}
              alt={data.fullName}
              width={96}
              height={96}
              className="size-24 object-cover"
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
