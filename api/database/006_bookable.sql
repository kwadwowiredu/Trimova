-- ───────────────────────────────────────────────────────────────────────────
-- 006_bookable.sql
-- Whether a barber takes bookings themselves ("Bookable") or is admin-only.
-- Shop staff can toggle this during onboarding and later in profile settings;
-- mobile/freelance barbers are always bookable. Run after 001–005.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE barber_profiles
  ADD COLUMN IF NOT EXISTS is_bookable BOOLEAN NOT NULL DEFAULT TRUE;
