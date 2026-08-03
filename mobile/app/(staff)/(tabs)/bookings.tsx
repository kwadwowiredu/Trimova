import { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarX } from 'lucide-react-native';
import { BookingCard, type Booking } from '@/components/barber/BookingCard';
import { useThemeColors } from '@/hooks/useThemeColors';

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const;
type TabName = (typeof TABS)[number];

// Mock until the bookings API exists — these are only THIS staff member's.
const MOCK: Booking[] = [
  {
    id: '1', clientName: 'Ama Osei', clientAvatar: null, serviceName: 'Executive Fade',
    status: 'confirmed',
    startTime: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(10, 45, 0, 0)).toISOString(),
    locationAddress: 'In shop',
  },
  {
    id: '2', clientName: 'Kwesi Poku', clientAvatar: null, serviceName: 'Beard Trim',
    status: 'pending',
    startTime: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(11, 50, 0, 0)).toISOString(),
    locationAddress: 'In shop',
  },
  {
    id: '3', clientName: 'Yaw Owusu', clientAvatar: null, serviceName: 'Skin Fade',
    status: 'completed',
    startTime: new Date(Date.now() - 86_400_000).toISOString(),
    endTime: new Date(Date.now() - 86_400_000 + 1_800_000).toISOString(),
    locationAddress: 'In shop',
  },
];

function filterFor(tab: TabName, list: Booking[]) {
  if (tab === 'Upcoming')  return list.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  if (tab === 'Completed') return list.filter((b) => b.status === 'completed');
  return list.filter((b) => b.status === 'cancelled');
}

/** A staff barber's own bookings — no shop-wide view, no batch admin tools. */
export default function StaffBookingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [tab, setTab] = useState<TabName>('Upcoming');
  const list = filterFor(tab, MOCK);

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

      <FlatList
        data={list}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
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
    </View>
  );
}
