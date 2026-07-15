import { View, Text, Pressable } from 'react-native';
import { Calendar, MapPin, CheckCircle2, Circle } from 'lucide-react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { useThemeColors } from '@/hooks/useThemeColors';

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
  /** Freelance barbers must accept requests — when provided (and the booking is
   *  pending) the card shows Accept / Decline actions. */
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

function statusConfig(isDark: boolean): Record<BookingStatus, { label: string; bg: string; text: string }> {
  return {
    confirmed: { label: 'Confirmed', bg: isDark ? '#3A2E12' : '#FFF3DC', text: isDark ? '#F6C36B' : '#B7791F' },
    pending:   { label: 'Pending',   bg: isDark ? '#1E2A40' : '#EBF4FF', text: isDark ? '#90CDF4' : '#2B6CB0' },
    completed: { label: 'Completed', bg: isDark ? '#16271C' : '#F0FFF4', text: isDark ? '#68D391' : '#276749' },
    cancelled: { label: 'Cancelled', bg: isDark ? '#3A1B1B' : '#FFF5F5', text: isDark ? '#FC8181' : '#C53030' },
  };
}

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
  onAccept,
  onDecline,
}: BookingCardProps) {
  const c = useThemeColors();
  const status = statusConfig(c.isDark)[booking.status];
  const cardBg = isSelected ? c.accentSoft : c.surface;
  const showRequestActions = booking.status === 'pending' && !!onAccept && !isSelectionMode;

  return (
    <Pressable
      onLongPress={() => onLongPress?.(booking.id)}
      onPress={() => isSelectionMode && onPress?.(booking.id)}
      delayLongPress={380}
      style={{
        backgroundColor: cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isSelected ? c.accent : c.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: c.isDark ? 0.25 : 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Clip container */}
      <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
        {/* Checkbox in selection mode */}
        {isSelectionMode && (
          <View className="absolute top-3.5 right-3.5 z-10">
            {isSelected
              ? <CheckCircle2 size={22} color={c.accent} />
              : <Circle      size={22} color={c.textFaint} />
            }
          </View>
        )}

        {/* Card body */}
        <View className="px-4 pt-4 pb-3">
          {/* Top row */}
          <View className="flex-row items-start gap-3">
            <Avatar uri={booking.clientAvatar} name={booking.clientName} size={46} />

            <View className="flex-1" style={{ paddingRight: isSelectionMode ? 30 : 0 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }} numberOfLines={1}>
                {booking.clientName}
              </Text>
              <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }} numberOfLines={1}>
                {booking.serviceName}
              </Text>
            </View>

            {!isSelectionMode && (
              <View style={{ backgroundColor: status.bg }} className="rounded-full px-3 py-1 self-start">
                <Text style={{ color: status.text, fontSize: 12, fontWeight: '700' }}>
                  {status.label}
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />

          {/* Date + location */}
          <View className="flex-row gap-4">
            <View className="flex-row items-center gap-1.5 flex-1">
              <Calendar size={13} color={c.textFaint} />
              <Text style={{ fontSize: 12, color: c.textMuted, flexShrink: 1 }} numberOfLines={1}>
                {formatDate(booking.startTime)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5 flex-1">
              <MapPin size={13} color={c.textFaint} />
              <Text style={{ fontSize: 12, color: c.textMuted, flexShrink: 1 }} numberOfLines={1}>
                {booking.locationAddress}
              </Text>
            </View>
          </View>

          {/* Accept / Decline — freelance request flow */}
          {showRequestActions && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => onAccept?.(booking.id)}
                style={{ flex: 1, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}
                className="active:opacity-80"
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Accept</Text>
              </Pressable>
              <Pressable
                onPress={() => onDecline?.(booking.id)}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: c.danger }}
                className="active:opacity-80"
              >
                <Text style={{ color: c.danger, fontSize: 13, fontWeight: '700' }}>Decline</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
