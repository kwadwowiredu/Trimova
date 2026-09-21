import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { mapBooking } from './bookingController';
import { notifyMany, whenLabel, cedis } from '../utils/notify';
import {
  initializeTransaction,
  verifyTransaction,
  refundTransaction,
  makeReference,
  isDemoMode,
} from '../utils/paystack';

/**
 * Payments — Trimova's escrow around a booking.
 *
 *   initialize → the client is charged and the money sits with Trimova
 *   verify     → confirms the charge landed, which confirms the appointment
 *   complete   → (see bookingController) releases the barber's share
 *   cancel     → refunds the client
 *
 * The `transactions` table is the ledger behind all of it, so the admin
 * panel's finance screens and a barber's earnings read from one source.
 */

type Row = Record<string, any>;

/** Trimova's cut of every completed booking, as a percentage. */
const COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 10);

const SELECT_WITH_PEOPLE = `
  *,
  client:client_id (id, full_name, avatar_url, phone),
  barber:barber_id (id, full_name, avatar_url, phone),
  staff:staff_barber_id (id, full_name, avatar_url, phone)
`;

/** What the client owes: the service plus any travel fee the barber added. */
function bookingTotal(booking: Row): number {
  return (
    (parseFloat(String(booking.service_price)) || 0) +
    (parseFloat(String(booking.travel_fee)) || 0)
  );
}

