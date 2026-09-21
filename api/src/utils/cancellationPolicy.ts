/**
 * Trimova's cancellation policy, in one place.
 *
 * The client agrees to this on the booking summary screen, so the wording
 * there and the arithmetic here must not drift apart:
 *
 *   • more than 3 hours before  → free
 *   • within 3 hours            → 50% of the total
 *   • within 1 hour, or no-show → 100% of the total
 *
 * Rescheduling follows the same clock: moving an appointment at the last
 * minute costs a barber the same lost slot that cancelling does.
 */

export const FREE_WINDOW_HOURS = 3;
export const HALF_FEE_WINDOW_HOURS = 1;

export interface PolicyOutcome {
  /** Fraction of the total forfeited: 0, 0.5 or 1. */
  feeRate: number;
  /** Actual amount forfeited, in GHS. */
  feeAmount: number;
  /** What the client gets back, in GHS. */
  refundAmount: number;
  /** Hours between now and the appointment (negative once it has started). */
  hoursUntil: number;
  /** Plain-language summary for the confirmation prompt. */
  summary: string;
}

export function applyCancellationPolicy(
  scheduledAt: string | Date,
  total: number,
  /** An unpaid booking has nothing to forfeit. */
  isPaid: boolean,
): PolicyOutcome {
  const start = new Date(scheduledAt).getTime();
  const hoursUntil = (start - Date.now()) / 3_600_000;

  let feeRate: number;
  if (!isPaid) {
    feeRate = 0;
  } else if (hoursUntil >= FREE_WINDOW_HOURS) {
    feeRate = 0;
  } else if (hoursUntil >= HALF_FEE_WINDOW_HOURS) {
    feeRate = 0.5;
  } else {
    feeRate = 1;
  }

  const feeAmount = Math.round(total * feeRate * 100) / 100;
  const refundAmount = Math.round((total - feeAmount) * 100) / 100;

  const summary = !isPaid
    ? 'The slot will be released. Nothing has been charged.'
    : feeRate === 0
      ? `You'll be refunded the full GH₵${total.toFixed(2)}.`
      : feeRate === 0.5
        ? `It's less than ${FREE_WINDOW_HOURS} hours before your appointment, so 50% (GH₵${feeAmount.toFixed(2)}) is forfeited. You'll be refunded GH₵${refundAmount.toFixed(2)}.`
        : `It's less than ${HALF_FEE_WINDOW_HOURS} hour before your appointment, so the full GH₵${total.toFixed(2)} is forfeited.`;

  return { feeRate, feeAmount, refundAmount, hoursUntil, summary };
}
