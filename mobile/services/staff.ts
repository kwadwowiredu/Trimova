import { api } from './api';
import type { ApiResponse } from '@/types/api';
import type { StaffBarber } from '@/types/user';

export interface CreateStaffPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  specialties?: string[];
}

export const staffService = {
  getAll: () =>
    api.get<ApiResponse<StaffBarber[]>>('/staff'),

  create: (payload: CreateStaffPayload) =>
    api.post<ApiResponse<StaffBarber>>('/staff', payload),

  update: (id: string, payload: Partial<Pick<StaffBarber, 'fullName' | 'phone' | 'specialties'>>) =>
    api.put<ApiResponse<StaffBarber>>(`/staff/${id}`, payload),

  toggleActive: (id: string) =>
    api.patch<ApiResponse<StaffBarber>>(`/staff/${id}/toggle`),

  resetPassword: (id: string) =>
    api.post<ApiResponse<{ newPassword: string }>>(`/staff/${id}/reset-password`),
};
