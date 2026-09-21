import { getSupabase } from './supabase';

/**
 * Suspicious-activity detection.
 *
 * Looks back over a rolling window and writes a flag when a pattern is worth a
 * human's attention. Deliberately conservative: a flag is a prompt to look, not
 * a verdict, and nothing here suspends anyone or moves money. Everything is
 * counted from appointments, so an admin can always check the working.
 *
 * Three patterns:
 *
 *   high_cancellation — a barber who cancels a large share of their bookings.
 *                       Clients lose slots they'd planned around.
 *   client_no_show    — a client who repeatedly disputes or abandons. Costs
 *                       barbers time they can't resell.
 *   collusion         — the SAME client and barber cancelling together, over
 *                       and over. That's the shape of two people using
 *                       bookings for something other than haircuts.
 */

const WINDOW_DAYS = 30;

/** Below this, the sample is too small for a rate to mean anything. */
const MIN_BOOKINGS = 4;

/** Share of a barber's bookings that must be cancelled to raise a flag. */
const CANCEL_RATE_THRESHOLD = 0.4;

/** Disputes from one client before it stops looking like bad luck. */
const CLIENT_DISPUTE_THRESHOLD = 3;

/** Cancelled bookings between the same pair before it looks arranged. */
const COLLUSION_THRESHOLD = 3;

type Row = Record<string, any>;

interface FlagDraft {
  subject_id: string;
  counterpart_id: string | null;
  kind: 'high_cancellation' | 'client_no_show' | 'collusion';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  evidence: Record<string, unknown>;
}

/**
 * Run a detection pass. Returns how many flags are currently open.
 *
 * Safe to run repeatedly: a partial unique index keeps one live flag per
 * subject/kind/counterpart, so re-running refreshes the evidence rather than
 * stacking duplicates.
 */
export async function runDetection(): Promise<{ created: number; open: number }> {
  const supabase = getSupabase();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, client_id, barber_id, staff_barber_id, status, disputed_at, cancelled_by, created_at')
    .gte('created_at', since);

  if (error) {
    console.error('[detection] lookup failed:', error.message);
    return { created: 0, open: 0 };
  }

  const rows = appointments ?? [];
  const drafts: FlagDraft[] = [];

  // ── Barbers cancelling too much ──────────────────────────────────────────
  const byBarber = new Map<string, { total: number; cancelled: number }>();
  for (const a of rows) {
    const barberId = (a.staff_barber_id as string) ?? (a.barber_id as string);
    if (!barberId) continue;
    const entry = byBarber.get(barberId) ?? { total: 0, cancelled: 0 };
    entry.total += 1;
    // Only count cancellations the BARBER caused — a client changing their
    // mind says nothing about the barber.
    if (
      (a.status === 'cancelled' && a.cancelled_by === barberId) ||
      a.status === 'declined'
    ) {
      entry.cancelled += 1;
    }
    byBarber.set(barberId, entry);
  }

  for (const [barberId, { total, cancelled }] of byBarber) {
    if (total < MIN_BOOKINGS) continue;
    const rate = cancelled / total;
    if (rate < CANCEL_RATE_THRESHOLD) continue;

    drafts.push({
      subject_id: barberId,
      counterpart_id: null,
      kind: 'high_cancellation',
      severity: rate >= 0.7 ? 'high' : rate >= 0.55 ? 'medium' : 'low',
      reason: `Cancelled or declined ${cancelled} of ${total} bookings (${Math.round(rate * 100)}%) in the last ${WINDOW_DAYS} days.`,
      evidence: { total, cancelled, rate: Math.round(rate * 100) / 100, windowDays: WINDOW_DAYS },
    });
  }

  // ── Clients disputing repeatedly ─────────────────────────────────────────
  const byClient = new Map<string, { total: number; disputed: number }>();
  for (const a of rows) {
    const clientId = a.client_id as string;
    if (!clientId) continue;
    const entry = byClient.get(clientId) ?? { total: 0, disputed: 0 };
    entry.total += 1;
    if (a.disputed_at) entry.disputed += 1;
    byClient.set(clientId, entry);
  }

  for (const [clientId, { total, disputed }] of byClient) {
    if (disputed < CLIENT_DISPUTE_THRESHOLD) continue;

    drafts.push({
      subject_id: clientId,
      counterpart_id: null,
      kind: 'client_no_show',
      severity: disputed >= 6 ? 'high' : disputed >= 4 ? 'medium' : 'low',
      reason: `Reported ${disputed} of ${total} appointments as not having happened in the last ${WINDOW_DAYS} days.`,
      evidence: { total, disputed, windowDays: WINDOW_DAYS },
    });
  }

  // ── The same pair, cancelling together ───────────────────────────────────
  const byPair = new Map<string, { client: string; barber: string; count: number }>();
  for (const a of rows) {
    if (!['cancelled', 'declined'].includes(a.status)) continue;
    const barberId = (a.staff_barber_id as string) ?? (a.barber_id as string);
    const clientId = a.client_id as string;
    if (!barberId || !clientId) continue;

    const key = `${clientId}|${barberId}`;
    const entry = byPair.get(key) ?? { client: clientId, barber: barberId, count: 0 };
    entry.count += 1;
    byPair.set(key, entry);
  }

  for (const { client, barber, count } of byPair.values()) {
    if (count < COLLUSION_THRESHOLD) continue;

    drafts.push({
      subject_id: client,
      counterpart_id: barber,
      kind: 'collusion',
      severity: count >= 6 ? 'high' : 'medium',
      reason: `The same client and barber have ${count} cancelled or declined bookings between them in the last ${WINDOW_DAYS} days.`,
      evidence: { count, windowDays: WINDOW_DAYS },
    });
  }

  // ── Write them ───────────────────────────────────────────────────────────
  let created = 0;
  for (const draft of drafts) {
    // Refresh an existing open flag rather than duplicating it.
    const existing = await supabase
      .from('suspicious_flags')
      .select('id')
      .eq('subject_id', draft.subject_id)
      .eq('kind', draft.kind)
      .eq('status', 'pending')
      .is('counterpart_id', draft.counterpart_id === null ? null : undefined)
      .maybeSingle();

    if (existing.data) {
      await supabase
        .from('suspicious_flags')
        .update({ severity: draft.severity, reason: draft.reason, evidence: draft.evidence })
        .eq('id', existing.data.id);
      continue;
    }

    const { error: insertError } = await supabase.from('suspicious_flags').insert(draft);
    // A unique-violation just means a concurrent pass got there first.
    if (insertError && insertError.code !== '23505') {
      console.error('[detection] insert failed:', insertError.message);
      continue;
    }
    if (!insertError) created += 1;
  }

  const { count: open } = await supabase
    .from('suspicious_flags')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  console.log(`[detection] ${created} new flag(s), ${open ?? 0} open`);
  return { created, open: open ?? 0 };
}

/** Shape a flag row for the admin panel. */
export function mapFlag(row: Row) {
  const one = (r: unknown) => (Array.isArray(r) ? r[0] : r) as Row | null;
  const subject = one(row.subject);
  const counterpart = one(row.counterpart);

  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    reason: row.reason,
    evidence: row.evidence ?? {},
    status: row.status,
    resolution_note: row.resolution_note ?? null,
    resolved_at: row.resolved_at ?? null,
    created_at: row.created_at,
    subject_name: subject?.full_name ?? 'Unknown',
    subject_id: row.subject_id,
    subject_role: subject?.role ?? 'client',
    counterpart_name: counterpart?.full_name ?? null,
    counterpart_id: row.counterpart_id ?? null,
  };
}
