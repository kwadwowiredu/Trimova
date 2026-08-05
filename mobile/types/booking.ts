export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface Booking {
  id: string;
  clientId: string;
  barberId: string;
  staffBarberId: string | null;
  serviceId: string | null;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  /** Added by a mobile barber who accepts a job outside their usual radius. */
  travelFee: number;
  /** servicePrice + travelFee — what the client actually pays. */
  total: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  /** True for mobile barbers, who vet the job before the client may pay. */
  requiresApproval: boolean;
  approvedAt: string | null;
  /** When an unpaid booking loses its slot. */
  holdExpiresAt: string | null;
  scheduledAt: string;
  endsAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  clientLocation: BookingLocation | null;
  notes: string | null;
  /** Whoever is actually cutting — the staff member if there is one. */
  barberName: string;
  barberAvatarUrl: string | null;
  /** The business the booking sits under. */
  shopName: string;
  clientName: string;
  clientAvatarUrl: string | null;
  clientPhone: string | null;
  createdAt: string;
}

export interface BookingLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface CreateBookingPayload {
  barberId: string;
  staffBarberId?: string | null;
  serviceId: string;
  /** ISO timestamp for the start of the appointment. */
  scheduledAt: string;
  clientLocation?: BookingLocation | null;
  notes?: string;
}

/** One day of a barber's calendar, as the time picker needs it. */
export interface DayAvailability {
  isOpen: boolean;
  /** "09:00" — null when the barber is closed that day. */
  openTime: string | null;
  closeTime: string | null;
  /** Appointments and breaks already taken. */
  busy: { start: string; end: string }[];
  leadMinutes: number;
  futureDays: number;
}

/** Bookability for a whole range of days, keyed by "YYYY-MM-DD". */
export interface MonthAvailability {
  dates: Record<string, { available: boolean; slotCount: number }>;
  leadMinutes: number;
}

export interface PaymentInit {
  reference: string;
  /** Paystack checkout URL — empty in demo mode. */
  authorizationUrl: string;
  accessCode: string;
  amount: number;
  email: string;
  /** True when no real charge was created and the app should skip checkout. */
  demo: boolean;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}
