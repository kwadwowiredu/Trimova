import { NotificationsList } from '@/components/barber/NotificationsList';

/** A staff barber's own notifications. */
export default function StaffNotificationsScreen() {
  return <NotificationsList bookingsRoute="/(staff)/(tabs)/bookings" />;
}
