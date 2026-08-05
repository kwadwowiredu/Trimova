import { api } from './api';
import type { ApiResponse } from '@/types/api';

export type TransactionType = 'deposit' | 'transfer' | 'refund' | 'commission';
export type TransactionStatus = 'pending' | 'success' | 'failed';

/** One line in the money ledger, from the signed-in user's point of view. */
export interface Transaction {
  id: string;
  reference: string;
  bookingId: string | null;
  /** GHS. */
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  /** 'mobile_money' | 'card' | 'demo' */
  channel: string | null;
  createdAt: string;
}

/**
 * Charging for a booking lives on the booking itself — see
 * `bookingsService.initializePayment` / `verifyPayment`. This module covers
 * the money history either side can look back on.
 */
export const paymentsService = {
  /** A client's payments, or a barber's earnings, newest first. */
  getMyTransactions: () => api.get<ApiResponse<Transaction[]>>('/payments/transactions'),
};
