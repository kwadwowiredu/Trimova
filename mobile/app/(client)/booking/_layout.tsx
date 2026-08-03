import { Stack } from 'expo-router';

/** Booking wizard: service → professional → date & time → summary → payment. */
export default function BookingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
