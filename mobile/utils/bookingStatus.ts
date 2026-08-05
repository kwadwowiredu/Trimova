import type { Booking } from '@/types/booking';

export type StatusTone = 'success' | 'warn' | 'error' | 'info' | 'neutral';

/**
 * How a booking should read on screen. Status alone isn't enough — a pending
 * booking means something different depending on whether it's waiting on the
 * barber or on the client's payment — so this folds both fields into one
 * label the user can act on.
 *
 * Returns a tone rather than a colour, because the client app uses fixed
 * tokens while the barber/staff apps theme themselves.
 */
export function bookingBadge(booking: Booking): { label: string; tone: StatusTone } {
  switch (booking.status) {
    case 'completed':
      return { label: 'Completed', tone: 'success' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'error' };
    case 'declined':
      return { label: 'Declined', tone: 'error' };
    case 'in_progress':
      return { label: 'In progress', tone: 'info' };
    case 'confirmed':
      return { label: 'Confirmed', tone: 'success' };
    case 'pending':
      if (booking.requiresApproval && !booking.approvedAt) {
        return { label: 'Awaiting barber', tone: 'warn' };
      }
      return { label: 'Payment due', tone: 'warn' };
    default:
      return { label: booking.status, tone: 'neutral' };
  }
}

/** Still ahead of the client — anything they might still turn up for. */
export function isUpcoming(booking: Booking): boolean {
  return ['pending', 'confirmed', 'in_progress'].includes(booking.status);
}

/** The client owes money and is allowed to pay it right now. */
export function awaitingPayment(booking: Booking): boolean {
  return (
    booking.status === 'pending' &&
    booking.paymentStatus === 'unpaid' &&
    (!booking.requiresApproval || !!booking.approvedAt)
  );
}

/** "2026-07-20T16:15:00+00:00" → { date: "2026-07-20", time: "16:15" } */
export function splitScheduled(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}
