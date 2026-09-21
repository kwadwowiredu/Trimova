import { api } from './api';
import type { ApiResponse } from '@/types/api';

/** A staff barber as a client sees them when picking who cuts their hair. */
export interface ShopStaff {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  clientName: string;
  clientAvatarUrl: string | null;
  /** Set when a staff member, rather than the owner, did the work. */
  staffId: string | null;
  staffName: string | null;
  createdAt: string;
}

/**
 * Reviews and shop rosters.
 *
 * A review can only be written against a completed appointment, so the
 * ratings shown on a profile are all earned — the API enforces that, not
 * the app.
 */
export const reviewsService = {
  /** A shop's team. Public. */
  getShopStaff: (barberId: string) =>
    api.get<ApiResponse<ShopStaff[]>>(`/barbers/${barberId}/staff`),

  /** Reviews for a shop, optionally narrowed to one staff member. Public. */
  getBarberReviews: (barberId: string, staffId?: string) =>
    api.get<ApiResponse<Review[]>>(`/barbers/${barberId}/reviews`, {
      params: staffId ? { staffId } : undefined,
    }),

  /** What the signed-in client has written. */
  getMine: () => api.get<ApiResponse<Review[]>>('/reviews/me'),

  create: (payload: { bookingId: string; rating: number; comment?: string }) =>
    api.post<ApiResponse<Review>>('/reviews', payload),

  remove: (id: string) => api.delete<ApiResponse<null>>(`/reviews/${id}`),
};