async function logTransaction(entry: {
  reference: string;
  appointmentId: string;
  clientId: string;
  barberId: string;
  amount: number;
  type: 'deposit' | 'transfer' | 'refund' | 'commission';
  status: 'pending' | 'success' | 'failed';
  channel?: string | null;
  paystackId?: string | null;
  raw?: unknown;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from('transactions').upsert(
    {
      reference: entry.reference,
      appointment_id: entry.appointmentId,
      client_id: entry.clientId,
      barber_id: entry.barberId,
      amount: entry.amount,
      type: entry.type,
      status: entry.status,
      channel: entry.channel ?? null,
      paystack_id: entry.paystackId ?? null,
      raw: entry.raw ?? null,
    },
    { onConflict: 'reference' },
  );
  // A ledger failure must never fail the payment the client already made.
  if (error) console.error('[payments] ledger write failed:', error.message);
}

export const paymentController = {
  /**
   * POST /bookings/:id/payment/initialize
   * Starts a Paystack checkout for a booking the client owns.
   */
  async initialize(req: Request, res: Response) {
    const supabase = getSupabase();

    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }
    if (booking.client_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (booking.payment_status === 'paid') {
      sendError(res, 'This booking has already been paid for.');
      return;
    }
    if (['cancelled', 'declined', 'completed'].includes(booking.status)) {
      sendError(res, 'This booking is closed and can no longer be paid for.');
      return;
    }
    // A mobile barber vets the job before taking the client's money.
    if (booking.requires_approval && !booking.approved_at) {
      sendError(res, 'The barber has not accepted this request yet.');
      return;
    }
    if (booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() < Date.now()) {
      sendError(res, 'Your payment window expired and the slot was released.', 410);
      return;
    }

    const amount = bookingTotal(booking);
    const reference = makeReference(booking.id);

    const result = await initializeTransaction({
      email: req.user!.email,
      amount,
      reference,
    });

    if (!result.ok) {
      console.error('[payments] initialize failed:', result.message);
      sendError(res, "We couldn't start that payment. Please try again in a moment.", 502);
      return;
    }

    // Store the reference now so a webhook arriving before the app returns
    // can still be matched to this booking.
    await supabase
      .from('appointments')
      .update({ payment_reference: reference })
      .eq('id', booking.id);

    await logTransaction({
      reference,
      appointmentId: booking.id,
      clientId: booking.client_id,
      barberId: booking.barber_id,
      amount,
      type: 'deposit',
      status: 'pending',
      channel: result.data.demo ? 'demo' : null,
    });

    sendSuccess(res, {
      reference: result.data.reference,
      authorizationUrl: result.data.authorizationUrl,
      accessCode: result.data.accessCode,
      amount,
      email: req.user!.email,
      /** True when no real charge exists — the app skips the checkout page. */
      demo: result.data.demo,
    });
  },

  /**
   * POST /bookings/:id/payment/verify
   * Called when the client returns from checkout. Paystack is the authority
   * on whether the charge succeeded — the app is never trusted for that.
   */
  async verify(req: Request, res: Response) {
    const { reference } = req.body as { reference?: string };
    const supabase = getSupabase();

    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }
    if (booking.client_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }

    const ref = reference?.trim() || booking.payment_reference;
    if (!ref) {
      sendError(res, 'No payment was started for this booking.');
      return;
    }
    if (ref !== booking.payment_reference) {
      sendError(res, 'That payment reference does not match this booking.', 403);
      return;
    }

    // Already settled (e.g. the webhook beat the app back) — just report it.
    if (booking.payment_status === 'paid') {
      const { data } = await supabase
        .from('appointments')
        .select(SELECT_WITH_PEOPLE)
        .eq('id', booking.id)
        .single();
      sendSuccess(res, data ? mapBooking(data) : null, 'Payment already confirmed.');
      return;
    }

    const result = await verifyTransaction(ref);
    if (!result.ok) {
      sendError(res, "We couldn't confirm that payment yet. Please try again shortly.", 502);
      return;
    }
    if (!result.data.success) {
      await logTransaction({
        reference: ref,
        appointmentId: booking.id,
        clientId: booking.client_id,
        barberId: booking.barber_id,
        amount: bookingTotal(booking),
        type: 'deposit',
        status: 'failed',
        channel: result.data.channel,
        paystackId: result.data.paystackId,
        raw: result.data.raw,
      });
      sendError(res, 'That payment did not go through. Please try again.');
      return;
    }

    const settled = await settlePayment(booking, {
      reference: ref,
      channel: result.data.channel,
      paystackId: result.data.paystackId,
      raw: result.data.raw,
    });

    if (!settled) {
      sendError(res, "We couldn't confirm that booking. Please contact support.", 500);
      return;
    }
    sendSuccess(res, mapBooking(settled), 'Payment confirmed. Your booking is set.');
  },

  /**
   * POST /payments/webhook
   * Paystack's own callback. Unauthenticated by design — it is trusted only
   * because the raw body's signature matches our secret key.
   */
  async webhook(req: Request, res: Response) {
    // Acknowledge immediately; Paystack retries anything that isn't a 200.
    res.sendStatus(200);

    const event = req.body as { event?: string; data?: Row };
    if (event?.event !== 'charge.success' || !event.data?.reference) return;

    const reference = String(event.data.reference);
    const supabase = getSupabase();

    const { data: booking } = await supabase
      .from('appointments')
      .select('*')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (!booking || booking.payment_status === 'paid') return;

    await settlePayment(booking, {
      reference,
      channel: String(event.data.channel ?? 'unknown'),
      paystackId: String(event.data.id ?? ''),
      raw: event.data,
    });
    console.log(`[payments] webhook settled booking ${booking.id}`);
  },

  /** GET /payments/transactions — the signed-in user's own money history. */
  async myTransactions(req: Request, res: Response) {
    const supabase = getSupabase();
    const me = req.user!.sub;
    const column = req.user!.role === 'client' ? 'client_id' : 'barber_id';

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq(column, me)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[payments] myTransactions failed:', error);
      sendError(res, "We couldn't load your transactions. Please try again.", 500);
      return;
    }

    sendSuccess(
      res,
      (data ?? []).map((t) => ({
        id: t.id,
        reference: t.reference,
        bookingId: t.appointment_id,
        amount: parseFloat(String(t.amount)) || 0,
        type: t.type,
        status: t.status,
        channel: t.channel,
        createdAt: t.created_at,
      })),
    );
  },
};

// ─── Shared money operations ─────────────────────────────────────────────────

/**
 * Mark a booking paid and confirm it. Shared by the verify endpoint and the
 * webhook, so whichever arrives first wins and the other becomes a no-op.
 */
async function settlePayment(
  booking: Row,
  charge: { reference: string; channel: string; paystackId: string; raw: unknown },
): Promise<Row | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_reference: charge.reference,
      // Payment is the last gate: a barbershop booking is now confirmed, and
      // a mobile booking was already approved before we let the client pay.
      status: 'confirmed',
      hold_expires_at: null,
    })
    .eq('id', booking.id)
    .select(SELECT_WITH_PEOPLE)
    .single();

  if (error || !data) {
    console.error('[payments] settle failed:', error);
    return null;
  }

  await logTransaction({
    reference: charge.reference,
    appointmentId: booking.id,
    clientId: booking.client_id,
    barberId: booking.barber_id,
    amount: bookingTotal(booking),
    type: 'deposit',
    status: 'success',
    channel: charge.channel,
    paystackId: charge.paystackId,
    raw: charge.raw,
  });

  // Both sides care that the money landed: the client wants the receipt, the
  // barber needs to know the slot is now firm.
  const mapped = mapBooking(data);
  await notifyMany([
    {
      userId: mapped.clientId,
      type: 'payment_received',
      title: 'Booking confirmed',
      body: `You paid ${cedis(mapped.total)} for ${mapped.serviceName} with ${mapped.barberName} on ${whenLabel(mapped.scheduledAt)}. We'll hold it until your appointment is done.`,
      bookingId: mapped.id,
    },
    {
      userId: (booking.staff_barber_id as string) ?? (booking.barber_id as string),
      type: 'payment_received',
      title: 'Booking paid',
      body: `${mapped.clientName} paid ${cedis(mapped.total)} for ${mapped.serviceName} on ${whenLabel(mapped.scheduledAt)}.`,
      bookingId: mapped.id,
    },
  ]);

  return data;
}

