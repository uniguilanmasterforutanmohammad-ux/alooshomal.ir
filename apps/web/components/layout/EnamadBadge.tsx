/**
 * Official «اینماد» (e-namad) trust seal.
 *
 * The markup below is the exact snippet issued by enamad.ir for this site and
 * must not be edited: the seal is a state mark, and changing it is a crime
 * under the Islamic Penal Code. It is injected verbatim (instead of being
 * rewritten into JSX attributes) so the HTML the browser receives matches the
 * issued code.
 */
const ENAMAD_HTML =
  "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=8569817&Code=i9tOU3I9WQUYh7DjwWixhdtiNkJ4oClx'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=8569817&Code=i9tOU3I9WQUYh7DjwWixhdtiNkJ4oClx' alt='' style='cursor:pointer' code='i9tOU3I9WQUYh7DjwWixhdtiNkJ4oClx'></a>";

export function EnamadBadge({ className }: { className?: string }) {
  return (
    <div
      className={className}
      // The seal's HTML comes from enamad.ir, not from user input.
      dangerouslySetInnerHTML={{ __html: ENAMAD_HTML }}
    />
  );
}
