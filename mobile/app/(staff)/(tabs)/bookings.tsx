import { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { CalendarX } from 'lucide-react-native';
import { BookingCard, type Booking } from '@/components/barber/BookingCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { bookingsService } from '@/services/bookings';
import type { Booking as ApiBooking } from '@/types/booking';

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const;
type TabName = (typeof TABS)[number];

function toCardBooking(b: ApiBooking): Booking {
  return {
    id: b.id,
    clientName: b.clientName,
    clientAvatar: b.clientAvatarUrl,
    serviceName: b.serviceName,
    status: b.status,
    startTime: b.scheduledAt,
    endTime: b.endsAt,
    locationAddress: b.clientLocation?.address ?? 'In shop',
  };
}

function filterFor(tab: TabName, list: Booking[]) {
  if (tab === 'Upcoming') {
    return list.filter((b) =>
      b.status === 'confirmed' || b.status === 'pending' || b.status === 'in_progress',
    );
  }
  if (tab === 'Completed') return list.filter((b) => b.status === 'completed');
  return list.filter((b) => b.status === 'cancelled' || b.status === 'declined');
}

/** A staff barber's own bookings — no shop-wide view, no batch admin tools. */
export default function StaffBookingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [tab, setTab] = useState<TabName>('Upcoming');

  // The API narrows this to the signed-in staff member's own appointments.
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['bookings', 'staff'],
    queryFn: () => bookingsService.getBarberBookings({ page: 1 }),
  });

  const list = filterFor(tab, (data?.data.data ?? []).map(toCardBooking));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2D27A8', paddingTop: insets.top, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#7B5BC4', opacity: 0.45, top: -90, right: -40 }} />
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#ffffff' }}>My bookings</Text>
          <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            Appointments assigned to you
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {TABS.map((t) => {
          const on = t === tab;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13 }}>
              <Text style={{ fontSize: 14, fontWeight: on ? '800' : '600', color: on ? c.accent : c.textFaint }}>{t}</Text>
              {on && <View style={{ position: 'absolute', bottom: 0, left: 20, right: 20, height: 2.5, borderRadius: 2, backgroundColor: c.accent }} />}
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
          }
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12 }}>
              <BookingCard booking={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 70, gap: 10 }}>
              <CalendarX size={44} color={c.textFaint} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.textMuted }}>Nothing here yet</Text>
              <Text style={{ fontSize: 13, color: c.textFaint }}>Your {tab.toLowerCase()} appointments will show up here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
