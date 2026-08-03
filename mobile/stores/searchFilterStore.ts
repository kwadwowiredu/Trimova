import { create } from 'zustand';

// Client search filters — edited on the dedicated Filters screen, consumed by
// the map Search screen and the results Feed.
export const PRICE_MIN = 0;
export const PRICE_MAX = 500; // GHS ceiling for the range slider

export interface SearchFilters {
  venue?: 'barbershop' | 'mobile';
  sort?: 'rating' | 'distance';
  minRating: number;
  /** Service price range (GHS). Defaults to the full span = inactive. */
  priceMin: number;
  priceMax: number;
  /** Minimum discount on offer, e.g. 20 = "20% or more". 0 = any. */
  discount: number;
}

interface SearchFilterState extends SearchFilters {
  setFilters: (patch: Partial<SearchFilters>) => void;
  reset: () => void;
}

const INITIAL: SearchFilters = {
  venue: undefined,
  sort: undefined,
  minRating: 0,
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  discount: 0,
};

export const useSearchFilterStore = create<SearchFilterState>((set) => ({
  ...INITIAL,
  setFilters: (patch) => set(patch),
  reset: () => set({ ...INITIAL }),
}));

export function activeFilterCount(f: SearchFilters): number {
  return (
    (f.venue ? 1 : 0) +
    (f.sort ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.priceMin > PRICE_MIN || f.priceMax < PRICE_MAX ? 1 : 0) +
    (f.discount > 0 ? 1 : 0)
  );
}
