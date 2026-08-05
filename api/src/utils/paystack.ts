/**
 * Paystack integration (Ghana / GHS).
 *
 * Money is held by Trimova between payment and completion — the client is
 * charged up front, and the barber is paid out once the appointment is marked
 * complete. Only the charge half runs against Paystack here; payouts are
 * recorded in the `transactions` ledger.
 *
 * Without PAYSTACK_SECRET_KEY the module runs in DEMO MODE: charges are
 * simulated locally and marked `channel = 'demo'` in the ledger. That keeps
 * the whole booking flow demonstrable offline, and mirrors how utils/email.ts
 * falls back to console output when no Resend key is set.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

/** Paystack works in the currency's subunit — pesewas for GHS. */
export const toPesewas = (ghs: number) => Math.round(ghs * 100);
export const toCedis = (pesewas: number) => pesewas / 100;

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || key.startsWith('sk_test_your') || key.startsWith('your_')) return null;
  return key;
}

export function isDemoMode(): boolean {
  return secretKey() === null;
}

/** Unique, human-scannable reference we can trace back in the Paystack dashboard. */
export function makeReference(appointmentId: string): string {
  const short = appointmentId.replace(/-/g, '').slice(0, 8);
  return `TRV-${short}-${Date.now().toString(36).toUpperCase()}`;
}

async function paystackFetch<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const key = secretKey();
  if (!key) return { ok: false, message: 'Paystack is not configured.' };

  try {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

    const json = (await res.json()) as { status?: boolean; message?: string; data?: T };

    if (!res.ok || json.status === false) {
      console.error('[paystack] rejected', path, res.status, json.message);
      return { ok: false, message: json.message ?? `Paystack ${res.status}` };
    }
    return { ok: true, data: json.data as T };
  } catch (err) {
    console.error('[paystack] unreachable', path, err);
    return { ok: false, message: 'network' };
  }
}

// ─── Initialize ──────────────────────────────────────────────────────────────

export interface InitializeArgs {
  email: string;
  /** Major units (GHS) — converted to pesewas here. */
  amount: number;
  reference: string;
  /** Where Paystack sends the browser once checkout finishes. */
  callbackUrl?: string;
}

export interface InitializeResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  /** True when no real charge was created. */
  demo: boolean;
}

export async function initializeTransaction(
  args: InitializeArgs,
): Promise<{ ok: true; data: InitializeResult } | { ok: false; message: string }> {
  const { email, amount, reference, callbackUrl } = args;

  if (isDemoMode()) {
    console.log(`[paystack] DEMO charge of GHS ${amount.toFixed(2)} for ${email} (${reference})`);
    return {
      ok: true,
      data: { reference, authorizationUrl: '', accessCode: '', demo: true },
    };
  }

  const result = await paystackFetch<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>('/transaction/initialize', {
    method: 'POST',
    body: {
      email,
      amount: toPesewas(amount),
      currency: 'GHS',
      reference,
      // Ghanaian clients overwhelmingly pay by mobile money; cards are the
      // fallback. Listing both makes Paystack show the tabs we advertise.
      channels: ['mobile_money', 'card'],
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
    },
  });

  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      reference: result.data.reference,
      authorizationUrl: result.data.authorization_url,
      accessCode: result.data.access_code,
      demo: false,
    },
  };
}

// ─── Verify ──────────────────────────────────────────────────────────────────

export interface VerifyResult {
  success: boolean;
  /** Major units actually charged. */
  amount: number;
  channel: string;
  paystackId: string;
  raw: unknown;
}

export async function verifyTransaction(
  reference: string,
): Promise<{ ok: true; data: VerifyResult } | { ok: false; message: string }> {
  if (isDemoMode()) {
    return {
      ok: true,
      data: {
        success: true,
        amount: 0, // caller falls back to the appointment total
        channel: 'demo',
        paystackId: `demo_${reference}`,
        raw: { demo: true, reference },
      },
    };
  }

  const result = await paystackFetch<{
    status: string;
    amount: number;
    channel: string;
    id: number;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });

  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      success: result.data.status === 'success',
      amount: toCedis(result.data.amount),
      channel: result.data.channel ?? 'unknown',
      paystackId: String(result.data.id),
      raw: result.data,
    },
  };
}

// ─── Refund ──────────────────────────────────────────────────────────────────

export async function refundTransaction(
  reference: string,
  amount?: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (isDemoMode()) {
    console.log(`[paystack] DEMO refund for ${reference}`);
    return { ok: true };
  }

  const result = await paystackFetch<unknown>('/refund', {
    method: 'POST',
    body: { transaction: reference, ...(amount ? { amount: toPesewas(amount) } : {}) },
  });

  if (!result.ok) return result;
  return { ok: true };
}
