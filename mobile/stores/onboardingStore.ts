import { create } from 'zustand';
import { DEFAULT_RADIUS_KM } from '@/utils/constants';
import type { DaySchedule } from '@/services/workingHours';

export type BarberTypeOption = 'barbershop' | 'mobile';

interface BarberLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface OnboardingService {
  name: string;
  price: number;
  durationMins: number;
}

interface OnboardingState {
  barberType: BarberTypeOption | null;
  shopName: string;
  shopPhone: string;
  location: BarberLocation | null;
  /** Freelance (mobile) barbers: how far they're willing to travel, in km. */
  serviceRadius: number;

  // Wizard media + menu (collected across the steps)
  coverUri: string | null;
  avatarUri: string | null;
  portfolioUris: string[];
  services: OnboardingService[];
  /** Weekly working hours, edited across the working-hours list + day screens. */
  workingHours: DaySchedule[] | null;

  setBarberType: (type: BarberTypeOption) => void;
  setShopName: (name: string) => void;
  setShopPhone: (phone: string) => void;
  setLocation: (location: BarberLocation) => void;
  setServiceRadius: (km: number) => void;
  setCoverUri: (uri: string | null) => void;
  setAvatarUri: (uri: string | null) => void;
  setPortfolioUris: (uris: string[]) => void;
  setServices: (services: OnboardingService[]) => void;
  setWorkingHours: (schedule: DaySchedule[]) => void;
  reset: () => void;
}

const INITIAL = {
  barberType: null,
  shopName: '',
  shopPhone: '',
  location: null,
  serviceRadius: DEFAULT_RADIUS_KM,
  coverUri: null,
  avatarUri: null,
  portfolioUris: [] as string[],
  services: [] as OnboardingService[],
  workingHours: null as DaySchedule[] | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...INITIAL,

  setBarberType: (barberType) => set({ barberType }),
  setShopName: (shopName) => set({ shopName }),
  setShopPhone: (shopPhone) => set({ shopPhone }),
  setLocation: (location) => set({ location }),
  setServiceRadius: (serviceRadius) => set({ serviceRadius }),
  setCoverUri: (coverUri) => set({ coverUri }),
  setAvatarUri: (avatarUri) => set({ avatarUri }),
  setPortfolioUris: (portfolioUris) => set({ portfolioUris }),
  setServices: (services) => set({ services }),
  setWorkingHours: (workingHours) => set({ workingHours }),
  reset: () => set({ ...INITIAL }),
}));
