export interface Service {
  id: string;
  barberId: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  price: number;
  duration: number;
}

export interface UpdateServicePayload {
  name?: string;
  description?: string;
  price?: number;
  duration?: number;
  isActive?: boolean;
}

export interface WorkingHours {
  id: string;
  barberId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}

export interface Break {
  id: string;
  barberId: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  isRecurring: boolean;
  dayOfWeek: number | null;
}
