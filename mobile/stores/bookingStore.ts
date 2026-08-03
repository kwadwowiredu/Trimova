import { create } from 'zustand';

/** How long a client has to pay before their held slot is released. */
export const PAYMENT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export interface BookingService {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface BookingProfessional {
  id: string;          // 'owner' | staff id | 'any'
  name: string;
  role?: string;
  avatarUrl?: string | null;
  rating?: number;
}

interface BookingState {
  barberId: string | null;
  shopName: string | null;
  service: BookingService | null;
  professional: BookingProfessional | null;
  /** "2026-07-20" */
  date: string | null;
  /** "16:15" — start of the appointment */
  time: string | null;
  /**
   * Where a MOBILE barber should travel to. The client types this in during
   * booking (we never require device-location permission), and we forward-
   * geocode it to measure the distance against the barber's travel radius.
   */
  clientAddress: string | null;
  clientCoords: { lat: number; lng: number } | null;
  /** Epoch ms when the held slot expires (set when entering the summary). */
  holdExpiresAt: number | null;

  /**
   * Enter the wizard for a shop. Only wipes the draft when it's a DIFFERENT
   * shop — so navigating back and forth between steps keeps every selection.
   */
  ensureShop: (barberId: string, shopName: string) => void;
  setService: (s: BookingService) => void;
  setProfessional: (p: BookingProfessional) => void;
  setDateTime: (date: string, time: string) => void;
  setClientLocation: (address: string, coords: { lat: number; lng: number } | null) => void;
  beginHold: () => void;
  clearHold: () => void;
  reset: () => void;
}

const INITIAL = {
  barberId: null,
  shopName: null,
  service: null,
  professional: null,
  date: null,
  time: null,
  clientAddress: null,
  clientCoords: null,
  holdExpiresAt: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...INITIAL,

  ensureShop: (barberId, shopName) =>
    set((s) => (s.barberId === barberId ? { shopName } : { ...INITIAL, barberId, shopName })),
  setService: (service) => set({ service }),
  setProfessional: (professional) => set({ professional }),
  setDateTime: (date, time) => set({ date, time }),
  setClientLocation: (clientAddress, clientCoords) => set({ clientAddress, clientCoords }),
  beginHold: () => set({ holdExpiresAt: Date.now() + PAYMENT_WINDOW_MS }),
  clearHold: () => set({ holdExpiresAt: null }),
  reset: () => set({ ...INITIAL }),
}));

/** Combine a "2026-07-20" date and "16:15" time into a Date. */
export function toDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** "16:15" → "4:15 pm" */
export function fmt12(t: string): string {
  const [hStr, m] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

/** "2026-07-20" → "Mon, 20 Jul 2026" */
export function fmtDateLong(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** "16:15" + 45 → "17:00" */
export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
