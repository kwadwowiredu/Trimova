import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { generateSlots, type BusyBlock } from '../utils/slots';

/**
 * Appointments — the transaction that joins the client and barber apps.
 *
 * Two flows, decided by the barber's type:
 *
 *   barbershop → the slot is held, the client pays, and the booking becomes
 *                CONFIRMED automatically. The shop may still cancel.
 *   mobile     → the client REQUESTS the slot. The barber approves (optionally
 *                adding a travel fee) or declines. Only an approved request
 *                can be paid for.
 *
 * Money is held by Trimova from payment until the barber marks the
 * appointment complete — see paymentController.
 */

/** How long an unpaid booking keeps its slot before the hold lapses. */
export const PAYMENT_WINDOW_MINUTES = 10;

/** After a mobile barber approves, the client gets longer to pay. */
export const APPROVED_PAYMENT_WINDOW_MINUTES = 60;

type Row = Record<string, any>;

/**
 * Shape rows for the mobile app. Joined user records arrive under the alias
 * used in the select (`client:client_id (...)`), which may be an object or a
 * single-element array depending on how PostgREST infers the relationship.
 */
function one(rel: unknown): Row | null {
  if (Array.isArray(rel)) return (rel[0] as Row) ?? null;
  return (rel as Row) ?? null;
}

