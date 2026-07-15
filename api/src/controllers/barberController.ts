import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendPaginated, sendError } from '../utils/response';


// Raw row shape returned by the search_nearby_barbers SQL function
interface RawBarberRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  barber_type: string;
  business_name: string | null;
  rating: string | number;
  review_count: number;
  is_verified: boolean;
  is_available: boolean;
  service_radius_km: number | null;
  location_address: string | null;
  portfolio_images: string[];
  cover_photo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_km: string | number | null;
  total_count: string | number;
}

function mapListItem(row: RawBarberRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    barberType: row.barber_type,
    businessName: row.business_name,
    rating: parseFloat(String(row.rating)) || 0,
    reviewCount: row.review_count || 0,
    isVerified: row.is_verified,
    isAvailable: row.is_available,
    serviceRadius: row.service_radius_km,
    locationAddress: row.location_address,
    portfolioImages: row.portfolio_images || [],
    // Undefined until migration 008 updates the search RPC — clients fall back
    // to the first portfolio image, then a gradient.
    coverPhotoUrl: row.cover_photo_url ?? null,
    // Map-pin coordinates (also from migration 008).
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    distance:
      row.distance_km != null
        ? parseFloat(String(row.distance_km))
        : undefined,
  };
}

export const barberController = {
  /** PUT /api/barbers/me/business — create / update barber business details */
  async updateBusinessDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { barberType, businessName, bio, phone } = req.body as {
        barberType: string;
        businessName: string;
        bio?: string;
        phone?: string;
      };

      if (!barberType || !businessName?.trim()) {
        return sendError(res, 'barberType and businessName are required.', 400);
      }

      const supabase = getSupabase();

      // Upsert the barber profile row
      const { error: profileError } = await supabase
        .from('barber_profiles')
        .upsert(
          {
            user_id: userId,
            barber_type: barberType,
            business_name: businessName.trim(),
            bio: bio ?? null,
            onboarding_complete: true,
          },
          { onConflict: 'user_id' },
        );

      if (profileError) throw profileError;

      // Update phone on the users table if provided
      if (phone) {
        const { error: userError } = await supabase
          .from('users')
          .update({ phone: phone.trim() })
          .eq('id', userId);
        if (userError) throw userError;
      }

      // Return fresh user + profile
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url, phone, role, created_at')
        .eq('id', userId)
        .single();

      const { data: profileData } = await supabase
        .from('barber_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userFetchError || !userData) throw userFetchError;

      sendSuccess(res, {
        id:                 userData.id,
        email:              userData.email,
        fullName:           userData.full_name,
        avatarUrl:          userData.avatar_url,
        phone:              userData.phone,
        role:               userData.role,
        createdAt:          userData.created_at,
        barberType:         profileData?.barber_type,
        businessName:       profileData?.business_name,
        bio:                profileData?.bio,
        isVerified:         profileData?.is_verified ?? false,
        isAvailable:        profileData?.is_available ?? true,
        onboardingComplete: profileData?.onboarding_complete ?? true,
        rating:             parseFloat(String(profileData?.rating)) || 0,
        reviewCount:        profileData?.review_count || 0,
        serviceRadius:      profileData?.service_radius_km,
        locationAddress:    profileData?.location_address,
        portfolioImages:    profileData?.portfolio_images || [],
      });
    } catch (err) {
      next(err);
    }
  },

  /** PUT /api/barbers/me/location — set / update barber location */
  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { lat, lng, address, serviceRadius } = req.body as {
        lat: number;
        lng: number;
        address: string;
        serviceRadius?: number;
      };

      if (lat == null || lng == null) {
        return sendError(res, 'lat and lng are required.', 400);
      }

      const supabase = getSupabase();

      // Build update payload — use PostGIS WKT for the geography column
      const updatePayload: Record<string, unknown> = {
        lat,
        lng,
        location_address: address,
      };
      if (serviceRadius != null) updatePayload.service_radius_km = serviceRadius;

      // Attempt to set the PostGIS geography column via ST_Point
      // Falls back gracefully if the column doesn't support direct text cast
      try {
        await supabase.rpc('set_barber_location', {
          p_user_id: userId,
          p_lat:     lat,
          p_lng:     lng,
        });
      } catch {
        // RPC not defined yet — lat/lng columns are enough for the search function
      }

      const { error } = await supabase
        .from('barber_profiles')
        .update(updatePayload)
        .eq('user_id', userId);

      if (error) throw error;

      sendSuccess(res, { message: 'Location updated.' });
    } catch (err) {
      next(err);
    }
  },


  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        lat,
        lng,
        radius   = '10',
        type,
        minRating = '0',
        q,
        page     = '1',
        limit    = '20',
      } = req.query as Record<string, string>;

      const supabase = getSupabase();

      const { data, error } = await supabase.rpc('search_nearby_barbers', {
        search_lat:  lat  ? parseFloat(lat)  : null,
        search_lng:  lng  ? parseFloat(lng)  : null,
        radius_km:   parseFloat(radius),
        type_filter: type || null,
        min_rating:  parseFloat(minRating),
        search_q:    q    || null,
        page_size:   parseInt(limit),
        page_num:    parseInt(page),
      });

      if (error) throw error;

      const rows  = (data as RawBarberRow[]) || [];
      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

      sendPaginated(res, rows.map(mapListItem), {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const supabase = getSupabase();

      const [userResult, profileResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, avatar_url, phone, email, created_at')
          .eq('id', id)
          .eq('is_active', true)
          .single(),
        supabase
          .from('barber_profiles')
          .select('*')
          .eq('user_id', id)
          .single(),
      ]);

      if (userResult.error || !userResult.data) {
        return sendError(res, 'Barber not found', 404);
      }
      if (profileResult.error || !profileResult.data) {
        return sendError(res, 'Barber profile not found', 404);
      }

      const [{ data: services }, { data: hours }] = await Promise.all([
        supabase
          .from('services')
          .select('id, name, description, price, duration_minutes, is_active')
          .eq('barber_id', id)
          .eq('is_active', true)
          .order('price', { ascending: true }),
        supabase
          .from('working_hours')
          .select('day_of_week, start_time, end_time, is_active')
          .eq('barber_id', id),
      ]);

      const u = userResult.data;
      const p = profileResult.data;

      // Mon→Sun opening times for the client "About" tab (dow 0=Sun..6=Sat).
      const DAY_ORDER = [
        { day: 'Monday', dow: 1 }, { day: 'Tuesday', dow: 2 }, { day: 'Wednesday', dow: 3 },
        { day: 'Thursday', dow: 4 }, { day: 'Friday', dow: 5 }, { day: 'Saturday', dow: 6 },
        { day: 'Sunday', dow: 0 },
      ];
      const hhmm = (t: unknown) => String(t ?? '').slice(0, 5);
      const workingHours = (hours && hours.length > 0)
        ? DAY_ORDER.map(({ day, dow }) => {
            const wh = hours.find((h) => h.day_of_week === dow);
            return {
              day,
              isOpen:    wh ? !!wh.is_active : false,
              openTime:  wh ? hhmm(wh.start_time) : '09:00',
              closeTime: wh ? hhmm(wh.end_time)   : '18:00',
            };
          })
        : null;

      sendSuccess(res, {
        id:               u.id,
        email:            u.email,
        fullName:         u.full_name,
        avatarUrl:        u.avatar_url,
        phone:            u.phone,
        createdAt:        u.created_at,
        role:             'barber',
        barberType:       p.barber_type,
        businessName:     p.business_name,
        bio:              p.bio,
        rating:           parseFloat(String(p.rating)) || 0,
        reviewCount:      p.review_count || 0,
        isVerified:       p.is_verified,
        isAvailable:      p.is_available,
        onboardingComplete: p.onboarding_complete,
        serviceRadius:    p.service_radius_km,
        locationAddress:  p.location_address,
        portfolioImages:  p.portfolio_images || [],
        coverPhotoUrl:    p.cover_photo_url ?? null,
        workingHours,
        services: (services || []).map((s) => ({
          id:              s.id,
          name:            s.name,
          description:     s.description,
          price:           parseFloat(String(s.price)),
          durationMinutes: s.duration_minutes,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
