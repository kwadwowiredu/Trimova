export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api';

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

export const TOKEN_STORAGE_KEY = 'trimova_auth_token';
export const ONBOARDING_SEEN_KEY = 'trimova_onboarding_seen';
