import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, SearchX, Star, MapPin, Scissors, X } from 'lucide-react-native';
import { useLocationStore } from '@/stores/locationStore';
import { barbersService } from '@/services/barbers';
import { useDebounce } from '@/hooks/useDebounce';
import type { BarberListItem } from '@/types/user';

/**
 * The Feed — every search / filter result as a rich Booksy-style card:
 * big cover banner with a rating badge, a strip of portfolio thumbnails,
 * then name + address. Tapping anywhere opens the barber's detail screen.
 */
function ResultCard({ barber }: { barber: BarberListItem }) {
  const { width } = useWindowDimensions();
  const bannerUri = barber.coverPhotoUrl || barber.portfolioImages?.[0] || null;
  const thumbs = barber.portfolioImages?.slice(0, 4) ?? [];
  const THUMB_W = (width - 32 - 3 * 4) / 4;
  const title = barber.businessName || barber.fullName;

  return (
    <Pressable
      onPress={() => router.push(`/(client)/barber/${barber.id}` as never)}
      style={{ marginHorizontal: 16, marginBottom: 26 }}
      className="active:opacity-90"
    >
      {/* Cover banner */}
      <View style={{ height: 210, borderRadius: 4, overflow: 'hidden', backgroundColor: '#E7E9F5' }}>
        {bannerUri ? (
          <Image source={{ uri: bannerUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={['#3c3cb9', '#6d5bd0', '#9d7fe8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Scissors size={40} color="rgba(255,255,255,0.85)" />
          </LinearGradient>
        )}
        {/* Rating badge */}
        <View style={{ position: 'absolute', top: 10, right: 10, alignItems: 'flex-end', backgroundColor: 'rgba(15,17,35,0.72)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>
            {barber.rating > 0 ? barber.rating.toFixed(1) : 'New'}
          </Text>
          {barber.reviewCount > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{barber.reviewCount} reviews</Text>
          )}
        </View>
      </View>

      {/* Thumbnail strip */}
      {thumbs.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
          {thumbs.map((uri, i) => (
            <Image key={i} source={{ uri }} style={{ width: THUMB_W, height: THUMB_W, borderRadius: 2 }} resizeMode="cover" />
          ))}
        </View>
      )}

      {/* Info */}
      <Text style={{ fontSize: 19, fontWeight: '800', color: '#161c27', marginTop: 12 }} numberOfLines={2}>
        {title}
      </Text>
      {barber.businessName ? (
        <Text style={{ fontSize: 13, color: '#8a89a3', marginTop: 2 }} numberOfLines={1}>{barber.fullName}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
        <MapPin size={13} color="#fdb276" />
        <Text style={{ flex: 1, fontSize: 13.5, color: '#464554' }} numberOfLines={1}>
          {barber.locationAddress ?? 'Location not set'}
        </Text>
        {barber.distance != null && (
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#3c3cb9' }}>{barber.distance.toFixed(1)} km</Text>
        )}
      </View>
      {barber.barberType === 'mobile' && (
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <View style={{ backgroundColor: '#e6f9ee', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#006d40' }}>COMES TO YOU</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function ResultSkeleton() {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 26 }}>
      <View style={{ height: 210, borderRadius: 4, backgroundColor: '#EEF0F8' }} />
      <View style={{ height: 18, width: '65%', borderRadius: 8, backgroundColor: '#EEF0F8', marginTop: 12 }} />
      <View style={{ height: 13, width: '45%', borderRadius: 6, backgroundColor: '#F3F4FA', marginTop: 8 }} />
    </View>
  );
}

export default function SearchResultsScreen() {
  const insets = useSafeAreaInsets();
  const { coordinates } = useLocationStore();
  const params = useLocalSearchParams<{ q?: string; type?: string; sort?: string; minRating?: string }>();

  const [query, setQuery] = useState(params.q ?? '');
  const debouncedQuery = useDebounce(query, 350);

  const { data, isLoading } = useQuery({
    queryKey: ['barbers', 'results', debouncedQuery, params.type, params.minRating, coordinates?.lat, coordinates?.lng],
    queryFn: () =>
      barbersService.search({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radius: 25,
        q: debouncedQuery.trim() || undefined,
        type: (params.type as 'barbershop' | 'mobile') || undefined,
        minRating: params.minRating ? Number(params.minRating) : undefined,
        page: 1,
        limit: 30,
      }),
  });

  let results: BarberListItem[] =
    (data?.data as unknown as { data: BarberListItem[] })?.data ?? [];
  if (params.sort === 'rating') results = [...results].sort((a, b) => b.rating - a.rating);

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
      {/* ── Search header ────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color="#161c27" />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F4F5FA', borderRadius: 999, paddingHorizontal: 16 }}>
          <Search size={17} color="#8a89a3" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search barbers, shops or styles…"
            placeholderTextColor="#A0AEC0"
            autoFocus={!params.q}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 12, fontSize: 14.5, color: '#161c27' }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color="#8a89a3" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Feed ─────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={{ paddingTop: 20 }}>
          <ResultSkeleton />
          <ResultSkeleton />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <ResultCard barber={item} />}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 90, paddingHorizontal: 40, gap: 12 }}>
              <SearchX size={48} color="#c7c5d6" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#464554', textAlign: 'center' }}>
                No barbers found
              </Text>
              <Text style={{ fontSize: 13, color: '#8a89a3', textAlign: 'center', lineHeight: 19 }}>
                Try a different name or style, or loosen your filters.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
