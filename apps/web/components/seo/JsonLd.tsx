import { jsonLdHtml } from '@/lib/json-ld';

/**
 * Server-rendered `<script type="application/ld+json">` block.
 *
 * Centralising the tag keeps every page using the same XSS-safe serializer
 * (`jsonLdHtml`) and avoids copy-pasted `dangerouslySetInnerHTML` calls.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
    />
  );
}
