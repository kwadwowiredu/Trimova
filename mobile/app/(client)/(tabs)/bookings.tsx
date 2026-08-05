import { useState } from 'react';
import {
  View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, MapPin, Car, Store, ChevronRight } from 'lucide-react-native';
import { CalendarBadge } from '@/components/ui/Icons';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { fmt12, fmtDateLong } from '@/stores/bookingStore';
import { bookingBadge, isUpcoming, awaitingPayment, splitScheduled } from '@/utils/bookingStatus';
import { tapSelect, tapMedium } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import type { Booking } from '@/types/booking';

type Tab = 'upcoming' | 'past';

/** The client's side of the booking transaction — everything they've booked. */
export default function BookingsScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('upcoming');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['bookings', 'client'],
    queryFn: () => bookingsService.getClientBookings({ page: 1 }),
  });

  const all = data?.data.data ?? [];
  const bookings = all.filter((b) => (tab === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)));

  async function handleCancel(booking: Booking) {
    tapMedium();
    Alert.alert(
      'Cancel this booking?',
      booking.paymentStatus === 'paid'
        ? 'Your payment will be refunded to the account you paid from.'
        : 'The slot will be released for someone else to book.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsService.cancel(booking.id);
              queryClient.invalidateQueries({ queryKey: ['bookings'] });
            } catch (err) {
              Alert.alert('Not cancelled', getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

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
              <Text style={{ fontSize: 14, fontWeight: '700', color: on ? T.onAccent : T.textMuted }}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}{count ? ` · ${count}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <CalendarBadge size={64} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: T.accent, marginTop: 16, textAlign: 'center' }}>
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          renderItem={({ item }) => (
            <BookingCard booking={item} onCancel={() => handleCancel(item)} />
          )}
        />
      )}
    </View>
  );
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const badge = bookingBadge(booking);
  const tone = chip(badge.tone);
  const { date, time } = splitScheduled(booking.scheduledAt);
  const canPay = awaitingPayment(booking);
  const canCancel = isUpcoming(booking);
  const isMobileJob = !!booking.clientLocation;

  const initials = booking.barberName.split(' ').slice(0, 2).map((n) => n[0]).join('');

  return (
    <View
      style={{
        backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border,
        padding: 16, marginBottom: 12,
      }}
    >
      {/* Status + service type */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: tone.fg }}>{badge.label}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: T.input, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          {isMobileJob ? <Car size={12} color={T.textMuted} /> : <Store size={12} color={T.textMuted} />}
          <Text style={{ fontSize: 12, fontWeight: '600', color: T.textMuted }}>
            {isMobileJob ? 'Mobile' : 'In-shop'}
          </Text>
        </View>
      </View>

      {/* Barber */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {booking.barberAvatarUrl ? (
          <Image source={{ uri: booking.barberAvatarUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: T.accent, fontSize: 15, fontWeight: '800' }}>{initials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }} numberOfLines={1}>
            {booking.serviceName}
          </Text>
          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 2 }} numberOfLines={1}>
            {booking.barberName}
            {booking.shopName && booking.shopName !== booking.barberName ? ` · ${booking.shopName}` : ''}
          </Text>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: T.text }}>
          GH₵{booking.total.toFixed(2)}
        </Text>
      </View>

      {/* When */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 }}>
        <Clock size={14} color={T.textFaint} />
        <Text style={{ fontSize: 13.5, color: T.textMuted }}>
          {fmtDateLong(date)} · {fmt12(time)}
        </Text>
      </View>

      {/* Where a mobile barber is coming to */}
      {booking.clientLocation && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 7 }}>
          <MapPin size={14} color={T.textFaint} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 13, color: T.textFaint, lineHeight: 19 }} numberOfLines={2}>
            {booking.clientLocation.address}
          </Text>
        </View>
      )}

      {/* Why it was called off */}
      {booking.cancelReason && (
        <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 10, fontStyle: 'italic' }}>
          {booking.cancelReason}
        </Text>
      )}

      {/* Actions */}
      {(canPay || canCancel) && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingTop: 14, borderTopWidth: HAIRLINE, borderTopColor: T.border }}>
          {canCancel && (
            <Pressable
              onPress={onCancel}
              style={{ flex: canPay ? 0 : 1, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, borderWidth: HAIRLINE, borderColor: T.border, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: T.textMuted }}>Cancel</Text>
            </Pressable>
          )}
          {canPay && (
            <Pressable
              onPress={() => {
                tapMedium();
                router.push({
                  pathname: '/(client)/booking/payment',
                  params: { bookingId: booking.id },
                } as never);
              }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: T.accent }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.onAccent }}>
                Pay GH₵{booking.total.toFixed(2)}
              </Text>
              <ChevronRight size={16} color={T.onAccent} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
