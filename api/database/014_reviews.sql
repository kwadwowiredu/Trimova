-- ───────────────────────────────────────────────────────────────────────────
-- 014_reviews.sql
-- Client reviews, tied to the appointment that earned them. Run after 011.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One review per appointment: a rating has to be earned by a real, completed
  -- job, which also makes review-bombing impossible.
  appointment_id  UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barber_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- The staff member who did the work, when it wasn't the owner. A barber's
  -- rating belongs to them, not the shop, so this is what we aggregate on.
  staff_barber_id UUID REFERENCES users(id) ON DELETE SET NULL,

  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,

  -- Set by an admin when a review is removed from the public listing.
  hidden_at       TIMESTAMPTZ,
  hidden_reason   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_barber ON reviews(barber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_staff  ON reviews(staff_barber_id, created_at DESC);

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== AGGREGATE RATING =====
-- barber_profiles.rating / review_count are denormalised so search results and
-- cards don't have to aggregate on every read. Recompute them whenever a
-- review is written, changed or removed, so they can never drift.
CREATE OR REPLACE FUNCTION refresh_barber_rating()
RETURNS TRIGGER AS $$
DECLARE
  target UUID;
BEGIN
  -- The rating follows the person who did the work.
  target := COALESCE(
    NEW.staff_barber_id, NEW.barber_id,
    OLD.staff_barber_id, OLD.barber_id
  );

  UPDATE barber_profiles bp
     SET rating = COALESCE((
           SELECT ROUND(AVG(r.rating)::numeric, 2)
             FROM reviews r
            WHERE COALESCE(r.staff_barber_id, r.barber_id) = target
              AND r.hidden_at IS NULL
         ), 0),
         review_count = (
           SELECT COUNT(*)
             FROM reviews r
            WHERE COALESCE(r.staff_barber_id, r.barber_id) = target
              AND r.hidden_at IS NULL
         )
   WHERE bp.user_id = target;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_refresh_rating ON reviews;
CREATE TRIGGER reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_barber_rating();

-- Service_role needs ordinary table privileges even though it bypasses RLS.
GRANT ALL PRIVILEGES ON TABLE public.reviews TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_barber_rating() TO service_role;
