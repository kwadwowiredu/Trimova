import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BarberListItem } from '@/types/user';

/**
 * Client browsing state persisted on-device:
 * - recentlyViewed: the last 6 barber profiles the client opened (newest first)
 * - favorites: barbers the client hearted on their detail screen
 */
interface ClientBrowseState {
  recentlyViewed: BarberListItem[];
  favorites: BarberListItem[];
  recordView: (barber: BarberListItem) => void;
  toggleFavorite: (barber: BarberListItem) => void;
  isFavorite: (id: string) => boolean;
  /**
   * Drop a barber from both lists. These lists are on-device SNAPSHOTS taken
   * when the client viewed a profile, so a barber who later deletes their
   * account would otherwise linger here forever (name cached locally, photos
   * already gone from storage). Call this whenever the server says they're gone.
   */
  removeBarber: (id: string) => void;
}

export const useClientBrowseStore = create<ClientBrowseState>()(
  persist(
    (set, get) => ({
      recentlyViewed: [],
      favorites: [],

      recordView: (barber) =>
        set((s) => ({
          recentlyViewed: [barber, ...s.recentlyViewed.filter((b) => b.id !== barber.id)].slice(0, 6),
        })),

      toggleFavorite: (barber) =>
        set((s) => ({
          favorites: s.favorites.some((b) => b.id === barber.id)
            ? s.favorites.filter((b) => b.id !== barber.id)
            : [barber, ...s.favorites],
        })),

      isFavorite: (id) => get().favorites.some((b) => b.id === id),

      removeBarber: (id) =>
        set((s) => ({
          favorites: s.favorites.filter((b) => b.id !== id),
          recentlyViewed: s.recentlyViewed.filter((b) => b.id !== id),
        })),
    }),
    {
      name: 'trimova_client_browse',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
