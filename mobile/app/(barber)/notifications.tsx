import { NotificationsList } from '@/components/barber/NotificationsList';

/** A barbershop owner's or freelancer's notifications. */
export default function BarberNotificationsScreen() {
  return <NotificationsList bookingsRoute="/(barber)/(tabs)/bookings" />;
}
