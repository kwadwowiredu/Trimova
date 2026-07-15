import { api } from './api';
import type { ApiResponse } from '@/types/api';

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string }[];
}

export const workingHoursService = {
  /** Returns the saved week, or null if the barber hasn't set one yet. */
  getMine: () =>
    api.get<ApiResponse<DaySchedule[] | null>>('/working-hours/me'),

  /** Replace the whole week. */
  save: (schedule: DaySchedule[]) =>
    api.put<ApiResponse<DaySchedule[]>>('/working-hours/me', { schedule }),
};
