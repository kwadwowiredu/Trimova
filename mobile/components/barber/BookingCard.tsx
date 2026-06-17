import { View, Text, Pressable } from 'react-native';
import { Calendar, MapPin, CheckCircle2, Circle } from 'lucide-react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';

export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  clientName: string;
  clientAvatar: string | null;
  serviceName: string;
  status: BookingStatus;
  /** ISO 8601 timestamp */
  startTime: string;
  endTime: string;
  locationAddress: string;
}

interface BookingCardProps {
  booking: Booking;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onLongPress?: (id: string) => void;
  onPress?: (id: string) => void;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  confirmed: { label: 'Confirmed', bg: '#FFF3DC', text: '#B7791F' },
  pending:   { label: 'Pending',   bg: '#EBF4FF', text: '#2B6CB0' },
  completed: { label: 'Completed', bg: '#F0FFF4', text: '#276749' },
  cancelled: { label: 'Cancelled', bg: '#FFF5F5', text: '#C53030' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isToday(date))    return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  return format(date, 'EEE d MMM, h:mm a');
}

export function BookingCard({
  booking,
  isSelected = false,
  isSelectionMode = false,
  onLongPress,
  onPress,
}: BookingCardProps) {
  const status = STATUS_CONFIG[booking.status];

  return (
    /*
      SHADOW PATTERN:
      • Outer Pressable = shadow host (no overflow-hidden so iOS shadow bleeds outside)
      • borderColor #E2E8F0 is visibly darker than the page bg #F5F6F8
        — neutral-100 (#f1f2f3) was lighter than the background, making it invisible.
      • Explicit shadowOpacity / elevation instead of NativeWind shadow-sm
        (shadow-sm maps to near-zero opacity values in React Native).
      • Inner View = overflow-hidden + rounded corners to clip content.
    */
    <Pressable
      onLongPress={() => onLongPress?.(booking.id)}
      onPress={() => isSelectionMode && onPress?.(booking.id)}
      delayLongPress={380}
      style={{
        backgroundColor: isSelected ? '#EEEEFC' : '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isSelected ? '#C7C7F5' : '#E2E8F0',
        shadowColor: '#1A202C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Clip container */}
      <View
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: isSelected ? '#EEEEFC' : '#ffffff' }}
      >
        {/* Checkbox in selection mode */}
        {isSelectionMode && (
          <View className="absolute top-3.5 right-3.5 z-10">
            {isSelected
              ? <CheckCircle2 size={22} color="#3c3cb9" />
              : <Circle      size={22} color="#CBD5E0" />
            }
          </View>
        )}

        {/* Card body */}
        <View className="px-4 pt-4 pb-3">
          {/* Top row */}
          <View className="flex-row items-start gap-3">
            <Avatar uri={booking.clientAvatar} name={booking.clientName} size={46} />

            <View className="flex-1" style={{ paddingRight: isSelectionMode ? 30 : 0 }}>
              <Text className="text-sm font-bold text-neutral-800" numberOfLines={1}>
                {booking.clientName}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                {booking.serviceName}
              </Text>
            </View>

            {!isSelectionMode && (
              <View
                style={{ backgroundColor: status.bg }}
                className="rounded-full px-3 py-1 self-start"
              >
                <Text style={{ color: status.text }} className="text-xs font-bold">
                  {status.label}
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View className="h-px bg-neutral-100 my-3" />

          {/* Date + location */}
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
      </View>
    </Pressable>
  );
}
