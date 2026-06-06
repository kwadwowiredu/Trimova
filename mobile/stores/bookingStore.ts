import { create } from 'zustand';
import type { Service } from '@/types/service';
import type { BarberProfile } from '@/types/user';
import type { BookingLocation } from '@/types/booking';

interface BookingState {
  selectedBarber: BarberProfile | null;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  clientLocation: BookingLocation | null;
  notes: string;

  setBarber: (barber: BarberProfile) => void;
  setService: (service: Service) => void;
  setDateTime: (date: string, time: string) => void;
  setClientLocation: (location: BookingLocation) => void;
  setNotes: (notes: string) => void;
  reset: () => void;
}

const initialState = {
  selectedBarber: null,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  clientLocation: null,
  notes: '',
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setBarber: (barber) => set({ selectedBarber: barber }),
  setService: (service) => set({ selectedService: service }),
  setDateTime: (date, time) => set({ selectedDate: date, selectedTime: time }),
  setClientLocation: (location) => set({ clientLocation: location }),
  setNotes: (notes) => set({ notes }),
  reset: () => set(initialState),
}));
