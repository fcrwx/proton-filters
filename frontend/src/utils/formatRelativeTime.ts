import { formatDistanceToNow, differenceInHours, format } from 'date-fns';

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const hoursDiff = differenceInHours(now, date);

  if (hoursDiff < 24) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, 'MMM d, h:mm a');
}
