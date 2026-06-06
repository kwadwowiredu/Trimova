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

  googleAuth: (idToken: string) =>
    api.post<ApiResponse<AuthResponse & { requiresRoleSelection?: boolean }>>('/auth/google', { idToken }),

  appleAuth: (identityToken: string, fullName?: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/apple', { identityToken, fullName }),

  updateRole: (role: UserRole) =>
    api.patch<ApiResponse<AuthResponse>>('/auth/role', { role }),
};
