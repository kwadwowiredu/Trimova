import { create } from 'zustand';

// Bumped every time the user taps the Home tab. Home screens watch their
// respective nonce and respond by scrolling to top + refetching — the
// Instagram/TikTok "tap the active tab to refresh" behaviour.
interface RefreshState {
  clientHome: number;
  barberHome: number;
  bumpClientHome: () => void;
  bumpBarberHome: () => void;
}

export const useRefreshSignal = create<RefreshState>((set) => ({
  clientHome: 0,
  barberHome: 0,
  bumpClientHome: () => set((s) => ({ clientHome: s.clientHome + 1 })),
  bumpBarberHome: () => set((s) => ({ barberHome: s.barberHome + 1 })),
}));
