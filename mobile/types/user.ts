export type UserRole = 'client' | 'barber' | 'staff_barber';

export type BarberType = 'barbershop' | 'mobile';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  /** FALSE until the user has explicitly chosen a role on role-selection. */
  roleSelected?: boolean;
}

export interface ClientProfile extends User {
  role: 'client';
}

export interface BarberProfile extends User {
  role: 'barber';
  barberType: BarberType;
  businessName: string;
  bio: string | null;
  coverPhotoUrl: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isAvailable: boolean;
  onboardingComplete: boolean;
  location: BarberLocation | null;
  serviceRadius: number | null;
  portfolioImages: string[];
  distance?: number;
}

export interface BarberLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface StaffBarber extends User {
  role: 'staff_barber';
  barbershopId: string;
  barbershopName: string;
  isActive: boolean;
  specialties: string[];
}

export interface PayoutMethod {
  id: string;
  type: 'mobile_money' | 'bank';
  provider: string | null;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

/** Lightweight shape returned by GET /barbers/search — used on Home + Search screens */
export interface BarberListItem {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  barberType: BarberType;
  businessName: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isAvailable: boolean;
  serviceRadius: number | null;
  locationAddress: string | null;
  portfolioImages: string[];
  /** Shop cover banner — used on client-facing barber cards. */
  coverPhotoUrl?: string | null;
  /** Map-pin coordinates for the client Search map. */
  lat?: number | null;
  lng?: number | null;
  distance?: number;
}

export interface OnboardingStatus {
  hasBusinessDetails: boolean;
  hasLocation: boolean;
  hasServices: boolean;
  hasWorkingHours: boolean;
  hasPayoutMethod: boolean;
  isComplete: boolean;
}
