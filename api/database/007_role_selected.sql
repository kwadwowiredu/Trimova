-- ───────────────────────────────────────────────────────────────────────────
-- 007_role_selected.sql
-- Tracks whether a user has explicitly chosen their role (client vs barber).
-- New sign-ups (email + social) are created with role_selected = FALSE and the
-- app forces them through role-selection before granting access — so quitting
-- right after "Create Account" no longer silently leaves a usable client login.
-- Existing users default to TRUE (they're already active). Run after 001–006.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_selected BOOLEAN NOT NULL DEFAULT TRUE;
