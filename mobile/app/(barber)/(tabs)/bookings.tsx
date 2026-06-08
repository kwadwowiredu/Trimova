import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, CalendarX } from 'lucide-react-native';
import { BookingCard, type Booking } from '@/components/barber/BookingCard';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

// ─── Mock data (ISO timestamps — replace with useQuery when API is ready) ─────

const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    clientName: 'Kwame Mensah',
    clientAvatar: null,
    serviceName: 'Executive Fade & Beard Trim',
    status: 'confirmed',
    startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endTime:   new Date(new Date().setHours(14, 45, 0, 0)).toISOString(),
    locationAddress: 'East Legon, Accra',
  },
  {
    id: '2',
    clientName: 'Kwabena Osei',
    clientAvatar: null,
    serviceName: 'Full Head Shave',
    status: 'pending',
    startTime: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    endTime:   new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    locationAddress: 'Kumasi, Ashanti',
  },
  {
    id: '3',
    clientName: 'Akosua Boateng',
    clientAvatar: null,
    serviceName: 'Haircut',
    status: 'completed',
    startTime: new Date(Date.now() - 86_400_000).toISOString(),
    endTime:   new Date(Date.now() - 86_400_000 + 1_800_000).toISOString(),
    locationAddress: 'Osu, Accra',
  },
  {
    id: '4',
    clientName: 'Fiifi Andoh',
    clientAvatar: null,
    serviceName: 'Beard Shaping',
    status: 'cancelled',
    startTime: new Date(Date.now() - 172_800_000).toISOString(),
    endTime:   new Date(Date.now() - 172_800_000 + 1_800_000).toISOString(),
    locationAddress: 'Accra Mall, Accra',
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const;
type TabName = (typeof TABS)[number];

function filterBookings(bookings: Booking[], tab: TabName): Booking[] {
  if (tab === 'Upcoming')  return bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  if (tab === 'Completed') return bookings.filter((b) => b.status === 'completed');
  return bookings.filter((b) => b.status === 'cancelled');
}

// ─── Segmented tab bar ────────────────────────────────────────────────────────

function TabBar({
  activeTab,
  onSelect,
  upcomingCount,
}: {
  activeTab: TabName;
  onSelect: (tab: TabName) => void;
  upcomingCount: number;
}) {
  const { width } = useWindowDimensions();
  const tabWidth  = width / TABS.length;
  const indicatorX = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  function handlePress(tab: TabName, index: number) {
    indicatorX.value = withTiming(index * tabWidth, { duration: 220 });
    onSelect(tab);
  }

  return (
    <View className="border-b border-neutral-100">
      <View className="flex-row">
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            // width is a runtime value from useWindowDimensions — must stay inline
            style={{ width: tabWidth }}
            className="items-center py-3.5"
            onPress={() => handlePress(tab, i)}
          >
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-accent' : 'text-neutral-400'
                }`}
              >
                {tab}
              </Text>
              {tab === 'Upcoming' && upcomingCount > 0 && (
                <View className="bg-danger rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                  <Text className="text-white text-[11px] font-extrabold">
                    {upcomingCount > 9 ? '9+' : upcomingCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/*
        Animated underline — kept as inline style because:
        - useAnimatedStyle (Reanimated) requires a plain style object, not className
        - width is a runtime device-dimension value
        - backgroundColor ties to the animated base style that merges with the transform
      */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            height: 2.5,
            width: tabWidth,
            backgroundColor: '#3c3cb9', // accent
            borderRadius: 2,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabName }) {
  const messages: Record<TabName, { title: string; subtitle: string }> = {
    Upcoming:  { title: 'No upcoming bookings',  subtitle: 'New client appointments will appear here.' },
    Completed: { title: 'No completed bookings', subtitle: 'Finished appointments will show up here.' },
    Cancelled: { title: 'No cancelled bookings', subtitle: 'Cancelled appointments will appear here.' },
  };
  const { title, subtitle } = messages[tab];
  return (
    <View className="flex-1 items-center pt-20 px-10 gap-3">
      <CalendarX size={52} color="#CBD5E0" />
      <Text className="text-base font-bold text-neutral-600 text-center">{title}</Text>
      <Text className="text-sm text-neutral-400 text-center leading-5">{subtitle}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const barber   = user as BarberProfile | null;

  const [activeTab, setActiveTab] = useState<TabName>('Upcoming');
  const [bookings, setBookings]   = useState<Booking[]>(MOCK_BOOKINGS);

  const upcomingCount = bookings.filter(
    (b) => b.status === 'confirmed' || b.status === 'pending',
  ).length;

  const displayedBookings = filterBookings(bookings, activeTab);

  function handleCancel(id: string) {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? The client will be notified.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: () =>
            setBookings((prev) =>
              prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
            ),
        },
      ],
    );
  }

  return (
    // paddingTop is a runtime value from useSafeAreaInsets — must stay inline
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ── Header ────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-neutral-100">
        <Text className="text-[17px] font-bold text-neutral-800" numberOfLines={1}>
          {barber?.businessName ?? 'My Barbershop'}
        </Text>
        <Pressable className="relative p-1">
          <Bell size={22} color="#4A5568" />
          {upcomingCount > 0 && (
            <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-2 border-white" />
          )}
        </Pressable>
      </View>

      {/* ── Page title ────────────────────────────────────── */}
      <View className="px-5 pt-4 pb-3.5">
        <Text className="text-2xl font-bold text-neutral-800">Bookings</Text>
        <Text className="text-sm text-neutral-500 mt-0.5">Manage your schedule and requests.</Text>
      </View>

      {/* ── Tab bar ───────────────────────────────────────── */}
      <TabBar
        activeTab={activeTab}
        onSelect={setActiveTab}
        upcomingCount={upcomingCount}
      />

      {/* ── Booking list ──────────────────────────────────── */}
      <FlatList
        data={displayedBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState tab={activeTab} />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onCancel={handleCancel}
            showCancel={activeTab === 'Upcoming'}
          />
        )}
      />
    </View>
  );
}
