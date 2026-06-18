import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
} from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
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
  return (
    <TextInput
      value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="#CBD5E0" keyboardType={keyboardType}
      multiline={multiline} numberOfLines={multiline ? 4 : 1}
      style={{
        backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 13, fontSize: 14, fontWeight: '500', color: '#1A202C',
        borderWidth: 1.5, borderColor: '#3c3cb9', textAlignVertical: multiline ? 'top' : 'center',
        minHeight: multiline ? 100 : undefined,
      }}
    />
  );
}

export default function BusinessDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const barber = user as BarberProfile | null;

  const [isEditing, setIsEditing] = useState(false);
  const [shopName,  setShopName]  = useState(barber?.businessName ?? '');
  const [address,   setAddress]   = useState(barber?.location?.address ?? '');
  const [shopPhone, setShopPhone] = useState(user?.phone ?? '');
  const [about,     setAbout]     = useState(barber?.bio ?? '');
  const [coverUri,  setCoverUri]  = useState<string | null>(null);
  const [showMap,   setShowMap]   = useState(false);
  const [coords,    setCoords]    = useState({
    lat: barber?.location?.lat ?? 5.6037,
    lng: barber?.location?.lng ?? -0.1870,
  });

  function handleSave() {
    setIsEditing(false);
    // TODO: PATCH /api/barber/profile { businessName, location: { lat, lng, address }, phone, bio }
  }

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Business Details</Text>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setIsEditing(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#4A5568" />
            </Pressable>
            <Pressable onPress={handleSave} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={17} color="#3c3cb9" />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Cover photo */}
        <View style={{ marginBottom: 16 }}>
          <Pressable onPress={isEditing ? pickCover : undefined} style={{ height: 160, borderRadius: 20, overflow: 'hidden', backgroundColor: '#2D27A8' }}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7B5BC4', opacity: 0.4, top: -60, right: -40 }} />
                {isEditing && (
                  <View style={{ alignItems: 'center', gap: 6 }}>
                    <Camera size={28} color="rgba(255,255,255,0.7)" />
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>Tap to add cover photo</Text>
                  </View>
                )}
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
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, gap: 16 }}>

          {/* Shop name */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Building2 size={14} color="#A0AEC0" />
              <FieldLabel>Shop Name</FieldLabel>
            </View>
            {isEditing
              ? <EditInput value={shopName} onChangeText={setShopName} placeholder="Your shop name" />
              : <Text style={{ fontSize: 15, fontWeight: '500', color: '#1A202C' }}>{shopName || '—'}</Text>}
          </View>

          <View style={{ height: 1, backgroundColor: '#f1f2f3' }} />

          {/* Address */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <MapPin size={14} color="#A0AEC0" />
              <FieldLabel>Address</FieldLabel>
            </View>
            {isEditing ? (
              <View>
                <View style={{ backgroundColor: '#F7FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#3c3cb9', paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, fontSize: 14, color: address ? '#1A202C' : '#CBD5E0' }} numberOfLines={2}>
                    {address || 'Search for address'}
                  </Text>
                  <Pressable onPress={() => setShowMap(true)} style={{ backgroundColor: '#e0e0ff', borderRadius: 8, padding: 6 }}>
                    <MapPin size={15} color="#3c3cb9" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '500', color: '#1A202C' }}>{address || '—'}</Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: '#f1f2f3' }} />

          {/* Phone */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Phone size={14} color="#A0AEC0" />
              <FieldLabel>Shop Phone</FieldLabel>
            </View>
            {isEditing
              ? <EditInput value={shopPhone} onChangeText={setShopPhone} placeholder="+233 ..." keyboardType="phone-pad" />
              : <Text style={{ fontSize: 15, fontWeight: '500', color: '#1A202C' }}>{shopPhone || '—'}</Text>}
          </View>

          <View style={{ height: 1, backgroundColor: '#f1f2f3' }} />

          {/* About */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <FileText size={14} color="#A0AEC0" />
              <FieldLabel>About</FieldLabel>
            </View>
            {isEditing
              ? <EditInput value={about} onChangeText={setAbout} placeholder="Describe your shop, specialties…" multiline />
              : <Text style={{ fontSize: 14, color: '#4A5568', lineHeight: 21 }}>{about || 'No description yet.'}</Text>}
          </View>
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

      {/* Map / Places Autocomplete Modal */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
            <Pressable onPress={() => setShowMap(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#4A5568" />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Search Address</Text>
          </View>

          <View style={{ flex: 1 }}>
            <GooglePlacesAutocomplete
              placeholder="Search for address..."
              minLength={2}
              fetchDetails
              onPress={(data, details) => {
                if (details?.geometry?.location) {
                  setCoords({ lat: details.geometry.location.lat, lng: details.geometry.location.lng });
                  setAddress(data.description);
                }
                setShowMap(false);
              }}
              query={{ key: 'YOUR_GOOGLE_PLACES_API_KEY', language: 'en', components: 'country:gh' }}
              styles={{
                textInputContainer: { paddingHorizontal: 16, paddingTop: 12 },
                textInput: { height: 50, borderRadius: 14, backgroundColor: '#f1f2f3', paddingHorizontal: 16, fontSize: 14, color: '#1A202C' },
                listView: { paddingHorizontal: 16 },
                row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' },
                description: { fontSize: 13, color: '#1A202C' },
              }}
              enablePoweredByContainer={false}
              renderRow={(rowData) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MapPin size={15} color="#3c3cb9" />
                  <Text style={{ flex: 1, fontSize: 13, color: '#1A202C' }} numberOfLines={2}>{rowData.description}</Text>
                </View>
              )}
            />

            {/* Map below search */}
            <MapView
              style={{ flex: 1, marginTop: 8 }}
              region={{ latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setCoords({ lat: latitude, lng: longitude });
              }}
            >
              <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} draggable
                onDragEnd={(e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setCoords({ lat: latitude, lng: longitude });
                }}
              />
            </MapView>

            <Pressable
              onPress={() => setShowMap(false)}
              style={{ margin: 16, backgroundColor: '#3c3cb9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 32 : 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Confirm Location</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
