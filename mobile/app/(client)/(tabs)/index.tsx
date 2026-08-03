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
  Animated,
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
import { PullLoader } from '@/components/ui/PullLoader';
import { T, HAIRLINE, cardSurface } from '@/constants/clientTheme';
import { StarIcon } from '@/components/ui/Icons';
import type { BarberListItem } from '@/types/user';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const APP_LOGO = require('../../../assets/app logo.png');
// Navy (#14213d) wave icon derived from assets/handwave.jpg.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const HANDWAVE = require('../../../assets/handwave.jpg');

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
    <View style={{ width: cardW, marginRight: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border }}>
      <View style={{ height: Math.round(cardW * 0.62), backgroundColor: T.inputDeep }} />
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ height: 14, width: '70%', borderRadius: 7, backgroundColor: T.inputDeep }} />
        <View style={{ height: 11, width: '50%', borderRadius: 6, backgroundColor: T.input }} />
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
        <Text style={{ fontSize: 13.5, color: T.textFaint }}>{emptyText}</Text>
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
  const scrollY = useRef(new Animated.Value(0)).current;
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

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <StatusBar barStyle="dark-content" backgroundColor={T.canvas} />
      <Animated.ScrollView
        ref={scrollRef as React.RefObject<ScrollView>}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        refreshControl={
          // The native spinner is hidden — PullLoader is our visible cue.
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor={T.canvas}
          />
        }
      >
        {/* ── Hidden "Loading …" strip, revealed by pulling down ── */}
        <PullLoader scrollY={scrollY} refreshing={isRefetching} background={T.canvas} color={T.accent} />

        {/* ── Header — sits quietly on the canvas, no colour wash ── */}
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 4, backgroundColor: T.canvas }}>
          {/* Brand row: centered logo + app name, bell pinned right */}
          <View style={{ height: 44, justifyContent: 'center' }}>
            <View className="flex-row items-center justify-center gap-2">
              <Image source={APP_LOGO} style={{ width: 28, height: 34 }} resizeMode="contain" />
              <Text style={{ fontSize: 20, fontWeight: '800', color: T.text, letterSpacing: -0.3 }}>Trimova</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(client)/notifications' as never)}
              className="active:opacity-70"
              style={{
                position: 'absolute', right: 16,
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Bell size={19} color={T.text} />
            </Pressable>
          </View>

          {/* Welcome message — one line, with the brand wave icon */}
          <View className="flex-row items-center px-4 pt-3 pb-1 gap-2">
            <Text style={{ fontSize: 24, fontWeight: '700', color: T.text, flexShrink: 1 }} numberOfLines={1}>
              {getGreeting()}, {firstName}
            </Text>
            <Image source={HANDWAVE} style={{ width: 32, height: 32 }} resizeMode="contain" />
          </View>

          {/* Search — Layer 2 recessed well, reads as interactive */}
          <Pressable
            onPress={() => router.push('/(client)/(tabs)/search' as never)}
            className="mx-4 mt-4 mb-4 flex-row items-center rounded-2xl px-4 py-4 gap-3 active:opacity-80"
            style={{ backgroundColor: T.input, borderWidth: HAIRLINE, borderColor: T.border }}
          >
            <Search size={18} color={T.textFaint} />
            <Text style={{ flex: 1, fontSize: 14.5, color: T.textFaint }}>Find your barber…</Text>
          </Pressable>
        </View>

        {/* ── Connectivity issue — inline, header + tabs stay visible ── */}
        {isError && (
          <View
            className="mx-4 mt-6 items-center px-6 py-10"
            style={{ ...cardSurface }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={26} color={T.textFaint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginTop: 14, textAlign: 'center' }}>
              Could not load barbers
            </Text>
            <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 6, textAlign: 'center', lineHeight: 19 }}>
              Check your internet connection and try again.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="active:opacity-80"
              style={{ backgroundColor: T.accent, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 12, marginTop: 18 }}
            >
              <Text style={{ color: T.onAccent, fontWeight: '700', fontSize: 13.5 }}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!isError && (
        <>
        {/* ── Recommended — top-rated barbers ───────────────────── */}
        <View className="mb-7 mt-2">
          <View className="flex-row items-center justify-between px-4 mb-3">
            <View className="flex-row items-center gap-1.5">
              <StarIcon size={15} />
              <Text style={{ fontSize: 17.5, fontWeight: '700', color: T.text }}>Recommended</Text>
            </View>
            <Pressable onPress={() => router.push('/(client)/(tabs)/search' as never)}>
              <Text style={{ fontSize: 13.5, color: T.accent, fontWeight: '600' }}>See all</Text>
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
              <Navigation size={14} color={T.textFaint} />
              <Text style={{ fontSize: 17.5, fontWeight: '700', color: T.text }}>Nearby</Text>
            </View>
            <Pressable onPress={() => router.push('/(client)/(tabs)/search' as never)}>
              <Text style={{ fontSize: 13.5, color: T.accent, fontWeight: '600' }}>See all</Text>
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
            <View className="mx-4" style={{ ...cardSurface, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={18} color={T.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: T.textMuted, lineHeight: 19 }}>
                Allow location access so we can show barbershops and mobile barbers close to you.
              </Text>
            </View>
          )}
        </View>

        {/* ── Recently viewed — last 6 profiles the client opened ── */}
        {recentlyViewed.length > 0 && (
          <View className="mb-4">
            <View className="flex-row items-center gap-1.5 px-4 mb-3">
              <History size={14} color={T.textFaint} />
              <Text style={{ fontSize: 17.5, fontWeight: '700', color: T.text }}>Recently Viewed</Text>
            </View>
            <PeekCarousel
              data={recentlyViewed}
              loading={false}
              emptyText=""
              cardW={CARD_W}
            />
          </View>
        )}
        </>
        )}
      </Animated.ScrollView>
    </View>
  );
}
