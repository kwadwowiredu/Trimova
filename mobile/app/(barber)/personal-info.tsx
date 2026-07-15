import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Share,
  Animated,
  Linking,
  ActivityIndicator,
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
  QrCode,
  Link,
  Copy,
  Music2,
} from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Image } from 'react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  const c = useThemeColors();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
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
  const c = useThemeColors();
  if (editable) {
    return (
      <View style={{ marginBottom: 16 }}>
        <FieldLabel>{label}</FieldLabel>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={c.textFaint} keyboardType={keyboardType}
          style={{
            backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
            fontSize: 14, fontWeight: '500', color: c.text,
            borderWidth: 1.5, borderColor: c.accent,
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ fontSize: 15, fontWeight: '500', color: c.text, paddingVertical: 4 }}>
        {value || <Text style={{ color: c.textFaint }}>{placeholder ?? '—'}</Text>}
      </Text>
      <View style={{ height: 1, backgroundColor: c.border, marginTop: 8 }} />
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
          {row.map((col, ci) => (
            <View key={ci} style={{ width: cell, height: cell, backgroundColor: col ? '#1A202C' : '#ffffff' }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PersonalInfoScreen() {
  const insets    = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, updateUser, mergeUser }  = useAuthStore();
  const u = user as (typeof user & { instagram?: string; facebook?: string; tiktok?: string }) | null;

  const [isEditing,  setIsEditing]  = useState(false);
  const [name,       setName]       = useState(user?.fullName ?? '');
  const [phone,      setPhone]      = useState(user?.phone ?? '');
  const [instagram,  setInstagram]  = useState(u?.instagram ?? '');
  const [facebook,   setFacebook]   = useState(u?.facebook ?? '');
  const [tiktok,     setTiktok]     = useState(u?.tiktok ?? '');
  const [avatarUri,  setAvatarUri]  = useState<string | null>(user?.avatarUrl ?? null);
  const [showQR,     setShowQR]     = useState(false);
  const [flyerPhoto, setFlyerPhoto] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('Changes saved successfully');
  const [toastOk,  setToastOk]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Re-seed fields when the background sync delivers fresh data after mount —
  // but never while the user is mid-edit or saving.
  useEffect(() => {
    if (isEditing || saving) return;
    setName(user?.fullName ?? '');
    setPhone(user?.phone ?? '');
    setInstagram(u?.instagram ?? '');
    setFacebook(u?.facebook ?? '');
    setTiktok(u?.tiktok ?? '');
    setAvatarUri(user?.avatarUrl ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const safeInitials = (n: string) => {
    const parts = n.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map((p) => p[0] ?? '').join('').toUpperCase() || 'B';
  };
  const initials  = safeInitials(name);
  const barberId  = user?.id ?? 'demo';
  const profileLink = `trimova.app/b/${barberId}`;

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
    updateUser({ fullName: name, phone, avatarUrl: avatarUri ?? undefined, instagram, facebook, tiktok });
    try {
      let avatarUrl = avatarUri ?? undefined;
      if (avatarUri && isLocalUri(avatarUri)) {
        avatarUrl = await uploadImage(avatarUri, 'avatars');
        setAvatarUri(avatarUrl);
      }
      const res = await authService.updateProfile({
        fullName: name, phone, avatarUrl: avatarUrl ?? null,
        instagram, facebook, tiktok,
      });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      setIsEditing(false);          // only leave edit mode once the server confirms
      showToast('Changes saved', true);
    } catch (e) {
      // Stay in edit mode so the user can retry; surface the real reason.
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setSaving(false);
    }
  }

  function openSocialLink(platform: string, handle: string) {
    if (!handle) return;
    let url = '';
    const clean = handle.replace(/^@/, '').trim();
    if (platform === 'Instagram') url = `https://instagram.com/${clean}`;
    else if (platform === 'Facebook') url = handle.startsWith('http') ? handle : `https://facebook.com/${clean}`;
    else if (platform === 'TikTok') url = `https://tiktok.com/@${clean}`;
    if (url) Linking.openURL(url).catch(() => {});
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      mediaTypes: ['images'],
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

  const cardStyle = {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 16,
  };
  const sectionLabel = { fontSize: 11, fontWeight: '800' as const, color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 16 };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Personal Info</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Edit profile & social links</Text>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Avatar section */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Pressable onPress={isEditing ? pickAvatar : undefined} style={{ position: 'relative' }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: c.accent }} />
            ) : (
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.accent }}>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>{initials}</Text>
              </View>
            )}
            {isEditing && (
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface }}>
                <Camera size={13} color="#ffffff" />
              </View>
            )}
          </Pressable>
          {isEditing && (
            <Text style={{ fontSize: 12, color: c.accent, marginTop: 8, fontWeight: '600' }}>Tap photo to change</Text>
          )}
        </View>

        {/* Profile fields */}
        <View style={cardStyle}>
          <Text style={sectionLabel}>Profile</Text>
          <Field label="Full Name" value={name} editable={isEditing} onChangeText={setName} placeholder="Your full name" />
          {/* Email is the login identity — shown here but not editable in-app. */}
          <Field label="Email" value={user?.email ?? ''} editable={false} placeholder="—" />
          <Field label="Phone Number" value={phone} editable={isEditing} onChangeText={setPhone} placeholder="+233 ..." keyboardType="phone-pad" />
        </View>

        {/* Social links */}
        <View style={cardStyle}>
          <Text style={sectionLabel}>Social Links</Text>
          {[
            { icon: <FontAwesome name="instagram" size={15} color="#E1306C" />, label: 'Instagram', value: instagram, setter: setInstagram, placeholder: '@yourhandle', bg: c.isDark ? '#3A2230' : '#fce7f3' },
            { icon: <FontAwesome name="facebook" size={15} color="#1877F2" />, label: 'Facebook', value: facebook, setter: setFacebook, placeholder: 'facebook.com/yourpage', bg: c.isDark ? '#1E2A40' : '#dbeafe' },
            { icon: <Music2 size={15} color={c.text} />, label: 'TikTok', value: tiktok, setter: setTiktok, placeholder: '@yourtiktok', bg: c.surfaceAlt },
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
                    placeholderTextColor={c.textFaint} autoCapitalize="none"
                    style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.accent }}
                  />
                ) : value ? (
                  <Pressable onPress={() => openSocialLink(label, value)} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: c.accent, fontWeight: '500', textDecorationLine: 'underline' }}>{value}</Text>
                  </Pressable>
                ) : (
                  <Text style={{ flex: 1, fontSize: 14, color: c.textFaint }}>{placeholder}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Share link */}
        <View style={cardStyle}>
          <Text style={{ ...sectionLabel, marginBottom: 12 }}>Your Booking Link</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
            <Link size={15} color={c.accent} />
            <Text style={{ flex: 1, fontSize: 13, color: c.accent, fontWeight: '600' }} numberOfLines={1}>{profileLink}</Text>
            <Pressable onPress={shareLink} hitSlop={8}>
              <Copy size={17} color={c.accent} />
            </Pressable>
          </View>
          <Pressable onPress={shareLink} style={{ marginTop: 10, backgroundColor: c.accentSoft, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.accent }}>Share Link</Text>
          </Pressable>
        </View>

        {/* QR Flyer */}
        <Pressable
          onPress={() => setShowQR(true)}
          style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}
        >
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={22} color={c.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>QR Flyer</Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>Generate a shareable advertisement flyer with QR code</Text>
          </View>
          <ChevronLeft size={18} color={c.textFaint} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
      </ScrollView>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 70,
          left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger,
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#ffffff" /> : <X size={18} color="#ffffff" />}
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>

      {/* QR Flyer Modal (intentionally dark in both themes) */}
      <Modal visible={showQR} animationType="slide" onRequestClose={() => setShowQR(false)}>
        <View style={{ flex: 1, backgroundColor: '#1A202C', paddingTop: insets.top }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
            <Pressable onPress={() => setShowQR(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} color="#ffffff" />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#ffffff', textAlign: 'center' }}>Advertisement Flyer</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <View style={{
              width: '100%', maxWidth: 340,
              backgroundColor: '#2D27A8',
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
            }}>
              <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#7B5BC4', opacity: 0.5, top: -50, right: -50 }} />
              <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#C084FC', opacity: 0.3, bottom: 100, left: -30 }} />

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

              <View style={{ padding: 20, alignItems: 'center', gap: 8 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>Book Now</Text>
                <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{name || 'Your Name'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' }}>Professional Barbershop • East Legon, Accra</Text>

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
