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
    distance:
      row.distance_km != null
        ? parseFloat(String(row.distance_km))
        : undefined,
  };
}

export const barberController = {
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

      const { data: services } = await supabase
        .from('services')
        .select('id, name, description, price, duration_minutes, is_active')
        .eq('barber_id', id)
        .eq('is_active', true)
        .order('price', { ascending: true });

      const u = userResult.data;
      const p = profileResult.data;

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
