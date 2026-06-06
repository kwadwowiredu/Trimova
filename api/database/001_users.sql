-- Enable PostGIS extension (for location queries)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum types
CREATE TYPE user_role AS ENUM ('client', 'barber', 'staff_barber');
CREATE TYPE barber_type AS ENUM ('barbershop', 'mobile');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'refunded');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT,
  role user_role NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  apple_id TEXT UNIQUE,
  push_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Barber profiles table (extends users where role = 'barber' or 'staff_barber')
CREATE TABLE barber_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- for staff_barbers: points to their barbershop owner
  barber_type barber_type,
  business_name TEXT,
  bio TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  service_radius_km INT,
  location GEOGRAPHY(POINT, 4326),
  location_address TEXT,
  portfolio_images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geospatial barber searches
CREATE INDEX barber_location_idx ON barber_profiles USING GIST (location);
CREATE INDEX barber_owner_idx ON barber_profiles(owner_id);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER barber_profiles_updated_at BEFORE UPDATE ON barber_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
