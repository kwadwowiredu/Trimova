import { View, Text, Pressable } from 'react-native';
import { Calendar, MapPin, CheckCircle2, Circle, Eye } from 'lucide-react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Avatar } from '@/components/ui/Avatar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { tapLight, tapMedium, tapSelect } from '@/utils/haptics';

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined';

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
  /** True for mobile barbers, who vet each job before the client may pay. */
  requiresApproval: boolean;
  /**
   * When the barber accepted. A mobile booking stays `pending` after approval
   * until the client pays, so status alone can't tell "needs my decision" from
   * "waiting on their money" — this is what separates them.
   */
  approvedAt: string | null;
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
  /** Opens the full appointment detail sheet, where cancelling lives. */
  onOpen?: (id: string) => void;
}

function statusConfig(isDark: boolean): Record<BookingStatus, { label: string; bg: string; text: string }> {
  return {
    confirmed:   { label: 'Confirmed',   bg: isDark ? '#3A2E12' : '#FFF3DC', text: isDark ? '#F6C36B' : '#B7791F' },
    pending:     { label: 'Pending',     bg: isDark ? '#1E2A40' : '#EBF4FF', text: isDark ? '#90CDF4' : '#2B6CB0' },
    in_progress: { label: 'In progress', bg: isDark ? '#1E2A40' : '#EBF4FF', text: isDark ? '#90CDF4' : '#2B6CB0' },
    completed:   { label: 'Completed',   bg: isDark ? '#16271C' : '#F0FFF4', text: isDark ? '#68D391' : '#276749' },
    cancelled:   { label: 'Cancelled',   bg: isDark ? '#3A1B1B' : '#FFF5F5', text: isDark ? '#FC8181' : '#C53030' },
    declined:    { label: 'Declined',    bg: isDark ? '#3A1B1B' : '#FFF5F5', text: isDark ? '#FC8181' : '#C53030' },
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
  onOpen,

}: BookingCardProps) {
  const c = useThemeColors();
  const status = statusConfig(c.isDark)[booking.status];
  const cardBg = isSelected ? c.accentSoft : c.surface;
  // Only a request the barber hasn't answered yet needs Accept / Decline.
  // Once approved it's the client's move, so the card drops to View details.
  const awaitingDecision =
    booking.status === 'pending' && booking.requiresApproval && !booking.approvedAt;
  const showRequestActions = awaitingDecision && !!onAccept && !isSelectionMode;

  // A booking that's still going ahead can be opened; one already closed can't.
  const showManageActions =
    !isSelectionMode &&
    !showRequestActions &&
    ['pending', 'confirmed', 'in_progress'].includes(booking.status);

  return (
    <Pressable
      onLongPress={() => {
        // Entering selection mode is a mode change — it should feel like one.
        tapMedium();
        onLongPress?.(booking.id);
      }}
      onPress={() => {
        if (isSelectionMode) {
          tapSelect();
          onPress?.(booking.id);
          return;
        }
        // Tapping the card anywhere opens it, which is what people try first.
        if (onOpen) {
          tapLight();
          onOpen(booking.id);
        }
      }}
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
                onPress={() => { tapMedium(); onAccept?.(booking.id); }}
                style={{ flex: 1, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}
                className="active:opacity-80"
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                  {/* A mobile barber sets a travel fee while accepting, so the
                      label has to promise a next step rather than finality. */}
                  Review &amp; accept
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { tapLight(); onDecline?.(booking.id); }}
                style={{ flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1.5, borderColor: c.danger }}
                className="active:opacity-80"
              >
                <Text style={{ color: c.danger, fontSize: 13, fontWeight: '700' }}>Decline</Text>
              </Pressable>
            </View>
          )}

          {/*
            One way in. Cancelling lives inside the detail sheet, where the
            barber can see who they'd be standing up and what it costs before
            they commit — not as a button they can fat-finger on a list.
          */}
          {showManageActions && onOpen && (
            <Pressable
              onPress={() => { tapLight(); onOpen(booking.id); }}
              style={{ flexDirection: 'row', gap: 6, borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, marginTop: 12 }}
              className="active:opacity-80"
            >
              <Eye size={14} color={c.textMuted} />
              <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '700' }}>View details</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}
