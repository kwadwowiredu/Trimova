-- ───────────────────────────────────────────────────────────────────────────
-- 004_payout_portfolio.sql
-- Single payout method stored on the barber profile + a public bucket for
-- portfolio image uploads. Run after 001/002/003.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE barber_profiles
  ADD COLUMN IF NOT EXISTS payout_provider        TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_name    TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_number  TEXT,
  ADD COLUMN IF NOT EXISTS payout_type            TEXT;

-- Public bucket for portfolio photos (writes happen via the service-role key).
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;
