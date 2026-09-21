import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes, randomInt } from 'crypto';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { sendEmail, staffInviteEmail } from '../utils/email';
import type { UserRole } from '../types/index';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
const INVITE_TTL_DAYS = 7;

/** Escape user-supplied text before it goes into the invite landing page. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Where this API is reachable from a phone's browser. The invite email links
 * here rather than at a custom scheme, because mail clients drop those.
 */
function invitePageUrl(token: string): string {
  const base = (process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 3000}`)
    .replace(/\/$/, '');
  return `${base}/api/staff/invites/open?token=${encodeURIComponent(token)}`;
}

function signToken(userId: string, role: UserRole, email: string): string {
  return jwt.sign(
    { sub: userId, role, email },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] },
  );
}

/**
 * Short, human-readable invite code — e.g. "TRV-8F42-QK".
 * Ambiguous characters (0/O, 1/I) are excluded so it can be read aloud.
 */
function makeCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `TRV-${pick(4)}-${pick(2)}`;
}

/** Shape returned to the shop owner. Never exposes the long token. */
function formatInvite(row: Record<string, unknown>) {
  const accepted = !!row.accepted_at;
  const revoked = !!row.revoked_at;
  const expired = !accepted && !revoked && new Date(row.expires_at as string) < new Date();
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? null,
    code: row.code,
    status: accepted ? 'accepted' : revoked ? 'revoked' : expired ? 'expired' : 'pending',
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? null,
    createdAt: row.created_at,
  };
}

export const staffController = {
  /** POST /api/staff/invites — owner invites a staff barber. */
  async createInvite(req: Request, res: Response) {
    const ownerId = req.user!.sub;
    const { fullName, email, phone } = req.body as {
      fullName?: string; email?: string; phone?: string;
    };

    if (!fullName?.trim() || !email?.trim()) {
      sendError(res, 'Full name and email are required.');
      return;
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      sendError(res, 'Enter a valid email address.');
      return;
    }

    const supabase = getSupabase();

    // Owners can't invite themselves.
    const { data: owner } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', ownerId)
      .single();
    if (!owner) { sendError(res, 'Owner not found.', 404); return; }
    if ((owner.email as string).toLowerCase() === cleanEmail) {
      sendError(res, "That's your own email address.");
      return;
    }

    // An address already tied to an account can't be re-invited.
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (existingUser) {
      sendError(res, 'Someone already uses that email on Trimova. Ask them to sign in instead.', 409);
      return;
    }

    // Replace any previous live invite for this person (partial unique index).
    await supabase
      .from('staff_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .ilike('email', cleanEmail)
      .is('accepted_at', null)
      .is('revoked_at', null);

    const token = randomBytes(32).toString('hex');
    const code = makeCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);

    const { data: invite, error } = await supabase
      .from('staff_invites')
      .insert({
        owner_id: ownerId,
        email: cleanEmail,
        full_name: fullName.trim(),
        phone: phone?.trim() ?? null,
        token,
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error || !invite) {
      // Full technical detail goes to the server log for us; the barber sees
      // plain language. (The usual cause is migration 010 not having been run,
      // which shows up here as a missing-relation error.)
      const detail = (error as { message?: string; code?: string } | null)?.message ?? '';
      const missingTable = /relation .*staff_invites.* does not exist|schema cache/i.test(detail);
      console.error(
        missingTable
          ? '[createInvite] staff_invites table missing — run database/010_staff_invites.sql'
          : '[createInvite] insert failed:',
        error,
      );
      sendError(res, "We couldn't send that invitation right now. Please try again in a moment.", 500);
      return;
    }

    // Shop name for the email body.
    const { data: profile } = await supabase
      .from('barber_profiles')
      .select('business_name')
      .eq('user_id', ownerId)
      .maybeSingle();

    const mail = staffInviteEmail({
      staffName: fullName.trim(),
      shopName: (profile?.business_name as string) || 'the team',
      ownerName: (owner.full_name as string) || 'The owner',
      joinUrl: invitePageUrl(token),
      expiresInDays: INVITE_TTL_DAYS,
    });
    const delivery = await sendEmail({ to: cleanEmail, ...mail });

    sendSuccess(
      res,
      { invite: formatInvite(invite), emailSent: delivery.sent, emailSimulated: delivery.simulated },
      delivery.sent
        ? 'Invitation email sent.'
        : 'Invitation created, but the email could not be sent. Check the server logs.',
      201,
    );
  },

  /** POST /api/staff/invites/:id/resend — send the same invite email again. */
  async resendInvite(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data: invite } = await supabase
      .from('staff_invites')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user!.sub)
      .maybeSingle();

    if (!invite)            { sendError(res, 'Invitation not found.', 404); return; }
    if (invite.accepted_at) { sendError(res, 'That invitation has already been used.', 410); return; }
    if (invite.revoked_at)  { sendError(res, 'That invitation has been revoked.', 410); return; }

    // Push the expiry out so a resend is actually useful.
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
    await supabase
      .from('staff_invites')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('id', invite.id);

    const [{ data: owner }, { data: profile }] = await Promise.all([
      supabase.from('users').select('full_name').eq('id', req.user!.sub).single(),
      supabase.from('barber_profiles').select('business_name').eq('user_id', req.user!.sub).maybeSingle(),
    ]);

    const mail = staffInviteEmail({
      staffName: invite.full_name as string,
      shopName: (profile?.business_name as string) || 'the team',
      ownerName: (owner?.full_name as string) || 'The owner',
      joinUrl: invitePageUrl(invite.token),
      expiresInDays: INVITE_TTL_DAYS,
    });
    const delivery = await sendEmail({ to: invite.email as string, ...mail });

    sendSuccess(
      res,
      { emailSent: delivery.sent, emailSimulated: delivery.simulated },
      delivery.sent ? 'Invitation email resent.' : 'Email is not configured — check the server logs.',
    );
  },

  /** GET /api/staff/invites — every invite this owner has sent. */
  async listInvites(req: Request, res: Response) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('staff_invites')
      .select('*')
      .eq('owner_id', req.user!.sub)
      .order('created_at', { ascending: false });

    if (error) { sendError(res, 'Failed to load invitations.', 500); return; }
    sendSuccess(res, (data ?? []).map(formatInvite));
  },

  /** DELETE /api/staff/invites/:id — owner revokes a pending invite. */
  async revokeInvite(req: Request, res: Response) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('staff_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('owner_id', req.user!.sub)   // ownership check — can't revoke others'
      .is('accepted_at', null);

    if (error) { sendError(res, 'Failed to revoke the invitation.', 500); return; }
    sendSuccess(res, null, 'Invitation revoked.');
  },

  /**
   * GET /api/staff/invites/lookup?code=... | ?token=...
   * PUBLIC — lets the app show "You're joining <Shop> as <Name>" before signup.
   * Returns only what's needed to render that screen.
   */
  async lookupInvite(req: Request, res: Response) {
    const { code, token } = req.query as Record<string, string>;
    if (!code && !token) { sendError(res, 'An invite code or token is required.'); return; }

    const supabase = getSupabase();
    const query = supabase.from('staff_invites').select('*');
    const { data: invite } = token
      ? await query.eq('token', token).maybeSingle()
      : await query.eq('code', code.trim().toUpperCase()).maybeSingle();

    if (!invite)                       { sendError(res, 'That invitation could not be found.', 404); return; }
    if (invite.revoked_at)             { sendError(res, 'That invitation has been revoked.', 410); return; }
    if (invite.accepted_at)            { sendError(res, 'That invitation has already been used.', 410); return; }
    if (new Date(invite.expires_at) < new Date()) {
      sendError(res, 'That invitation has expired. Ask the shop to send a new one.', 410);
      return;
    }

    const { data: profile } = await supabase
      .from('barber_profiles')
      .select('business_name')
      .eq('user_id', invite.owner_id)
      .maybeSingle();

    sendSuccess(res, {
      fullName: invite.full_name,
      email: invite.email,
      shopName: (profile?.business_name as string) || 'the shop',
      expiresAt: invite.expires_at,
    });
  },

  /**
   * POST /api/staff/invites/accept — redeem an invite and create the account.
   * PUBLIC. The invite is bound to an email, so a leaked code alone is useless:
   * the caller must also know (and sign up with) that exact address.
   */
  async acceptInvite(req: Request, res: Response) {
    const { code, token, email, password } = req.body as {
      code?: string; token?: string; email?: string; password?: string;
    };

    if ((!code && !token) || !email || !password) {
      sendError(res, 'Invite code, email and password are required.');
      return;
    }
    if (password.length < 8) {
      sendError(res, 'Password must be at least 8 characters.');
      return;
    }

    const supabase = getSupabase();
    const query = supabase.from('staff_invites').select('*');
    const { data: invite } = token
      ? await query.eq('token', token).maybeSingle()
      : await query.eq('code', code!.trim().toUpperCase()).maybeSingle();

    if (!invite)            { sendError(res, 'That invitation could not be found.', 404); return; }
    if (invite.revoked_at)  { sendError(res, 'That invitation has been revoked.', 410); return; }
    if (invite.accepted_at) { sendError(res, 'That invitation has already been used.', 410); return; }
    if (new Date(invite.expires_at) < new Date()) {
      sendError(res, 'That invitation has expired. Ask the shop to send a new one.', 410);
      return;
    }

    // THE BINDING CHECK — the whole security model rests on this line.
    if ((invite.email as string).toLowerCase() !== email.toLowerCase().trim()) {
      sendError(res, 'This invitation was issued to a different email address.', 403);
      return;
    }

    const { data: taken } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (taken) { sendError(res, 'An account with this email already exists.', 409); return; }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({
        full_name: invite.full_name,
        email: email.toLowerCase().trim(),
        phone: invite.phone,
        password_hash: passwordHash,
        role: 'staff_barber',
        role_selected: true,        // role comes from the invite, not a choice
      })
      .select()
      .single();

    if (userErr || !user) {
      console.error('[acceptInvite] user insert failed:', userErr);
      sendError(res, 'Failed to create your account. Please try again.', 500);
      return;
    }

    // Link the staff barber to the shop that invited them.
    await supabase.from('barber_profiles').insert({
      user_id: user.id,
      owner_id: invite.owner_id,
      onboarding_complete: true,   // the shop already supplies the business details
    });

    await supabase
      .from('staff_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id);

    const authToken = signToken(user.id, user.role, user.email);
    sendSuccess(
      res,
      {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
          roleSelected: true,
          ownerId: invite.owner_id,
        },
      },
      'Welcome to the team!',
      201,
    );
  },

  /**
   * GET /staff/invites/open?token=…
   *
   * The landing page an invite email links to.
   *
   * Emailing a raw `exp://` or `trimova://` link doesn't work: mail clients
   * strip or rewrite unknown schemes, so the button does nothing and the
   * fallback link lands somewhere meaningless. An ordinary http(s) link always
   * survives — and a custom scheme fired from a page the user already opened
   * does reach the app.
   */
  async openInvite(req: Request, res: Response) {
    const token = String(req.query.token ?? '');
    const deepLink = `${process.env.APP_URL ?? 'trimova://'}join-staff?token=${encodeURIComponent(token)}`;

    const supabase = getSupabase();
    const { data: invite } = token
      ? await supabase
          .from('staff_invites')
          .select('full_name, email, status, expires_at, owner:owner_id (full_name)')
          .eq('token', token)
          .maybeSingle()
      : { data: null };

    const owner = Array.isArray(invite?.owner) ? invite?.owner[0] : invite?.owner;
    const expired = invite?.expires_at ? new Date(invite.expires_at) < new Date() : false;
    const usable = Boolean(invite) && invite!.status === 'pending' && !expired;

    const body = !invite
      ? `<h1>This invitation link isn't valid</h1>
         <p>It may have been revoked, or the link may have been copied incompletely. Ask whoever invited you to send a new one.</p>`
      : !usable
        ? `<h1>This invitation has ${expired ? 'expired' : 'already been used'}</h1>
           <p>Ask ${escapeHtml(owner?.full_name ?? 'the shop owner')} to send you a fresh invitation.</p>`
        : `<h1>You've been invited to join ${escapeHtml(owner?.full_name ?? 'a shop')}</h1>
           <p>Hi ${escapeHtml(invite!.full_name as string)} — open this on the phone where you have Trimova installed, then tap below.</p>
           <p><a class="btn" href="${escapeHtml(deepLink)}">Open in Trimova</a></p>
           <p class="hint">Nothing happened? Open Trimova yourself and paste this code on the sign-in screen:</p>
           <div class="code">${escapeHtml(token)}</div>
           <p class="hint">This invitation only works with <strong>${escapeHtml(invite!.email as string)}</strong>.</p>`;

    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Join your team on Trimova</title>
  <style>
    body { margin:0; padding:32px 20px; background:#f9f9ff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#161c27; }
    .card { max-width:520px; margin:0 auto; background:#fff; border:1px solid #E2E8F8; border-radius:18px; padding:28px; }
    .brand { font-size:20px; font-weight:800; letter-spacing:-0.3px; margin-bottom:18px; }
    h1 { font-size:21px; margin:0 0 14px; }
    p { font-size:15px; line-height:22px; color:#464554; margin:0 0 16px; }
    .btn { display:inline-block; background:#023047; color:#fff; text-decoration:none; font-weight:700; padding:14px 28px; border-radius:12px; }
    .hint { font-size:13px; color:#8a89a3; }
    .code { font-family:ui-monospace,Menlo,monospace; font-size:13px; background:#f1f3ff; border:1px solid #E2E8F8; border-radius:10px; padding:12px 14px; word-break:break-all; margin-bottom:16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Trimova</div>
    ${body}
  </div>
</body>
</html>`);
  },

  /**
   * GET /staff/roster — the shop owner's own team, with real performance.
   *
   * Richer than the public /barbers/:id/staff view: an owner needs contact
   * details and this month's numbers, which a browsing client has no business
   * seeing. Every figure is derived from appointments, so it can't go stale.
   */
  async roster(req: Request, res: Response) {
    const supabase = getSupabase();
    const ownerId = req.user!.sub;

    const { data: profiles, error } = await supabase
      .from('barber_profiles')
      .select(`
        user_id, rating, review_count, is_available, created_at,
        user:user_id (id, full_name, email, phone, avatar_url, is_active, created_at)
      `)
      .eq('owner_id', ownerId);

    if (error) {
      console.error('[staff] roster failed:', error);
      sendError(res, "We couldn't load your team. Please try again.", 500);
      return;
    }

    const members = (profiles ?? []).filter((p: Record<string, any>) => {
      const user = Array.isArray(p.user) ? p.user[0] : p.user;
      return user && user.is_active !== false;
    });

    if (members.length === 0) {
      sendSuccess(res, []);
      return;
    }

    // One query for everyone's appointments beats one query per barber.
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const staffIds = members.map((m: Record<string, any>) => m.user_id);
    const { data: appointments } = await supabase
      .from('appointments')
      .select('staff_barber_id, status, service_price, travel_fee, completed_at')
      .in('staff_barber_id', staffIds);

    const stats = new Map<string, { completed: number; revenue: number }>();
    for (const id of staffIds) stats.set(id, { completed: 0, revenue: 0 });

    for (const a of appointments ?? []) {
      const entry = stats.get(a.staff_barber_id as string);
      if (!entry || a.status !== 'completed') continue;
      entry.completed += 1;
      // "This month" is about work finished, not booked.
      if (a.completed_at && new Date(a.completed_at) >= monthStart) {
        entry.revenue +=
          (parseFloat(String(a.service_price)) || 0) + (parseFloat(String(a.travel_fee)) || 0);
      }
    }

    sendSuccess(
      res,
      members.map((p: Record<string, any>) => {
        const user = Array.isArray(p.user) ? p.user[0] : p.user;
        const stat = stats.get(p.user_id) ?? { completed: 0, revenue: 0 };
        return {
          id: p.user_id,
          name: user.full_name,
          role: 'Staff Barber',
          rating: parseFloat(String(p.rating)) || 0,
          reviewCount: Number(p.review_count) || 0,
          avatarUrl: user.avatar_url ?? null,
          isActive: p.is_available !== false,
          totalAppointments: stat.completed,
          revenueThisMonth: Math.round(stat.revenue * 100) / 100,
          phoneNumber: user.phone ?? '',
          email: user.email,
          joinedDate: user.created_at,
        };
      }),
    );
  },
};
