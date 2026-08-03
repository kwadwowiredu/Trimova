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
      console.error('[createInvite]', error);
      sendError(res, 'Failed to create the invitation.', 500);
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
      code,
      joinUrl: `${process.env.APP_URL ?? 'trimova://'}join-staff?token=${token}`,
      expiresInDays: INVITE_TTL_DAYS,
    });
    const delivery = await sendEmail({ to: cleanEmail, ...mail });

    sendSuccess(
      res,
      { invite: formatInvite(invite), emailSent: delivery.sent, emailSimulated: delivery.simulated },
      delivery.sent
        ? 'Invitation sent.'
        : 'Invitation created — share the code with them directly.',
      201,
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
};
