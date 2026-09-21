-- ───────────────────────────────────────────────────────────────────────────
-- 017_admin_modules.sql
-- Backing tables for the admin panel's Security, Moderation and Settings
-- screens. Run after 016.
-- ───────────────────────────────────────────────────────────────────────────

-- ===== SUSPICIOUS ACTIVITY =====
-- Written by the detection pass, cleared by a human. Nothing here is acted on
-- automatically: a flag is a prompt to look, not a verdict.
CREATE TABLE IF NOT EXISTS suspicious_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who or what is flagged. `subject_id` is a user for behaviour flags; for a
  -- collusion flag it's the client, with the barber in `counterpart_id`.
  subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterpart_id  UUID REFERENCES users(id) ON DELETE CASCADE,

  kind          TEXT NOT NULL CHECK (kind IN (
                  'high_cancellation',   -- cancels far more than they keep
                  'client_no_show',      -- repeatedly disputes/abandons
                  'collusion'            -- same pair cancelling repeatedly
                )),
  severity      TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  reason        TEXT NOT NULL,
  /** Whatever the detector counted, kept so an admin can see the working. */
  evidence      JSONB,

  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'cleared', 'action_taken')),
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  resolution_note TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One live flag per subject+kind+counterpart, so a detection pass that runs
-- twice doesn't bury the queue in duplicates. Re-running updates the evidence
-- on the existing row instead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_flags_unique_open
  ON suspicious_flags(subject_id, kind, COALESCE(counterpart_id, subject_id))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_flags_status ON suspicious_flags(status, created_at DESC);

DROP TRIGGER IF EXISTS suspicious_flags_updated_at ON suspicious_flags;
CREATE TRIGGER suspicious_flags_updated_at
  BEFORE UPDATE ON suspicious_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== BOOKING REFERENCE =====
-- A uuid is unusable over the phone. This is the first block of it — short
-- enough to read aloud, and the exact string the admin panel prints, so what
-- support is told is what they can paste into the search box.
--
-- Generated rather than stored separately, so it can never disagree with the id.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS short_ref TEXT
  GENERATED ALWAYS AS (substr(id::text, 1, 8)) STORED;

CREATE INDEX IF NOT EXISTS idx_appointments_short_ref ON appointments(short_ref);

-- ===== REVIEW REPORTS =====
-- `hidden_at` already exists from 014; this adds who complained and why.
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS reported_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reported_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_reason  TEXT,
  -- Set when a moderator dismisses the report, so it stops resurfacing.
  ADD COLUMN IF NOT EXISTS report_cleared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by   UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_reported
  ON reviews(reported_at DESC)
  WHERE reported_at IS NOT NULL AND report_cleared_at IS NULL;

-- ===== COMMISSION TIERS =====
-- Volume pricing: a barber's rate improves as they complete more work. The
-- tier is derived from completed bookings over a rolling window, so it can't
-- drift from reality.
CREATE TABLE IF NOT EXISTS commission_tiers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT UNIQUE NOT NULL,
  /** Completed bookings needed to reach this tier. */
  booking_threshold INTEGER NOT NULL CHECK (booking_threshold >= 0),
  commission_rate   NUMERIC(5,2) NOT NULL CHECK (commission_rate BETWEEN 0 AND 50),
  sort_order        INTEGER NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO commission_tiers (name, booking_threshold, commission_rate, sort_order)
VALUES
  ('Starter', 0,   12, 1),
  ('Regular', 40,  10, 2),
  ('Pro',     120, 7,  3)
ON CONFLICT (name) DO NOTHING;

DROP TRIGGER IF EXISTS commission_tiers_updated_at ON commission_tiers;
CREATE TRIGGER commission_tiers_updated_at
  BEFORE UPDATE ON commission_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== EXTRA SETTINGS =====
ALTER TABLE platform_settings
  -- How long a mobile barber has to answer a request before it expires.
  ADD COLUMN IF NOT EXISTS request_expiry_minutes INTEGER NOT NULL DEFAULT 120
    CHECK (request_expiry_minutes > 0),
  -- Rolling window the tier calculation looks back over.
  ADD COLUMN IF NOT EXISTS tier_window_days INTEGER NOT NULL DEFAULT 90
    CHECK (tier_window_days > 0);

-- ===== ADMIN ANNOUNCEMENTS =====
-- A record of system messages an admin has broadcast, so the same notice
-- isn't sent twice and there's an audit trail of who said what.
CREATE TABLE IF NOT EXISTS announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  /** 'all' | 'client' | 'barber' | 'staff_barber', or a single user. */
  audience    TEXT NOT NULL,
  target_user UUID REFERENCES users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  recipients  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);

GRANT ALL PRIVILEGES ON TABLE public.suspicious_flags  TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.commission_tiers  TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.announcements     TO service_role;
