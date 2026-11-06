/**
 * Serialise structured data for a `<script type="application/ld+json">` block.
 *
 * `JSON.stringify` alone is unsafe inside HTML: a user-controlled value such
 * as `</script><script>…` would close the tag and inject markup (stored XSS).
 * Escaping `<`, `>`, `&` and the JavaScript line separators keeps the payload
 * valid JSON while making it inert to the HTML parser.
 */
export function jsonLdHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
