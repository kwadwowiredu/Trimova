-- ───────────────────────────────────────────────────────────────────────────
-- 010_staff_invites.sql
-- Staff invitations for barbershops. Run after 001–009.
--
-- SECURITY MODEL: the invite is BOUND to an email address + a shop. The token
-- and the short code are two deliveries of the SAME invite, so a leaked code
-- is useless to anyone else — redemption always checks the email matches.
-- Invites are single-use (accepted_at), expiring, and owner-revocable.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The barbershop owner who sent it
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Who it's for. Redemption requires this exact address.
  email        TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  phone        TEXT,
  -- Long random token (used by the deep link)
  token        TEXT UNIQUE NOT NULL,
  -- Short human-readable code, e.g. "TRV-8F42-QK" (read out in person)
  code         TEXT UNIQUE NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  accepted_at  TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  -- The staff user created when the invite was redeemed
  accepted_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_owner ON staff_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_invites_code  ON staff_invites(code);
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(LOWER(email));

-- Only one live (unaccepted, unrevoked) invite per email per shop.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invites_pending_unique
  ON staff_invites(owner_id, LOWER(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

GRANT ALL ON TABLE staff_invites TO service_role;

-- Staff barbers link to their shop through barber_profiles.owner_id, which
-- already exists (001_users.sql). Make lookups by shop fast.
CREATE INDEX IF NOT EXISTS idx_barber_profiles_owner ON barber_profiles(owner_id);
