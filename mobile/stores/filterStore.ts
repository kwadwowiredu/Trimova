import { create } from 'zustand';
import type { BarberType } from '@/types/user';
import { DEFAULT_RADIUS_KM } from '@/utils/constants';

type SortBy = 'distance' | 'rating' | 'price';

interface FilterState {
  barberType: BarberType | null;
  minRating: number | null;
  radiusKm: number;
  sortBy: SortBy;
  serviceQuery: string;

  setBarberType: (type: BarberType | null) => void;
  setMinRating: (rating: number | null) => void;
  setRadius: (km: number) => void;
  setSortBy: (sort: SortBy) => void;
  setServiceQuery: (query: string) => void;
  reset: () => void;
}

const initialState = {
  barberType: null,
  minRating: null,
  radiusKm: DEFAULT_RADIUS_KM,
  sortBy: 'distance' as SortBy,
  serviceQuery: '',
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,

  setBarberType: (type) => set({ barberType: type }),
  setMinRating: (rating) => set({ minRating: rating }),
  setRadius: (km) => set({ radiusKm: km }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setServiceQuery: (query) => set({ serviceQuery: query }),
  reset: () => set(initialState),
}));
