-- ───────────────────────────────────────────────────────────────────────────
-- 009_search_by_area.sql
-- Lets the free-text search (search_q) also match the barber's LOCATION
-- ADDRESS, so clients can search by town/area/city (e.g. "Ayeduase",
-- "East Legon", "Kumasi"). Same signature as 008 → CREATE OR REPLACE is
-- enough. Run after 008.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_nearby_barbers(
  search_lat   FLOAT8  DEFAULT NULL,
  search_lng   FLOAT8  DEFAULT NULL,
  radius_km    FLOAT8  DEFAULT 10,
  type_filter  TEXT    DEFAULT NULL,
  min_rating   FLOAT8  DEFAULT 0,
  search_q     TEXT    DEFAULT NULL,
  page_size    INT     DEFAULT 20,
  page_num     INT     DEFAULT 1
)
RETURNS TABLE (
  id               UUID,
  full_name        TEXT,
  avatar_url       TEXT,
  barber_type      TEXT,
  business_name    TEXT,
  rating           NUMERIC,
  review_count     INT,
  is_verified      BOOLEAN,
  is_available     BOOLEAN,
  service_radius_km INT,
  location_address TEXT,
  portfolio_images TEXT[],
  cover_photo_url  TEXT,
  lat              FLOAT8,
  lng              FLOAT8,
  distance_km      FLOAT8,
  total_count      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      u.id,
      u.full_name,
      u.avatar_url,
      bp.barber_type::TEXT                                   AS barber_type,
      bp.business_name,
      bp.rating,
      bp.review_count,
      bp.is_verified,
      bp.is_available,
      bp.service_radius_km,
      bp.location_address,
      bp.portfolio_images,
      bp.cover_photo_url,
      bp.lat::FLOAT8 AS lat,
      bp.lng::FLOAT8 AS lng,
      CASE
        WHEN search_lat IS NOT NULL
          AND search_lng IS NOT NULL
          AND bp.location IS NOT NULL
        THEN ROUND(
          (ST_Distance(
            bp.location::geography,
            ST_MakePoint(search_lng, search_lat)::geography
          ) / 1000.0)::NUMERIC, 2
        )::FLOAT8
        ELSE NULL::FLOAT8
      END AS distance_km
    FROM users u
    JOIN barber_profiles bp ON bp.user_id = u.id
    WHERE
      u.is_active          = TRUE
      AND u.role           = 'barber'
      AND bp.onboarding_complete = TRUE
      AND (type_filter IS NULL OR bp.barber_type::TEXT = type_filter)
      AND (min_rating = 0   OR bp.rating >= min_rating)
      AND (
        search_q IS NULL
        OR u.full_name       ILIKE '%' || search_q || '%'
        OR bp.business_name   ILIKE '%' || search_q || '%'
        -- Area/town/city search: match the shop's address too
        OR bp.location_address ILIKE '%' || search_q || '%'
      )
      AND (
        search_lat IS NULL OR search_lng IS NULL OR bp.location IS NULL
        OR ST_DWithin(
          bp.location::geography,
          ST_MakePoint(search_lng, search_lat)::geography,
          radius_km * 1000
        )
      )
  )
  SELECT
    base.id,
    base.full_name,
    base.avatar_url,
    base.barber_type,
    base.business_name,
    base.rating,
    base.review_count,
    base.is_verified,
    base.is_available,
    base.service_radius_km,
    base.location_address,
    base.portfolio_images,
    base.cover_photo_url,
    base.lat,
    base.lng,
    base.distance_km,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM base
  ORDER BY
    base.distance_km ASC NULLS LAST,
    base.rating DESC
  LIMIT page_size
  OFFSET (page_num - 1) * page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION search_nearby_barbers TO service_role;
GRANT EXECUTE ON FUNCTION search_nearby_barbers TO anon;
GRANT EXECUTE ON FUNCTION search_nearby_barbers TO authenticated;
