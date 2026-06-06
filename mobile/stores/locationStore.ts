import { create } from 'zustand';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationState {
  coordinates: Coordinates | null;
  hasPermission: boolean | null;
  setCoordinates: (coordinates: Coordinates) => void;
  setPermission: (hasPermission: boolean) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  coordinates: null,
  hasPermission: null,

  setCoordinates: (coordinates) => set({ coordinates }),
  setPermission: (hasPermission) => set({ hasPermission }),
  clearLocation: () => set({ coordinates: null }),
}));
