import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME_MODE_KEY, LEGACY_THEME_KEY } from '@/utils/constants';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadMode: () => Promise<void>;
}

function isMode(v: unknown): v is ThemeMode {
  return v === 'light' || v === 'dark' || v === 'system';
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',

  setMode: async (mode) => {
    set({ mode });
    // Device-global preference — NOT cleared on logout.
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  },

  loadMode: async () => {
    let saved = await AsyncStorage.getItem(THEME_MODE_KEY);
    // One-time migration from the legacy key so existing installs keep their pick.
    if (!saved) {
      const legacy = await AsyncStorage.getItem(LEGACY_THEME_KEY);
      if (isMode(legacy)) {
        saved = legacy;
        await AsyncStorage.setItem(THEME_MODE_KEY, legacy);
        await AsyncStorage.removeItem(LEGACY_THEME_KEY);
      }
    }
    if (isMode(saved)) set({ mode: saved });
  },
}));
