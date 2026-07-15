import { api } from './api';
import type { ApiResponse, AuthResponse } from '@/types/api';
import type { UserRole } from '@/types/user';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: (payload: RegisterPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', payload),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', { token, password }),

  refreshToken: () =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh'),

  getMe: () =>
    api.get<ApiResponse<AuthResponse['user']>>('/auth/me'),

  updateProfile: (payload: Record<string, unknown>) =>
    api.patch<ApiResponse<AuthResponse['user']>>('/auth/me', payload),

  googleAuth: (idToken: string) =>
    api.post<ApiResponse<AuthResponse & { requiresRoleSelection?: boolean }>>('/auth/google', { idToken }),

  appleAuth: (identityToken: string, fullName?: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/apple', { identityToken, fullName }),

  updateRole: (role: UserRole) =>
    api.patch<ApiResponse<AuthResponse>>('/auth/role', { role }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/change-password', { currentPassword, newPassword }),

  /** Confirm the current password (used before destructive flows like account deletion). */
  verifyPassword: (password: string) =>
    api.post<ApiResponse<{ valid: boolean }>>('/auth/verify-password', { password }),

  /** Disassociate this device's push token from the user on the backend. */
  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout'),

  /** Permanently delete the account (and all owned data) from the database. */
  deleteAccount: (password?: string) =>
    api.delete<ApiResponse<null>>('/auth/me', { data: { password } }),
};
