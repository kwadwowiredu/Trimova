import { getSupabase } from './supabase';
import { getSettings, splitCommission } from './settings';
import { notify, notifyMany, cedis } from './notify';

/**
 * Escrow settlement — how money gets from a client to a barber.
 *
 * The honest problem: Trimova can't see whether a haircut happened. Nobody is
 * standing in the shop. So the model is built around who has an incentive to
 * speak up, and what silence should mean.
 *
 *   1. Client pays        → Trimova holds the full amount.
 *   2. Appointment ends   → a confirmation window opens (default 12 hours).
 *      The client is asked to confirm, and can instead report a no-show.
 *   3. Client confirms    → release immediately.
 *      Client disputes    → freeze. Support decides; nothing moves on its own.
 *      Client says nothing → release when the window closes.
 *
 * Silence releasing the money is the deliberate part. A client who wasn't
 * served has every reason to complain, while one who was served has no reason
 * to open the app again — so treating silence as a complaint would strand
 * barbers on almost every booking. The window is what gives an unhappy client
 * time to act before the money is gone.
 *
 * Commission is taken at release, not at payment, so a refunded booking never
 * has a commission to unwind.
 */

type Row = Record<string, any>;

const total = (b: Row) =>
  (parseFloat(String(b.service_price)) || 0) + (parseFloat(String(b.travel_fee)) || 0);

/**
 * Release one booking's escrow: record the commission, and queue what the
 * barber is owed. Idempotent — a booking already released is skipped.
 */
export async function releaseEscrow(booking: Row): Promise<void> {
  const supabase = getSupabase();
  const { commissionPercent } = await getSettings();
  const amount = total(booking);
  const { commission, barberShare } = splitCommission(amount, commissionPercent);

  // Only release a booking that is paid and not already released. The guard is
  // in the WHERE clause so two concurrent passes can't both pay out.
  const { data: claimed } = await supabase
    .from('appointments')
    .update({
      released_at: new Date().toISOString(),
      commission_amount: commission,
      commission_rate: commissionPercent,
    })
    .eq('id', booking.id)
    .eq('payment_status', 'paid')
    .is('released_at', null)
    .select('id');

  if (!claimed || claimed.length === 0) return;

  const reference = booking.payment_reference ?? booking.id;
  const barberId = (booking.staff_barber_id as string) ?? (booking.barber_id as string);

  // Ledger: Trimova's cut, then the barber's share.
  await supabase.from('transactions').upsert(
    [
      {
        reference: `${reference}-COM`,
        appointment_id: booking.id,
        client_id: booking.client_id,
        barber_id: booking.barber_id,
        amount: commission,
        type: 'commission',
        status: 'success',
      },
      {
        reference: `${reference}-PAY`,
        appointment_id: booking.id,
        client_id: booking.client_id,
        barber_id: booking.barber_id,
        amount: barberShare,
        type: 'transfer',
        status: 'pending',
      },
    ],
    { onConflict: 'reference' },
  );

  // Where the money should go. Snapshotted so editing the profile later can't
  // redirect a payout that's already been queued.
  const { data: profile } = await supabase
    .from('barber_profiles')
    .select('payout_provider, payout_account_name, payout_account_number')
    .eq('user_id', barberId)
    .maybeSingle();

  const { error: payoutError } = await supabase.from('payouts').upsert(
    {
      barber_id: barberId,
      appointment_id: booking.id,
      amount: barberShare,
      status: 'pending',
      payout_provider: profile?.payout_provider ?? null,
      payout_account_name: profile?.payout_account_name ?? null,
      payout_account_number: profile?.payout_account_number ?? null,
      reference: `${reference}-PAY`,
    },
    { onConflict: 'reference' },
  );
  if (payoutError) console.error('[settlement] payout queue failed:', payoutError.message);

  await notifyMany([
    {
      userId: barberId,
      type: 'payout',
      title: 'Payment released',
      body: profile?.payout_account_number
        ? `${cedis(barberShare)} is on its way to your ${profile.payout_provider} account (${cedis(commission)} platform fee).`
        : `${cedis(barberShare)} is ready for you — add a payout account in Settings to receive it.`,
      bookingId: booking.id as string,
    },
    {
      userId: booking.client_id as string,
      type: 'booking_completed',
      title: 'Appointment closed',
      body: 'Thanks! Your payment has been released to the barber.',
      bookingId: booking.id as string,
    },
  ]);
}

/**
 * Close out appointments whose confirmation window has passed without the
 * client raising a problem.
 *
 * Disputed bookings are deliberately skipped — those wait for a human.
 */
export async function settleDueAppointments(): Promise<void> {
  const supabase = getSupabase();
  const { confirmationWindowHours } = await getSettings();

  const cutoff = new Date(Date.now() - confirmationWindowHours * 3_600_000).toISOString();

  const { data: due, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .is('released_at', null)
    .is('disputed_at', null)
    .lt('ends_at', cutoff)
    .limit(50);

  if (error) {
    console.error('[settlement] lookup failed:', error.message);
    return;
  }
  if (!due || due.length === 0) return;

  for (const booking of due) await releaseEscrow(booking);
  console.log(`[settlement] released ${due.length} booking(s)`);
}

/**
 * Ask the client to confirm, once an appointment's time has passed. Sent once
 * per booking — the notification itself is the record.
 */
export async function requestConfirmations(): Promise<void> {
  const supabase = getSupabase();

  const { data: due } = await supabase
    .from('appointments')
    .select('id, client_id, service_name, barber_id, staff_barber_id')
    .eq('status', 'completed')
    .eq('payment_status', 'paid')
    .is('released_at', null)
    .is('disputed_at', null)
    .is('client_confirmed_at', null)
    .limit(50);

  if (!due || due.length === 0) return;

  for (const booking of due) {
    // One ask per booking: skip any that already have one.
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('type', 'booking_completed')
      .eq('user_id', booking.client_id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    await notify({
      userId: booking.client_id as string,
      type: 'booking_completed',
      title: 'How was your appointment?',
      body: `Confirm your ${booking.service_name} went ahead, or tell us if it didn't. We'll release payment shortly either way if we don't hear from you.`,
      bookingId: booking.id as string,
    });
  }
}
