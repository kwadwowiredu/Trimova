import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '@/services/bookings';
import { awaitingPayment, awaitingConfirmation } from '@/utils/bookingStatus';

/**
 * How many bookings are waiting on the client to do something.
 *
 * Two cases, both on a clock:
 *   • the barber accepted and the slot is held until payment;
 *   • the appointment is done and we're asking whether it went ahead, before
 *     the money is released.
 *
 * Both deserve a badge — neither is something a client would think to go
 * looking for, and both cost them if ignored.
 */
export function useActionableBookings(): number {
  const { data } = useQuery({
    queryKey: ['bookings', 'client'],
    queryFn: () => bookingsService.getClientBookings({ page: 1 }),
    refetchInterval: 15_000,
  });

  return (data?.data.data ?? []).filter(
    (b) => awaitingPayment(b) || awaitingConfirmation(b),
  ).length;
}
