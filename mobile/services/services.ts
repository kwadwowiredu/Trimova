import { api } from './api';
import type { ApiResponse } from '@/types/api';
import type { Service, CreateServicePayload, UpdateServicePayload } from '@/types/service';

export const servicesService = {
  getBarberServices: (barberId: string) =>
    api.get<ApiResponse<Service[]>>(`/barbers/${barberId}/services`),

  getMyServices: () =>
    api.get<ApiResponse<Service[]>>('/services/me'),

  create: (payload: CreateServicePayload) =>
    api.post<ApiResponse<Service>>('/services', payload),

  update: (id: string, payload: UpdateServicePayload) =>
    api.put<ApiResponse<Service>>(`/services/${id}`, payload),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/services/${id}`),

  toggleActive: (id: string) =>
    api.patch<ApiResponse<Service>>(`/services/${id}/toggle`),
};
