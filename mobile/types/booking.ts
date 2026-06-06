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
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  scheduledAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  clientLocation: BookingLocation | null;
  notes: string | null;
  barberName: string;
  barberAvatarUrl: string | null;
  clientName: string;
  clientAvatarUrl: string | null;
  createdAt: string;
}

export interface BookingLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface CreateBookingPayload {
  barberId: string;
  staffBarberId?: string;
  serviceId: string;
  scheduledAt: string;
  clientLocation?: BookingLocation;
  notes?: string;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}
