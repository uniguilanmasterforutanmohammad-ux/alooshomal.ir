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
import {
  RecordCard,
  type RecordIconLink,
  type RecordRow,
} from '@/components/ui/RecordCard';
import type { Biolink } from '@/lib/api';
import {
  RECORD_TEMPLATE_KEY,
  biolinkTemplate,
  biolinkViewModes,
  type BiolinkTemplate,
} from '@/lib/biolink-templates';
import { socialHref as socialNetworkHref } from '@/lib/social-fields';

/** Short glyph per social network for the design card's icon row. */
const SOCIAL_GLYPHS: Record<string, string> = {
  whatsapp: '✆',
  instagram: '◎',
  telegram: '➤',
  linkedin: 'in',
  twitter: 'X',
};

/** Builds the shared contact rows for both designs from a biolink payload. */
function buildRows(biolink: Biolink): RecordRow[] {
  const rows: RecordRow[] = [];
  if (biolink.mobile)
    rows.push({
      key: 'mobile',
      label: 'تلفن همراه',
      value: biolink.mobile,
      href: `tel:${biolink.mobile}`,
      dir: 'ltr',
      Icon: Smartphone,
    });
  if (biolink.phone)
    rows.push({
      key: 'phone',
      label: 'تلفن ثابت',
      value: biolink.phone,
      href: `tel:${biolink.phone}`,
      dir: 'ltr',
      Icon: Phone,
    });
  if (biolink.email)
    rows.push({
      key: 'email',
      label: 'ایمیل',
      value: biolink.email,
      href: `mailto:${biolink.email}`,
      dir: 'ltr',
      Icon: Mail,
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
      Icon: Globe,
    });
  if (biolink.address)
    rows.push({ key: 'address', label: 'آدرس', value: biolink.address, Icon: MapPin });
  return rows;
}

function buildIconLinks(biolink: Biolink): RecordIconLink[] {
  return [
    biolink.whatsapp
      ? {
          key: 'whatsapp',
          label: 'واتساپ',
          href: `https://wa.me/${biolink.whatsapp.replace(/[^0-9]/g, '')}`,
          Icon: MessageCircle,
        }
      : null,
    biolink.instagram
      ? {
          key: 'instagram',
          label: 'اینستاگرام',
          href: socialNetworkHref('instagram', biolink.instagram),
          Icon: Instagram,
        }
      : null,
    biolink.telegram
      ? {
          key: 'telegram',
          label: 'تلگرام',
          href: socialNetworkHref('telegram', biolink.telegram),
          Icon: Send,
        }
      : null,
    biolink.linkedin
      ? {
          key: 'linkedin',
          label: 'لینکدین',
          href: socialNetworkHref('linkedin', biolink.linkedin),
          Icon: Linkedin,
        }
      : null,
    biolink.twitter
      ? {
          key: 'twitter',
          label: 'ایکس',
          href: socialNetworkHref('twitter', biolink.twitter),
          Icon: Twitter,
        }
      : null,
  ].filter((entry): entry is RecordIconLink => Boolean(entry));
}

/** The two view modes a published biolink exposes (classic + owner's design). */
export function biolinkModesFor(biolink: Biolink): BiolinkTemplate[] {
  return biolinkViewModes(biolink.template);
}

/** The mode a biolink opens in (owner's design, else the classic record). */
export function initialModeFor(biolink: Biolink): string {
  return biolinkTemplate(biolink.template)
    ? biolink.template ?? RECORD_TEMPLATE_KEY
    : RECORD_TEMPLATE_KEY;
}

/**
 * Renders the biolink body in the classic «رکورد» look or in the owner's chosen
 * ready-made design. Presentational only: the surrounding page decides which
 * chrome to show, and the mode is owned by `PublicBiolinkView`.
 */
export function BiolinkTemplateStage({
  biolink,
  mode,
}: {
  biolink: Biolink;
  mode: string;
}) {
  const headline =
    biolink.jobTitle || biolink.company || biolink.fullName || 'بیولینک';
  const subline = biolink.fullName ? `به مدیریت ${biolink.fullName}` : null;
  const rows = buildRows(biolink);
  const iconLinks = buildIconLinks(biolink);
  const design = biolinkTemplate(mode);

  if (!design) {
    return (
      <RecordCard
        fullName={biolink.fullName}
        headline={headline}
        subline={subline}
        bio={biolink.bio}
        companyName={biolink.company}
        cityName={biolink.city?.name}
        businessName={biolink.business?.name}
        avatarUrl={biolink.avatarUrl}
        rows={rows}
        iconLinks={iconLinks}
        accent={biolink.primaryColor}
        headingLevel="h1"
      />
    );
  }

  return (
    <BiolinkTemplateCard
      template={design}
      fullName={biolink.fullName}
      headline={headline}
      subline={subline}
      bio={biolink.bio}
      cityName={biolink.city?.name}
      businessName={biolink.business?.name}
      avatarUrl={biolink.avatarUrl}
      rows={rows.map((row) => ({
        key: row.key,
        label: row.label,
        value: row.value,
        href: row.href,
        dir: row.dir,
      }))}
      icons={iconLinks.map((link) => ({
        key: link.key,
        label: link.label,
        href: link.href,
        glyph: SOCIAL_GLYPHS[link.key] ?? '◎',
      }))}
      accent={biolink.primaryColor}
      website={biolink.website}
    />
  );
}
