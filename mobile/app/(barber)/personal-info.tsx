import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Share,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Pencil,
  Check,
  X,
  Camera,
  Instagram,
  QrCode,
  Link,
  Copy,
  Facebook,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { Image } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
      {children}
    </Text>
  );
}

function Field({
  label, value, editable, onChangeText, placeholder, keyboardType = 'default',
}: {
  label: string; value: string; editable: boolean;
  onChangeText?: (t: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
}) {
  if (editable) {
    return (
      <View style={{ marginBottom: 16 }}>
        <FieldLabel>{label}</FieldLabel>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor="#CBD5E0" keyboardType={keyboardType}
          style={{
            backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
            fontSize: 14, fontWeight: '500', color: '#1A202C',
            borderWidth: 1.5, borderColor: '#3c3cb9',
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ fontSize: 15, fontWeight: '500', color: '#1A202C', paddingVertical: 4 }}>
        {value || <Text style={{ color: '#CBD5E0' }}>{placeholder ?? '—'}</Text>}
      </Text>
      <View style={{ height: 1, backgroundColor: '#E2E8F0', marginTop: 8 }} />
    </View>
  );
}

// ─── Minimal QR placeholder (SVG-like View pattern) ───────────────────────────

function QRPlaceholder({ size = 180 }: { size?: number }) {
  const cell = size / 12;
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,0,0],
    [1,0,0,0,0,0,1,0,0,1,1,0],
    [1,0,1,1,1,0,1,0,1,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,1,0,0],
    [1,1,1,1,1,1,1,0,1,0,1,0],
    [0,0,0,0,0,0,0,0,0,1,0,1],
    [1,1,0,1,0,1,0,1,0,0,1,0],
    [1,1,1,1,1,1,1,0,1,0,0,1],
    [1,0,0,0,0,0,1,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,1,0,1,1],
    [1,1,1,1,1,1,1,0,0,1,0,0],
  ];
  return (
    <View style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {pattern.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((col, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: col ? '#1A202C' : '#ffffff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PersonalInfoScreen() {
  const insets    = useSafeAreaInsets();
  const { user }  = useAuthStore();

  const [isEditing,  setIsEditing]  = useState(false);
  const [name,       setName]       = useState(user?.fullName ?? '');
  const [phone,      setPhone]      = useState(user?.phone ?? '');
  const [instagram,  setInstagram]  = useState('');
  const [facebook,   setFacebook]   = useState('');
  const [tiktok,     setTiktok]     = useState('');
  const [avatarUri,  setAvatarUri]  = useState<string | null>(user?.avatarUrl ?? null);
  const [showQR,     setShowQR]     = useState(false);
  const [flyerPhoto, setFlyerPhoto] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;

  const initials = name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'B';
  const barberId = user?.id ?? 'demo';
  const profileLink = `trimova.app/b/${barberId}`;

  function showSavedToast() {
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  async function handleSave() {
    setIsEditing(false);
    // TODO: PATCH /api/barber/profile  { fullName: name, phone, instagram, facebook, tiktok }
    showSavedToast();
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function pickFlyerPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setFlyerPhoto(result.assets[0].uri);
    }
  }

  async function shareLink() {
    await Share.share({ message: `Book me on Trimova: https://${profileLink}` });
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Personal Info</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Avatar section */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Pressable onPress={isEditing ? pickAvatar : undefined} style={{ position: 'relative' }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#3c3cb9' }} />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#3c3cb9' }}>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>{initials}</Text>
              </View>
            )}
            {isEditing && (
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                <Camera size={13} color="#ffffff" />
              </View>
            )}
          </Pressable>
          {isEditing && (
            <Text style={{ fontSize: 12, color: '#3c3cb9', marginTop: 8, fontWeight: '600' }}>Tap photo to change</Text>
          )}
        </View>

        {/* Profile fields */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Profile</Text>
          <Field label="Full Name" value={name} editable={isEditing} onChangeText={setName} placeholder="Your full name" />
          <Field label="Phone Number" value={phone} editable={isEditing} onChangeText={setPhone} placeholder="+233 ..." keyboardType="phone-pad" />
        </View>

        {/* Social links */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>Social Links</Text>
          {[
            { icon: <Instagram size={17} color="#E1306C" />, label: 'Instagram', value: instagram, setter: setInstagram, placeholder: '@yourhandle', bg: '#fce7f3' },
            { icon: <Facebook size={17} color="#1877F2" />, label: 'Facebook', value: facebook, setter: setFacebook, placeholder: 'facebook.com/yourpage', bg: '#dbeafe' },
            { icon: <Link size={17} color="#3c3cb9" />, label: 'TikTok', value: tiktok, setter: setTiktok, placeholder: '@yourtiktok', bg: '#e0e0ff' },
          ].map(({ icon, label, value, setter, placeholder, bg }) => (
            <View key={label} style={{ marginBottom: 14 }}>
              <FieldLabel>{label}</FieldLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </View>
                {isEditing ? (
                  <TextInput
                    value={value} onChangeText={setter} placeholder={placeholder}
                    placeholderTextColor="#CBD5E0" autoCapitalize="none"
                    style={{ flex: 1, backgroundColor: '#F7FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A202C', borderWidth: 1.5, borderColor: '#3c3cb9' }}
                  />
                ) : (
                  <Text style={{ flex: 1, fontSize: 14, color: value ? '#1A202C' : '#CBD5E0' }}>{value || placeholder}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Share link */}
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Your Booking Link</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f2f3', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
            <Link size={15} color="#3c3cb9" />
            <Text style={{ flex: 1, fontSize: 13, color: '#3c3cb9', fontWeight: '600' }} numberOfLines={1}>{profileLink}</Text>
            <Pressable onPress={shareLink} hitSlop={8}>
              <Copy size={17} color="#3c3cb9" />
            </Pressable>
          </View>
          <Pressable onPress={shareLink} style={{ marginTop: 10, backgroundColor: '#f0f0ff', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#3c3cb9' }}>Share Link</Text>
          </Pressable>
        </View>

        {/* QR Flyer */}
        <Pressable
          onPress={() => setShowQR(true)}
          style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0e0ff', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={22} color="#3c3cb9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A202C' }}>QR Flyer</Text>
            <Text style={{ fontSize: 12, color: '#718096', marginTop: 1 }}>Generate a shareable advertisement flyer with QR code</Text>
          </View>
          <ChevronLeft size={18} color="#CBD5E0" style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
      </ScrollView>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 70,
          left: 20, right: 20,
          backgroundColor: '#38A169',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#38A169', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        <Check size={18} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Changes saved successfully</Text>
      </Animated.View>

      {/* QR Flyer Modal */}
      <Modal visible={showQR} animationType="slide" onRequestClose={() => setShowQR(false)}>
        <View style={{ flex: 1, backgroundColor: '#1A202C', paddingTop: insets.top }}>
          {/* Modal header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <Pressable onPress={() => setShowQR(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#ffffff" />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#ffffff', textAlign: 'center' }}>Advertisement Flyer</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            {/* Flyer card */}
            <View style={{
              width: '100%', maxWidth: 340,
              backgroundColor: '#2D27A8',
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
            }}>
              {/* Decorative blobs */}
              <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7B5BC4', opacity: 0.5, top: -50, right: -50 }} />
              <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#C084FC', opacity: 0.3, bottom: 100, left: -30 }} />

              {/* Top: marketing photo slot */}
              <Pressable onPress={pickFlyerPhoto} style={{ height: 180, alignItems: 'center', justifyContent: 'center' }}>
                {flyerPhoto ? (
                  <Image source={{ uri: flyerPhoto }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <View style={{ alignItems: 'center', gap: 10 }}>
                    <Camera size={36} color="rgba(255,255,255,0.5)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Tap to add a photo</Text>
                  </View>
                )}
              </Pressable>

              {/* Content */}
              <View style={{ padding: 20, alignItems: 'center', gap: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>Book Now</Text>
                <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{name || 'Your Name'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' }}>Professional Barbershop • East Legon, Accra</Text>

                {/* QR code */}
                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginTop: 8 }}>
                  <QRPlaceholder size={140} />
                  <Text style={{ textAlign: 'center', fontSize: 11, color: '#718096', marginTop: 8, fontWeight: '600' }}>
                    trimova://barber/{barberId}
                  </Text>
                </View>

                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 }}>
                  Powered by Trimova
                </Text>
              </View>
            </View>

            <Text style={{ color: '#718096', fontSize: 12, marginTop: 20, textAlign: 'center' }}>
              Take a screenshot to save or share your flyer.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
