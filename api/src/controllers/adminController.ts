import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { refundTransaction } from '../utils/paystack';

/**
 * Platform administration.
 *
 * Everything here reads the same tables the mobile apps write, so the admin
 * panel never talks to Supabase directly — one API, one set of rules. Field
 * names are snake_case to match what the Next.js panel's types expect.
 */

type Row = Record<string, any>;

const RANGE_DAYS: Record<string, number> = { '30d': 30, '90d': 90, '1y': 365 };

/** A full uuid pasted from a log or URL, as opposed to a short reference. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function rangeStart(range: string): Date {
  const days = RANGE_DAYS[range] ?? 30;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() - (days - 1) * 86_400_000);
}

const num = (v: unknown) => parseFloat(String(v)) || 0;

/** "2026-08-05" → "Aug 5", the label the panel's charts render. */
function trendLabel(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The panel models accounts as a lifecycle; we store a boolean. */
function statusOf(user: Row): string {
  if (user.is_active === false) return 'suspended';
  // A barber who never finished onboarding isn't really live yet.
  if (!user.password_hash && !user.google_id && !user.apple_id) return 'pending';
  return 'active';
}

function mapUser(row: Row) {
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    role: row.role,
    status: statusOf(row),
    avatar_url: row.avatar_url ?? null,
    rating: profile?.rating != null ? num(profile.rating) : null,
    barber_type: profile?.barber_type ?? null,
    business_name: profile?.business_name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Build the per-day trend series. Days with no activity still need a point,
 * otherwise the chart draws a misleading straight line across the gap.
 */
function buildTrend(appointments: Row[], from: Date, days: number) {
  const buckets = new Map<string, { bookings: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    buckets.set(ymd(new Date(from.getTime() + i * 86_400_000)), { bookings: 0, revenue: 0 });
  }

  for (const a of appointments) {
    const key = ymd(new Date(a.created_at));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.bookings += 1;
    // Only money that actually cleared counts as revenue.
    if (a.payment_status === 'paid' || a.payment_status === 'refunded') {
      bucket.revenue += num(a.service_price) + num(a.travel_fee);
    }
  }

  return Array.from(buckets.entries()).map(([date, v]) => ({
    date: trendLabel(new Date(`${date}T00:00:00`)),
    bookings: v.bookings,
    revenue: Math.round(v.revenue * 100) / 100,
  }));
}

/**
 * The live feed: who joined, and what money moved, newest first. Shared by the
 * dashboard's first paint and the feed's polling refresh.
 */
async function recentActivity(limit = 12) {
  const supabase = getSupabase();

  const [recentUsers, recentTxns] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('transactions')
      .select(
        'id, amount, type, status, created_at, appointment_id, client:client_id (full_name), barber:barber_id (full_name)',
      )
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  return [
    ...(recentUsers.data ?? []).map((u) => ({
      id: `user_${u.id}`,
      type: 'registration' as const,
      actor_name: u.full_name,
      description: `joined as a ${String(u.role).replace('_', ' ')}`,
      booking_id: null as string | null,
      created_at: u.created_at,
    })),
    ...(recentTxns.data ?? []).map((t: Row) => {
      const client = Array.isArray(t.client) ? t.client[0] : t.client;
      const barber = Array.isArray(t.barber) ? t.barber[0] : t.barber;
      const isPayout = t.type === 'transfer' || t.type === 'commission';
      return {
        id: `txn_${t.id}`,
        type: (isPayout ? 'payout' : 'booking') as 'payout' | 'booking',
        actor_name: (isPayout ? barber?.full_name : client?.full_name) ?? 'Someone',
        description:
          t.type === 'deposit'
            ? t.status === 'success'
              ? 'paid for a booking'
              : `payment ${t.status}`
            : t.type === 'refund'
              ? 'was refunded'
              : t.type === 'commission'
                ? 'platform commission'
                : `payout ${t.status}`,
        amount: num(t.amount),
        // Lets the feed link straight through to the booking it describes.
        booking_id: (t.appointment_id as string | null) ?? null,
        created_at: t.created_at,
      };
    }),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export const adminController = {
  /** GET /admin/activity — the feed on its own, for polling refreshes. */
  async activity(_req: Request, res: Response) {
    try {
      sendSuccess(res, await recentActivity(12));
    } catch (err) {
      console.error('[admin] activity failed:', err);
      sendError(res, "We couldn't load recent activity. Please try again.", 500);
    }
  },

  /** GET /admin/dashboard?range=30d|90d|1y */
  async dashboard(req: Request, res: Response) {
    const range = String(req.query.range ?? '30d');
    const from = rangeStart(range);
    const days = RANGE_DAYS[range] ?? 30;
    const supabase = getSupabase();

    const [users, barbers, live, escrow, commission, appointments, activity] =
      await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .in('role', ['barber', 'staff_barber'])
          .eq('is_active', true),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed', 'in_progress']),
        // Escrow is what Trimova is holding: paid, but not yet released.
        supabase
          .from('appointments')
          .select('service_price, travel_fee')
          .eq('payment_status', 'paid')
          .is('released_at', null),
        supabase
          .from('transactions')
          .select('amount')
          .eq('type', 'commission')
          .eq('status', 'success'),
        supabase
          .from('appointments')
          .select('created_at, payment_status, service_price, travel_fee')
          .gte('created_at', from.toISOString()),
        recentActivity(12),
      ]);

    if (appointments.error) {
      console.error('[admin] dashboard failed:', appointments.error);
      sendError(res, "We couldn't load the dashboard. Please try again.", 500);
      return;
    }

    const escrowBalance = (escrow.data ?? []).reduce(
      (sum, a) => sum + num(a.service_price) + num(a.travel_fee),
      0,
    );
    const commissionRevenue = (commission.data ?? []).reduce((sum, t) => sum + num(t.amount), 0);

    sendSuccess(res, {
      kpis: {
        total_users: users.count ?? 0,
        active_barbers: barbers.count ?? 0,
        live_booking_volume: live.count ?? 0,
        commission_revenue: Math.round(commissionRevenue * 100) / 100,
        escrow_balance: Math.round(escrowBalance * 100) / 100,
      },
      trend: buildTrend(appointments.data ?? [], from, days),
      activity,
      // The automated detection engine hasn't been built yet, so there is
      // nothing to surface rather than anything to hide.
      flags: [],
    });
  },

  /** GET /admin/dashboard/trend?range= */
  async trend(req: Request, res: Response) {
    const range = String(req.query.range ?? '30d');
    const from = rangeStart(range);
    const days = RANGE_DAYS[range] ?? 30;

    const { data, error } = await getSupabase()
      .from('appointments')
      .select('created_at, payment_status, service_price, travel_fee')
      .gte('created_at', from.toISOString());

    if (error) {
      console.error('[admin] trend failed:', error);
      sendError(res, "We couldn't load the chart data. Please try again.", 500);
      return;
    }
    sendSuccess(res, buildTrend(data ?? [], from, days));
  },

  /** GET /admin/users?filter=all|clients|barbers&search= */
  async listUsers(req: Request, res: Response) {
    const { filter = 'all', search = '' } = req.query as Record<string, string>;
    const supabase = getSupabase();

    let query = supabase
      .from('users')
      .select(`
        id, full_name, email, phone, role, avatar_url, is_active,
        password_hash, google_id, apple_id, created_at, updated_at,
        profile:barber_profiles!barber_profiles_user_id_fkey (rating, barber_type, business_name)
      `);

    if (filter === 'clients') query = query.eq('role', 'client');
    if (filter === 'barbers') query = query.in('role', ['barber', 'staff_barber']);

    const needle = search.trim();
    if (needle) {
      query = query.or(`full_name.ilike.%${needle}%,email.ilike.%${needle}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);

    if (error) {
      console.error('[admin] listUsers failed:', error);
      sendError(res, "We couldn't load the users list. Please try again.", 500);
      return;
    }
    sendSuccess(res, (data ?? []).map(mapUser));
  },

  /** GET /admin/users/:id — full profile for the detail drawer. */
  async getUser(req: Request, res: Response) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('users')
      .select(`
        id, full_name, email, phone, role, avatar_url, is_active,
        password_hash, google_id, apple_id, created_at, updated_at,
        profile:barber_profiles!barber_profiles_user_id_fkey (*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      sendError(res, 'That user could not be found.', 404);
      return;
    }

    // A barber's record is only meaningful alongside how they've performed.
    const isBarber = data.role === 'barber' || data.role === 'staff_barber';
    const column = isBarber ? 'barber_id' : 'client_id';

    const [completed, cancelled, total] = await Promise.all([
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq(column, data.id)
        .eq('status', 'completed'),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq(column, data.id)
        .in('status', ['cancelled', 'declined']),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq(column, data.id),
    ]);

    const completedCount = completed.count ?? 0;
    const totalCount = total.count ?? 0;

    sendSuccess(res, {
      ...mapUser(data),
      completed_bookings: completedCount,
      cancelled_bookings: cancelled.count ?? 0,
      total_bookings: totalCount,
      completion_rate: totalCount ? completedCount / totalCount : 0,
    });
  },

  /** GET /admin/users/:id/payouts — what a barber has been paid. */
  async userPayouts(req: Request, res: Response) {
    const { data, error } = await getSupabase()
      .from('transactions')
      .select('*')
      .eq('barber_id', req.params.id)
      .in('type', ['transfer', 'commission'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[admin] userPayouts failed:', error);
      sendError(res, "We couldn't load that payout history. Please try again.", 500);
      return;
    }

    sendSuccess(
      res,
      (data ?? []).map((t) => ({
        id: t.id,
        barber_id: t.barber_id,
        amount: num(t.amount),
        // The panel's PayoutRecord speaks 'paid' rather than 'success'.
        status: t.status === 'success' ? 'paid' : t.status,
        type: t.type,
        reference: t.reference,
        created_at: t.created_at,
      })),
    );
  },

  /** PATCH /admin/users/:id — suspend or reinstate an account. */
  async updateUser(req: Request, res: Response) {
    const { status } = req.body as { status?: string };

    if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
      sendError(res, 'That status is not valid.');
      return;
    }
    if (req.params.id === req.user!.sub) {
      sendError(res, 'You cannot change your own account status.');
      return;
    }

    const { data, error } = await getSupabase()
      .from('users')
      .update({ is_active: status === 'active' })
      .eq('id', req.params.id)
      .select('id, full_name, email, phone, role, avatar_url, is_active, password_hash, google_id, apple_id, created_at, updated_at')
      .single();

    if (error || !data) {
      console.error('[admin] updateUser failed:', error);
      sendError(res, "We couldn't update that account. Please try again.", 500);
      return;
    }
    sendSuccess(res, mapUser(data), status === 'active' ? 'Account reinstated.' : 'Account suspended.');
  },

  /** GET /admin/finance/pipeline — the three Paystack stages. */
  async financePipeline(_req: Request, res: Response) {
    const supabase = getSupabase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [held, transfers, refunds, todayTransfers, pendingRefunds] = await Promise.all([
      supabase
        .from('appointments')
        .select('service_price, travel_fee')
        .eq('payment_status', 'paid')
        .is('released_at', null),
      supabase.from('transactions').select('amount').eq('type', 'transfer'),
      supabase.from('transactions').select('amount').eq('type', 'refund'),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'transfer')
        .eq('status', 'success')
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'refund')
        .eq('status', 'pending'),
    ]);

    const sum = (rows: Row[] | null) => rows?.reduce((t, r) => t + num(r.amount), 0) ?? 0;

    sendSuccess(res, {
      funds_held:
        Math.round(
          (held.data ?? []).reduce((t, a) => t + num(a.service_price) + num(a.travel_fee), 0) * 100,
        ) / 100,
      transfers_total: Math.round(sum(transfers.data) * 100) / 100,
      refunds_total: Math.round(sum(refunds.data) * 100) / 100,
      transfers_success_today: todayTransfers.count ?? 0,
      refunds_pending: pendingRefunds.count ?? 0,
    });
  },

  /** GET /admin/finance/transactions?page&page_size&search&status */
  async listTransactions(req: Request, res: Response) {
    const {
      page = '1',
      page_size = '20',
      search = '',
      status = 'all',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));
    const from = (pageNum - 1) * perPage;

    const supabase = getSupabase();
    let query = supabase
      .from('transactions')
      .select('*, client:client_id (full_name, email)', { count: 'exact' });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search.trim()) query = query.ilike('reference', `%${search.trim()}%`);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[admin] listTransactions failed:', error);
      sendError(res, "We couldn't load the transaction log. Please try again.", 500);
      return;
    }

    sendSuccess(res, {
      items: (data ?? []).map((t: Row) => {
        const client = Array.isArray(t.client) ? t.client[0] : t.client;
        return {
          id: t.id,
          reference: t.reference,
          client_id: t.client_id,
          booking_id: t.appointment_id,
          user_name: client?.full_name ?? '—',
          user_email: client?.email ?? '—',
          amount: num(t.amount),
          type: t.type,
          status: t.status,
          channel: t.channel,
          created_at: t.created_at,
        };
      }),
      total: count ?? 0,
      page: pageNum,
      page_size: perPage,
    });
  },

  /** POST /admin/finance/transactions/:id/refund — manual override. */
  async refund(req: Request, res: Response) {
    const supabase = getSupabase();

    const { data: txn, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !txn) {
      sendError(res, 'That transaction could not be found.', 404);
      return;
    }
    if (txn.type !== 'deposit' || txn.status !== 'success') {
      sendError(res, 'Only a successful client payment can be refunded.');
      return;
    }

    const { data: already } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', `${txn.reference}-REF`)
      .maybeSingle();

    if (already) {
      sendError(res, 'This payment has already been refunded.');
      return;
    }

    const result = await refundTransaction(txn.reference, num(txn.amount));

    await supabase.from('transactions').insert({
      reference: `${txn.reference}-REF`,
      appointment_id: txn.appointment_id,
      client_id: txn.client_id,
      barber_id: txn.barber_id,
      amount: num(txn.amount),
      type: 'refund',
      status: result.ok ? 'success' : 'failed',
      channel: txn.channel,
    });

    if (!result.ok) {
      console.error('[admin] refund failed:', result.message);
      sendError(res, "Paystack couldn't process that refund. Please try again shortly.", 502);
      return;
    }

    // The booking follows the money: refunded, and no longer going ahead.
    if (txn.appointment_id) {
      await supabase
        .from('appointments')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Refunded by Trimova support',
        })
        .eq('id', txn.appointment_id);
    }

    sendSuccess(res, null, 'Refund processed.');
  },

  /**
   * GET /admin/bookings?status=&search=&page=&page_size=
   * Every appointment on the platform, so support can answer "what actually
   * happened between this barber and this client?".
   */
  async listBookings(req: Request, res: Response) {
    const {
      page = '1',
      page_size = '20',
      status = 'all',
      search = '',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(page_size, 10) || 20));
    const from = (pageNum - 1) * perPage;

    const supabase = getSupabase();
    let query = supabase
      .from('appointments')
      .select(
        `*,
         client:client_id (id, full_name, email, phone),
         barber:barber_id (id, full_name, email, phone),
         staff:staff_barber_id (id, full_name)`,
        { count: 'exact' },
      );

    if (status && status !== 'all') query = query.in('status', status.split(','));

    /**
     * Support arrives with whatever the person on the phone gave them: a
     * booking reference, a name, an email, a Paystack reference. One box has
     * to cope with all of it.
     *
     * Names live on the joined users rows, which PostgREST can't put inside an
     * `.or()` alongside local columns — so people are resolved to ids first,
     * then folded into a single filter.
     */
    const needle = search.trim();
    if (needle) {
      const filters: string[] = [
        // `short_ref` is the reference the panel prints, so pasting it works.
        `short_ref.ilike.%${needle}%`,
        `service_name.ilike.%${needle}%`,
        `payment_reference.ilike.%${needle}%`,
      ];

      // A full uuid pasted from a log or a URL should match exactly.
      if (UUID_RE.test(needle)) filters.push(`id.eq.${needle}`);

      const { data: people } = await supabase
        .from('users')
        .select('id')
        .or(`full_name.ilike.%${needle}%,email.ilike.%${needle}%`)
        .limit(50);

      for (const person of people ?? []) {
        filters.push(`client_id.eq.${person.id}`);
        filters.push(`barber_id.eq.${person.id}`);
        filters.push(`staff_barber_id.eq.${person.id}`);
      }

      query = query.or(filters.join(','));
    }

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: false })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[admin] listBookings failed:', error);
      sendError(res, "We couldn't load the bookings. Please try again.", 500);
      return;
    }

    sendSuccess(res, {
      items: (data ?? []).map(mapAdminBooking),
      total: count ?? 0,
      page: pageNum,
      page_size: perPage,
    });
  },

  /** GET /admin/bookings/:id — the full record, money included. */
  async getBooking(req: Request, res: Response) {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('appointments')
      .select(
        `*,
         client:client_id (id, full_name, email, phone, avatar_url),
         barber:barber_id (id, full_name, email, phone, avatar_url),
         staff:staff_barber_id (id, full_name, avatar_url)`,
      )
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }

    const { data: txns } = await supabase
      .from('transactions')
      .select('*')
      .eq('appointment_id', data.id)
      .order('created_at', { ascending: true });

    sendSuccess(res, {
      ...mapAdminBooking(data),
      transactions: (txns ?? []).map((t) => ({
        id: t.id,
        reference: t.reference,
        amount: num(t.amount),
        type: t.type,
        status: t.status,
        channel: t.channel,
        created_at: t.created_at,
      })),
    });
  },
};