export function mapBooking(row: Row) {
  const client = one(row.client);
  const barber = one(row.barber);
  const staff = one(row.staff);
  // A staff member performs the cut under the shop's name; the client should
  // see who is actually cutting their hair.
  const performer = staff ?? barber;

  return {
    id: row.id,
    clientId: row.client_id,
    barberId: row.barber_id,
    staffBarberId: row.staff_barber_id ?? null,
    serviceId: row.service_id ?? null,
    serviceName: row.service_name,
    servicePrice: parseFloat(String(row.service_price)) || 0,
    serviceDuration: Number(row.service_duration_minutes) || 30,
    travelFee: parseFloat(String(row.travel_fee)) || 0,
    total:
      (parseFloat(String(row.service_price)) || 0) +
      (parseFloat(String(row.travel_fee)) || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference ?? null,
    requiresApproval: Boolean(row.requires_approval),
    approvedAt: row.approved_at ?? null,
    holdExpiresAt: row.hold_expires_at ?? null,
    scheduledAt: row.scheduled_at,
    endsAt: row.ends_at,
    completedAt: row.completed_at ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancelReason: row.cancel_reason ?? null,
    clientLocation: row.client_address
      ? { address: row.client_address, lat: row.client_lat, lng: row.client_lng }
      : null,
    notes: row.notes ?? null,
    barberName: performer?.full_name ?? '',
    barberAvatarUrl: performer?.avatar_url ?? null,
    shopName: barber?.full_name ?? '',
    clientName: client?.full_name ?? '',
    clientAvatarUrl: client?.avatar_url ?? null,
    clientPhone: client?.phone ?? null,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_PEOPLE = `
  *,
  client:client_id (id, full_name, avatar_url, phone),
  barber:barber_id (id, full_name, avatar_url, phone),
  staff:staff_barber_id (id, full_name, avatar_url, phone)
`;

/** Statuses that still occupy a slot on the calendar. */
const LIVE_STATUSES = ['pending', 'confirmed', 'in_progress'];

/**
 * Release slots whose payment window lapsed, so a client who abandoned
 * checkout doesn't block the time forever. Cheap enough to run before any
 * read that depends on live availability.
 */
async function expireStaleHolds() {
  const supabase = getSupabase();
  const { error } = await supabase.rpc('expire_stale_holds');
  if (error) console.error('[bookings] expire_stale_holds failed:', error.message);
}

function minutesFromNow(mins: number): string {
  return new Date(Date.now() + mins * 60_000).toISOString();
}

/** "16:00:00" → "16:00", so the picker can compare times as plain strings. */
const hhmm = (t: string) => t.slice(0, 5);

/** An appointment's local wall-clock start/end, which is what a barber reads. */
function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Local "YYYY-MM-DD" — never UTC, which shifts the day in Ghana's timezone. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const bookingController = {
  /**
   * POST /bookings
   * Creates the appointment and holds the slot. Payment happens next, except
   * for a mobile barber who must approve the request first.
   */
  async create(req: Request, res: Response) {
    const {
      barberId, staffBarberId, serviceId, scheduledAt, clientLocation, notes,
    } = req.body as {
      barberId?: string;
      staffBarberId?: string | null;
      serviceId?: string;
      scheduledAt?: string;
      clientLocation?: { lat: number; lng: number; address: string } | null;
      notes?: string;
    };

    if (!barberId || !serviceId || !scheduledAt) {
      sendError(res, 'Please choose a barber, a service and a time.');
      return;
    }

    const start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) {
      sendError(res, 'That appointment time is not valid.');
      return;
    }
    if (start.getTime() <= Date.now()) {
      sendError(res, 'That time has already passed. Please pick another slot.');
      return;
    }

    const supabase = getSupabase();
    await expireStaleHolds();

    // Price and duration come from the database, never from the client — the
    // request body only says WHICH service, never what it costs.
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, barber_id, name, price, duration_minutes, is_active')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      sendError(res, 'That service is no longer available.', 404);
      return;
    }
    if (service.barber_id !== barberId) {
      sendError(res, 'That service does not belong to this barber.');
      return;
    }
    if (service.is_active === false) {
      sendError(res, 'That service is no longer available.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('barber_profiles')
      .select('barber_type, booking_lead_minutes, booking_future_days, is_available')
      .eq('user_id', barberId)
      .single();

    if (profileError || !profile) {
      sendError(res, 'We could not find that barber.', 404);
      return;
    }
    if (profile.is_available === false) {
      sendError(res, 'This barber is not accepting bookings right now.');
      return;
    }

    // Honour the barber's own booking rules.
    const leadMs = (profile.booking_lead_minutes ?? 30) * 60_000;
    if (start.getTime() < Date.now() + leadMs) {
      sendError(
        res,
        `This barber needs at least ${profile.booking_lead_minutes ?? 30} minutes' notice.`,
      );
      return;
    }
    const futureDays = profile.booking_future_days ?? 90;
    if (start.getTime() > Date.now() + futureDays * 86_400_000) {
      sendError(res, `You can only book up to ${futureDays} days ahead.`);
      return;
    }

    // A staff member must actually work at this shop.
    if (staffBarberId) {
      const { data: staff } = await supabase
        .from('barber_profiles')
        .select('user_id')
        .eq('user_id', staffBarberId)
        .eq('owner_id', barberId)
        .maybeSingle();
      if (!staff) {
        sendError(res, 'That professional is not available at this shop.');
        return;
      }
    }

    const duration = Number(service.duration_minutes) || 30;
    const end = new Date(start.getTime() + duration * 60_000);
    const requiresApproval = profile.barber_type === 'mobile';

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: req.user!.sub,
        barber_id: barberId,
        staff_barber_id: staffBarberId ?? null,
        service_id: service.id,
        service_name: service.name,
        service_price: service.price,
        service_duration_minutes: duration,
        status: 'pending',
        payment_status: 'unpaid',
        requires_approval: requiresApproval,
        scheduled_at: start.toISOString(),
        ends_at: end.toISOString(),
        // A request awaiting approval isn't on a payment clock yet.
        hold_expires_at: requiresApproval ? null : minutesFromNow(PAYMENT_WINDOW_MINUTES),
        client_address: clientLocation?.address ?? null,
        client_lat: clientLocation?.lat ?? null,
        client_lng: clientLocation?.lng ?? null,
        notes: notes?.trim() || null,
      })
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      // The exclusion constraint is the authority on double-booking: someone
      // else took this slot between the client seeing it and confirming.
      if (error?.code === '23P01' || /appointments_no_overlap/.test(error?.message ?? '')) {
        sendError(res, 'Sorry, that slot was just taken. Please choose another time.', 409);
        return;
      }
      console.error('[bookings] create failed:', error);
      sendError(res, "We couldn't create that booking right now. Please try again.", 500);
      return;
    }

    sendSuccess(
      res,
      mapBooking(data),
      requiresApproval
        ? 'Request sent. The barber will confirm shortly.'
        : 'Slot held. Complete payment to confirm.',
      201,
    );
  },

  /** GET /bookings/client — the signed-in client's own appointments. */
  async listForClient(req: Request, res: Response) {
    await expireStaleHolds();
    const supabase = getSupabase();
    const { status, page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const from = (pageNum - 1) * perPage;

    let query = supabase
      .from('appointments')
      .select(SELECT_WITH_PEOPLE, { count: 'exact' })
      .eq('client_id', req.user!.sub);

    if (status) query = query.in('status', status.split(','));

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: false })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[bookings] listForClient failed:', error);
      sendError(res, "We couldn't load your bookings. Please try again.", 500);
      return;
    }

    sendPaginated(res, (data ?? []).map(mapBooking), {
      page: pageNum,
      limit: perPage,
      total: count ?? 0,
    });
  },

  /**
   * GET /bookings/barber — appointments for the signed-in barber.
   * A shop owner sees everything booked at the shop (including their staff's);
   * a staff barber sees only their own.
   */
  async listForBarber(req: Request, res: Response) {
    await expireStaleHolds();
    const supabase = getSupabase();
    const { status, date, page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const from = (pageNum - 1) * perPage;

    let query = supabase
      .from('appointments')
      .select(SELECT_WITH_PEOPLE, { count: 'exact' });

    query =
      req.user!.role === 'staff_barber'
        ? query.eq('staff_barber_id', req.user!.sub)
        : query.eq('barber_id', req.user!.sub);

    if (status) query = query.in('status', status.split(','));

    // `date` is a calendar day in the server's timezone — used by the barber's
    // day view.
    if (date) {
      const dayStart = new Date(`${date}T00:00:00`);
      if (!Number.isNaN(dayStart.getTime())) {
        const dayEnd = new Date(dayStart.getTime() + 86_400_000);
        query = query
          .gte('scheduled_at', dayStart.toISOString())
          .lt('scheduled_at', dayEnd.toISOString());
      }
    }

    const { data, error, count } = await query
      .order('scheduled_at', { ascending: true })
      .range(from, from + perPage - 1);

    if (error) {
      console.error('[bookings] listForBarber failed:', error);
      sendError(res, "We couldn't load your bookings. Please try again.", 500);
      return;
    }

    sendPaginated(res, (data ?? []).map(mapBooking), {
      page: pageNum,
      limit: perPage,
      total: count ?? 0,
    });
  },

  /** GET /bookings/:id — readable by either party. */
  async getById(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('appointments')
      .select(SELECT_WITH_PEOPLE)
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }

    const me = req.user!.sub;
    if (data.client_id !== me && data.barber_id !== me && data.staff_barber_id !== me) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    sendSuccess(res, mapBooking(data));
  },

  /**
   * GET /bookings/availability?barberId=&date=&durationMinutes=&staffBarberId=
   * Everything the client's time picker needs for one day: opening hours,
   * breaks, and the blocks already taken. Public — a client browses slots
   * before committing to anything.
   */
  async availability(req: Request, res: Response) {
    const { barberId, date, staffBarberId } = req.query as Record<string, string>;

    if (!barberId || !date) {
      sendError(res, 'A barber and a date are required.');
      return;
    }
    const dayStart = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dayStart.getTime())) {
      sendError(res, 'That date is not valid.');
      return;
    }

    await expireStaleHolds();
    const supabase = getSupabase();

    // Whose calendar are we reading — the owner's, or a specific staff member's?
    const performerId = staffBarberId || barberId;
    const dayOfWeek = dayStart.getDay(); // 0 = Sunday, matching working_hours
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const [hoursResult, breaksResult, bookedResult, profileResult] = await Promise.all([
      supabase
        .from('working_hours')
        .select('start_time, end_time, is_active')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle(),
      supabase
        .from('breaks')
        .select('start_time, end_time')
        .eq('barber_id', barberId)
        .eq('day_of_week', dayOfWeek),
      supabase
        .from('appointments')
        .select('scheduled_at, ends_at')
        .eq('performer_id', performerId)
        .in('status', LIVE_STATUSES)
        .gte('scheduled_at', dayStart.toISOString())
        .lt('scheduled_at', dayEnd.toISOString()),
      supabase
        .from('barber_profiles')
        .select('booking_lead_minutes, booking_future_days')
        .eq('user_id', barberId)
        .maybeSingle(),
    ]);

    if (hoursResult.error || bookedResult.error) {
      console.error(
        '[bookings] availability failed:',
        hoursResult.error ?? bookedResult.error,
      );
      sendError(res, "We couldn't load available times. Please try again.", 500);
      return;
    }

    const hours = hoursResult.data;
    const isOpen = Boolean(hours) && hours!.is_active !== false;

    const busy = [
      ...(breaksResult.data ?? []).map((b) => ({
        start: hhmm(b.start_time),
        end: hhmm(b.end_time),
      })),
      ...(bookedResult.data ?? []).map((a) => ({
        start: localTime(a.scheduled_at),
        end: localTime(a.ends_at),
      })),
    ];

    sendSuccess(res, {
      isOpen,
      openTime: isOpen ? hhmm(hours!.start_time) : null,
      closeTime: isOpen ? hhmm(hours!.end_time) : null,
      busy,
      leadMinutes: profileResult.data?.booking_lead_minutes ?? 30,
      futureDays: profileResult.data?.booking_future_days ?? 90,
    });
  },

  /**
   * GET /bookings/availability/month?barberId=&from=&to=&durationMinutes=&staffBarberId=
   * Which days in a range can still take a booking of a given length.
   *
   * The calendar greys out unbookable days, and asking day by day would be
   * ~90 requests — this answers the whole range from two queries.
   */
  async availabilityMonth(req: Request, res: Response) {
    const { barberId, from, to, durationMinutes, staffBarberId } =
      req.query as Record<string, string>;

    if (!barberId || !from || !to) {
      sendError(res, 'A barber and a date range are required.');
      return;
    }

    const rangeStart = new Date(`${from}T00:00:00`);
    const rangeEnd = new Date(`${to}T00:00:00`);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      sendError(res, 'That date range is not valid.');
      return;
    }
    // One booking window is the most anyone needs at a time.
    const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000);
    if (days < 0 || days > 120) {
      sendError(res, 'That date range is too large.');
      return;
    }

    const duration = Math.max(5, parseInt(durationMinutes, 10) || 30);
    const performerId = staffBarberId || barberId;

    await expireStaleHolds();
    const supabase = getSupabase();

    const [hoursResult, breaksResult, bookedResult, profileResult] = await Promise.all([
      supabase
        .from('working_hours')
        .select('day_of_week, start_time, end_time, is_active')
        .eq('barber_id', barberId),
      supabase
        .from('breaks')
        .select('day_of_week, start_time, end_time')
        .eq('barber_id', barberId),
      supabase
        .from('appointments')
        .select('scheduled_at, ends_at')
        .eq('performer_id', performerId)
        .in('status', LIVE_STATUSES)
        .gte('scheduled_at', rangeStart.toISOString())
        .lt('scheduled_at', new Date(rangeEnd.getTime() + 86_400_000).toISOString()),
      supabase
        .from('barber_profiles')
        .select('booking_lead_minutes')
        .eq('user_id', barberId)
        .maybeSingle(),
    ]);

    if (hoursResult.error || bookedResult.error) {
      console.error(
        '[bookings] availabilityMonth failed:',
        hoursResult.error ?? bookedResult.error,
      );
      sendError(res, "We couldn't load available dates. Please try again.", 500);
      return;
    }

    // Group what we fetched by the day it applies to.
    const hoursByDow = new Map<number, { start: string; end: string; open: boolean }>();
    for (const h of hoursResult.data ?? []) {
      hoursByDow.set(h.day_of_week, {
        start: hhmm(h.start_time),
        end: hhmm(h.end_time),
        open: h.is_active !== false,
      });
    }

    const breaksByDow = new Map<number, BusyBlock[]>();
    for (const b of breaksResult.data ?? []) {
      const list = breaksByDow.get(b.day_of_week) ?? [];
      list.push({ start: hhmm(b.start_time), end: hhmm(b.end_time) });
      breaksByDow.set(b.day_of_week, list);
    }

    const bookedByDate = new Map<string, BusyBlock[]>();
    for (const a of bookedResult.data ?? []) {
      const key = ymd(new Date(a.scheduled_at));
      const list = bookedByDate.get(key) ?? [];
      list.push({ start: localTime(a.scheduled_at), end: localTime(a.ends_at) });
      bookedByDate.set(key, list);
    }

    const leadMinutes = profileResult.data?.booking_lead_minutes ?? 30;
    const now = new Date();
    const todayKey = ymd(now);
    const earliestToday = now.getHours() * 60 + now.getMinutes() + leadMinutes;

    const dates: Record<string, { available: boolean; slotCount: number }> = {};

    for (let i = 0; i <= days; i++) {
      const day = new Date(rangeStart.getTime() + i * 86_400_000);
      const key = ymd(day);
      const hours = hoursByDow.get(day.getDay());

      if (!hours || !hours.open) {
        dates[key] = { available: false, slotCount: 0 };
        continue;
      }

      const slots = generateSlots({
        openTime: hours.start,
        closeTime: hours.end,
        busy: [...(breaksByDow.get(day.getDay()) ?? []), ...(bookedByDate.get(key) ?? [])],
        durationMinutes: duration,
        earliestMinutes: key === todayKey ? earliestToday : 0,
      });

      dates[key] = { available: slots.length > 0, slotCount: slots.length };
    }

    sendSuccess(res, { dates, leadMinutes });
  },

  /**
   * PATCH /bookings/:id/confirm — the barber accepts.
   * For a mobile barber this approves the travel request and starts the
   * client's payment window; a travel fee may be attached.
   */
  async confirm(req: Request, res: Response) {
    const { travelFee } = req.body as { travelFee?: number };
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
    if (booking.barber_id !== req.user!.sub && booking.staff_barber_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      sendError(res, 'This booking can no longer be confirmed.');
      return;
    }

    const patch: Row = { approved_at: new Date().toISOString() };

    if (travelFee != null) {
      if (typeof travelFee !== 'number' || travelFee < 0) {
        sendError(res, 'That travel fee is not valid.');
        return;
      }
      patch.travel_fee = travelFee;
    }

    if (booking.payment_status === 'paid') {
      // Already funded — approval is the last thing standing in the way.
      patch.status = 'confirmed';
      patch.hold_expires_at = null;
    } else {
      // Hand the client a fresh window to pay now that they've been approved.
      patch.hold_expires_at = minutesFromNow(APPROVED_PAYMENT_WINDOW_MINUTES);
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(patch)
      .eq('id', booking.id)
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      console.error('[bookings] confirm failed:', error);
      sendError(res, "We couldn't confirm that booking. Please try again.", 500);
      return;
    }
    sendSuccess(res, mapBooking(data), 'Booking confirmed.');
  },

  /** PATCH /bookings/:id/decline — the barber turns the request down. */
  async decline(req: Request, res: Response) {
    const { reason } = req.body as { reason?: string };
    const supabase = getSupabase();

    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('id, barber_id, staff_barber_id, status, payment_status')
      .eq('id', req.params.id)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }
    if (booking.barber_id !== req.user!.sub && booking.staff_barber_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      sendError(res, 'This booking can no longer be declined.');
      return;
    }
    if (booking.payment_status === 'paid') {
      sendError(
        res,
        'This booking has already been paid for. Please cancel it instead so the client is refunded.',
      );
      return;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'declined',
        cancel_reason: reason?.trim() || null,
        cancelled_by: req.user!.sub,
        cancelled_at: new Date().toISOString(),
        hold_expires_at: null,
      })
      .eq('id', booking.id)
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      console.error('[bookings] decline failed:', error);
      sendError(res, "We couldn't decline that booking. Please try again.", 500);
      return;
    }
    sendSuccess(res, mapBooking(data), 'Booking declined.');
  },

  /**
   * PATCH /bookings/:id/cancel — either side calls this off.
   * A paid booking is refunded automatically.
   */
  async cancel(req: Request, res: Response) {
    const { reason } = req.body as { reason?: string };
    const supabase = getSupabase();
    const me = req.user!.sub;

    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }

    const isClient = booking.client_id === me;
    const isBarber = booking.barber_id === me || booking.staff_barber_id === me;
    if (!isClient && !isBarber) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (['completed', 'cancelled', 'declined'].includes(booking.status)) {
      sendError(res, 'This booking has already been closed.');
      return;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancel_reason: reason?.trim() || null,
        cancelled_by: me,
        cancelled_at: new Date().toISOString(),
        hold_expires_at: null,
      })
      .eq('id', booking.id)
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      console.error('[bookings] cancel failed:', error);
      sendError(res, "We couldn't cancel that booking. Please try again.", 500);
      return;
    }

    // Trimova still holds the money, so refunding is just handing it back.
    if (booking.payment_status === 'paid' && booking.payment_reference) {
      const { refundBookingPayment } = await import('./paymentController');
      await refundBookingPayment(booking);
    }

    sendSuccess(res, mapBooking(data), 'Booking cancelled.');
  },

  /**
   * PATCH /bookings/:id/start — the barber marks the client as in the chair.
   */
  async start(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('id, barber_id, staff_barber_id, status')
      .eq('id', req.params.id)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }
    if (booking.barber_id !== req.user!.sub && booking.staff_barber_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (booking.status !== 'confirmed') {
      sendError(res, 'Only a confirmed booking can be started.');
      return;
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'in_progress' })
      .eq('id', booking.id)
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      console.error('[bookings] start failed:', error);
      sendError(res, "We couldn't update that booking. Please try again.", 500);
      return;
    }
    sendSuccess(res, mapBooking(data), 'Appointment started.');
  },

  /**
   * PATCH /bookings/:id/complete — the barber finishes the job, which
   * releases the held funds to them.
   */
  async complete(req: Request, res: Response) {
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
    if (booking.barber_id !== req.user!.sub && booking.staff_barber_id !== req.user!.sub) {
      sendError(res, 'You do not have access to this booking.', 403);
      return;
    }
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      sendError(res, 'Only a confirmed booking can be completed.');
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: now,
        // Escrow ends here: the money stops being the client's.
        ...(booking.payment_status === 'paid' ? { released_at: now } : {}),
      })
      .eq('id', booking.id)
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      console.error('[bookings] complete failed:', error);
      sendError(res, "We couldn't complete that booking. Please try again.", 500);
      return;
    }

    if (booking.payment_status === 'paid') {
      const { recordPayoutForBooking } = await import('./paymentController');
      await recordPayoutForBooking(booking);
    }

    sendSuccess(res, mapBooking(data), 'Appointment completed.');
  },
};
