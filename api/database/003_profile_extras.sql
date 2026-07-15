-- ───────────────────────────────────────────────────────────────────────────
-- 003_profile_extras.sql
-- Adds cover photo + social link columns to barber_profiles, and creates the
-- public storage buckets used for avatar / cover uploads.
--
-- Run this against your Supabase project (SQL editor) once.
-- ───────────────────────────────────────────────────────────────────────────

-- New profile columns ---------------------------------------------------------
ALTER TABLE barber_profiles
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram        TEXT,
  ADD COLUMN IF NOT EXISTS facebook         TEXT,
  ADD COLUMN IF NOT EXISTS tiktok           TEXT,
  -- Plain lat/lng alongside the PostGIS geography column so the profile can be
  -- read back without a spatial query (the API already writes these).
  ADD COLUMN IF NOT EXISTS lat              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng              DOUBLE PRECISION;

-- Storage buckets -------------------------------------------------------------
-- Public buckets: objects are readable by anyone via their public URL.
-- Writes happen from the API using the service-role key, which bypasses RLS,
-- so no additional storage policies are required for uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;