/**
 * Release escrow once the barber finishes: Trimova keeps its commission and
 * the rest is owed to the barber. Both legs are ledgered.
 *
 * Actually moving the money is a Paystack Transfer, which needs a verified
 * recipient per barber; until payout onboarding exists the transfer is
 * recorded as pending so the amount owed is never lost.
 */
export async function recordPayoutForBooking(booking: Row): Promise<void> {
  const total = bookingTotal(booking);
  const commission = Math.round(total * COMMISSION_PERCENT) / 100;
  const barberShare = Math.round((total - commission) * 100) / 100;
  const base = booking.payment_reference ?? booking.id;

  await logTransaction({
    reference: `${base}-COM`,
    appointmentId: booking.id,
    clientId: booking.client_id,
    barberId: booking.barber_id,
    amount: commission,
    type: 'commission',
    status: 'success',
    channel: isDemoMode() ? 'demo' : null,
  });

  await logTransaction({
    reference: `${base}-PAY`,
    appointmentId: booking.id,
    clientId: booking.client_id,
    barberId: booking.barber_id,
    amount: barberShare,
    type: 'transfer',
    status: isDemoMode() ? 'success' : 'pending',
    channel: isDemoMode() ? 'demo' : null,
  });
}

/**
 * Refund part of what a client paid, keeping the rest as a policy fee.
 *
 * The kept share isn't Trimova's windfall — it compensates the barber for a
 * slot they can no longer sell, so it's ledgered as a transfer to them.
 */
export async function partialRefund(
  booking: Row,
  refundAmount: number,
  reason: string,
): Promise<void> {
  const supabase = getSupabase();
  const total = bookingTotal(booking);
  const kept = Math.round((total - refundAmount) * 100) / 100;
  const reference = booking.payment_reference as string;

  const result = await refundTransaction(reference, refundAmount);

  await logTransaction({
    reference: `${reference}-REF`,
    appointmentId: booking.id,
    clientId: booking.client_id,
    barberId: booking.barber_id,
    amount: refundAmount,
    type: 'refund',
    status: result.ok ? 'success' : 'failed',
    channel: isDemoMode() ? 'demo' : null,
  });

  if (kept > 0) {
    await logTransaction({
      reference: `${reference}-FEE`,
      appointmentId: booking.id,
      clientId: booking.client_id,
      barberId: booking.barber_id,
      amount: kept,
      type: 'transfer',
      status: isDemoMode() ? 'success' : 'pending',
      channel: isDemoMode() ? 'demo' : null,
    });
  }

  if (result.ok) {
    // Escrow is settled either way, so release it and record why.
    await supabase
      .from('appointments')
      .update({ payment_status: 'refunded', released_at: new Date().toISOString() })
      .eq('id', booking.id);
  } else {
    console.error(`[payments] partial refund failed for ${reference} (${reason}): ${result.message}`);
  }
}

/** Hand a cancelled booking's money back to the client. */
export async function refundBookingPayment(booking: Row): Promise<void> {
  const supabase = getSupabase();
  const total = bookingTotal(booking);
  const reference = booking.payment_reference as string;

  const result = await refundTransaction(reference, total);

  await logTransaction({
    reference: `${reference}-REF`,
    appointmentId: booking.id,
    clientId: booking.client_id,
    barberId: booking.barber_id,
    amount: total,
    type: 'refund',
    status: result.ok ? 'success' : 'failed',
    channel: isDemoMode() ? 'demo' : null,
  });

  if (result.ok) {
    await supabase
      .from('appointments')
      .update({ payment_status: 'refunded' })
      .eq('id', booking.id);
  } else {
    // The booking is still cancelled; the money just needs a manual nudge.
    console.error(`[payments] refund failed for ${reference}: ${result.message}`);
  }
}
