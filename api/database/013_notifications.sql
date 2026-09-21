-- ───────────────────────────────────────────────────────────────────────────
-- 013_notifications.sql
-- In-app notifications for clients, barbers and staff. Run after 011/012.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Drives the icon and tint in both apps.
  type        TEXT NOT NULL CHECK (type IN (
                'booking_created',    -- a client booked you
                'booking_confirmed',  -- the barber accepted
                'booking_declined',
                'booking_cancelled',
                'booking_rescheduled',
                'payment_received',   -- money cleared
                'payment_due',        -- approved, now pay
                'booking_completed',
                'payout',
                'staff_invite',
                'system'
              )),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,

  -- What to open when tapped. Kept generic so future notification kinds don't
  -- need a schema change.
  booking_id  UUID REFERENCES appointments(id) ON DELETE CASCADE,

  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The badge count reads "unread, newest first" constantly, so index for it.
CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id) WHERE read_at IS NULL;

-- Service_role needs ordinary table privileges even though it bypasses RLS.
GRANT ALL PRIVILEGES ON TABLE public.notifications TO service_role;
