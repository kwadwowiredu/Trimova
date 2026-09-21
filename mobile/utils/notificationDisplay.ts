import type { NotificationType } from '@/services/notifications';

export type NotificationTone = 'success' | 'warn' | 'error' | 'info' | 'neutral';

/**
 * How a notification should look, independent of which app is rendering it.
 * Returns an icon name and a tone rather than colours, because the client app
 * uses fixed tokens while the barber and staff apps theme themselves.
 */
export function notificationLook(type: NotificationType): {
  icon: NotificationIcon;
  tone: NotificationTone;
} {
  switch (type) {
    case 'booking_created':
      return { icon: 'calendar-plus', tone: 'info' };
    case 'booking_confirmed':
      return { icon: 'check-circle', tone: 'success' };
    case 'payment_received':
      return { icon: 'wallet', tone: 'success' };
    case 'booking_completed':
      return { icon: 'check-circle', tone: 'success' };
    case 'payout':
      return { icon: 'wallet', tone: 'success' };
    case 'payment_due':
      return { icon: 'credit-card', tone: 'warn' };
    case 'booking_rescheduled':
      return { icon: 'calendar-clock', tone: 'warn' };
    case 'staff_invite':
      return { icon: 'user-plus', tone: 'info' };
    case 'booking_declined':
    case 'booking_cancelled':
      return { icon: 'x-circle', tone: 'error' };
    default:
      return { icon: 'bell', tone: 'neutral' };
  }
}

export type NotificationIcon =
  | 'calendar-plus'
  | 'calendar-clock'
  | 'check-circle'
  | 'x-circle'
  | 'wallet'
  | 'credit-card'
  | 'user-plus'
  | 'bell';

/** "3 minutes ago" — notifications are read at a glance, so keep it short. */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
