-- ───────────────────────────────────────────────────────────────────────────
-- 005_booking_rules.sql
-- Per-barber booking constraints. Run after 001–004.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE barber_profiles
  ADD COLUMN IF NOT EXISTS booking_lead_minutes     INTEGER NOT NULL DEFAULT 30,   -- min notice before an appointment
  ADD COLUMN IF NOT EXISTS booking_future_days      INTEGER NOT NULL DEFAULT 90,   -- how far ahead clients can book
  ADD COLUMN IF NOT EXISTS reschedule_lead_minutes  INTEGER NOT NULL DEFAULT 60;   -- min notice to reschedule
