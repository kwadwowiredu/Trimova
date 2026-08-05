export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

// ── Brand / domain ──────────────────────────────────────────────────────────
// Single source of truth for every public-facing URL and address, so switching
// domains later (e.g. to a GitHub Student Pack .me domain) is a one-line change.
export const APP_DOMAIN = 'trimova.website';
export const SUPPORT_EMAIL = `support@${APP_DOMAIN}`;
export const PRIVACY_URL = `https://${APP_DOMAIN}/privacy`;

/** Public link to a barber's bookable profile. */
export const barberProfileLink = (barberId: string) => `${APP_DOMAIN}/b/${barberId}`;

export const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export const PAYSTACK_KEY = process.env.EXPO_PUBLIC_PAYSTACK_KEY ?? '';

export const GHANA_MAP_REGION = {
  latitude: 7.9465,
  longitude: -1.0232,
  latitudeDelta: 4.0,
  longitudeDelta: 4.0,
};

export const GHANA_BOUNDS = {
  northeast: { lat: 11.1748, lng: 1.2107 },
  southwest: { lat: 4.7383, lng: -3.2617 },
};

export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;
export const DEFAULT_RADIUS_KM = 10;
export const SEARCH_RADIUS_KM = 25;

export const PAYMENT_DEADLINE_HOURS = 24;

export const ITEMS_PER_PAGE = 20;

export const DEBOUNCE_MS = 300;

// ── Storage keys ─────────────────────────────────────────────────────────────
// SecureStore (user-scoped, cleared on logout)
export const TOKEN_STORAGE_KEY = 'user_token';

// AsyncStorage — USER-SCOPED: wiped on logout / account deletion.
export const PROFILE_CACHE_KEY    = 'profile_data';
export const FINANCIAL_STATS_KEY  = 'financial_stats';
export const ACTIVE_WORKSPACE_KEY = 'active_workspace_id';
export const LOYALTY_PROGRESS_KEY = 'loyalty_progress';

/** Every user-scoped AsyncStorage key. Logout removes exactly these — never AsyncStorage.clear(). */
export const USER_SCOPED_KEYS = [
  PROFILE_CACHE_KEY,
  FINANCIAL_STATS_KEY,
  ACTIVE_WORKSPACE_KEY,
  LOYALTY_PROGRESS_KEY,
] as const;

// AsyncStorage — DEVICE-GLOBAL: RETAINED across logout (never cleared here).
export const THEME_MODE_KEY            = 'is_dark_mode';
export const ONBOARDING_SEEN_KEY       = 'has_completed_onboarding';
export const PUSH_TOKEN_KEY            = 'push_token';
export const LANGUAGE_KEY              = 'language';

// Legacy keys kept only for one-time migration of existing installs.
export const LEGACY_THEME_KEY      = 'trimova_theme_mode';
export const LEGACY_ONBOARDING_KEY = 'trimova_onboarding_seen';
