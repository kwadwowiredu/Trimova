import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import type { UserRole } from '../types/index';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId: string, role: UserRole, email: string): string {
  return jwt.sign(
    { sub: userId, role, email },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] }
  );
}

function formatUser(user: Record<string, unknown>) {
  return {
    id:        user.id,
    email:     user.email,
    fullName:  user.full_name,
    phone:     user.phone,
    role:      user.role,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
  };
}

/**
 * For barbers, join barber_profiles so callers always receive
 * onboardingComplete (and other profile fields).
 * For non-barbers, returns the base user shape unchanged.
 */
async function enrichUser(
  user: Record<string, unknown>,
  supabase: ReturnType<typeof import('../utils/supabase').getSupabase>,
) {
  const base = formatUser(user);
  if (user.role !== 'barber') return base;

  const { data: p } = await supabase
    .from('barber_profiles')
    .select(
      'barber_type, business_name, bio, onboarding_complete, ' +
      'is_available, is_verified, rating, review_count, ' +
      'service_radius_km, location_address, portfolio_images',
    )
    .eq('user_id', user.id as string)
    .maybeSingle() as { data: Record<string, unknown> | null };

  return {
    ...base,
    barberType:         p?.barber_type          ?? null,
    businessName:       p?.business_name         ?? null,
    bio:                p?.bio                   ?? null,
    onboardingComplete: p?.onboarding_complete   ?? false,
    isAvailable:        p?.is_available          ?? true,
    isVerified:         p?.is_verified           ?? false,
    rating:             parseFloat(String(p?.rating)) || 0,
    reviewCount:        p?.review_count          || 0,
    serviceRadius:      p?.service_radius_km     ?? null,
    locationAddress:    p?.location_address      ?? null,
    portfolioImages:    p?.portfolio_images       || [],
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const { fullName, email, phone, password, role } = req.body as {
      fullName: string;
      email: string;
      phone?: string;
      password: string;
      role: UserRole;
    };

    if (!fullName || !email || !password || !role) {
      sendError(res, 'Full name, email, password, and role are required.');
      return;
    }

    if (!['client', 'barber'].includes(role)) {
      sendError(res, 'Role must be either client or barber.');
      return;
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      sendError(res, 'An account with this email already exists.', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() ?? null,
        password_hash: passwordHash,
        role,
      })
      .select()
      .single();

    if (error || !user) {
      console.error('[Register Error]', error);
      sendError(res, 'Failed to create account. Please try again.', 500);
      return;
    }

    if (role === 'barber') {
      await supabase.from('barber_profiles').insert({ user_id: user.id });
    }

    const token = signToken(user.id, user.role, user.email);
    sendSuccess(res, { token, user: await enrichUser(user, supabase) }, 'Account created successfully.', 201);
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      sendError(res, 'Email and password are required.');
      return;
    }

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (!user) {
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    if (!user.password_hash) {
      sendError(res, 'This account uses social login. Please sign in with Google or Apple.', 401);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      sendError(res, 'Invalid email or password.', 401);
      return;
    }

    const token = signToken(user.id, user.role, user.email);
    sendSuccess(res, { token, user: await enrichUser(user, supabase) }, 'Logged in successfully.');
  },

  async getMe(req: Request, res: Response) {
    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user!.sub)
      .eq('is_active', true)
      .single();

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    sendSuccess(res, await enrichUser(user, supabase));
  },

  async googleAuth(req: Request, res: Response) {
    const { idToken } = req.body as { idToken: string };

    if (!idToken) {
      sendError(res, 'Google ID token is required.');
      return;
    }

    let googleId: string;
    let email: string;
    let name: string;
    let picture: string | undefined;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('Invalid token payload');
      googleId = payload.sub;
      email = payload.email;
      name = payload.name ?? email;
      picture = payload.picture;
    } catch {
      sendError(res, 'Invalid Google token.', 401);
      return;
    }

    const supabase = getSupabase();

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .single();

    if (!user) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (byEmail) {
        await supabase.from('users').update({ google_id: googleId }).eq('id', byEmail.id);
        user = { ...byEmail, google_id: googleId };
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            full_name: name,
            email: email.toLowerCase(),
            google_id: googleId,
            avatar_url: picture ?? null,
            role: 'client',
          })
          .select()
          .single();
        user = newUser;
      }
    }

    if (!user) {
      sendError(res, 'Failed to authenticate with Google.', 500);
      return;
    }

    const token = signToken(user.id, user.role, user.email);
    const isNewUser = !user.role || user.role === 'client';
    sendSuccess(res, { token, user: await enrichUser(user, supabase), requiresRoleSelection: isNewUser });
  },

  async appleAuth(req: Request, res: Response) {
    const { identityToken, fullName } = req.body as { identityToken: string; fullName?: string };

    if (!identityToken) {
      sendError(res, 'Apple identity token is required.');
      return;
    }

    let appleId: string;
    let email: string | undefined;

    try {
      const payload = await appleSignin.verifyIdToken(identityToken, {
        audience: process.env.APPLE_BUNDLE_ID,
        ignoreExpiration: false,
      });
      appleId = payload.sub;
      email = payload.email;
    } catch {
      sendError(res, 'Invalid Apple token.', 401);
      return;
    }

    const supabase = getSupabase();

    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('apple_id', appleId)
      .single();

    if (!user) {
      const resolvedEmail = email ?? `apple_${appleId}@privaterelay.appleid.com`;
      const { data: byEmail } = email
        ? await supabase.from('users').select('*').eq('email', resolvedEmail).single()
        : { data: null };

      if (byEmail) {
        await supabase.from('users').update({ apple_id: appleId }).eq('id', byEmail.id);
        user = { ...byEmail, apple_id: appleId };
      } else {
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            full_name: fullName?.trim() ?? 'Trimova User',
            email: resolvedEmail,
            apple_id: appleId,
            role: 'client',
          })
          .select()
          .single();
        user = newUser;
      }
    }

    if (!user) {
      sendError(res, 'Failed to authenticate with Apple.', 500);
      return;
    }

    const token = signToken(user.id, user.role, user.email);
    sendSuccess(res, { token, user: await enrichUser(user, supabase) });
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body as { email: string };
    if (!email) { sendError(res, 'Email is required.'); return; }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always return success to prevent email enumeration
    if (!user) {
      sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
      return;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // TODO: Send email with reset link: `${FRONTEND_URL}/reset-password?token=${token}`
    console.log(`[Dev] Password reset token for ${email}: ${token}`);

    sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body as { token: string; password: string };
    if (!token || !password) { sendError(res, 'Token and new password are required.'); return; }
    if (password.length < 8) { sendError(res, 'Password must be at least 8 characters.'); return; }

    const supabase = getSupabase();
    const { data: resetRecord } = await supabase
      .from('password_reset_tokens')
      .select('*, users(id)')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!resetRecord) {
      sendError(res, 'This reset link is invalid or has expired.', 400);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await Promise.all([
      supabase.from('users').update({ password_hash: passwordHash }).eq('id', resetRecord.user_id),
      supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', resetRecord.id),
    ]);

    sendSuccess(res, null, 'Password reset successfully. You can now log in.');
  },

  async updateRole(req: Request, res: Response) {
    const { role } = req.body as { role: UserRole };
    if (!['client', 'barber'].includes(role)) {
      sendError(res, 'Role must be client or barber.');
      return;
    }

    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.user!.sub)
      .select()
      .single();

    if (error || !user) { sendError(res, 'Failed to update role.', 500); return; }

    if (role === 'barber') {
      const { data: existing } = await supabase
        .from('barber_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!existing) {
        await supabase.from('barber_profiles').insert({ user_id: user.id });
      }
    }

    const token = signToken(user.id, user.role, user.email);
    sendSuccess(res, { token, user: await enrichUser(user, supabase) }, 'Role updated successfully.');
  },
};
