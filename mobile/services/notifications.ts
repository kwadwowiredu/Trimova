import { api } from './api';
import type { ApiResponse } from '@/types/api';

export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'payment_received'
  | 'payment_due'
  | 'booking_completed'
  | 'payout'
  | 'staff_invite'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Set when tapping should open a specific appointment. */
  bookingId: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * In-app notifications. Written by the API whenever a booking changes hands,
 * so both sides of a transaction find out without having to go looking.
 */
export const notificationsService = {
  list: () => api.get<ApiResponse<AppNotification[]>>('/notifications'),

  /** Drives the bell badge. */
  unreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    api.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () => api.patch<ApiResponse<null>>('/notifications/read-all'),
};
