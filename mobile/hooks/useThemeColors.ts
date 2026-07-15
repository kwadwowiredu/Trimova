import { useColorScheme as useRNColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Central color palette for inline-styled screens. Reading from NativeWind's
 * color scheme (driven by the theme store via setColorScheme) means every
 * screen that uses these tokens restyles automatically when dark mode toggles.
 */
export interface ThemeColors {
  isDark: boolean;
  /** App screen background */
  bg: string;
  /** Cards, headers, sheets */
  surface: string;
  /** Subtle fills (chips, icon circles, input backgrounds) */
  surfaceAlt: string;
  /** Hairlines / borders */
  border: string;
  /** Primary text */
  text: string;
  /** Secondary text */
  textMuted: string;
  /** Faint text / placeholders */
  textFaint: string;
  /** Brand accent (unchanged across themes) */
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
  /** Overlay scrim for modals */
  overlay: string;
}

const LIGHT: ThemeColors = {
  isDark: false,
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F2F3',
  border: '#E2E8F8',
  text: '#1A202C',
  textMuted: '#718096',
  textFaint: '#A0AEC0',
  accent: '#3C3CB9',
  accentSoft: '#E0E0FF',
  danger: '#E53E3E',
  success: '#38A169',
  warning: '#D69E2E',
  overlay: 'rgba(0,0,0,0.4)',
};

const DARK: ThemeColors = {
  isDark: true,
  bg: '#0B0B0F',
  surface: '#17171F',
  surfaceAlt: '#23232D',
  border: '#2C2C38',
  text: '#F7FAFC',
  textMuted: '#A0AEC0',
  textFaint: '#6B7280',
  accent: '#8B8BF0',
  accentSoft: '#2A2A52',
  danger: '#FC8181',
  success: '#68D391',
  warning: '#F6C36B',
  overlay: 'rgba(0,0,0,0.6)',
};

export function useThemeColors(): ThemeColors {
  // Driven directly by the theme store (source of truth) so a toggle re-renders
  // every screen instantly. 'system' resolves via the OS appearance.
  const mode = useThemeStore((s) => s.mode);
  const system = useRNColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return isDark ? DARK : LIGHT;
}