function mapAdminBooking(row: Row) {
  const one = (r: unknown) => (Array.isArray(r) ? r[0] : r) as Row | null;
  const client = one(row.client);
  const barber = one(row.barber);
  const staff = one(row.staff);

  return {
    id: row.id,
    // The short reference support quotes on the phone. Falls back to slicing
    // the id so this still works before migration 017 has been run.
    short_ref: (row.short_ref as string) ?? String(row.id).slice(0, 8),
    service_name: row.service_name,
    service_price: num(row.service_price),
    travel_fee: num(row.travel_fee),
    amount: num(row.service_price) + num(row.travel_fee),
    status: row.status,
    payment_status: row.payment_status,
    payment_reference: row.payment_reference ?? null,
    requires_approval: Boolean(row.requires_approval),
    scheduled_at: row.scheduled_at,
    ends_at: row.ends_at,
    approved_at: row.approved_at ?? null,
    completed_at: row.completed_at ?? null,
    cancelled_at: row.cancelled_at ?? null,
    released_at: row.released_at ?? null,
    cancel_reason: row.cancel_reason ?? null,
    client_address: row.client_address ?? null,
    notes: row.notes ?? null,
    created_at: row.created_at,
    client: client && {
      id: client.id,
      full_name: client.full_name,
      email: client.email,
      phone: client.phone ?? null,
      avatar_url: client.avatar_url ?? null,
    },
    barber: barber && {
      id: barber.id,
      full_name: barber.full_name,
      email: barber.email,
      phone: barber.phone ?? null,
      avatar_url: barber.avatar_url ?? null,
    },
    // Who actually performed it, when a shop's staff member did.
    staff: staff && { id: staff.id, full_name: staff.full_name, avatar_url: staff.avatar_url ?? null },
  };
}
