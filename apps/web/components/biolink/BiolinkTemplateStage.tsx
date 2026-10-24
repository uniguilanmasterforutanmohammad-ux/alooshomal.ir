'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Smartphone,
  Twitter,
} from 'lucide-react';

import { BiolinkTemplateCard } from './BiolinkTemplateCard';
import type { Biolink } from '@/lib/api';
import {
  BIOLINK_TEMPLATES,
  biolinkTemplate,
  type BiolinkTemplate,
} from '@/lib/biolink-templates';
import { SPECTRUM_COLORS } from '@/lib/card-spectrum';

/** Short glyph per social network for the template card's icon row. */
const SOCIAL_GLYPHS: Record<string, string> = {
  whatsapp: '✆',
  instagram: '◎',
  telegram: '➤',
  linkedin: 'in',
  twitter: 'X',
};

const SOCIAL_ICONS = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  telegram: Send,
  linkedin: Linkedin,
  twitter: Twitter,
} as const;

interface Props {
  biolink: Biolink;
  /** admin-enabled template keys (falls back to all when empty) */
  enabledKeys: string[];
  /** admin default for light-mode pages */
  defaultLight: string;
  /** admin default for dark-mode pages */
  defaultDark: string;
  children?: React.ReactNode;
}

/**
 * The public biolink «stage»: it renders the biolink in one of the ready-made
 * display templates and lets the **visitor** switch templates live (their pick
 * is remembered per-biolink in `localStorage`). The initial template is the
 * owner's choice for the current light/dark mode, falling back to the admin
 * default the admin set for that mode.
 */
export function BiolinkTemplateStage({
  biolink,
  enabledKeys,
  defaultLight,
  defaultDark,
}: Props) {
  const enabled = useMemo<BiolinkTemplate[]>(() => {
    const set = new Set(enabledKeys);
    const picked = BIOLINK_TEMPLATES.filter((t) => set.has(t.key));
    return picked.length > 0 ? picked : BIOLINK_TEMPLATES;
  }, [enabledKeys]);

  const storageKey = `biolink-view:${biolink.slug}`;
  const [selected, setSelected] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Resolve the owner's / admin's initial template for the current page mode.
  const ownerTemplate = isDark ? biolink.templateDark : biolink.template;
  const fallbackTemplate = isDark ? defaultDark : defaultLight;
  const initialTemplate = useMemo(() => {
    const preferred = biolinkTemplate(ownerTemplate)?.key ?? fallbackTemplate;
    const allowed = enabled.some((t) => t.key === preferred)
      ? preferred
      : enabled[0]?.key ?? BIOLINK_TEMPLATES[0].key;
    return allowed;
  }, [ownerTemplate, fallbackTemplate, enabled]);

  useEffect(() => {
    // Read the current site theme and any previously stored visitor choice.
    const readTheme = () => {
      const theme = document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
      setIsDark(theme === 'dark');
    };
    readTheme();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && biolinkTemplate(stored)) setSelected(stored);
    } catch {
      /* storage may be blocked; ignore */
    }
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [storageKey]);

  const activeKey = selected ?? initialTemplate;
  const active = biolinkTemplate(activeKey) ?? enabled[0] ?? BIOLINK_TEMPLATES[0];

  function choose(key: string) {
    setSelected(key);
    try {
      localStorage.setItem(storageKey, key);
    } catch {
      /* ignore */
    }
  }

  const headline =
    biolink.jobTitle || biolink.company || biolink.fullName || 'بیولینک';
  const subline = biolink.fullName ? `به مدیریت ${biolink.fullName}` : null;

  const rows: import('./BiolinkTemplateCard').TemplateRow[] = [];
  if (biolink.mobile)
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: biolink.mobile,
      href: `tel:${biolink.mobile}`,
      dir: 'ltr',
    });
  if (biolink.phone)
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: biolink.phone,
      href: `tel:${biolink.phone}`,
      dir: 'ltr',
    });
  if (biolink.email)
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: biolink.email,
      href: `mailto:${biolink.email}`,
      dir: 'ltr',
    });
  if (biolink.website)
    rows.push({
      key: 'website',
      label: 'وب‌سایت',
      value: biolink.website,
      href: /^https?:\/\//i.test(biolink.website)
        ? biolink.website
        : `https://${biolink.website}`,
      dir: 'ltr',
    });
  if (biolink.address)
    rows.push({ key: 'address', label: 'آدرس', value: biolink.address });

  const icons: import('./BiolinkTemplateCard').TemplateIcon[] = [];
  const socials: Array<{ key: keyof typeof SOCIAL_ICONS; value: string | null }> = [
    { key: 'whatsapp', value: biolink.whatsapp },
    { key: 'instagram', value: biolink.instagram },
    { key: 'telegram', value: biolink.telegram },
    { key: 'linkedin', value: biolink.linkedin },
    { key: 'twitter', value: biolink.twitter },
  ];
  for (const social of socials) {
    if (!social.value) continue;
    const href =
      social.key === 'whatsapp'
        ? `https://wa.me/${social.value.replace(/[^0-9]/g, '')}`
        : /^https?:\/\//i.test(social.value)
          ? social.value
          : `https://${social.value}`;
    icons.push({
      key: social.key,
      label: social.key,
      href,
      glyph: SOCIAL_GLYPHS[social.key] ?? '◎',
    });
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {enabled.length > 1 ? (
        <div className="blt-switch" role="group" aria-label="انتخاب حالت نمایش">
          <span className="blt-switch-label">حالت نمایش:</span>
          {enabled.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => choose(template.key)}
              aria-pressed={active.key === template.key}
              className={
                active.key === template.key
                  ? 'blt-switch-chip is-active'
                  : 'blt-switch-chip'
              }
              title={template.name}
            >
              <span
                className="blt-switch-dot"
                style={{
                  background: `linear-gradient(135deg, ${template.swatch[0]} 0 34%, ${template.swatch[1]} 34% 67%, ${template.swatch[2]} 67% 100%)`,
                }}
              />
              {template.name}
            </button>
          ))}
        </div>
      ) : null}

      <BiolinkTemplateCard
        template={active}
        fullName={biolink.fullName}
        headline={headline}
        subline={subline}
        bio={biolink.bio}
        cityName={biolink.city?.name}
        businessName={biolink.business?.name}
        avatarUrl={biolink.avatarUrl}
        rows={rows}
        icons={icons}
        accent={
          biolink.template === 'spectrum'
            ? (SPECTRUM_COLORS.find(
                (c) => c.bg.toLowerCase() === biolink.primaryColor.toLowerCase(),
              )?.bg ?? biolink.primaryColor)
            : biolink.primaryColor
        }
        website={biolink.website}
      />
    </div>
  );
}
