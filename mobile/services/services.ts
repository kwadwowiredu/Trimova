import { api } from './api';
import type { ApiResponse } from '@/types/api';

/** Service shape returned by the API (matches the Services screen). */
export interface ApiService {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMins: number;
  isActive: boolean;
}

export interface ServiceInput {
  name: string;
  description: string;
  price: number;
  durationMins: number;
}

export const servicesService = {
  getMine: () =>
    api.get<ApiResponse<ApiService[]>>('/services/me'),

  create: (payload: ServiceInput) =>
    api.post<ApiResponse<ApiService>>('/services', payload),

  update: (id: string, payload: Partial<ServiceInput>) =>
    api.put<ApiResponse<ApiService>>(`/services/${id}`, payload),

  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/services/${id}`),
};
