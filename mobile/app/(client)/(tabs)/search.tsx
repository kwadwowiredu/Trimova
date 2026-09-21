import { useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { Search, Navigation, SlidersHorizontal, Scissors } from 'lucide-react-native';
import { useLocationStore } from '@/stores/locationStore';
import { useSearchFilterStore, activeFilterCount } from '@/stores/searchFilterStore';
import { barbersService } from '@/services/barbers';
import { tapLight } from '@/utils/haptics';
import type { BarberListItem } from '@/types/user';

// Accra fallback when the client hasn't granted location.
const DEFAULT_REGION: Region = {
  latitude: 5.6037,
  longitude: -0.187,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

export default function ClientSearchScreen() {
  const insets = useSafeAreaInsets();
  const { coordinates } = useLocationStore();
  const mapRef = useRef<MapView>(null);
  const filters = useSearchFilterStore();
  const filterCount = activeFilterCount(filters);

  const initialRegion: Region = useMemo(
    () =>
      coordinates
        ? { latitude: coordinates.lat, longitude: coordinates.lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
        : DEFAULT_REGION,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Every subscribed barber around the client, shown as map pins.
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

  // Fly the map to the client's current position.
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

  function openResults() {
    router.push({
      pathname: '/(client)/search-results',
      params: {
        ...(filters.venue ? { type: filters.venue } : {}),
        ...(filters.sort ? { sort: filters.sort } : {}),
        ...(filters.minRating ? { minRating: String(filters.minRating) } : {}),
      },
    } as never);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Map (full screen behind everything) ─────────────── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Profile-photo pin per subscribed barber */}
        {pinnable.map((b) => {
          const photo = b.avatarUrl || b.coverPhotoUrl || b.portfolioImages?.[0] || null;
          return (
            <Marker
              key={b.id}
              coordinate={{ latitude: b.lat!, longitude: b.lng! }}
              onPress={() => router.push(`/(client)/barber/${b.id}` as never)}
            >
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  borderWidth: 2.5, borderColor: '#ffffff',
                  backgroundColor: '#3c3cb9', overflow: 'hidden',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
                }}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Scissors size={20} color="#ffffff" />
                  )}
                </View>
                {/* pin tail */}
                <View style={{ width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#ffffff', marginTop: -1 }} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Floating search bar with filter button ──────────── */}
      <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16 }}>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: '#ffffff', borderRadius: 999, paddingLeft: 18, paddingRight: 8, paddingVertical: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 8,
          }}
        >
          <Pressable onPress={openResults} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
            <Search size={20} color="#161c27" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#161c27' }}>Barbers & styles</Text>
              <Text style={{ fontSize: 12, color: '#8a89a3', marginTop: 1 }} numberOfLines={1}>
                {coordinates ? 'Map area · near you' : 'Map area · Accra'}
              </Text>
            </View>
          </Pressable>

          {/* Filter button → dedicated filter screen */}
          <Pressable
            onPress={() => { tapLight(); router.push('/(client)/search-filters' as never); }}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: filterCount > 0 ? '#161c27' : '#F4F5FA', alignItems: 'center', justifyContent: 'center' }}
          >
            <SlidersHorizontal size={18} color={filterCount > 0 ? '#ffffff' : '#161c27'} />
            {filterCount > 0 && (
              <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E53E3E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800' }}>{filterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Locate-me FAB ───────────────────────────────────── */}
      <Pressable
        onPress={() => { tapLight(); locateMe(); }}
        style={{
          position: 'absolute', right: 16, bottom: 28,
          width: 52, height: 52, borderRadius: 26, backgroundColor: '#ffffff',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
        }}
      >
        <Navigation size={21} color="#161c27" />
      </Pressable>
    </View>
  );
}
