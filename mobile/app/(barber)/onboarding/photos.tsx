import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Pencil, User, MapPin, Check } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { authService } from '@/services/auth';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { useAuthStore } from '@/stores/authStore';

const TIPS = [
  'Use natural lighting for your profile shot to appear more approachable.',
  'Your cover photo should showcase your best work or studio atmosphere.',
  'Avoid busy backgrounds that distract from your craftsmanship.',
];

export default function OnboardingPhotosScreen() {
  const insets = useSafeAreaInsets();
  const { coverUri, avatarUri, setCoverUri, setAvatarUri } = useOnboardingStore();
  const { updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  async function pick(setter: (uri: string) => void, aspect: [number, number]) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setter(res.assets[0].uri);
  }

  async function handleContinue() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (coverUri && isLocalUri(coverUri))  payload.coverPhotoUrl = await uploadImage(coverUri, 'covers');
      if (avatarUri && isLocalUri(avatarUri)) payload.avatarUrl = await uploadImage(avatarUri, 'avatars');
      if (Object.keys(payload).length > 0) {
        const res = await authService.updateProfile(payload);
        updateUser(res.data.data as unknown as Record<string, unknown>);
      }
    } catch {
      // Best-effort — the URIs are held in the onboarding store and can be retried.
    } finally {
      setSaving(false);
      router.push('/(barber)/onboarding/portfolio-setup');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={2} onBack={() => router.back()} onSkip={() => router.push('/(barber)/onboarding/portfolio-setup')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground }}>Profile & Cover Photo</Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 6 }}>
          Adding high-quality photos makes you stand out and helps clients trust your expertise.
        </Text>

        {/* Media upload layer */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface, marginTop: 26, marginBottom: 10 }}>Cover Photo</Text>
        <View style={{ marginBottom: 60 }}>
          {/* Cover dropzone */}
          <Pressable
            onPress={() => pick(setCoverUri, [2, 1])}
            style={{
              width: '100%', aspectRatio: 2, borderRadius: 8, overflow: 'hidden',
              backgroundColor: OB.surfaceContainerLow, borderWidth: 1, borderColor: OB.outlineVariant, borderStyle: 'dashed',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: OB.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={24} color={OB.primaryContainer} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface, marginTop: 4 }}>Upload Cover</Text>
                <Text style={{ fontSize: 12, color: OB.onSurfaceVariant }}>Recommended: 1200 x 600 px</Text>
              </View>
            )}
          </Pressable>

          {/* Overlapping avatar */}
          <View style={{ position: 'absolute', left: 16, bottom: -44 }}>
            <Pressable
              onPress={() => pick(setAvatarUri, [1, 1])}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: OB.background, backgroundColor: OB.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
            >
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <User size={34} color={OB.outline} />}
            </Pressable>
            <View style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: OB.primaryContainer, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: OB.background }}>
              <Pencil size={14} color="#fff" />
            </View>
          </View>
        </View>

        {/* Compliance hint */}
        <Text style={{ fontSize: 13, color: OB.error, fontStyle: 'italic', marginBottom: 22 }}>
          * Make sure your face is clearly visible in the profile photo.
        </Text>

        {/* Pro tips */}
        <View style={{ backgroundColor: OB.surfaceContainerLow, borderRadius: 16, borderWidth: 1, borderColor: OB.border, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MapPin size={16} color={OB.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface }}>Pro Tips</Text>
          </View>
          {TIPS.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: OB.secondary, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Check size={11} color="#fff" strokeWidth={3} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: OB.onSurfaceVariant, lineHeight: 19 }}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleContinue}
        loading={saving}
        canContinue={!!avatarUri}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
