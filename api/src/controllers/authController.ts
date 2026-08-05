import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';
import { sendEmail, passwordResetEmail } from '../utils/email';
import { deleteUserStorage } from '../utils/storage';
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
    // FALSE until the user explicitly picks a role. Legacy rows default TRUE.
    roleSelected: user.role_selected ?? true,
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

  // select('*') so a missing column (un-run migration) degrades to undefined for
  // that field instead of failing the entire query and nulling ALL barber fields.
  const { data: p, error: pErr } = await supabase
    .from('barber_profiles')
    .select('*')
    .eq('user_id', user.id as string)
    .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

  if (pErr) console.error('[enrichUser] barber_profiles fetch failed:', pErr);

  const hasCoords = p?.lat != null && p?.lng != null;

  return {
    ...base,
    barberType:         p?.barber_type          ?? null,
    businessName:       p?.business_name         ?? null,
    bio:                p?.bio                   ?? null,
    coverPhotoUrl:      p?.cover_photo_url       ?? null,
    onboardingComplete: p?.onboarding_complete   ?? false,
    isAvailable:        p?.is_available          ?? true,
    // Whether this barber takes bookings themselves. Shop staff can flip this to
    // "Admin only"; mobile/freelance barbers are always bookable. Defaults to true.
    isBookable:         p?.is_bookable           ?? true,
    isVerified:         p?.is_verified           ?? false,
    rating:             parseFloat(String(p?.rating)) || 0,
    reviewCount:        p?.review_count          || 0,
    serviceRadius:      p?.service_radius_km     ?? null,
    locationAddress:    p?.location_address      ?? null,
    location:           hasCoords
      ? { lat: Number(p?.lat), lng: Number(p?.lng), address: (p?.location_address as string) ?? '' }
      : null,
    instagram:          p?.instagram             ?? null,
    facebook:           p?.facebook              ?? null,
    tiktok:             p?.tiktok                ?? null,
    portfolioImages:    p?.portfolio_images       || [],
    payout: p?.payout_provider
      ? {
          provider:      p?.payout_provider       as string,
          accountName:   (p?.payout_account_name   as string) ?? '',
          accountNumber: (p?.payout_account_number as string) ?? '',
          type:          (p?.payout_type           as string) ?? 'mobile_money',
        }
      : null,
    bookingRules: {
      leadMinutes:           Number(p?.booking_lead_minutes ?? 30),
      futureDays:            Number(p?.booking_future_days ?? 90),
      rescheduleLeadMinutes: Number(p?.reschedule_lead_minutes ?? 60),
    },
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
        // Role isn't final until the user confirms it on the role-selection screen.
        role_selected: false,
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
            role_selected: false,
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
    sendSuccess(res, { token, user: await enrichUser(user, supabase), requiresRoleSelection: user.role_selected === false });
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
            role_selected: false,
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
    sendSuccess(res, { token, user: await enrichUser(user, supabase), requiresRoleSelection: user.role_selected === false });
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

    const resetUrl = `${process.env.APP_URL ?? 'trimova://'}reset-password?token=${token}`;
    const mail = passwordResetEmail(user.full_name ?? 'there', resetUrl, token);
    // Awaited but never fatal — a mail failure must not reveal whether the
    // address exists, and must not fail the request.
    await sendEmail({ to: email.toLowerCase().trim(), ...mail });

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

  /** PATCH /auth/me — update profile fields on users + barber_profiles. */
  async updateProfile(req: Request, res: Response) {
    const userId = req.user!.sub;
    const body = req.body as Record<string, unknown>;
    const {
      fullName, phone, avatarUrl,
      businessName, bio, coverPhotoUrl, instagram, facebook, tiktok,
      payoutProvider, payoutAccountName, payoutAccountNumber, payoutType,
    } = body as Record<string, string | null | undefined>;
    const portfolioImages = body.portfolioImages as string[] | undefined;
    const isBookable            = body.isBookable as boolean | undefined;
    const bookingLeadMinutes    = body.bookingLeadMinutes as number | undefined;
    const bookingFutureDays     = body.bookingFutureDays as number | undefined;
    const rescheduleLeadMinutes = body.rescheduleLeadMinutes as number | undefined;

    const supabase = getSupabase();

    // ── users table ──────────────────────────────────────────────────────────
    const userUpdate: Record<string, unknown> = {};
    if (fullName !== undefined)  userUpdate.full_name = fullName?.trim() ?? null;
    if (phone !== undefined)     userUpdate.phone = phone?.trim() ?? null;
    if (avatarUrl !== undefined) userUpdate.avatar_url = avatarUrl ?? null;

    if (Object.keys(userUpdate).length > 0) {
      const { error } = await supabase.from('users').update(userUpdate).eq('id', userId);
      if (error) { sendError(res, 'Failed to update profile.', 500); return; }
    }

    // ── barber_profiles table (barbers only) ────────────────────────────────
    if (req.user!.role === 'barber') {
      const profileUpdate: Record<string, unknown> = {};
      if (businessName !== undefined)  profileUpdate.business_name = businessName?.trim() ?? null;
      if (bio !== undefined)           profileUpdate.bio = bio ?? null;
      if (coverPhotoUrl !== undefined) profileUpdate.cover_photo_url = coverPhotoUrl ?? null;
      if (instagram !== undefined)     profileUpdate.instagram = instagram ?? null;
      if (facebook !== undefined)      profileUpdate.facebook = facebook ?? null;
      if (tiktok !== undefined)        profileUpdate.tiktok = tiktok ?? null;
      if (portfolioImages !== undefined)      profileUpdate.portfolio_images = Array.isArray(portfolioImages) ? portfolioImages : [];
      if (isBookable !== undefined)           profileUpdate.is_bookable = !!isBookable;
      if (payoutProvider !== undefined)       profileUpdate.payout_provider = payoutProvider ?? null;
      if (payoutAccountName !== undefined)    profileUpdate.payout_account_name = payoutAccountName ?? null;
      if (payoutAccountNumber !== undefined)  profileUpdate.payout_account_number = payoutAccountNumber ?? null;
      if (payoutType !== undefined)           profileUpdate.payout_type = payoutType ?? null;
      if (bookingLeadMinutes !== undefined)     profileUpdate.booking_lead_minutes = bookingLeadMinutes;
      if (bookingFutureDays !== undefined)      profileUpdate.booking_future_days = bookingFutureDays;
      if (rescheduleLeadMinutes !== undefined)  profileUpdate.reschedule_lead_minutes = rescheduleLeadMinutes;

      if (Object.keys(profileUpdate).length > 0) {
        const { error } = await supabase
          .from('barber_profiles')
          .upsert({ user_id: userId, ...profileUpdate }, { onConflict: 'user_id' });
        if (error) { sendError(res, 'Failed to update business profile.', 500); return; }
      }
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) { sendError(res, 'User not found.', 404); return; }

    sendSuccess(res, await enrichUser(user, supabase), 'Profile updated.');
  },

  /** POST /auth/verify-password — confirm the current password (used before destructive flows). */
  async verifyPassword(req: Request, res: Response) {
    const { password } = req.body as { password?: string };
    if (!password) {
      sendError(res, 'Password is required.');
      return;
    }
    const supabase = getSupabase();
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user!.sub)
      .single();

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }
    // Social-login accounts have no password — nothing to verify.
    if (!user.password_hash) {
      sendSuccess(res, { valid: true });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      sendError(res, 'Your password is incorrect.', 401);
      return;
    }
    sendSuccess(res, { valid: true }, 'Verified.');
  },

  /** POST /auth/logout — disassociate this user's push token (token stays on device). */
  async logout(req: Request, res: Response) {
    const supabase = getSupabase();
    try {
      await supabase.from('users').update({ push_token: null }).eq('id', req.user!.sub);
    } catch {
      // Non-fatal — logout should always succeed client-side.
    }
    sendSuccess(res, null, 'Logged out.');
  },

  /** DELETE /auth/me — permanently delete the account and all owned data. */
  async deleteAccount(req: Request, res: Response) {
    const { password } = req.body as { password?: string };
    const userId = req.user!.sub;
    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    // Password-based accounts must confirm with their password.
    if (user.password_hash) {
      if (!password) {
        sendError(res, 'Password is required to delete your account.');
        return;
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        sendError(res, 'Your password is incorrect.', 401);
        return;
      }
    }

    // Storage has no foreign keys, so nothing cascades — the user's files must
    // be removed explicitly or they stay in the buckets forever.
    const removedFiles = await deleteUserStorage(userId);
    console.log(`[Delete Account] storage cleaned for ${userId}:`, removedFiles);

    // Delete the user row. barber_profiles + password_reset_tokens cascade.
    //
    // `.select()` matters: without it Supabase reports success even when the
    // statement matched ZERO rows, which previously let a no-op delete look
    // like a completed one — leaving the account visible to clients.
    const { data: deleted, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select('id');

    if (error || !deleted || deleted.length === 0) {
      console.error('[Delete Account] hard delete did not remove the row:', error ?? 'no rows matched');

      // Fall back to a definitive deactivation so the account is genuinely
      // unusable and disappears from client search (both filter is_active),
      // and release the email address so it can be registered again.
      const { error: deactivateError } = await supabase
        .from('users')
        .update({
          is_active: false,
          email: `deleted_${userId}@deleted.trimova`,
          password_hash: null,
          push_token: null,
          google_id: null,
          apple_id: null,
        })
        .eq('id', userId);

      if (deactivateError) {
        console.error('[Delete Account] deactivation fallback failed:', deactivateError);
        sendError(res, 'We could not delete your account. Please try again.', 500);
        return;
      }
      // The account is now unusable and hidden, so this is a genuine success
      // for the user even though the row itself survived.
      console.warn(`[Delete Account] user ${userId} deactivated instead of deleted.`);
    }

    sendSuccess(res, null, 'Account deleted.');
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      sendError(res, 'Current and new password are required.');
      return;
    }
    if (newPassword.length < 8) {
      sendError(res, 'New password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      sendError(res, 'New password must include at least one uppercase letter and one number.');
      return;
    }

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', req.user!.sub)
      .single();

    if (!user) {
      sendError(res, 'User not found.', 404);
      return;
    }

    if (!user.password_hash) {
      sendError(res, 'This account uses social login and has no password to change.', 400);
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      sendError(res, 'Your current password is incorrect.', 401);
      return;
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id);

    if (error) {
      sendError(res, 'Failed to update password. Please try again.', 500);
      return;
    }

    sendSuccess(res, null, 'Password updated successfully.');
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
      .update({ role, role_selected: true })
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
