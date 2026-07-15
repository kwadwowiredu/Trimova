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

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface AuthResponse {
  token: string;
  user: import('./user').User;
}

export interface SearchBarbersParams {
  lat?: number;
  lng?: number;
  radius?: number;
  /** Free-text query — matches barber names and business names. */
  q?: string;
  /** Barber-type filter; the API expects this as `type`. */
  type?: 'barbershop' | 'mobile';
  service?: string;
  barberType?: 'barbershop' | 'mobile';
  minRating?: number;
  sortBy?: 'distance' | 'rating' | 'price';
  page?: number;
  limit?: number;
}
