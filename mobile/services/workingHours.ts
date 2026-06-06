import { api } from './api';
import type { ApiResponse } from '@/types/api';
import type { WorkingHours, Break } from '@/types/service';

export const workingHoursService = {
  getMyHours: () =>
    api.get<ApiResponse<WorkingHours[]>>('/working-hours/me'),

  updateHours: (hours: Partial<WorkingHours>[]) =>
    api.put<ApiResponse<WorkingHours[]>>('/working-hours/me', { hours }),

  getMyBreaks: () =>
    api.get<ApiResponse<Break[]>>('/breaks/me'),

  addBreak: (payload: Omit<Break, 'id' | 'barberId'>) =>
    api.post<ApiResponse<Break>>('/breaks', payload),

  deleteBreak: (id: string) =>
    api.delete<ApiResponse<null>>(`/breaks/${id}`),
};
