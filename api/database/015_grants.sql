-- ───────────────────────────────────────────────────────────────────────────
-- 015_grants.sql
-- Grants the API's service_role access to everything added in 011–014.
--
-- The API connects with the service-role key, which bypasses RLS but still
-- needs ordinary table privileges. Supabase's default privileges don't cover
-- tables created afterwards through the SQL editor, so a new table reads back
-- as an empty-message permission error until it's granted explicitly — the
-- table is there, the API just can't see it.
--
-- Safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

GRANT ALL PRIVILEGES ON TABLE public.appointments   TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.transactions   TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.notifications  TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.reviews        TO service_role;

GRANT EXECUTE ON FUNCTION public.expire_stale_holds()    TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_barber_rating() TO service_role;

-- Belt and braces: make every future table in `public` grant itself, so the
-- next migration doesn't repeat this dance.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
