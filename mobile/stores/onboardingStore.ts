import { create } from 'zustand';

export type BarberTypeOption = 'barbershop' | 'mobile';

interface BarberLocation {
  lat: number;
  lng: number;
  address: string;
}

interface OnboardingState {
  barberType: BarberTypeOption | null;
  shopName: string;
  shopPhone: string;
  location: BarberLocation | null;

  setBarberType: (type: BarberTypeOption) => void;
  setShopName: (name: string) => void;
  setShopPhone: (phone: string) => void;
  setLocation: (location: BarberLocation) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  barberType: null,
  shopName: '',
  shopPhone: '',
  location: null,

  setBarberType: (barberType) => set({ barberType }),
  setShopName: (shopName) => set({ shopName }),
  setShopPhone: (shopPhone) => set({ shopPhone }),
  setLocation: (location) => set({ location }),
  reset: () =>
    set({ barberType: null, shopName: '', shopPhone: '', location: null }),
}));
