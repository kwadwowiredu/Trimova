import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ChevronLeft,
  Pencil,
  Check,
  X,
  MapPin,
  Camera,
  Building2,
  Phone,
  FileText,
  Navigation,
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { barbersService } from '@/services/barbers';
import { getApiErrorMessage } from '@/services/api';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RadiusSlider } from '@/components/ui/RadiusSlider';
import { MIN_RADIUS_KM, MAX_RADIUS_KM, DEFAULT_RADIUS_KM } from '@/utils/constants';
import type { BarberProfile } from '@/types/user';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  const c = useThemeColors();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
      {children}
    </Text>
  );
}

function EditInput({
  value, onChangeText, placeholder, multiline = false, keyboardType = 'default',
}: {
  value: string; onChangeText: (t: string) => void; placeholder?: string;
  multiline?: boolean; keyboardType?: 'default' | 'phone-pad';
}) {
  const c = useThemeColors();
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={c.textFaint} keyboardType={keyboardType}
      multiline={multiline} numberOfLines={multiline ? 4 : 1}
      style={{
        backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 13, fontSize: 14, fontWeight: '500', color: c.text,
        borderWidth: 1.5, borderColor: c.accent, textAlignVertical: multiline ? 'top' : 'center',
        minHeight: multiline ? 100 : undefined,
      }}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BusinessDetailsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, updateUser, mergeUser } = useAuthStore();
  const barber = user as BarberProfile | null;

  const [isEditing, setIsEditing] = useState(false);
  const [shopName,  setShopName]  = useState(barber?.businessName || '');
  const [address,   setAddress]   = useState(barber?.location?.address || '');
  const [shopPhone, setShopPhone] = useState(user?.phone || '');
  const [about,     setAbout]     = useState(barber?.bio || '');
  const [coverUri,  setCoverUri]  = useState<string | null>(barber?.coverPhotoUrl ?? null);
  const [showMap,   setShowMap]   = useState(false);
  const [coords,    setCoords]    = useState({
    lat: barber?.location?.lat ?? 5.6037,
    lng: barber?.location?.lng ?? -0.1870,
  });
  const [selectedLabel, setSelectedLabel] = useState(address);
  // Freelance (mobile) barbers: how far they travel from base.
  const isFreelance = barber?.barberType === 'mobile';
  const [serviceRadius, setServiceRadius] = useState(barber?.serviceRadius ?? DEFAULT_RADIUS_KM);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('Business details saved');
  const [toastOk,  setToastOk]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Re-seed fields when the background sync delivers fresh data after mount
  // (e.g. a slow DB response) — but never while the user is mid-edit or saving.
  useEffect(() => {
    if (isEditing || saving) return;
    setShopName(barber?.businessName || '');
    setAddress(barber?.location?.address || '');
    setShopPhone(user?.phone || '');
    setAbout(barber?.bio || '');
    setCoverUri(barber?.coverPhotoUrl ?? null);
    setServiceRadius(barber?.serviceRadius ?? DEFAULT_RADIUS_KM);
    if (barber?.location?.lat != null && barber?.location?.lng != null) {
      setCoords({ lat: barber.location.lat, lng: barber.location.lng });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg);
    setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  async function handleSave() {
    setSaving(true);
    // Optimistic local cache update — instant feedback.
    updateUser({
      businessName:  shopName,
      phone:         shopPhone,
      bio:           about,
      coverPhotoUrl: coverUri ?? undefined,
      location:      { lat: coords.lat, lng: coords.lng, address },
    });
    try {
      let coverPhotoUrl = coverUri ?? undefined;
      if (coverUri && isLocalUri(coverUri)) {
        coverPhotoUrl = await uploadImage(coverUri, 'covers');
        setCoverUri(coverPhotoUrl);
      }
      // Location save runs first so the profile re-fetch returns fresh coords,
      // but its own failure must NOT abort the main profile save.
      try {
        await barbersService.updateLocation({
          lat: coords.lat, lng: coords.lng, address,
          ...(isFreelance ? { serviceRadius } : {}),
        });
      } catch { /* non-fatal */ }
      const res = await authService.updateProfile({
        businessName:  shopName,
        phone:         shopPhone,
        bio:           about,
        coverPhotoUrl: coverPhotoUrl ?? null,
      });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      setIsEditing(false);          // only leave edit mode once the server confirms
      showToast('Business details saved', true);
    } catch (e) {
      // Stay in edit mode so the user can retry; surface the real reason.
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setSaving(false);
    }
  }

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  }

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const newCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
    setCoords(newCoords);
    try {
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      if (geo) {
        const label = [geo.name, geo.street, geo.city, geo.region].filter(Boolean).join(', ');
        setSelectedLabel(label);
        setAddress(label);
      }
    } catch {
      // Geocoder rate-limited/offline — keep coordinates, don't crash.
      const fallback = `${newCoords.lat.toFixed(5)}, ${newCoords.lng.toFixed(5)}`;
      setSelectedLabel((prev) => prev || fallback);
    }
  }

  // Turn dropped-pin coordinates into a human-readable address.
  async function applyPinLocation(lat: number, lng: number) {
    setCoords({ lat, lng });
    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo) {
        const label = [geo.name, geo.street, geo.city, geo.region].filter(Boolean).join(', ');
        setSelectedLabel(label || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setSelectedLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setSelectedLabel(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }

  function confirmMapLocation() {
    const finalLabel = selectedLabel || address;
    setAddress(finalLabel);
    setSelectedLabel(finalLabel);
    setShowMap(false);
  }

  const divider = { height: 1, backgroundColor: c.border };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Business Details</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Shop info, address & cover photo</Text>
        </View>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setIsEditing(false)} disabled={saving} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.5 : 1 }}>
              <X size={18} color={c.textMuted} />
            </Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Check size={18} color="#ffffff" />}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={17} color={c.accent} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

          {/* Cover photo */}
          <View style={{ marginBottom: 16 }}>
            <Pressable onPress={isEditing ? pickCover : undefined} style={{ height: 160, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2D27A8' }}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7B5BC4', opacity: 0.4, top: -60, right: -40 }} />
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Camera size={28} color="rgba(255,255,255,0.7)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>
                      {isEditing ? 'Tap to add cover photo' : 'No cover photo set'}
                    </Text>
                  </View>
                </View>
              )}
              {isEditing && coverUri && (
                <View style={{ position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Camera size={13} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Change</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Fields card */}
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, gap: 16 }}>

            {/* Shop name */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <Building2 size={14} color={c.textFaint} />
                <FieldLabel>Shop Name</FieldLabel>
              </View>
              {isEditing
                ? <EditInput value={shopName} onChangeText={setShopName} placeholder="Your shop name" />
                : <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>{shopName || '—'}</Text>}
            </View>

            <View style={divider} />

            {/* Address */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <MapPin size={14} color={c.textFaint} />
                <FieldLabel>Address</FieldLabel>
              </View>
              {isEditing ? (
                <Pressable
                  onPress={() => { setSelectedLabel(address); setShowMap(true); }}
                  style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, borderWidth: 1.5, borderColor: c.accent, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text style={{ flex: 1, fontSize: 14, color: address ? c.text : c.textFaint }} numberOfLines={2}>
                    {address || 'Search for address'}
                  </Text>
                  <MapPin size={15} color={c.accent} />
                </Pressable>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>{address || '—'}</Text>
              )}
            </View>

            <View style={divider} />

            {/* Phone */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <Phone size={14} color={c.textFaint} />
                <FieldLabel>Shop Phone</FieldLabel>
              </View>
              {isEditing
                ? <EditInput value={shopPhone} onChangeText={setShopPhone} placeholder="+233 ..." keyboardType="phone-pad" />
                : <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>{shopPhone || '—'}</Text>}
            </View>

            <View style={divider} />

            {/* About */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <FileText size={14} color={c.textFaint} />
                <FieldLabel>About</FieldLabel>
              </View>
              {isEditing
                ? <EditInput value={about} onChangeText={setAbout} placeholder="Describe your shop, specialties…" multiline />
                : <Text style={{ fontSize: 14, color: c.textMuted, lineHeight: 21 }}>{about || 'No description yet.'}</Text>}
            </View>

            {/* Travel radius — freelance (mobile) barbers only */}
            {isFreelance && (
              <>
                <View style={divider} />
                <View>
                  {isEditing ? (
                    <RadiusSlider
                      value={serviceRadius}
                      onChange={setServiceRadius}
                      min={MIN_RADIUS_KM}
                      max={MAX_RADIUS_KM}
                      label="Willing to travel"
                    />
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <Navigation size={14} color={c.textFaint} />
                        <FieldLabel>Willing to Travel</FieldLabel>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: c.text }}>Up to {serviceRadius} km from base</Text>
                    </>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Static map preview */}
          {!isEditing && (
            <View style={{ marginTop: 16, borderRadius: 20, overflow: 'hidden', height: 160 }}>
              <MapView
                style={{ flex: 1 }}
                region={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
              >
                <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} />
              </MapView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#fff" /> : <X size={18} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>

      {/* Map / Places Autocomplete Modal */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={{ flex: 1, backgroundColor: c.surface, paddingTop: insets.top }}>

          {/* Modal header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Search Address</Text>
            <Pressable onPress={() => setShowMap(false)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 15, color: c.accent, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <GooglePlacesAutocomplete
              placeholder="Search for your business address..."
              minLength={2}
              fetchDetails
              autoFocus
              textInputProps={{
                placeholderTextColor: c.textFaint,
                returnKeyType: 'search',
              }}
              onPress={(data, details) => {
                if (details?.geometry?.location) {
                  const newCoords = { lat: details.geometry.location.lat, lng: details.geometry.location.lng };
                  setCoords(newCoords);
                  setSelectedLabel(data.description);
                }
              }}
              query={{ key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '', language: 'en', components: 'country:gh' }}
              keepResultsAfterBlur
              styles={{
                container: { flex: 0 },
                textInputContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
                textInput: {
                  height: 50, borderRadius: 25, backgroundColor: c.surfaceAlt,
                  paddingHorizontal: 20, fontSize: 14, color: c.text,
                },
                listView: { paddingHorizontal: 16, maxHeight: 220, backgroundColor: c.surface },
                row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
                description: { fontSize: 13, color: c.text },
              }}
              enablePoweredByContainer={false}
              renderRow={(rowData) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} color={c.accent} />
                  <Text style={{ flex: 1, fontSize: 13, color: c.text }} numberOfLines={2}>{rowData.description}</Text>
                </View>
              )}
            />

            {/* Map */}
            <MapView
              style={{ flex: 1 }}
              region={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                applyPinLocation(latitude, longitude);
              }}
            >
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  applyPinLocation(latitude, longitude);
                }}
              />
            </MapView>

            {/* Bottom area */}
            <View style={{ backgroundColor: c.surface, padding: 16, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 16, gap: 12 }}>
              <Pressable
                onPress={useCurrentLocation}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 25, borderWidth: 1.5, borderColor: c.accent, paddingVertical: 14 }}
              >
                <Navigation size={16} color={c.accent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.accent }}>Use my current location</Text>
              </Pressable>

              {selectedLabel ? (
                <View style={{ paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Selected Location</Text>
                  <Text style={{ fontSize: 13, color: c.text, fontWeight: '500' }} numberOfLines={2}>{selectedLabel}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={confirmMapLocation}
                style={{ backgroundColor: c.accent, borderRadius: 25, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Confirm Location</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
