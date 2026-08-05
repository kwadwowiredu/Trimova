-- ───────────────────────────────────────────────────────────────────────────
-- 011_appointments.sql
-- The booking transaction: appointments shared by the client and barber apps,
-- plus the Paystack money ledger. Run after 001–010.
-- ───────────────────────────────────────────────────────────────────────────

-- Needed so an EXCLUDE constraint can mix `=` (uuid) with `&&` (range).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ===== APPOINTMENTS =====
CREATE TABLE IF NOT EXISTS appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  client_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The business the booking belongs to: a barbershop owner or a freelancer.
  barber_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Set when a shop's staff member performs the cut instead of the owner.
  staff_barber_id    UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Whoever's calendar is actually occupied. Generated so the overlap
  -- constraint and the availability query never have to COALESCE by hand.
  performer_id       UUID GENERATED ALWAYS AS (COALESCE(staff_barber_id, barber_id)) STORED,

  -- The service is snapshotted, not just referenced: a barber may rename,
  -- reprice or delete it later, and the appointment must keep what was agreed.
  service_id         UUID REFERENCES services(id) ON DELETE SET NULL,
  service_name       TEXT NOT NULL,
  service_price      NUMERIC(10,2) NOT NULL CHECK (service_price >= 0),
  service_duration_minutes INTEGER NOT NULL CHECK (service_duration_minutes > 0),
  -- Charged by mobile barbers who accept a job outside their usual radius.
  travel_fee         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (travel_fee >= 0),

  status             booking_status NOT NULL DEFAULT 'pending',
  payment_status     payment_status NOT NULL DEFAULT 'unpaid',
  payment_reference  TEXT,

  scheduled_at       TIMESTAMPTZ NOT NULL,
  -- Denormalised end so overlap checks are a pure range comparison.
  ends_at            TIMESTAMPTZ NOT NULL,
  CONSTRAINT appointments_time_order CHECK (ends_at > scheduled_at),

  -- Mobile barbers vet the job before the client is allowed to pay; a
  -- barbershop booking is confirmed the moment payment clears.
  requires_approval  BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at        TIMESTAMPTZ,

  -- While a slot is held for an unpaid booking nobody else can take it.
  -- Cleared on payment; a lapsed hold frees the slot.
  hold_expires_at    TIMESTAMPTZ,

  -- Where a mobile barber must travel to.
  client_address     TEXT,
  client_lat         DOUBLE PRECISION,
  client_lng         DOUBLE PRECISION,

  notes              TEXT,
  cancel_reason      TEXT,
  cancelled_by       UUID REFERENCES users(id) ON DELETE SET NULL,

  completed_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,
  -- Escrow release: funds sit with Trimova between payment and completion.
  released_at        TIMESTAMPTZ,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Double-booking is prevented by the database, not by application code: two
-- live appointments can never overlap on the same performer's calendar.
-- Cancelled/declined/completed rows are excluded so freed time is reusable.
ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    performer_id WITH =,
    tstzrange(scheduled_at, ends_at) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'in_progress'));

CREATE INDEX IF NOT EXISTS idx_appointments_client    ON appointments(client_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_barber    ON appointments(barber_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_performer ON appointments(performer_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status    ON appointments(status);

-- Postgres has no CREATE TRIGGER IF NOT EXISTS, so drop first to keep this
-- whole file safe to re-run.
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== TRANSACTIONS (Paystack ledger) =====
-- Every movement of money gets a row, so the admin panel's finance pipeline
-- and a barber's earnings both read from one auditable source.
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      TEXT UNIQUE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  client_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  barber_id      UUID REFERENCES users(id) ON DELETE SET NULL,

  amount         NUMERIC(10,2) NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('deposit', 'transfer', 'refund', 'commission')),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),

  -- 'mobile_money' | 'card' | 'demo' — 'demo' marks a simulated charge made
  -- while no Paystack key was configured.
  channel        TEXT,
  paystack_id    TEXT,
  -- Verbatim gateway payload, kept for dispute resolution.
  raw            JSONB,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client      ON transactions(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_barber      ON transactions(barber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created     ON transactions(created_at DESC);

DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== GRANTS =====
-- The API talks to Supabase with the service-role key and nothing else does,
-- so these two tables only ever need that role. Granting explicitly rather
-- than relying on default privileges keeps this migration reproducible on a
-- fresh project.
GRANT ALL PRIVILEGES ON TABLE public.appointments TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.transactions TO service_role;

-- ===== EXPIRED HOLDS =====
-- An unpaid booking whose payment window lapsed stops blocking the slot.
-- Called opportunistically by the availability endpoint, so no cron is needed.
CREATE OR REPLACE FUNCTION expire_stale_holds()
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE appointments
     SET status        = 'cancelled',
         cancelled_at  = NOW(),
         cancel_reason = 'Payment window expired'
   WHERE status         = 'pending'
     AND payment_status = 'unpaid'
     AND hold_expires_at IS NOT NULL
     AND hold_expires_at < NOW();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.expire_stale_holds() TO service_role;
