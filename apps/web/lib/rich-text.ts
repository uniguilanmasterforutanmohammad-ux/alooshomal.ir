/**
 * Minimal rich-text helpers for feed posts.
 *
 * Posts used to store plain text; the composer now offers a small HTML editor
 * (bold / italic / underline / lists / link). Everything is normalised through
 * this module:
 *
 *   - `sanitizeHtml` keeps a tiny allow-list of formatting tags and drops
 *     everything else (scripts, styles, event handlers, `javascript:` links),
 *   - `bodyToHtml` upgrades legacy plain-text posts (newlines → `<br>`) so old
 *     records keep rendering exactly as before,
 *   - `isRichTextEmpty` treats markup with no visible text as empty.
 *
 * Sanitising happens both when a post is submitted and again when it is
 * rendered, so stored HTML is never trusted on its own.
 */

const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'BR',
  'P',
  'DIV',
  'SPAN',
  'UL',
  'OL',
  'LI',
  'A',
  'BLOCKQUOTE',
  'CODE',
  'PRE',
  'H2',
  'H3',
]);

/** Tags that are dropped together with their subtree (never unwrapped). */
const DROP_WITH_CONTENT = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
  'SVG',
  'MATH',
]);

const SAFE_HREF = /^(https?:|mailto:|tel:|\/)/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === 3 /* text */) continue;
    if (child.nodeType !== 1 /* element */) {
      child.remove();
      continue;
    }
    const el = child as HTMLElement;
    const tag = el.tagName;

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      // Unwrap unknown tags but keep their (sanitised) text.
      cleanNode(el);
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    // Keep only the allowed attributes; strip every event handler/style.
    for (const attr of Array.from(el.attributes)) {
      if (tag === 'A' && attr.name === 'href') {
        if (!SAFE_HREF.test(attr.value.trim())) el.removeAttribute('href');
        continue;
      }
      if (tag === 'A' && attr.name === 'title') continue;
      el.removeAttribute(attr.name);
    }
    if (tag === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer nofollow');
    }

    cleanNode(el);
  }
}

/** Strip everything outside the formatting allow-list, returning safe HTML. */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // No DOM (SSR): the feed renderers are client components, but be safe.
    return escapeHtml(html);
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';
  cleanNode(root);
  return root.innerHTML;
}

const HTML_LIKE = /<([a-z][a-z0-9]*)\b[^>]*>/i;

/**
 * Render-ready HTML for a stored post body. Legacy plain-text posts (no tags)
 * are escaped and their newlines turned into `<br>`; HTML posts are sanitised.
 */
export function bodyToHtml(body: string | null | undefined): string {
  if (!body) return '';
  if (!HTML_LIKE.test(body)) {
    return escapeHtml(body).replace(/\r?\n/g, '<br>');
  }
  return sanitizeHtml(body);
}

/** True when the HTML contains no visible text (e.g. an empty `<p></p>`). */
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u200b/g, '')
    .trim().length === 0;
}

/** Plain-text preview of a body (used for image alt text and admin lists). */
export function richTextPreview(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
