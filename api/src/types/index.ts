export type UserRole = 'client' | 'barber' | 'staff_barber' | 'admin';
export type BarberType = 'barbershop' | 'mobile';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'declined';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
