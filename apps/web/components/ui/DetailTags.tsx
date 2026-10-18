import { Briefcase, MapPin } from 'lucide-react';

interface Props {
  cityName?: string | null;
  businessName?: string | null;
}

/**
 * City + business tags shown in the directory detail panels, matching the
 * chips already rendered inside the themed cards. Rendered as pills so the
 * plain detail view carries the same «شهر» + «کسب و کار» context at a glance.
 */
export function DetailTags({ cityName, businessName }: Props) {
  if (!cityName && !businessName) return null;

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--vintage-border)] bg-soft px-3 py-1 text-xs font-bold text-ink';

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {cityName ? (
        <span className={chip}>
          <MapPin className="size-3.5 shrink-0 text-brand" aria-hidden />
          {cityName}
        </span>
      ) : null}
      {businessName ? (
        <span className={chip}>
          <Briefcase className="size-3.5 shrink-0 text-brand" aria-hidden />
          {businessName}
        </span>
      ) : null}
    </div>
  );
}
