import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_STORAGE_KEY } from '@/utils/constants';
import type { User, UserRole } from '@/types/user';

interface AuthState {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  role: null,
  isLoading: true,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
    set({ token, user, role: user.role, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
    set({ token: null, user: null, role: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
