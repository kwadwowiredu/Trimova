import { useCallback, useState } from 'react';
import {
  View, Text, Pressable, FlatList, RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Car, Store, UserRound } from 'lucide-react-native';
import { CalendarBadge } from '@/components/ui/Icons';
import { BookingListSkeleton } from '@/components/client/BookingSkeleton';
import { AppointmentDetailSheet } from '@/components/client/AppointmentDetailSheet';
import { bookingsService } from '@/services/bookings';
import { fmt12 } from '@/stores/bookingStore';
import { bookingBadge, isUpcoming, splitScheduled } from '@/utils/bookingStatus';
import { tapSelect } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import type { Booking } from '@/types/booking';

type Tab = 'upcoming' | 'past';

/** The client's side of the booking transaction — everything they've booked. */
export default function BookingsScreen() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);
  // Pull-to-refresh gets its own flag. Wiring the spinner to react-query's
  // isRefetching leaves it spinning after a background invalidation from
  // another screen, because nothing ever tells the control to retract.
  const [pulling, setPulling] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'client'],
    queryFn: () => bookingsService.getClientBookings({ page: 1 }),
    // A barber accepting a request or cancelling should show up here on its
    // own — the client shouldn't have to pull to find out.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const onPullRefresh = useCallback(async () => {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  }, [refetch]);

  const all = data?.data.data ?? [];
  const bookings = all.filter((b) => (tab === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)));

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: '500', color: T.accent }}>My Bookings</Text>
      </View>

      {/* Upcoming / Past */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14 }}>
        {(['upcoming', 'past'] as Tab[]).map((t) => {
          const on = tab === t;
          const count = all.filter((b) => (t === 'upcoming' ? isUpcoming(b) : !isUpcoming(b))).length;
          return (
            <Pressable
              key={t}
              onPress={() => { tapSelect(); setTab(t); }}
              style={{
                borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9,
                backgroundColor: on ? T.accent : T.card,
                borderWidth: on ? 0 : HAIRLINE, borderColor: T.border,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: on ? T.onAccent : T.textMuted }}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}{count ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <BookingListSkeleton />
      ) : bookings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <CalendarBadge size={64} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: T.accent, marginTop: 16, textAlign: 'center' }}>
            {tab === 'upcoming' ? 'No bookings yet' : 'Nothing here yet'}
          </Text>
          <Text style={{ fontSize: 14, color: T.textFaint, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            {tab === 'upcoming'
              ? 'Find a barber, pick a service, and book your first appointment!'
              : 'Your completed and cancelled appointments will show up here.'}
          </Text>
          {tab === 'upcoming' && (
            <Pressable
              onPress={() => router.push('/(client)/(tabs)/search' as never)}
              style={{ backgroundColor: T.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 }}
            >
              <Text style={{ color: T.onAccent, fontWeight: '700', fontSize: 14 }}>Find a Barber</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={pulling} onRefresh={onPullRefresh} tintColor={T.accent} />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => { tapSelect(); setOpenBookingId(item.id); }}
            />
          )}
        />
      )}

      <AppointmentDetailSheet
        bookingId={openBookingId}
        onClose={() => setOpenBookingId(null)}
      />
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A booking at a glance: what, with whom, and when.
 *
 * Deliberately has no buttons. Three actions crammed onto a card overflowed on
 * narrow screens, and none of them are ones you want a client firing by
 * accident — they live in the detail sheet, one tap away.
 */
function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const badge = bookingBadge(booking);
  const tone = chip(badge.tone);
  const { date, time } = splitScheduled(booking.scheduledAt);
  const [year, month, day] = date.split('-').map(Number);
  const isMobileJob = !!booking.clientLocation;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        backgroundColor: T.card,
        borderRadius: 10,
        borderWidth: HAIRLINE,
        borderColor: T.border,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.17,
        shadowRadius: 8,
        elevation: 4,
      }}
      android_ripple={{ color: T.input }}
    >
      {/* Left: what and with whom */}
      <View style={{ flex: 1, padding: 14, paddingRight: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: '500', color: tone.fg }}>{badge.label}</Text>
          </View>
        </View>

        <Text
          style={{ fontSize: 14, fontWeight: '600', color: T.text, marginTop: 10, letterSpacing: -0.2 }}
          numberOfLines={1}
        >
          {booking.serviceName}
        </Text>
        <Text style={{ fontSize: 14, color: T.textFaint, marginTop: 2 }} numberOfLines={1}>
          with {booking.barberName.split(' ')[0]}
        </Text>

        {/* Where it happens: the shop, or the address a mobile barber comes to */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 }}>
          {booking.barberAvatarUrl ? (
            <Image
              source={{ uri: booking.barberAvatarUrl }}
              style={{ width: 30, height: 30, borderRadius: 15 }}
            />
          ) : (
            <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: HAIRLINE, borderColor: T.border, alignItems: 'center', justifyContent: 'center' }}>
              <UserRound size={16} color={T.textDisabled} strokeWidth={1.8} />
            </View>
          )}
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: T.text }} numberOfLines={1}>
            {isMobileJob ? booking.clientLocation!.address : booking.shopName}
          </Text>
          {isMobileJob
            ? <Car size={14} color={T.textDisabled} />
            : <Store size={14} color={T.textDisabled} />}
        </View>
      </View>

      {/* Right rail: the date, readable from across the room */}
      <View
        style={{
          width: 104,
          borderLeftWidth: HAIRLINE,
          borderLeftColor: T.border,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 18,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textMuted }}>
          {MONTHS[month - 1]}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: '600', color: T.text, lineHeight: 38, letterSpacing: -0.5 }}>
          {day}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: T.textMuted, marginTop: 2 }}>
          {fmt12(time)}
        </Text>
        {/* The year only earns its place when it isn't the obvious one. */}
        {year !== new Date().getFullYear() && (
          <Text style={{ fontSize: 11.5, color: T.textDisabled, marginTop: 2 }}>{year}</Text>
        )}
      </View>
    </Pressable>
  );
}
