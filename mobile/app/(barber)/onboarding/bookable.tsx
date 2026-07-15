import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Settings, Scissors } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';

export default function OnboardingBookableScreen() {
  const insets = useSafeAreaInsets();
  const { mergeUser } = useAuthStore();
  const [bookable, setBookable] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mobile / freelance barbers are always bookable — this step doesn't apply to
  // them. If the flow lands here anyway, bounce straight to payout.
  useEffect(() => {
    if (useOnboardingStore.getState().barberType === 'mobile') {
      router.replace('/(barber)/onboarding/payout-setup');
    }
  }, []);

  async function handleContinue() {
    setSaving(true);
    try {
      const res = await authService.updateProfile({ isBookable: bookable });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
    } catch {
      // best-effort — editable later in profile settings.
    } finally {
      setSaving(false);
      router.push('/(barber)/onboarding/payout-setup');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={6} onBack={() => router.back()} onSkip={() => router.push('/(barber)/onboarding/payout-setup')} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        {/* Banner with floating PRO badge */}
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../../assets/bookable status.jpg')}
            style={{ width: '100%', height: 170 }}
            resizeMode="cover"
          />
          <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: OB.secondaryContainer, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: OB.onSecondaryContainer }}>PRO ACCOUNT SETUP</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground, textAlign: 'center', marginTop: 26 }}>
          Do you cut hair?
        </Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 8, textAlign: 'center', paddingHorizontal: 8 }}>
          Let clients book you directly as a staff barber, or keep this account for shop administration only.
        </Text>

        {/* Toggle row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 30 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: !bookable ? OB.onSurface : OB.textFaint }}>Admin Only</Text>

          <Pressable
            onPress={() => setBookable((v) => !v)}
            style={{ width: 68, height: 38, borderRadius: 999, backgroundColor: bookable ? OB.primaryContainer : OB.surfaceContainerHighest, justifyContent: 'center', padding: 4 }}
          >
            <View style={{
              width: 30, height: 30, borderRadius: 15, backgroundColor: OB.surfaceContainerLowest,
              alignItems: 'center', justifyContent: 'center',
              alignSelf: bookable ? 'flex-end' : 'flex-start',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
            }}>
              <Settings size={16} color={bookable ? OB.primary : OB.outline} />
            </View>
          </Pressable>

          <Text style={{ fontSize: 14, fontWeight: '700', color: bookable ? OB.onSurface : OB.textFaint }}>Bookable</Text>
        </View>

        {/* Dynamic status banner */}
        <View style={{ marginTop: 28, backgroundColor: OB.surfaceContainerHigh, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bookable ? OB.primaryContainer : OB.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
            {bookable ? <Scissors size={20} color={OB.onPrimary} /> : <Settings size={20} color={OB.outline} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: OB.textFaint }}>Currently</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: bookable ? OB.primary : OB.onSurfaceVariant, marginTop: 2 }}>
              {bookable ? 'Set as Bookable Staff Barber' : 'Administrative Access Only'}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: OB.textFaint, textAlign: 'center', marginTop: 16, lineHeight: 18 }}>
          You can change this anytime in Profile › Settings.
        </Text>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleContinue}
        loading={saving}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
