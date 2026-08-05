import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

/**
 * Paystack webhooks carry no bearer token — the proof of origin is an
 * HMAC-SHA512 of the exact raw request body, keyed with our secret key and
 * sent as `x-paystack-signature`.
 *
 * The signature is over the RAW bytes, so index.ts stashes them on the request
 * before express.json() reshapes the payload.
 */
export function verifyPaystackSignature(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  // Demo mode: no key means no real Paystack, so no webhooks to trust.
  if (!secret || secret.startsWith('sk_test_your') || secret.startsWith('your_')) {
    res.sendStatus(200);
    return;
  }

  const signature = req.headers['x-paystack-signature'];
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;

  if (typeof signature !== 'string' || !raw) {
    console.warn('[paystack] webhook rejected: missing signature or raw body');
    res.sendStatus(401);
    return;
  }

  const expected = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);

  if (
    expectedBuf.length !== signatureBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    console.warn('[paystack] webhook rejected: signature mismatch');
    res.sendStatus(401);
    return;
  }

  next();
}
