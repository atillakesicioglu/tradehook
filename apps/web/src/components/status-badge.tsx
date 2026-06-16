import { Badge } from '@/components/ui/badge';

const variantByStatus: Record<
  string,
  'default' | 'success' | 'destructive' | 'warning' | 'secondary'
> = {
  FILLED: 'success',
  PROCESSED: 'success',
  PENDING: 'warning',
  QUEUED: 'warning',
  RECEIVED: 'secondary',
  FAILED: 'destructive',
  REJECTED: 'destructive',
  CANCELLED: 'secondary',
  DUPLICATE: 'secondary',
  ONLINE: 'success',
  OFFLINE: 'secondary',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variantByStatus[status] ?? 'secondary'}>{status}</Badge>;
}
