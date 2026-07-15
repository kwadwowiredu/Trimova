import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Star, Navigation, SlidersHorizontal, ChevronDown, X, Check, MapPin,
} from 'lucide-react-native';
import { useLocationStore } from '@/stores/locationStore';
import { barbersService } from '@/services/barbers';
import type { BarberListItem } from '@/types/user';

// Accra fallback when the client hasn't granted location.
const DEFAULT_REGION: Region = {
  latitude: 5.6037,
  longitude: -0.187,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

// ─── Filter model ──────────────────────────────────────────────────────────────

const VENUE_OPTIONS = [
  { label: 'All venues', value: undefined },
  { label: 'Barbershops', value: 'barbershop' },
  { label: 'Mobile barbers', value: 'mobile' },
] as const;

const SORT_OPTIONS = [
  { label: 'Best match', value: undefined },
  { label: 'Top rated', value: 'rating' },
  { label: 'Nearest', value: 'distance' },
] as const;

const RATING_OPTIONS = [
  { label: 'Any rating', value: 0 },
  { label: '4.0 +', value: 4 },
  { label: '4.5 +', value: 4.5 },
] as const;

interface Filters {
  venue?: 'barbershop' | 'mobile';
  sort?: 'rating' | 'distance';
  minRating: number;
}

/** Bottom sheet with one option group (venue / sort / rating). */
function OptionSheet<T>({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 12 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#161c27' }}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}><X size={22} color="#8a89a3" /></Pressable>
        </View>
        {options.map((o) => {
          const on = o.value === selected;
          return (
            <Pressable
              key={o.label}
              onPress={() => { onSelect(o.value); onClose(); }}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F3F9' }}
            >
              <Text style={{ flex: 1, fontSize: 15, fontWeight: on ? '800' : '500', color: '#161c27' }}>{o.label}</Text>
              {on && <Check size={18} color="#3c3cb9" strokeWidth={3} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

/** Rounded filter pill for the bottom control bar. */
function FilterPill({ label, active, onPress, icon }: { label?: string; active?: boolean; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: active ? '#eef0ff' : '#ffffff',
        borderWidth: 1.5, borderColor: active ? '#3c3cb9' : '#E8EAF6',
        borderRadius: 999, paddingHorizontal: label ? 16 : 12, paddingVertical: 11,
      }}
    >
      {icon}
      {label ? (
        <>
          <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#3c3cb9' : '#161c27' }}>{label}</Text>
          <ChevronDown size={14} color={active ? '#3c3cb9' : '#8a89a3'} />
        </>
      ) : null}
    </Pressable>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function ClientSearchScreen() {
  const insets = useSafeAreaInsets();
  const { coordinates } = useLocationStore();
  const mapRef = useRef<MapView>(null);

  const [filters, setFilters] = useState<Filters>({ minRating: 0 });
  const [sheet, setSheet] = useState<'venue' | 'sort' | 'rating' | null>(null);

  const initialRegion: Region = useMemo(
    () =>
      coordinates
        ? { latitude: coordinates.lat, longitude: coordinates.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
        : DEFAULT_REGION,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Barbers on the map — every Trimova barber around the client.
  const { data } = useQuery({
    queryKey: ['barbers', 'map', coordinates?.lat, coordinates?.lng, filters.venue, filters.minRating],
    queryFn: () =>
      barbersService.search({
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        radius: 25,
        type: filters.venue,
        minRating: filters.minRating || undefined,
        page: 1,
        limit: 50,
      }),
  });
  const barbers: BarberListItem[] =
    (data?.data as unknown as { data: BarberListItem[] })?.data ?? [];
  const pinnable = barbers.filter((b) => b.lat != null && b.lng != null);

  // Fly the map to the client's current position ("show me where I am").
  async function locateMe() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    } catch {
      // Location unavailable — ignore.
    }
  }

  // Open the results feed for the current query/filters.
  function openResults(q?: string) {
    router.push({
      pathname: '/(client)/search-results',
      params: {
        ...(q ? { q } : {}),
        ...(filters.venue ? { type: filters.venue } : {}),
        ...(filters.sort ? { sort: filters.sort } : {}),
        ...(filters.minRating ? { minRating: String(filters.minRating) } : {}),
      },
    } as never);
  }

  const activeFilterCount =
    (filters.venue ? 1 : 0) + (filters.sort ? 1 : 0) + (filters.minRating ? 1 : 0);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Map (full screen behind everything) ─────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* One floating rating pin per subscribed barber */}
        {pinnable.map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat!, longitude: b.lng! }}
            onPress={() => router.push(`/(client)/barber/${b.id}` as never)}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#161c27', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 }}>
                <Star size={11} color="#FFC94D" fill="#FFC94D" />
                <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '800' }}>
                  {b.rating > 0 ? b.rating.toFixed(1) : 'New'}
                </Text>
              </View>
              {/* pin tail */}
              <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#161c27' }} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Floating search bar ─────────────────────────────── */}
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16 }}>
        <Pressable
          onPress={() => openResults()}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14,
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 8,
          }}
        >
          <Search size={20} color="#161c27" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#161c27' }}>Barbers & styles</Text>
            <Text style={{ fontSize: 12, color: '#8a89a3', marginTop: 1 }} numberOfLines={1}>
              {coordinates ? 'Map area · near you' : 'Map area · Accra'}
            </Text>
          </View>
          <MapPin size={18} color="#8a89a3" />
        </Pressable>
      </View>

      {/* ── Locate-me FAB ───────────────────────────────────── */}
      <Pressable
        onPress={locateMe}
        style={{
          position: 'absolute', right: 16, bottom: 128,
          width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffffff',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
        }}
      >
        <Navigation size={20} color="#161c27" />
      </Pressable>

      {/* ── Bottom filter bar ───────────────────────────────── */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', '#ffffff']}
          style={{ paddingTop: 26, paddingBottom: 14 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <FilterPill
              icon={<SlidersHorizontal size={16} color={activeFilterCount ? '#3c3cb9' : '#161c27'} />}
              active={activeFilterCount > 0}
              onPress={() => openResults()}
            />
            <FilterPill
              label={VENUE_OPTIONS.find((o) => o.value === filters.venue)?.label ?? 'Venues'}
              active={!!filters.venue}
              onPress={() => setSheet('venue')}
            />
            <FilterPill
              label={SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? 'Best match'}
              active={!!filters.sort}
              onPress={() => setSheet('sort')}
            />
            <FilterPill
              label={RATING_OPTIONS.find((o) => o.value === filters.minRating)?.label ?? 'Rating'}
              active={filters.minRating > 0}
              onPress={() => setSheet('rating')}
            />
          </ScrollView>
        </LinearGradient>
      </View>

      {/* ── Filter sheets ───────────────────────────────────── */}
      <OptionSheet
        visible={sheet === 'venue'}
        title="Venue type"
        options={VENUE_OPTIONS}
        selected={filters.venue}
        onSelect={(v) => setFilters((f) => ({ ...f, venue: v }))}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'sort'}
        title="Sort by"
        options={SORT_OPTIONS}
        selected={filters.sort}
        onSelect={(v) => setFilters((f) => ({ ...f, sort: v }))}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'rating'}
        title="Minimum rating"
        options={RATING_OPTIONS}
        selected={filters.minRating}
        onSelect={(v) => setFilters((f) => ({ ...f, minRating: v }))}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
