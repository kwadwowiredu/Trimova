import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, TOKEN_STORAGE_KEY } from '@/utils/constants';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Only clear the token when the SERVER says the token itself is bad.
    // Endpoint-level 401s (e.g. a wrong password on verify/change/delete) must
    // NOT log the user out.
    const data = error.response?.data as { code?: string } | undefined;
    if (error.response?.status === 401 && data?.code === 'TOKEN_INVALID') {
      await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error.response) return 'Something went wrong. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}
