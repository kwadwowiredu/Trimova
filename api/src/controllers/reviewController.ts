import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { notify } from '../utils/notify';

/**
 * Reviews.
 *
 * A review must be earned: it can only be written by the client on a
 * completed appointment, and only once. That makes the aggregate rating on a
 * barber's profile something a client can actually trust.
 */

type Row = Record<string, any>;

function one(rel: unknown): Row | null {
  if (Array.isArray(rel)) return (rel[0] as Row) ?? null;
  return (rel as Row) ?? null;
}

function mapReview(row: Row) {
  const client = one(row.client);
  const staff = one(row.staff);
  return {
    id: row.id,
    bookingId: row.appointment_id,
    rating: Number(row.rating),
    comment: row.comment ?? '',
    clientName: client?.full_name ?? 'A client',
    clientAvatarUrl: client?.avatar_url ?? null,
    staffId: row.staff_barber_id ?? null,
    staffName: staff?.full_name ?? null,
    createdAt: row.created_at,
  };
}

const SELECT_WITH_PEOPLE = `
  *,
  client:client_id (id, full_name, avatar_url),
  staff:staff_barber_id (id, full_name)
`;

export const reviewController = {
  /**
   * GET /barbers/:id/staff
   * The shop's roster, as a client sees it when choosing who cuts their hair.
   * Public, and limited to what a client needs — no contact details.
   */
  async listStaff(req: Request, res: Response) {
    const supabase = getSupabase();

    // A staff member's profile points at the shop owner via owner_id.
    const { data, error } = await supabase
      .from('barber_profiles')
      .select(`
        user_id, rating, review_count, is_available, is_bookable,
        user:user_id (id, full_name, avatar_url, is_active)
      `)
      .eq('owner_id', req.params.id);

    if (error) {
      console.error('[reviews] listStaff failed:', error);
      sendError(res, "We couldn't load this shop's team. Please try again.", 500);
      return;
    }

    const roster = (data ?? [])
      .map((row: Row) => {
        const user = one(row.user);
        if (!user || user.is_active === false) return null;
        return {
          id: row.user_id,
          name: user.full_name,
          role: 'Staff Barber',
          avatarUrl: user.avatar_url ?? null,
          rating: parseFloat(String(row.rating)) || 0,
          reviewCount: Number(row.review_count) || 0,
          isAvailable: row.is_available !== false,
        };
      })
      // A deactivated account shouldn't be bookable.
      .filter((s): s is NonNullable<typeof s> => s !== null);

    sendSuccess(res, roster);
  },

  /**
   * GET /barbers/:id/reviews?staffId=
   * Public — a client compares barbers before signing in.
   */
  async listForBarber(req: Request, res: Response) {
    const { staffId } = req.query as Record<string, string>;
    const supabase = getSupabase();

    let query = supabase
      .from('reviews')
      .select(SELECT_WITH_PEOPLE)
      .eq('barber_id', req.params.id)
      // Removed reviews stay in the table for the audit trail but leave the
      // public listing.
      .is('hidden_at', null);

    if (staffId) query = query.eq('staff_barber_id', staffId);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[reviews] listForBarber failed:', error);
      sendError(res, "We couldn't load reviews right now. Please try again.", 500);
      return;
    }
    sendSuccess(res, (data ?? []).map(mapReview));
  },

  /** GET /reviews/me — what this client has written. */
  async listMine(req: Request, res: Response) {
    const { data, error } = await getSupabase()
      .from('reviews')
      .select(SELECT_WITH_PEOPLE)
      .eq('client_id', req.user!.sub)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[reviews] listMine failed:', error);
      sendError(res, "We couldn't load your reviews. Please try again.", 500);
      return;
    }
    sendSuccess(res, (data ?? []).map(mapReview));
  },

  /** POST /reviews — one per completed appointment. */
  async create(req: Request, res: Response) {
    const { bookingId, rating, comment } = req.body as {
      bookingId?: string;
      rating?: number;
      comment?: string;
    };

    if (!bookingId || rating == null) {
      sendError(res, 'Please choose a rating.');
      return;
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      sendError(res, 'A rating must be between 1 and 5 stars.');
      return;
    }

    const supabase = getSupabase();

    const { data: booking, error: findError } = await supabase
      .from('appointments')
      .select('id, client_id, barber_id, staff_barber_id, status, service_name')
      .eq('id', bookingId)
      .single();

    if (findError || !booking) {
      sendError(res, 'That booking could not be found.', 404);
      return;
    }
    if (booking.client_id !== req.user!.sub) {
      sendError(res, 'You can only review your own appointments.', 403);
      return;
    }
    if (booking.status !== 'completed') {
      sendError(res, 'You can review an appointment once it has been completed.');
      return;
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        appointment_id: booking.id,
        client_id: booking.client_id,
        barber_id: booking.barber_id,
        staff_barber_id: booking.staff_barber_id,
        rating,
        comment: comment?.trim() || null,
      })
      .select(SELECT_WITH_PEOPLE)
      .single();

    if (error || !data) {
      // The unique constraint on appointment_id is what enforces "one review".
      if (error?.code === '23505') {
        sendError(res, "You've already reviewed this appointment.");
        return;
      }
      console.error('[reviews] create failed:', error);
      sendError(res, "We couldn't save your review. Please try again.", 500);
      return;
    }

    const review = mapReview(data);
    await notify({
      userId: (booking.staff_barber_id as string) ?? (booking.barber_id as string),
      type: 'system',
      title: `New ${rating}-star review`,
      body: `${review.clientName} reviewed your ${booking.service_name}.${
        review.comment ? ` "${review.comment}"` : ''
      }`,
      bookingId: booking.id,
    });

    sendSuccess(res, review, 'Thanks for your review.', 201);
  },

  /**
   * POST /reviews/:id/report — flag a review for a moderator.
   *
   * Anyone signed in can report; the barber being reviewed is usually the one
   * who notices. Reporting hides nothing on its own — a moderator decides.
   */
  async report(req: Request, res: Response) {
    const { reason } = req.body as { reason?: string };
    const supabase = getSupabase();

    const { data: review, error: findError } = await supabase
      .from('reviews')
      .select('id, client_id, reported_at')
      .eq('id', req.params.id)
      .single();

    if (findError || !review) {
      sendError(res, 'That review could not be found.', 404);
      return;
    }
    if (review.client_id === req.user!.sub) {
      sendError(res, 'You can delete your own review rather than reporting it.');
      return;
    }
    if (review.reported_at) {
      sendSuccess(res, null, "Thanks — this review is already with our moderators.");
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .update({
        reported_at: new Date().toISOString(),
        reported_by: req.user!.sub,
        report_reason: reason?.trim() || 'Reported as inappropriate',
      })
      .eq('id', review.id);

    if (error) {
      console.error('[reviews] report failed:', error);
      sendError(res, "We couldn't submit that report. Please try again.", 500);
      return;
    }
    sendSuccess(res, null, "Thanks — our moderators will take a look.");
  },

  /** DELETE /reviews/:id — a client may withdraw their own review. */
  async remove(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', req.user!.sub)
      .select('id');

    if (error || !data || data.length === 0) {
      sendError(res, "We couldn't remove that review.", 404);
      return;
    }
    sendSuccess(res, null, 'Review removed.');
  },
};
