import { api } from './api';
import type { ApiResponse } from '@/types/api';
import type { Notification } from '@/types/notification';

export const notificationsService = {
  getAll: () =>
    api.get<ApiResponse<Notification[]>>('/notifications'),

  markRead: (id: string) =>
    api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<ApiResponse<null>>('/notifications/read-all'),

  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    api.post<ApiResponse<null>>('/notifications/register', { token, platform }),
};
