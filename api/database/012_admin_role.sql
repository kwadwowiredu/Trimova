-- ───────────────────────────────────────────────────────────────────────────
-- 012_admin_role.sql
-- Adds the platform-admin role used by the Next.js admin panel.
--
-- Run this file ON ITS OWN. Postgres won't let a newly added enum value be
-- used by other statements in the same transaction, so anything that inserts
-- an 'admin' user has to come afterwards in a separate query.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- After this file has run, create your first admin from the API project with:
--
--   npm run create-admin -- "Ama Boateng" admin@trimova.website "a-strong-password"
--
-- That hashes the password the same way the mobile apps' login does, so the
-- admin panel can sign in through the ordinary /auth/login endpoint.
