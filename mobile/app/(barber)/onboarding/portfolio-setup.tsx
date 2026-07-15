import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, Info, X } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { authService } from '@/services/auth';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { useAuthStore } from '@/stores/authStore';

const MAX_SLOTS = 6; // 1 master + 5 grid
const TIPS = [
  'Use natural, bright lighting for every photo.',
  'Focus on clean lines and close-up details.',
  'Include a variety of styles (fades, shears, beard trims).',
];

export default function OnboardingPortfolioScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { portfolioUris, setPortfolioUris } = useOnboardingStore();
  const { updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const GAP = 12;
  const gridW = (width - 40 - GAP) / 2;

  async function pickAt(index: number) {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const next = [...portfolioUris];
    next[index] = res.assets[0].uri;
    setPortfolioUris(next.filter(Boolean));
  }

  function removeAt(index: number) {
    setPortfolioUris(portfolioUris.filter((_, i) => i !== index));
  }

  async function handleContinue() {
    setSaving(true);
    try {
      if (portfolioUris.length > 0) {
        const urls: string[] = [];
        for (const uri of portfolioUris) urls.push(isLocalUri(uri) ? await uploadImage(uri, 'portfolio') : uri);
        const res = await authService.updateProfile({ portfolioImages: urls });
        updateUser(res.data.data as unknown as Record<string, unknown>);
      }
    } catch {
      // best-effort — kept in the onboarding store
    } finally {
      setSaving(false);
      router.push('/(barber)/onboarding/services-setup');
    }
  }

  const master = portfolioUris[0];
  // Slots 1..5 (show one empty "add" slot after the last filled one, up to MAX_SLOTS)
  const gridFilled = portfolioUris.slice(1);
  const gridSlots = Math.min(MAX_SLOTS - 1, gridFilled.length + 1);

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={3} onBack={() => router.back()} onSkip={() => router.push('/(barber)/onboarding/services-setup')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground }}>Showcase Your Work</Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 6 }}>
          Upload photos of your best haircuts and styles to build your portfolio.
        </Text>

        {/* Master showcase */}
        <Pressable
          onPress={() => pickAt(0)}
          style={{
            width: '100%', height: 210, borderRadius: 16, overflow: 'hidden', marginTop: 22,
            backgroundColor: OB.surfaceContainerLow, borderWidth: 1.5, borderColor: OB.outlineVariant, borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {master ? (
            <>
              <Image source={{ uri: master }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <Pressable onPress={() => removeAt(0)} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#fff" />
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: OB.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={26} color={OB.primaryContainer} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: OB.onSurface, marginTop: 4 }}>Primary Showcase</Text>
              <Text style={{ fontSize: 12, color: OB.onSurfaceVariant }}>Tap to upload your masterwork</Text>
            </View>
          )}
        </Pressable>

        {/* Secondary grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: GAP }}>
          {Array.from({ length: gridSlots }).map((_, i) => {
            const uri = gridFilled[i];
            const realIndex = i + 1;
            return (
              <Pressable
                key={i}
                onPress={() => pickAt(realIndex)}
                style={{
                  width: gridW, height: gridW, borderRadius: 12, overflow: 'hidden',
                  backgroundColor: OB.surfaceContainerLow, borderWidth: 1, borderColor: OB.outlineVariant, borderStyle: uri ? 'solid' : 'dashed',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {uri ? (
                  <>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <Pressable onPress={() => removeAt(realIndex)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={14} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <Plus size={26} color={OB.outline} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Pro tips */}
        <View style={{ backgroundColor: OB.surfaceContainerLow, borderRadius: 16, borderWidth: 1, borderColor: OB.border, padding: 18, marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Info size={16} color={OB.primary} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface }}>Pro Tips for a Great Portfolio</Text>
          </View>
          {TIPS.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: OB.primaryContainer, marginTop: 7 }} />
              <Text style={{ flex: 1, fontSize: 13, color: OB.onSurfaceVariant, lineHeight: 19 }}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleContinue}
        loading={saving}
        canContinue={portfolioUris.length > 0}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
