import { getSupabase } from './supabase';

/**
 * In-app notifications.
 *
 * Writing one must never be able to fail the action that caused it — a client
 * whose payment cleared should not see an error because a notification row
 * didn't insert. Every function here swallows its own errors and logs instead.
 */

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

export interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  bookingId?: string | null;
}

export async function notify(args: NotifyArgs): Promise<void> {
  try {
    const { error } = await getSupabase().from('notifications').insert({
      user_id: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      booking_id: args.bookingId ?? null,
    });
    if (error) console.error('[notify] insert failed:', error.message);
  } catch (err) {
    console.error('[notify] unexpected failure:', err);
  }
}

/** Fire several at once — e.g. telling both sides a booking was cancelled. */
export async function notifyMany(items: NotifyArgs[]): Promise<void> {
  await Promise.all(items.map(notify));
}

/** "2026-08-10T16:15:00Z" → "Mon, 10 Aug at 4:15 pm" */
export function whenLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${date} at ${h12}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

/** GH₵ amounts, formatted the way both apps display them. */
export const cedis = (amount: number) => `GH₵${amount.toFixed(2)}`;
