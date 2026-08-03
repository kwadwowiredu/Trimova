import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RequestStatus = 'pending' | 'approved' | 'declined';

/**
 * A booking REQUEST — used when a client falls outside a mobile barber's
 * travel radius. The barber reviews it, sets a travel fee, and approves or
 * declines. Only after approval can the client pay.
 *
 * Persisted locally for now; TODO: move to a `booking_requests` table so both
 * sides see the same record (this store currently only simulates that).
 */
export interface BookingRequest {
  id: string;
  barberId: string;
  barberName: string;
  clientName: string;
  clientAddress: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  date: string;   // "2026-07-20"
  time: string;   // "16:15"
  distanceKm: number;
  status: RequestStatus;
  /** Set by the barber when approving. Added to the client's total. */
  travelFee: number | null;
  declineReason?: string;
  createdAt: string;
}

interface RequestState {
  requests: BookingRequest[];
  submit: (r: Omit<BookingRequest, 'id' | 'status' | 'travelFee' | 'createdAt'>) => string;
  approve: (id: string, travelFee: number) => void;
  decline: (id: string, reason?: string) => void;
  byId: (id: string) => BookingRequest | undefined;
  forBarber: (barberId: string) => BookingRequest[];
  clear: () => void;
}

export const useBookingRequestStore = create<RequestState>()(
  persist(
    (set, get) => ({
      requests: [],

      submit: (r) => {
        const id = `req_${Date.now()}`;
        set((s) => ({
          requests: [
            { ...r, id, status: 'pending', travelFee: null, createdAt: new Date().toISOString() },
            ...s.requests,
          ],
        }));
        return id;
      },

      approve: (id, travelFee) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'approved' as RequestStatus, travelFee } : r,
          ),
        })),

      decline: (id, declineReason) =>
        set((s) => ({
          requests: s.requests.map((r) =>
            r.id === id ? { ...r, status: 'declined' as RequestStatus, declineReason } : r,
          ),
        })),

      byId: (id) => get().requests.find((r) => r.id === id),
      forBarber: (barberId) => get().requests.filter((r) => r.barberId === barberId),
      clear: () => set({ requests: [] }),
    }),
    { name: 'trimova_booking_requests', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
