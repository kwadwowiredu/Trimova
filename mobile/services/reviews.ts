import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Review, CreateReviewPayload, UpdateReviewPayload } from '@/types/review';

export const reviewsService = {
  getBarberReviews: (barberId: string, params?: { page?: number }) =>
    api.get<PaginatedResponse<Review>>(`/barbers/${barberId}/reviews`, { params }),

  getMyReviews: () =>
    api.get<ApiResponse<Review[]>>('/reviews/me'),

  create: (payload: CreateReviewPayload) =>
    api.post<ApiResponse<Review>>('/reviews', payload),

  update: (id: string, payload: UpdateReviewPayload) =>
    api.put<ApiResponse<Review>>(`/reviews/${id}`, payload),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/reviews/${id}`),

  reply: (id: string, reply: string) =>
    api.patch<ApiResponse<Review>>(`/reviews/${id}/reply`, { reply }),

  report: (id: string, reason: string) =>
    api.post<ApiResponse<null>>(`/reviews/${id}/report`, { reason }),
};
