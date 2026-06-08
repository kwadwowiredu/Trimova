import { View, Text, Pressable } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';

export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  clientName: string;
  clientAvatar: string | null;
  serviceName: string;
  status: BookingStatus;
  /** ISO 8601 timestamp — e.g. "2026-06-06T14:00:00.000Z" */
  startTime: string;
  endTime: string;
  locationAddress: string;
}

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
  /** Hide cancel button for completed / cancelled tabs */
  showCancel?: boolean;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; bg: string; text: string }
> = {
  confirmed: { label: 'Confirmed', bg: '#FFF3DC', text: '#B7791F' },
  pending:   { label: 'Pending',   bg: '#EBF4FF', text: '#2B6CB0' },
  completed: { label: 'Completed', bg: '#F0FFF4', text: '#276749' },
  cancelled: { label: 'Cancelled', bg: '#FFF5F5', text: '#C53030' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'EEE d MMM, h:mm a');
}

export function BookingCard({ booking, onCancel, showCancel = true }: BookingCardProps) {
  const status = STATUS_CONFIG[booking.status];

  return (
    <View
      className="bg-white rounded-2xl mx-4 mb-3 overflow-hidden"
      style={{
        shadowColor: 'red',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 16,
        elevation: 5,
      }}
    >
      {/* Card body */}
      <View className="px-4 pt-4 pb-3">
        {/* Top row: avatar + name + service + status badge */}
        <View className="flex-row items-start gap-3">
          <Avatar uri={booking.clientAvatar} name={booking.clientName} size={46} />

          <View className="flex-1">
            <Text className="text-sm font-bold text-neutral-800" numberOfLines={1}>
              {booking.clientName}
            </Text>
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
              {booking.serviceName}
            </Text>
          </View>

          {/* Status badge */}
          <View
            style={{ backgroundColor: status.bg }}
            className="rounded-full px-3 py-1 self-start"
          >
            <Text style={{ color: status.text }} className="text-xs font-bold">
              {status.label}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View className="h-px bg-neutral-100 my-3" />

        {/* Date/time + location row */}
        <View className="flex-row gap-4">
          <View className="flex-row items-center gap-1.5 flex-1">
            <Calendar size={13} color="#A0AEC0" />
            <Text className="text-xs text-neutral-800 flex-shrink" numberOfLines={1}>
              {formatDate(booking.startTime)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 flex-1">
            <MapPin size={13} color="#A0AEC0" />
            <Text className="text-xs text-neutral-800 flex-shrink" numberOfLines={1}>
              {booking.locationAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* Cancel button — only for upcoming/pending */}
      {showCancel && booking.status !== 'cancelled' && booking.status !== 'completed' && (
        <Pressable
          onPress={() => onCancel?.(booking.id)}
          className="border-t border-neutral-100 py-3 items-center active:bg-neutral-50"
        >
          <Text className="text-sm font-semibold text-neutral-600">Cancel Appointment</Text>
        </Pressable>
      )}
    </View>
  );
}
