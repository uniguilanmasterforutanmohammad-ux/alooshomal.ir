import { Badge } from '@/components/ui/Badge';
import { biolinkStatusLabels, biolinkStatusStyles } from '@/lib/utils';

export function BusinessCardStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={biolinkStatusStyles[status] ?? biolinkStatusStyles.UNPUBLISHED}>
      {biolinkStatusLabels[status] ?? status}
    </Badge>
  );
}
