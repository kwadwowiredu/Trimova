/**
 * Transactional email via Resend.
 *
 * Trimova manages its own users table (bcrypt + self-signed JWTs) rather than
 * Supabase Auth, so Supabase's built-in auth emails don't apply — we send our
 * own. This also covers the non-auth mail the app needs (staff invites, and
 * later booking confirmations/reminders).
 *
 * With no RESEND_API_KEY set, emails are logged to the console instead of
 * being sent, so every flow stays testable in development.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * Set EMAIL_FROM to an address on a domain verified in Resend, e.g.
 * "Trimova <no-reply@trimova.website>". The mailbox part doesn't need a real
 * inbox — we only send from it.
 *
 * The fallback is Resend's shared test sender, which needs no verification but
 * can ONLY deliver to the address that owns the Resend account.
 */
const FROM = process.env.EMAIL_FROM ?? 'Trimova <onboarding@resend.dev>';

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  /** True when we only logged it (no API key configured). */
  simulated: boolean;
  error?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith('your_')) {
    console.log('\n──────── EMAIL (not sent — RESEND_API_KEY missing) ────────');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text ?? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('───────────────────────────────────────────────────────────\n');
    return { sent: false, simulated: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(text ? { text } : {}) }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[email] Resend rejected the request:', res.status, detail);
      return { sent: false, simulated: false, error: `Resend ${res.status}` };
    }
    return { sent: true, simulated: false };
  } catch (err) {
    // Never let a mail failure break the request that triggered it.
    console.error('[email] Failed to reach Resend:', err);
    return { sent: false, simulated: false, error: 'network' };
  }
}

// ─── Shared template shell ───────────────────────────────────────────────────

function layout(heading: string, body: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f9f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F8;border-radius:18px;overflow:hidden;">
      <div style="padding:24px 28px 8px;">
        <div style="font-size:20px;font-weight:800;color:#161c27;letter-spacing:-0.3px;">Trimova</div>
      </div>
      <div style="padding:8px 28px 28px;">
        <h1 style="margin:8px 0 14px;font-size:21px;font-weight:800;color:#161c27;">${heading}</h1>
        ${body}
      </div>
    </div>
    <p style="max-width:520px;margin:16px auto 0;font-size:12px;color:#8a89a3;text-align:center;">
      Sent by Trimova · If you weren't expecting this email you can safely ignore it.
    </p>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#023047;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;">${label}</a>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export function passwordResetEmail(name: string, resetUrl: string, token: string) {
  return {
    subject: 'Reset your Trimova password',
    text: `Hi ${name},\n\nReset your password here: ${resetUrl}\n\nOr enter this code in the app: ${token}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
    html: layout('Reset your password', `
      <p style="margin:0 0 16px;font-size:15px;color:#464554;line-height:22px;">
        Hi ${name}, we got a request to reset your Trimova password.
      </p>
      <p style="margin:0 0 22px;">${button(resetUrl, 'Choose a new password')}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#8a89a3;">Or paste this code into the app:</p>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;color:#161c27;background:#f1f3ff;border:1px solid #E2E8F8;border-radius:10px;padding:12px 14px;word-break:break-all;">${token}</div>
      <p style="margin:18px 0 0;font-size:13px;color:#8a89a3;line-height:19px;">
        This link expires in 1 hour. If you didn't ask for a reset, nothing has changed.
      </p>
    `),
  };
}

export function staffInviteEmail(args: {
  staffName: string;
  shopName: string;
  ownerName: string;
  joinUrl: string;
  expiresInDays: number;
}) {
  const { staffName, shopName, ownerName, joinUrl, expiresInDays } = args;
  return {
    subject: `${ownerName} invited you to join ${shopName} on Trimova`,
    text: `Hi ${staffName},\n\n${ownerName} has invited you to join ${shopName} as a staff barber on Trimova.\n\nTap this link on your phone to accept and set your password:\n${joinUrl}\n\nThis invite expires in ${expiresInDays} days and only works with this email address.`,
    html: layout(`You've been invited to ${shopName}`, `
      <p style="margin:0 0 16px;font-size:15px;color:#464554;line-height:22px;">
        Hi ${staffName}, <strong style="color:#161c27;">${ownerName}</strong> has invited you to join
        <strong style="color:#161c27;">${shopName}</strong> as a staff barber on Trimova.
      </p>
      <p style="margin:0 0 10px;font-size:15px;color:#464554;line-height:22px;">
        Tap below on your phone to accept and choose your password.
      </p>
      <p style="margin:0 0 22px;">${button(joinUrl, 'Accept invitation')}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#8a89a3;">If the button doesn't work, copy this link:</p>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#464554;background:#f1f3ff;border:1px solid #E2E8F8;border-radius:10px;padding:12px 14px;word-break:break-all;">${joinUrl}</div>
      <p style="margin:18px 0 0;font-size:13px;color:#8a89a3;line-height:19px;">
        This invitation expires in ${expiresInDays} days and can only be used with this email address.
      </p>
    `),
  };
}
