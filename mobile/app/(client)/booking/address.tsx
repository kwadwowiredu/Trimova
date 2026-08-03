import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Info, Search } from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import { useBookingStore } from '@/stores/bookingStore';
import { checkTravelRange } from '@/utils/distance';
import { BookingHeader, ServiceCartBar } from '@/components/booking/BookingHeader';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import { tapLight } from '@/utils/haptics';

/**
 * Mobile-barber step — the client TYPES where they want the barber to come.
 *
 * We deliberately don't require device-location permission: the address is
 * forward-geocoded (an OS/server lookup that needs no permission) purely to
 * measure the distance against the barber's travel radius. If we can't resolve
 * it we still let the booking through as a request, rather than blocking.
 */
export default function BookingAddressScreen() {
  const {
    barberId, service, clientAddress, clientCoords, setClientLocation,
  } = useBookingStore();

  const [address, setAddress] = useState(clientAddress ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(clientCoords);
  const [resolving, setResolving] = useState(false);
  const [touched, setTouched] = useState(false);

  const { data } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: !!barberId,
  });
  const shop = data?.data.data as unknown as {
    fullName?: string; lat?: number | null; lng?: number | null; serviceRadius?: number | null;
  } | undefined;

  // Re-measure whenever we resolve a new set of coordinates.
  const travel = checkTravelRange(coords, shop ?? {});
  const firstName = shop?.fullName?.split(' ')[0] ?? 'The barber';

  /** Turn the typed address into coordinates (no permission needed). */
  async function resolveAddress(text: string) {
    if (text.trim().length < 4) { setCoords(null); return; }
    setResolving(true);
    try {
      const results = await Location.geocodeAsync(text.trim());
      setCoords(results.length > 0
        ? { lat: results[0].latitude, lng: results[0].longitude }
        : null);
    } catch {
      setCoords(null); // offline / rate-limited — treated as "can't measure"
    } finally {
      setResolving(false);
    }
  }

  // Debounce the lookup while typing.
  useEffect(() => {
    if (!touched) return;
    const t = setTimeout(() => resolveAddress(address), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, touched]);

  /** Optional convenience — only runs if the client taps it. */
  async function useMyLocation() {
    tapLight();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setResolving(true);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(c);
      const [geo] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
      if (geo) {
        const specific = [geo.name, geo.street].find((v) => v && !/^\d+$/.test(v));
        const parts = [specific, geo.district || geo.subregion, geo.city].filter(Boolean) as string[];
        setAddress(parts.slice(0, 2).join(', '));
      }
      setTouched(false); // don't re-geocode the text we just filled in
    } catch {
      // ignore — typing still works
    } finally {
      setResolving(false);
    }
  }

  function handleContinue() {
    setClientLocation(address.trim(), coords);
    router.push('/(client)/booking/summary' as never);
  }

  const canContinue = address.trim().length >= 4;
  const tone = travel.needsRequest ? chip('warn') : chip('success');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <BookingHeader title="Where should we come?" subtitle={firstName ? `${firstName} travels to you` : undefined} />

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
          {/* Address field */}
          <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 18 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Your address
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              backgroundColor: T.input, borderRadius: 14, paddingHorizontal: 14,
              borderWidth: HAIRLINE, borderColor: T.border,
            }}>
              <MapPin size={18} color={T.textFaint} style={{ marginTop: 15 }} />
              <TextInput
                value={address}
                onChangeText={(t) => { setAddress(t); setTouched(true); }}
                placeholder="e.g. Ayeduase North, near KNUST gate"
                placeholderTextColor={T.textFaint}
                multiline
                style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: T.text, minHeight: 52 }}
              />
            </View>

            <Pressable
              onPress={useMyLocation}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, alignSelf: 'flex-start' }}
            >
              <Navigation size={14} color={T.accent} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: T.accent }}>Use my current location instead</Text>
            </Pressable>
          </View>

          {/* Range feedback */}
          <View style={{ marginTop: 16 }}>
            {resolving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
                <ActivityIndicator size="small" color={T.textFaint} />
                <Text style={{ fontSize: 13, color: T.textFaint }}>Checking the distance…</Text>
              </View>
            ) : !coords && address.trim().length >= 4 ? (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: T.input, borderRadius: 14, padding: 14 }}>
                <Search size={16} color={T.textFaint} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: T.textMuted, lineHeight: 18 }}>
                  We couldn't pinpoint that address. You can still continue — {firstName} will
                  confirm whether they can reach you.
                </Text>
              </View>
            ) : coords && travel.distance != null ? (
              <View style={{ flexDirection: 'row', gap: 10, backgroundColor: tone.bg, borderRadius: 14, padding: 14 }}>
                <Info size={16} color={tone.fg} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '700', color: tone.fg }}>
                    {travel.needsRequest
                      ? `About ${travel.distance.toFixed(1)} km away — outside the ${travel.radius} km range`
                      : `About ${travel.distance.toFixed(1)} km away — within range`}
                  </Text>
                  <Text style={{ fontSize: 12.5, color: tone.fg, opacity: 0.85, marginTop: 3, lineHeight: 17 }}>
                    {travel.needsRequest
                      ? `You'll send a request instead of paying now. ${firstName} sets a travel fee, and you only pay once they accept.`
                      : 'You can book and pay straight away.'}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {service && (
          <ServiceCartBar
            serviceName={service.name}
            price={service.price}
            durationMinutes={service.durationMinutes}
            actionLabel={canContinue ? 'Continue' : 'Enter your address'}
            disabled={!canContinue}
            onPress={handleContinue}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
