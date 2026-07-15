import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_STORAGE_KEY, PROFILE_CACHE_KEY, USER_SCOPED_KEYS } from '@/utils/constants';
import { authService } from '@/services/auth';
import { useOnboardingStore } from '@/stores/onboardingStore';
import type { User, UserRole } from '@/types/user';

interface AuthState {
  token: string | null;
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  /** True once the persisted cache has been rehydrated from AsyncStorage. */
  hasHydrated: boolean;

  setAuth: (token: string, user: User) => Promise<void>;
  updateUser: (fields: Partial<User> & Record<string, unknown>) => void;
  /** Merge a SERVER response into the user, ignoring null/undefined fields so a
   *  partially-failing backend can never wipe locally-known values. */
  mergeUser: (fields: Record<string, unknown>) => void;
  /** Silently pull the latest profile from the backend and merge into the cache. */
  syncUser: () => Promise<void>;
  logout: () => Promise<void>;
  /** Remove ONLY user-scoped keys. Device-global flags (theme, onboarding, push
   *  token, language) are deliberately retained. Never AsyncStorage.clear(). */
  clearStorage: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  setHasHydrated: (v: boolean) => void;
}

/**
 * Keep only the keys actually present (and non-null) in the freshly fetched
 * server object, so a silent background sync never wipes a locally-edited field
 * the backend doesn't (yet) know about.
 */
function mergeFresh(current: User | null, fresh: Record<string, unknown>): User {
  const meaningful: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fresh)) {
    if (v !== null && v !== undefined) meaningful[k] = v;
  }
  return { ...(current ?? {}), ...meaningful } as User;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      role: null,
      isLoading: true,
      hasHydrated: false,

      setAuth: async (token, user) => {
        await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
        set({ token, user, role: user.role, isLoading: false });
      },

      updateUser: (fields) =>
        set((state) => ({
          user: state.user ? ({ ...state.user, ...fields } as User) : null,
        })),

      mergeUser: (fields) =>
        set((state) => ({
          user: state.user ? mergeFresh(state.user, fields) : null,
        })),

      syncUser: async () => {
        try {
          const res = await authService.getMe();
          const fresh = res.data.data as unknown as Record<string, unknown>;
          set((state) => ({
            user: mergeFresh(state.user, fresh),
            role: (fresh.role as UserRole) ?? state.role,
          }));
        } catch {
          // Offline or token invalid — keep the cached copy, fail silently.
        }
      },

      logout: async () => {
        // Best-effort: tell the backend to disassociate this device's push token
        // from the user (the token itself stays on the device). Runs while the
        // auth token is still valid, so before we delete it.
        try { await authService.logout(); } catch { /* offline — ignore */ }

        await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
        await get().clearStorage();
        // Clear any in-memory onboarding draft so the next account starts fresh.
        useOnboardingStore.getState().reset();
        set({ token: null, user: null, role: null, isLoading: false });
      },

      clearStorage: async () => {
        // Explicitly remove user-scoped keys only — device-global flags
        // (is_dark_mode, has_completed_onboarding, push_token, language) remain.
        await AsyncStorage.multiRemove([...USER_SCOPED_KEYS]);
      },

      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: PROFILE_CACHE_KEY, // 'profile_data'
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the cached profile — the token lives in SecureStore.
      partialize: (state) => ({ user: state.user, role: state.role }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
