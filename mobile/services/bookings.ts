import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Booking, BookingStatus, CreateBookingPayload } from '@/types/booking';

export const bookingsService = {
  getClientBookings: (params?: { status?: BookingStatus; page?: number }) =>
    api.get<PaginatedResponse<Booking>>('/bookings/client', { params }),

  getBarberBookings: (params?: { status?: BookingStatus; page?: number }) =>
    api.get<PaginatedResponse<Booking>>('/bookings/barber', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Booking>>(`/bookings/${id}`),

  create: (payload: CreateBookingPayload) =>
    api.post<ApiResponse<Booking>>('/bookings', payload),

  confirm: (id: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/confirm`),

  decline: (id: string, reason?: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/decline`, { reason }),

  cancel: (id: string, reason?: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`, { reason }),

  complete: (id: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/complete`),

  initializePayment: (id: string) =>
    api.post<ApiResponse<{ reference: string; authorizationUrl: string }>>(`/bookings/${id}/payment/initialize`),

  verifyPayment: (id: string, reference: string) =>
    api.post<ApiResponse<Booking>>(`/bookings/${id}/payment/verify`, { reference }),
};
