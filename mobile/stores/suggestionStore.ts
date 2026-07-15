import { create } from 'zustand';

// Tiny bridge so the "See suggestions" screen can hand a picked service name
// back to whichever screen opened it (onboarding services-setup or the settings
// Services screen) after router.back(). The opener consumes + clears it on focus.
interface SuggestionState {
  picked: string | null;
  setPicked: (name: string) => void;
  clear: () => void;
}

export const useSuggestionStore = create<SuggestionState>((set) => ({
  picked: null,
  setPicked: (picked) => set({ picked }),
  clear: () => set({ picked: null }),
}));
