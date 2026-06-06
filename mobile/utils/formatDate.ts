import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';

export function formatBookingDate(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'EEE, MMM d · h:mm a');
}

export function formatShortDate(dateString: string): string {
  return format(parseISO(dateString), 'MMM d, yyyy');
}

export function formatTime(dateString: string): string {
  return format(parseISO(dateString), 'h:mm a');
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}min`;
}

export function formatDayOfWeek(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] ?? '';
}

export function formatShortDay(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day] ?? '';
}
