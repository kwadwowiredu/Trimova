import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StatusBar,
  RefreshControl,
  Image,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, MapPin, Search, AlertCircle, Star, Navigation, History } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { useLocation } from '@/hooks/useLocation';
import { useRefreshSignal } from '@/stores/refreshSignal';
import { useClientBrowseStore } from '@/stores/clientBrowseStore';
import { barbersService } from '@/services/barbers';
import { BarberBannerCard } from '@/components/barber/BarberBannerCard';
import type { BarberListItem } from '@/types/user';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_LOGO = require('../../../assets/app logo.png');

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Hello';
}

/** Banner-card sized skeleton while the carousels load */
function BannerSkeleton({ cardW }: { cardW: number }) {
  return (
    <View style={{ width: cardW, marginRight: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#EDF0F7' }}>
      <View style={{ height: Math.round(cardW * 0.62), backgroundColor: '#EEF0F8' }} />
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ height: 14, width: '70%', borderRadius: 7, backgroundColor: '#EEF0F8' }} />
        <View style={{ height: 11, width: '50%', borderRadius: 6, backgroundColor: '#F3F4FA' }} />
      </View>
    </View>
  );
}

/** Horizontal peek carousel — snaps card-by-card, next card peeking in. */
function PeekCarousel({
  data,
  loading,
  emptyText,
  cardW,
}: {
  data: BarberListItem[];
  loading: boolean;
  emptyText: string;
  cardW: number;
}) {
  if (loading) {
    return (
      <FlatList
        data={[1, 2, 3]}
        keyExtractor={(i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={() => <BannerSkeleton cardW={cardW} />}
      />
    );
  }
  if (data.length === 0) {
    return (
      <View className="px-4">
        <Text className="text-sm text-neutral-400">{emptyText}</Text>
      </View>
    );
  }
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Snap one card at a time; +14 accounts for the card's right margin.
      snapToInterval={cardW + 14}
      decelerationRate="fast"
      snapToAlignment="start"
      contentContainerStyle={{ paddingHorizontal: 16 }}
      renderItem={({ item }) => <BarberBannerCard barber={item} />}
    />
  );
}

export default function HomeScreen() {
  // Request location permission on first entry ("allow Trimova to use your location?")
  useLocation();

  const { user } = useAuthStore();
  const { coordinates } = useLocationStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const scrollRef = useRef<ScrollView>(null);
  const recentlyViewed = useClientBrowseStore((s) => s.recentlyViewed);

  const CARD_W = Math.round(width * 0.72); // keep in sync with BarberBannerCard

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

  // Tap the Home tab → scroll to top and refetch (Instagram/TikTok behaviour).
  const clientHomeNonce = useRefreshSignal((s) => s.clientHome);
  useEffect(() => {
    if (clientHomeNonce === 0) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    refetch();
  }, [clientHomeNonce, refetch]);

  const barbers: BarberListItem[] =
    (data?.data as unknown as { data: BarberListItem[] })?.data ?? [];

  // Recommended = top-rated barbers (later: also barbers running discounts).
  const recommended = [...barbers].sort((a, b) => b.rating - a.rating).slice(0, 8);
  // Nearby = server order (sorted by distance when coordinates are present).
  const nearby = coordinates ? barbers.slice(0, 8) : [];

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

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#fdb276"
            colors={['#fdb276']}
          />
        }
      >
        {/* ── Gradient header: brand + welcome + search ─────────── */}
        <LinearGradient
          colors={['#eef0ff', '#f9f6ff', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={{ paddingTop: insets.top + 8, paddingBottom: 4 }}
        >
          {/* Brand row: centered logo + app name, bell pinned right */}
          <View style={{ height: 44, justifyContent: 'center' }}>
            <View className="flex-row items-center justify-center gap-2">
              <Image source={APP_LOGO} style={{ width: 28, height: 34 }} resizeMode="contain" />
              <Text className="text-xl font-extrabold text-primary tracking-tight">Trimova</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(client)/notifications' as never)}
              className="w-10 h-10 rounded-full bg-white items-center justify-center active:opacity-70"
              style={{ position: 'absolute', right: 16, borderWidth: 1, borderColor: '#E8EAF6' }}
            >
              <Bell size={20} color="#2D3748" />
            </Pressable>
          </View>

          {/* Welcome message — one line */}
          <Text className="px-4 pt-3 pb-1 text-2xl font-bold text-neutral-800" numberOfLines={1}>
            {getGreeting()}, {firstName} 👋
          </Text>

          {/* Floating search bar — tapping opens the Search screen */}
          <Pressable
            onPress={() => router.push('/(client)/(tabs)/search' as never)}
            className="mx-4 mt-3 mb-4 flex-row items-center bg-white rounded-2xl px-4 py-4 gap-3 active:opacity-80"
            style={{
              shadowColor: '#3c3cb9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14, elevation: 6,
            }}
          >
            <Search size={18} color="#A0AEC0" />
            <Text className="text-sm text-neutral-400 flex-1">Find your barber...</Text>
          </Pressable>
        </LinearGradient>

        {/* ── Recommended — top-rated barbers ───────────────────── */}
        <View className="mb-7 mt-2">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <Star size={16} color="#fdb276" fill="#fdb276" />
              <Text className="text-lg font-bold text-neutral-800">Recommended</Text>
            </View>
            <Pressable onPress={() => router.push('/(client)/(tabs)/search' as never)}>
              <Text className="text-sm text-accent font-medium">See all</Text>
            </Pressable>
          </View>
          <PeekCarousel
            data={recommended}
            loading={isLoading}
            emptyText="No recommendations yet — check back soon."
            cardW={CARD_W}
          />
        </View>

        {/* ── Nearby — barbers close to the client ──────────────── */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <Navigation size={15} color="#3c3cb9" />
              <Text className="text-lg font-bold text-neutral-800">Nearby</Text>
            </View>
            <Pressable onPress={() => router.push('/(client)/(tabs)/search' as never)}>
              <Text className="text-sm text-accent font-medium">See all</Text>
            </Pressable>
          </View>
          {coordinates ? (
            <PeekCarousel
              data={nearby}
              loading={isLoading}
              emptyText="No barbers near you yet — try widening your search."
              cardW={CARD_W}
            />
          ) : (
            <View className="mx-4 rounded-2xl overflow-hidden">
              <LinearGradient
                colors={['#f1f3ff', '#faf6ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <MapPin size={20} color="#3c3cb9" />
                <Text style={{ flex: 1, fontSize: 13, color: '#464554', lineHeight: 19 }}>
                  Allow location access so we can show barbershops and mobile barbers close to you.
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* ── Recently viewed — last 6 profiles the client opened ── */}
        {recentlyViewed.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 px-4 mb-3">
              <History size={15} color="#8a89a3" />
              <Text className="text-lg font-bold text-neutral-800">Recently Viewed</Text>
            </View>
            <PeekCarousel
              data={recentlyViewed}
              loading={false}
              emptyText=""
              cardW={CARD_W}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
