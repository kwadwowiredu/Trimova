import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, type Region } from 'react-native-maps';
import { GooglePlacesAutocomplete, type GooglePlacesAutocompleteRef } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { MapPin, Navigation } from 'lucide-react-native';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { RadiusSlider } from '@/components/ui/RadiusSlider';
import { MIN_RADIUS_KM, MAX_RADIUS_KM } from '@/utils/constants';

// Default coordinates — Accra, Ghana
const DEFAULT_REGION: Region = {
  latitude: 5.6037,
  longitude: -0.1870,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export default function LocationPickerScreen() {
  const insets = useSafeAreaInsets();
  const { setLocation, barberType, serviceRadius, setServiceRadius } = useOnboardingStore();
  const placesRef = useRef<GooglePlacesAutocompleteRef>(null);

  // Freelance (mobile) barbers set a base + travel radius; shops just pin an address.
  const isFreelance = barberType === 'mobile';

  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [isReversing, setIsReversing] = useState(false);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Last coordinate we actually looked up — used to skip near-duplicate lookups
  // that would otherwise hammer the OS geocoder and trip its rate limit.
  const lastGeocoded = useRef<{ lat: number; lng: number } | null>(null);

  async function reverseGeocode(lat: number, lng: number) {
    // Skip if we've barely moved (< ~30m) since the last successful lookup.
    const last = lastGeocoded.current;
    if (last && Math.abs(last.lat - lat) < 0.0003 && Math.abs(last.lng - lng) < 0.0003) return;
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results.length > 0) {
        const { district, city, region: regionName, country } = results[0];
        const parts = [district, city, regionName].filter(Boolean);
        setSelectedAddress(parts.length > 0 ? parts.join(', ') : country ?? 'Unknown location');
        lastGeocoded.current = { lat, lng };
      }
    } catch {
      // Geocoder busy / rate-limited / offline — keep the last known address and
      // fall back to coordinates if we don't have one yet. Never crash the map.
      setSelectedAddress((prev) => prev || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsReversing(false);
    }
  }

  // Debounced reverse-geocode when the map stops moving. A longer debounce keeps
  // us well under the platform geocoder's request-rate limit.
  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);
    clearTimeout(reverseTimer.current);
    setIsReversing(true);
    reverseTimer.current = setTimeout(() => {
      reverseGeocode(newRegion.latitude, newRegion.longitude);
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use device GPS
  async function handleCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Enable location access in Settings to use this feature.');
      return;
    }
    try {
      setIsReversing(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      const newRegion: Region = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(newRegion);
      await reverseGeocode(latitude, longitude);
    } catch {
      setIsReversing(false);
    }
  }

  function handleConfirm() {
    if (!selectedAddress) {
      Alert.alert('No location selected', 'Move the map or search for a location first.');
      return;
    }
    setLocation({ lat: region.latitude, lng: region.longitude, address: selectedAddress });
    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Map (fills entire screen behind everything) */}
      <MapView
        style={StyleSheet.absoluteFillObject}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Freelancers see their travel radius drawn live on the map */}
        {isFreelance && (
          <Circle
            center={{ latitude: region.latitude, longitude: region.longitude }}
            radius={serviceRadius * 1000}
            strokeColor="rgba(60,60,185,0.6)"
            strokeWidth={2}
            fillColor="rgba(60,60,185,0.12)"
          />
        )}
      </MapView>

      {/* Centered pin overlay — stays fixed while map moves */}
      <View style={styles.pinContainer} pointerEvents="none">
        <MapPin size={36} color="#fdb276" fill="#fdb276" />
        <View style={styles.pinDot} />
      </View>

      {/* ─── TOP PANEL ─────────────────────────────────────────── */}
      <View style={[styles.topPanel, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.topHeader}>
          <Text style={styles.brandText}>Trimova</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        {/* Google Places search */}
        <GooglePlacesAutocomplete
          ref={placesRef}
          placeholder="Search for your location..."
          onPress={(data, details) => {
            if (!details?.geometry) return;
            const { lat, lng } = details.geometry.location;
            const newRegion: Region = {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setRegion(newRegion);
            setSelectedAddress(data.description);
            placesRef.current?.clear();
          }}
          query={{
            key: MAPS_KEY,
            language: 'en',
            components: 'country:gh',
          }}
          fetchDetails
          enablePoweredByContainer={false}
          keepResultsAfterBlur={false}
          keyboardShouldPersistTaps="always"
          styles={{
            container: { flex: 0 },
            textInputContainer: {
              paddingHorizontal: 16,
              paddingBottom: 8,
              backgroundColor: 'transparent',
            },
            textInput: {
              backgroundColor: '#F1F2F3',
              borderRadius: 14,
              paddingHorizontal: 16,
              fontSize: 14,
              height: 46,
              color: '#1A202C',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 2,
            },
            listView: {
              backgroundColor: 'white',
              marginHorizontal: 16,
              borderRadius: 14,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 6,
              zIndex: 20,
            },
            row: { paddingHorizontal: 16, paddingVertical: 13 },
            description: { fontSize: 13, color: '#2D3748' },
            separator: { backgroundColor: '#F1F2F3', height: 1 },
          }}
        />
      </View>

      {/* ─── BOTTOM PANEL ──────────────────────────────────────── */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        {/* Use current location button */}
        <Pressable style={styles.currentLocationBtn} onPress={handleCurrentLocation}>
          <Navigation size={16} color="#3c3cb9" />
          <Text style={styles.currentLocationText}>Use my current location</Text>
        </Pressable>

        {/* Selected location label */}
        {(selectedAddress || isReversing) && (
          <View style={styles.selectedLocationContainer}>
            <Text style={styles.selectedLocationLabel}>
              {isFreelance ? 'YOUR BASE LOCATION' : 'SELECTED LOCATION'}
            </Text>
            {isReversing ? (
              <ActivityIndicator size="small" color="#3c3cb9" style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.selectedLocationText} numberOfLines={2}>
                {selectedAddress}
              </Text>
            )}
          </View>
        )}

        {/* Freelancers: how far they're willing to travel from base */}
        {isFreelance && (
          <View style={{ marginBottom: 14 }}>
            <RadiusSlider
              value={serviceRadius}
              onChange={setServiceRadius}
              min={MIN_RADIUS_KM}
              max={MAX_RADIUS_KM}
              label="Willing to travel"
            />
          </View>
        )}

        {/* Confirm button */}
        <Pressable
          style={[
            styles.confirmBtn,
            !selectedAddress && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!selectedAddress || isReversing}
        >
          <Text style={styles.confirmBtnText}>Confirm Location</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Pin
  pinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -42,
    alignItems: 'center',
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fdb276',
    marginTop: -2,
    opacity: 0.6,
  },

  // Top panel
  topPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  brandText: { fontSize: 17, fontWeight: '700', color: '#1A202C' },
  cancelText: { fontSize: 15, color: '#4A5568', fontWeight: '500' },

  // Bottom panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#3c3cb9',
    borderRadius: 100,
    paddingVertical: 13,
    marginBottom: 12,
  },
  currentLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3c3cb9',
  },
  selectedLocationContainer: { marginBottom: 12 },
  selectedLocationLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A0AEC0',
    letterSpacing: 1,
    marginBottom: 4,
  },
  selectedLocationText: { fontSize: 14, color: '#1A202C', fontWeight: '500' },

  confirmBtn: {
    backgroundColor: '#3c3cb9',
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#CBD5E0' },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
