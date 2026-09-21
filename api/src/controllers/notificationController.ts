import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';

/** A user's own notifications. Everything here is scoped to req.user.sub. */
export const notificationController = {
  /** GET /notifications?unread=true */
  async list(req: Request, res: Response) {
    const supabase = getSupabase();
    const unreadOnly = req.query.unread === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.sub);

    if (unreadOnly) query = query.is('read_at', null);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[notifications] list failed:', error);
      sendError(res, "We couldn't load your notifications. Please try again.", 500);
      return;
    }

    sendSuccess(
      res,
      (data ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        bookingId: n.booking_id ?? null,
        readAt: n.read_at ?? null,
        createdAt: n.created_at,
      })),
    );
  },

  /** GET /notifications/unread-count — drives the bell badge. */
  async unreadCount(req: Request, res: Response) {
    const { count, error } = await getSupabase()
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.user!.sub)
      .is('read_at', null);

    if (error) {
      console.error('[notifications] unreadCount failed:', error);
      // A badge is not worth an error state — report zero and move on.
      sendSuccess(res, { count: 0 });
      return;
    }
    sendSuccess(res, { count: count ?? 0 });
  },

  /** PATCH /notifications/:id/read */
  async markRead(req: Request, res: Response) {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.sub)
      .is('read_at', null);

    if (error) {
      console.error('[notifications] markRead failed:', error);
      sendError(res, "We couldn't update that notification. Please try again.", 500);
      return;
    }
    sendSuccess(res, null);
  },

  /** PATCH /notifications/read-all */
  async markAllRead(req: Request, res: Response) {
    const { error } = await getSupabase()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user!.sub)
      .is('read_at', null);

    if (error) {
      console.error('[notifications] markAllRead failed:', error);
      sendError(res, "We couldn't update your notifications. Please try again.", 500);
      return;
    }
    sendSuccess(res, null, 'All caught up.');
  },
};
