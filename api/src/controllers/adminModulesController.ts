import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { runDetection, mapFlag } from '../utils/detection';
import { invalidateSettingsCache } from '../utils/settings';
import { notify } from '../utils/notify';

/**
 * The admin panel's Security, Moderation, Settings and Notifications screens.
 *
 * Kept apart from adminController, which covers the dashboard, users, finance
 * and bookings — that file was getting long enough to be hard to navigate.
 */

type Row = Record<string, any>;

const num = (v: unknown) => parseFloat(String(v)) || 0;

const FLAG_SELECT = `
  *,
  subject:subject_id (id, full_name, role, email),
  counterpart:counterpart_id (id, full_name, role, email)
`;

export const adminModulesController = {
  // ─── Security ──────────────────────────────────────────────────────────

  /** GET /admin/flags?status=pending|cleared|action_taken|all */
  async listFlags(req: Request, res: Response) {
    const status = String(req.query.status ?? 'pending');
    const supabase = getSupabase();

    let query = supabase.from('suspicious_flags').select(FLAG_SELECT, { count: 'exact' });
    if (status !== 'all') query = query.eq('status', status);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[admin] listFlags failed:', error);
      sendError(res, "We couldn't load the security queue. Please try again.", 500);
      return;
    }

    // Counts per status so the tabs can carry badges.
    const [pending, cleared, actioned] = await Promise.all([
      supabase.from('suspicious_flags').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('suspicious_flags').select('id', { count: 'exact', head: true }).eq('status', 'cleared'),
      supabase.from('suspicious_flags').select('id', { count: 'exact', head: true }).eq('status', 'action_taken'),
    ]);

    sendSuccess(res, {
      items: (data ?? []).map(mapFlag),
      total: count ?? 0,
      counts: {
        pending: pending.count ?? 0,
        cleared: cleared.count ?? 0,
        action_taken: actioned.count ?? 0,
      },
    });
  },

  /** POST /admin/flags/scan — run the detector on demand. */
  async scanForFlags(_req: Request, res: Response) {
    const result = await runDetection();
    sendSuccess(
      res,
      result,
      result.created > 0
        ? `${result.created} new flag${result.created === 1 ? '' : 's'} raised.`
        : 'Scan complete — nothing new.',
    );
  },

  /** PATCH /admin/flags/:id — clear it, or record that action was taken. */
  async resolveFlag(req: Request, res: Response) {
    const { status, note } = req.body as { status?: string; note?: string };

    if (!status || !['cleared', 'action_taken', 'pending'].includes(status)) {
      sendError(res, 'That status is not valid.');
      return;
    }

    const { data, error } = await getSupabase()
      .from('suspicious_flags')
      .update({
        status,
        resolution_note: note?.trim() || null,
        // Reopening clears the audit fields; resolving stamps them.
        resolved_by: status === 'pending' ? null : req.user!.sub,
        resolved_at: status === 'pending' ? null : new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select(FLAG_SELECT)
      .single();

    if (error || !data) {
      console.error('[admin] resolveFlag failed:', error);
      sendError(res, "We couldn't update that flag. Please try again.", 500);
      return;
    }
    sendSuccess(res, mapFlag(data), status === 'cleared' ? 'Flag cleared.' : 'Flag updated.');
  },

  // ─── Moderation ────────────────────────────────────────────────────────

  /** GET /admin/reviews?filter=reported|hidden|all */
  async listReviews(req: Request, res: Response) {
    const filter = String(req.query.filter ?? 'reported');
    const supabase = getSupabase();

    let query = supabase.from('reviews').select(
      `*,
       client:client_id (id, full_name, avatar_url),
       barber:barber_id (id, full_name),
       staff:staff_barber_id (id, full_name)`,
      { count: 'exact' },
    );

    if (filter === 'reported') {
      query = query.not('reported_at', 'is', null).is('report_cleared_at', null).is('hidden_at', null);
    } else if (filter === 'hidden') {
      query = query.not('hidden_at', 'is', null);
    }

    const { data, error, count } = await query
      .order('reported_at', { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) {
      console.error('[admin] listReviews failed:', error);
      sendError(res, "We couldn't load the moderation queue. Please try again.", 500);
      return;
    }

    const [reported, hidden] = await Promise.all([
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .not('reported_at', 'is', null)
        .is('report_cleared_at', null)
        .is('hidden_at', null),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).not('hidden_at', 'is', null),
    ]);

    const one = (r: unknown) => (Array.isArray(r) ? r[0] : r) as Row | null;

    sendSuccess(res, {
      items: (data ?? []).map((r: Row) => {
        const client = one(r.client);
        const barber = one(r.barber);
        const staff = one(r.staff);
        return {
          id: r.id,
          rating: Number(r.rating),
          comment: r.comment ?? '',
          author_name: client?.full_name ?? 'A client',
          author_id: r.client_id,
          author_avatar_url: client?.avatar_url ?? null,
          about_name: staff?.full_name ?? barber?.full_name ?? '—',
          about_id: r.staff_barber_id ?? r.barber_id,
          reported_at: r.reported_at ?? null,
          report_reason: r.report_reason ?? null,
          hidden_at: r.hidden_at ?? null,
          hidden_reason: r.hidden_reason ?? null,
          created_at: r.created_at,
        };
      }),
      total: count ?? 0,
      counts: { reported: reported.count ?? 0, hidden: hidden.count ?? 0 },
    });
  },

  /**
   * PATCH /admin/reviews/:id — the three moderator actions.
   *
   *   dismiss → the report was unfounded; the review stays public
   *   remove  → soft-hide it; the row survives for the audit trail
   *   warn    → notify the author, leave the review in place
   */
  async moderateReview(req: Request, res: Response) {
    const { action, reason } = req.body as { action?: string; reason?: string };
    const supabase = getSupabase();

    const { data: review, error: findError } = await supabase
      .from('reviews')
      .select('*, client:client_id (id, full_name)')
      .eq('id', req.params.id)
      .single();

    if (findError || !review) {
      sendError(res, 'That review could not be found.', 404);
      return;
    }

    const now = new Date().toISOString();
    let patch: Row = {};
    let message = '';

    switch (action) {
      case 'dismiss':
        patch = { report_cleared_at: now, moderated_by: req.user!.sub };
        message = 'Report dismissed — the review stays visible.';
        break;

      case 'remove':
        // Soft delete. The row stays so the rating history and the audit trail
        // remain intact; the trigger recomputes the barber's average without it.
        patch = {
          hidden_at: now,
          hidden_reason: reason?.trim() || 'Removed by a moderator',
          moderated_by: req.user!.sub,
        };
        message = 'Review removed from public view.';
        break;

      case 'restore':
        patch = { hidden_at: null, hidden_reason: null, moderated_by: req.user!.sub };
        message = 'Review restored.';
        break;

      case 'warn':
        patch = { report_cleared_at: now, moderated_by: req.user!.sub };
        message = 'Warning sent to the author.';
        break;

      default:
        sendError(res, 'That moderation action is not valid.');
        return;
    }

    const { error } = await supabase.from('reviews').update(patch).eq('id', review.id);

    if (error) {
      console.error('[admin] moderateReview failed:', error);
      sendError(res, "We couldn't apply that. Please try again.", 500);
      return;
    }

    if (action === 'warn') {
      await notify({
        userId: review.client_id as string,
        type: 'system',
        title: 'About one of your reviews',
        body:
          reason?.trim() ||
          'A review you left has been reported. Please keep reviews factual and respectful — repeated reports may affect your account.',
      });
    }

    if (action === 'remove') {
      await notify({
        userId: review.client_id as string,
        type: 'system',
        title: 'A review was removed',
        body:
          reason?.trim() ||
          "One of your reviews was removed because it didn't meet our community guidelines.",
      });
    }

    sendSuccess(res, null, message);
  },

  // ─── Settings ──────────────────────────────────────────────────────────

  /** GET /admin/settings */
  async getSettings(_req: Request, res: Response) {
    const supabase = getSupabase();

    const [{ data: settings }, { data: tiers }] = await Promise.all([
      supabase.from('platform_settings').select('*').eq('id', true).maybeSingle(),
      supabase.from('commission_tiers').select('*').order('sort_order', { ascending: true }),
    ]);

    sendSuccess(res, {
      commission_percent: num(settings?.commission_percent) || 10,
      confirmation_window_hours: settings?.confirmation_window_hours ?? 12,
      free_cancel_hours: settings?.free_cancel_hours ?? 3,
      half_fee_hours: settings?.half_fee_hours ?? 1,
      request_expiry_minutes: settings?.request_expiry_minutes ?? 120,
      tier_window_days: settings?.tier_window_days ?? 90,
      tiers: (tiers ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        booking_threshold: t.booking_threshold,
        commission_rate: num(t.commission_rate),
      })),
    });
  },

  /** PUT /admin/settings */
  async updateSettings(req: Request, res: Response) {
    const body = req.body as Row;
    const supabase = getSupabase();

    const patch: Row = {};
    const numeric: [string, number, number][] = [
      ['commission_percent', 0, 50],
      ['confirmation_window_hours', 0, 168],
      ['free_cancel_hours', 0, 168],
      ['half_fee_hours', 0, 168],
      ['request_expiry_minutes', 5, 10_080],
      ['tier_window_days', 7, 365],
    ];

    for (const [field, min, max] of numeric) {
      if (body[field] === undefined) continue;
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < min || value > max) {
        sendError(res, `${field.replace(/_/g, ' ')} must be between ${min} and ${max}.`);
        return;
      }
      patch[field] = value;
    }

    // The free window has to sit above the half-fee one, or the policy
    // contradicts itself and a client gets charged more for cancelling earlier.
    const free = patch.free_cancel_hours ?? body.free_cancel_hours;
    const half = patch.half_fee_hours ?? body.half_fee_hours;
    if (free !== undefined && half !== undefined && Number(free) <= Number(half)) {
      sendError(res, 'The free-cancellation window must be longer than the half-fee window.');
      return;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from('platform_settings').update(patch).eq('id', true);
      if (error) {
        console.error('[admin] updateSettings failed:', error);
        sendError(res, "We couldn't save those settings. Please try again.", 500);
        return;
      }
    }

    // Tiers, when supplied.
    if (Array.isArray(body.tiers)) {
      for (const tier of body.tiers as Row[]) {
        if (!tier.id) continue;
        const threshold = Number(tier.booking_threshold);
        const rate = Number(tier.commission_rate);
        if (!Number.isFinite(threshold) || threshold < 0) {
          sendError(res, 'A booking threshold must be zero or more.');
          return;
        }
        if (!Number.isFinite(rate) || rate < 0 || rate > 50) {
          sendError(res, 'A commission rate must be between 0 and 50 percent.');
          return;
        }
        await supabase
          .from('commission_tiers')
          .update({ booking_threshold: threshold, commission_rate: rate })
          .eq('id', tier.id);
      }
    }

    // The API caches settings for a minute; drop it so the next booking uses
    // the new numbers immediately.
    invalidateSettingsCache();

    await adminModulesController.getSettings(req, res);
  },

  // ─── Notifications ─────────────────────────────────────────────────────

  /** GET /admin/notifications — what the platform has been telling people. */
  async listNotifications(req: Request, res: Response) {
    const type = String(req.query.type ?? 'all');
    const supabase = getSupabase();

    let query = supabase
      .from('notifications')
      .select('*, user:user_id (id, full_name, role)', { count: 'exact' });

    if (type !== 'all') query = query.eq('type', type);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[admin] listNotifications failed:', error);
      sendError(res, "We couldn't load notifications. Please try again.", 500);
      return;
    }

    const { data: announcements } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const one = (r: unknown) => (Array.isArray(r) ? r[0] : r) as Row | null;

    sendSuccess(res, {
      items: (data ?? []).map((n: Row) => {
        const user = one(n.user);
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          booking_id: n.booking_id ?? null,
          read_at: n.read_at ?? null,
          created_at: n.created_at,
          recipient_name: user?.full_name ?? 'Unknown',
          recipient_role: user?.role ?? null,
        };
      }),
      total: count ?? 0,
      announcements: (announcements ?? []).map((a) => ({
        id: a.id,
        audience: a.audience,
        title: a.title,
        body: a.body,
        recipients: a.recipients,
        created_at: a.created_at,
      })),
    });
  },

  /** POST /admin/notifications/announce — broadcast a system message. */
  async announce(req: Request, res: Response) {
    const { audience, title, body, targetUserId } = req.body as {
      audience?: string;
      title?: string;
      body?: string;
      targetUserId?: string;
    };

    if (!title?.trim() || !body?.trim()) {
      sendError(res, 'A title and message are required.');
      return;
    }
    const validAudiences = ['all', 'client', 'barber', 'staff_barber', 'user'];
    if (!audience || !validAudiences.includes(audience)) {
      sendError(res, 'Choose who this should go to.');
      return;
    }
    if (audience === 'user' && !targetUserId) {
      sendError(res, 'Choose which person this should go to.');
      return;
    }

    const supabase = getSupabase();

    // Resolve the audience to concrete recipients.
    let recipientIds: string[] = [];
    if (audience === 'user') {
      recipientIds = [targetUserId!];
    } else {
      let query = supabase.from('users').select('id').eq('is_active', true);
      if (audience === 'all') query = query.neq('role', 'admin');
      else query = query.eq('role', audience);

      const { data: users, error } = await query;
      if (error) {
        console.error('[admin] announce lookup failed:', error);
        sendError(res, "We couldn't work out who to send that to. Please try again.", 500);
        return;
      }
      recipientIds = (users ?? []).map((u) => u.id as string);
    }

    if (recipientIds.length === 0) {
      sendError(res, 'Nobody matches that audience yet.');
      return;
    }

    // One insert rather than one per person — this can be thousands of rows.
    const { error: insertError } = await supabase.from('notifications').insert(
      recipientIds.map((userId) => ({
        user_id: userId,
        type: 'system',
        title: title.trim(),
        body: body.trim(),
      })),
    );

    if (insertError) {
      console.error('[admin] announce insert failed:', insertError);
      sendError(res, "We couldn't send that announcement. Please try again.", 500);
      return;
    }

    await supabase.from('announcements').insert({
      sent_by: req.user!.sub,
      audience,
      target_user: audience === 'user' ? targetUserId : null,
      title: title.trim(),
      body: body.trim(),
      recipients: recipientIds.length,
    });

    sendSuccess(
      res,
      { recipients: recipientIds.length },
      `Sent to ${recipientIds.length} ${recipientIds.length === 1 ? 'person' : 'people'}.`,
    );
  },
};
