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
  /** ISO 8601 timestamp — e.g. "2026-06-06T14:00:00.000Z" */
  startTime: string;
  endTime: string;
  locationAddress: string;
}

interface BookingCardProps {
  booking: Booking;
  /** Whether this card is currently selected in batch-select mode */
  isSelected?: boolean;
  /** Whether the list is in batch-select mode */
  isSelectionMode?: boolean;
  /** Called on long-press — parent enters selection mode */
  onLongPress?: (id: string) => void;
  /** Called on tap while in selection mode — parent toggles selection */
  onPress?: (id: string) => void;
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
      SHADOW PATTERN (React Native):
      • Shadow props live on the OUTER container (Pressable) which has NO overflow-hidden.
        iOS requires a transparent or opaque background on the shadow host;
        since we need overflow-hidden on the card itself for rounded corners, we
        split into two nested Views.
      • The INNER View has bg-white + overflow-hidden + rounded corners — clips content.
      • elevation (Android) is on the outer Pressable too.
    */
    <Pressable
      onLongPress={() => onLongPress?.(booking.id)}
      onPress={() => isSelectionMode && onPress?.(booking.id)}
      delayLongPress={380}
      /*
        iOS shadow requires a non-transparent backgroundColor on the shadow host.
        backgroundColor lives here (no overflow-hidden) so the shadow renders
        outside the card. The inner View clips content with overflow-hidden at the
        same border radius.
      */
      style={{
        backgroundColor: isSelected ? '#EEEEFC' : '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
      }}
    >
      {/* Content clip container — clips children to rounded corners */}
      <View
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: isSelected ? '#EEEEFC' : '#ffffff' }}
      >
        {/* Checkbox — only rendered in selection mode */}
        {isSelectionMode && (
          <View className="absolute top-3.5 right-3.5 z-10">
            {isSelected
              ? <CheckCircle2 size={22} color="#3c3cb9" />
              : <Circle      size={22} color="#CBD5E0" />
            }
          </View>
        )}

        {/* ── Card body ──────────────────────────────────────── */}
        <View className="px-4 pt-4 pb-3">
          {/* Top row: avatar · name · service · status badge */}
          <View className="flex-row items-start gap-3">
            <Avatar uri={booking.clientAvatar} name={booking.clientName} size={46} />

            {/* Shrink right edge to avoid overlapping the checkbox */}
            <View className="flex-1" style={{ paddingRight: isSelectionMode ? 30 : 0 }}>
              <Text className="text-sm font-bold text-neutral-800" numberOfLines={1}>
                {booking.clientName}
              </Text>
              <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
                {booking.serviceName}
              </Text>
            </View>

            {/* Status badge hidden during selection mode to reduce visual noise */}
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

          {/* Date / time + location */}
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
