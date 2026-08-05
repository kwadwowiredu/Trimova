import { api } from './api';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  DayAvailability,
  MonthAvailability,
  PaymentInit,
} from '@/types/booking';

/**
 * The booking transaction. Both apps read and write the same appointment
 * rows, so a client's booking shows up on the barber's calendar and every
 * status change one side makes is immediately visible to the other.
 */
export const bookingsService = {
  /**
   * Open times for one barber on one day. Public — the picker runs before the
   * client has committed to anything.
   * @param date "2026-07-20"
   */
  getAvailability: (params: { barberId: string; date: string; staffBarberId?: string }) =>
    api.get<ApiResponse<DayAvailability>>('/bookings/availability', { params }),

  /**
   * Which days in a range can still fit a service of this length — one request
   * for the whole calendar instead of one per day.
   */
  getMonthAvailability: (params: {
    barberId: string;
    /** "2026-07-01" */
    from: string;
    /** "2026-09-29" */
    to: string;
    durationMinutes: number;
    staffBarberId?: string;
  }) => api.get<ApiResponse<MonthAvailability>>('/bookings/availability/month', { params }),

  /** `status` accepts a comma-separated list, e.g. "pending,confirmed". */
  getClientBookings: (params?: { status?: BookingStatus | string; page?: number }) =>
    api.get<PaginatedResponse<Booking>>('/bookings/client', { params }),

  getBarberBookings: (params?: {
    status?: BookingStatus | string;
    /** "2026-07-20" — narrows to a single day for the calendar view. */
    date?: string;
    page?: number;
  }) => api.get<PaginatedResponse<Booking>>('/bookings/barber', { params }),

  getById: (id: string) => api.get<ApiResponse<Booking>>(`/bookings/${id}`),

  create: (payload: CreateBookingPayload) =>
    api.post<ApiResponse<Booking>>('/bookings', payload),

  /** Barber accepts. A mobile barber may attach a travel fee here. */
  confirm: (id: string, travelFee?: number) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/confirm`, { travelFee }),

  decline: (id: string, reason?: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/decline`, { reason }),

  cancel: (id: string, reason?: string) =>
    api.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`, { reason }),

  start: (id: string) => api.patch<ApiResponse<Booking>>(`/bookings/${id}/start`),

  /** Marks the job done, which releases the money held for the barber. */
  complete: (id: string) => api.patch<ApiResponse<Booking>>(`/bookings/${id}/complete`),

  initializePayment: (id: string) =>
    api.post<ApiResponse<PaymentInit>>(`/bookings/${id}/payment/initialize`),

  verifyPayment: (id: string, reference: string) =>
    api.post<ApiResponse<Booking>>(`/bookings/${id}/payment/verify`, { reference }),
};
