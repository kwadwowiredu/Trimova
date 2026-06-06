import { api } from './api';
import type { ApiResponse, PaginatedResponse, SearchBarbersParams } from '@/types/api';
import type { BarberProfile, OnboardingStatus, PayoutMethod } from '@/types/user';
import type { TimeSlot } from '@/types/booking';

export const barbersService = {
  search: (params: SearchBarbersParams) =>
    api.get<PaginatedResponse<BarberProfile>>('/barbers/search', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<BarberProfile>>(`/barbers/${id}`),

  getAvailableSlots: (id: string, date: string) =>
    api.get<ApiResponse<TimeSlot[]>>(`/barbers/${id}/slots`, { params: { date } }),

  getOnboardingStatus: () =>
    api.get<ApiResponse<OnboardingStatus>>('/barbers/me/onboarding'),

  updateBusinessDetails: (payload: Partial<BarberProfile>) =>
    api.put<ApiResponse<BarberProfile>>('/barbers/me/business', payload),

  updateLocation: (payload: { lat: number; lng: number; address: string; serviceRadius?: number }) =>
    api.put<ApiResponse<BarberProfile>>('/barbers/me/location', payload),

  updateAvailability: (isAvailable: boolean) =>
    api.patch<ApiResponse<BarberProfile>>('/barbers/me/availability', { isAvailable }),

  getPayoutMethods: () =>
    api.get<ApiResponse<PayoutMethod[]>>('/barbers/me/payout-methods'),

  addPayoutMethod: (payload: Omit<PayoutMethod, 'id' | 'isDefault'>) =>
    api.post<ApiResponse<PayoutMethod>>('/barbers/me/payout-methods', payload),

  setDefaultPayoutMethod: (id: string) =>
    api.patch<ApiResponse<PayoutMethod>>(`/barbers/me/payout-methods/${id}/default`),

  getEarnings: (params?: { from?: string; to?: string }) =>
    api.get<ApiResponse<{ total: number; pending: number; paid: number; history: EarningsEntry[] }>>('/barbers/me/earnings', { params }),
};

export interface EarningsEntry {
  id: string;
  amount: number;
  type: 'booking' | 'payout';
  status: 'pending' | 'paid';
  date: string;
  bookingId?: string;
}
