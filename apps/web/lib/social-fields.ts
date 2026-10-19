/**
 * Fixed bases for the social-network fields on the biolink / business-card
 * builders. Each network has a constant «prefix» (the site + path) that the
 * user never has to type; they only enter their own username / id / phone.
 *
 * `socialValueToInput` strips a known prefix from a stored value so an existing
 * record (which may hold a full URL) opens with just the username in the box,
 * and `socialInputToValue` expands the username back into a full URL for
 * storage and rendering.
 */
export interface SocialFieldSpec {
  key: 'whatsapp' | 'linkedin' | 'instagram' | 'telegram' | 'twitter';
  label: string;
  /** shown before the input, e.g. `instagram.com/` */
  prefix: string;
  /** full base used when expanding the username back to a URL */
  base: string;
  /** latin sample username / id for the placeholder */
  placeholder: string;
  /**
   * WhatsApp is keyed by phone number: the username box holds the digits and
   * the public link is built with `https://wa.me/<digits>`.
   */
  kind?: 'username' | 'phone';
}

export const SOCIAL_FIELDS: SocialFieldSpec[] = [
  {
    key: 'whatsapp',
    label: 'واتساپ',
    prefix: 'wa.me/',
    base: 'https://wa.me/',
    placeholder: '989121234567',
    kind: 'phone',
  },
  {
    key: 'linkedin',
    label: 'لینکدین',
    prefix: 'linkedin.com/in/',
    base: 'https://linkedin.com/in/',
    placeholder: 'username',
  },
  {
    key: 'instagram',
    label: 'اینستاگرام',
    prefix: 'instagram.com/',
    base: 'https://instagram.com/',
    placeholder: 'username',
  },
  {
    key: 'telegram',
    label: 'تلگرام',
    prefix: 't.me/',
    base: 'https://t.me/',
    placeholder: 'username',
  },
  {
    key: 'twitter',
    label: 'ایکس (توییتر)',
    prefix: 'x.com/',
    base: 'https://x.com/',
    placeholder: 'username',
  },
];

/** Strips any known URL prefix so only the username / id remains in the box. */
export function socialValueToInput(
  key: SocialFieldSpec['key'],
  value: string,
): string {
  const spec = SOCIAL_FIELDS.find((field) => field.key === key);
  if (!spec || !value) return value;
  let text = value.trim();
  text = text.replace(/^https?:\/\//i, '');
  const prefixes = [spec.prefix, spec.base.replace(/^https?:\/\//i, '')];
  for (const prefix of prefixes) {
    if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
      text = text.slice(prefix.length);
      break;
    }
  }
  return text.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Expands a bare username / id back into a full, storable URL. */
export function socialInputToValue(
  key: SocialFieldSpec['key'],
  value: string,
): string {
  const spec = SOCIAL_FIELDS.find((field) => field.key === key);
  if (!spec) return value;
  const text = value.trim();
  if (!text) return '';
  // A full URL (or a value already carrying the prefix) is kept as-is.
  if (/^https?:\/\//i.test(text)) return text;
  if (text.toLowerCase().startsWith(spec.prefix.toLowerCase())) {
    return `${spec.base}${text.slice(spec.prefix.length).replace(/^\/+/, '')}`;
  }
  const cleaned = text.replace(/^@/, '').replace(/^\/+/, '');
  if (spec.kind === 'phone') {
    return `${spec.base}${cleaned.replace(/[^0-9]/g, '')}`;
  }
  return `${spec.base}${cleaned}`;
}

/**
 * Normalises a stored social value into a safe `https://…` href. Full URLs are
 * kept, and legacy bare usernames are expanded with the network's base — so
 * older records still link to the right profile.
 */
export function socialHref(
  key: SocialFieldSpec['key'],
  value: string | null | undefined,
): string {
  if (!value) return '';
  return socialInputToValue(key, value);
}
