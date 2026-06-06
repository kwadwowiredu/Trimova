import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Search, AlertCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { barbersService } from '@/services/barbers';
import { BarberScrollCard } from '@/components/barber/BarberScrollCard';
import { BarberResultCard } from '@/components/barber/BarberResultCard';
import type { BarberListItem } from '@/types/user';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Hello';
}

/** Skeleton card placeholder while loading */
function BarberScrollSkeleton() {
  return (
    <View className="w-40 h-44 bg-neutral-100 rounded-xl mr-3 animate-pulse" />
  );
}

function BarberResultSkeleton() {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 flex-row gap-3 border border-neutral-100">
      <View className="w-15 h-15 rounded-full bg-neutral-100" />
      <View className="flex-1 gap-2">
        <View className="h-4 bg-neutral-100 rounded w-3/4" />
        <View className="h-3 bg-neutral-100 rounded w-1/2" />
        <View className="h-3 bg-neutral-100 rounded w-2/3" />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  // Request location permission on mount
  useLocation();

  const { user } = useAuthStore();
  const { coordinates } = useLocationStore();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['barbers', 'home', coordinates?.lat, coordinates?.lng],
    queryFn: () =>
      barbersService.search({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radius: 10,
        page: 1,
        limit: 20,
      }),
  });

  const barbers: BarberListItem[] =
    (data?.data as unknown as { data: BarberListItem[] })?.data ?? [];
  const featuredBarbers = barbers.slice(0, 6);

  // ── Header rendered inside FlatList (avoids double-nested ScrollViews) ──
  function ListHeader() {
    return (
      <View>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-4 pt-6 pb-2">
          <View>
            <Text className="text-xs text-neutral-500">{getGreeting()},</Text>
            <Text className="text-2xl font-bold text-neutral-800">{firstName}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(client)/notifications' as never)}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
          >
            <Bell size={20} color="#2D3748" />
          </Pressable>
        </View>

        {/* Location strip */}
        <View className="flex-row items-center gap-1 px-4 mb-5">
          <MapPin size={13} color="#fdb276" />
          <Text className="text-sm text-neutral-500">
            {coordinates ? 'Near your location' : 'Location not available'}
          </Text>
        </View>

        {/* Search bar — tapping navigates to Search tab */}
        <Pressable
          onPress={() => router.push('/(client)/(tabs)/search' as never)}
          className="mx-4 mb-6 flex-row items-center bg-neutral-100 rounded-xl px-4 py-3.5 gap-3 active:opacity-80"
        >
          <Search size={18} color="#A0AEC0" />
          <Text className="text-sm text-neutral-400 flex-1">Find your barber...</Text>
        </Pressable>

        {/* Featured / Nearby section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <Text className="text-lg font-semibold text-neutral-700">
              {coordinates ? 'Nearby Barbers' : 'Featured Barbers'}
            </Text>
            <Pressable onPress={() => router.push('/(client)/(tabs)/search' as never)}>
              <Text className="text-sm text-accent font-medium">See all</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <FlatList
              data={[1, 2, 3]}
              keyExtractor={(i) => String(i)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={() => <BarberScrollSkeleton />}
            />
          ) : featuredBarbers.length > 0 ? (
            <FlatList
              data={featuredBarbers}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => <BarberScrollCard barber={item} />}
            />
          ) : (
            <View className="px-4">
              <Text className="text-sm text-neutral-400">
                No barbers available near you yet.
              </Text>
            </View>
          )}
        </View>

        {/* All Barbers heading */}
        <View className="flex-row items-center justify-between px-4 mb-3">
          <Text className="text-lg font-semibold text-neutral-700">All Barbers</Text>
        </View>
      </View>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <AlertCircle size={48} color="#A0AEC0" />
        <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">
          Could not load barbers
        </Text>
        <Text className="text-sm text-neutral-500 mt-2 text-center">
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="bg-primary rounded-xl px-6 py-3 mt-6 active:opacity-80"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ── Main list ──
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FlatList
        data={isLoading ? [1, 2, 3, 4] : barbers}
        keyExtractor={(item) =>
          typeof item === 'number' ? String(item) : (item as BarberListItem).id
        }
        renderItem={({ item }) =>
          isLoading ? (
            <View className="px-4">
              <BarberResultSkeleton />
            </View>
          ) : (
            <View className="px-4">
              <BarberResultCard barber={item as BarberListItem} />
            </View>
          )
        }
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="px-4 py-12 items-center">
              <Text className="text-base font-semibold text-neutral-600 text-center">
                No barbers found nearby
              </Text>
              <Text className="text-sm text-neutral-400 mt-2 text-center">
                Try expanding your search or searching by name.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#fdb276"
            colors={['#fdb276']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}
