import { api } from './api';
import type { ApiResponse } from '@/types/api';

export const paymentsService = {
  initializeBookingPayment: (bookingId: string) =>
    api.post<ApiResponse<{ reference: string; amount: number; email: string }>>(`/payments/initialize/${bookingId}`),

  verifyPayment: (reference: string) =>
    api.post<ApiResponse<{ verified: boolean; bookingId: string }>>('/payments/verify', { reference }),

  requestPayout: (payoutMethodId: string, amount: number) =>
    api.post<ApiResponse<{ transferCode: string }>>('/payments/payout', { payoutMethodId, amount }),
};
