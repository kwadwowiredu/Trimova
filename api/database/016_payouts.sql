-- ───────────────────────────────────────────────────────────────────────────
-- 016_payouts.sql
-- Client confirmation + commission settings. Run after 011–015.
--
-- Answers two questions the escrow model left open:
--
--   1. How does Trimova know the appointment actually happened?
--      The client confirms. A booking whose time has passed enters a grace
--      window; if the client says it didn't happen, the money is held for
--      support instead of released. Silence after the window counts as
--      consent, because most people never confirm anything.
--
--   2. What does Trimova keep?
--      A commission percentage, stored here rather than hard-coded, so it can
--      be changed from the admin panel without a redeploy.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE appointments
  -- Set when the client confirms the service was delivered.
  ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMPTZ,
  -- Set when the client says it did NOT happen. Blocks release.
  ADD COLUMN IF NOT EXISTS disputed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_reason      TEXT,
  -- What Trimova kept, frozen at release time so a later rate change can't
  -- rewrite history.
  ADD COLUMN IF NOT EXISTS commission_amount   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS commission_rate     NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_appointments_disputed
  ON appointments(disputed_at) WHERE disputed_at IS NOT NULL;

-- ===== PLATFORM SETTINGS =====
-- Single-row table. The admin panel's Settings screen edits this.
CREATE TABLE IF NOT EXISTS platform_settings (
  id                    BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  commission_percent    NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (commission_percent BETWEEN 0 AND 50),
  -- Hours after an appointment ends before escrow releases automatically.
  -- Long enough for a client to raise a problem, short enough that a barber
  -- isn't waiting days for their money.
  confirmation_window_hours INTEGER NOT NULL DEFAULT 12 CHECK (confirmation_window_hours >= 0),
  -- Cancellation policy thresholds, so support can adjust them centrally.
  free_cancel_hours     INTEGER NOT NULL DEFAULT 3,
  half_fee_hours        INTEGER NOT NULL DEFAULT 1,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS platform_settings_updated_at ON platform_settings;
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== PAYOUT BATCHES =====
-- What a barber is actually owed, and whether it's been sent.
--
-- Separate from `transactions`: that's an immutable ledger of what happened,
-- this is the operational queue of what still needs to happen.
CREATE TABLE IF NOT EXISTS payouts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Barber's share, after commission.
  amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),

  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'processing', 'paid', 'failed')),

  -- Where it's going, snapshotted so a later profile edit can't redirect an
  -- in-flight payout.
  payout_provider       TEXT,
  payout_account_name   TEXT,
  payout_account_number TEXT,

  -- Paystack transfer identifiers, once one is created.
  transfer_code  TEXT,
  reference      TEXT UNIQUE,
  failure_reason TEXT,

  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_barber ON payouts(barber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);

DROP TRIGGER IF EXISTS payouts_updated_at ON payouts;
CREATE TRIGGER payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT ALL PRIVILEGES ON TABLE public.platform_settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.payouts           TO service_role;
