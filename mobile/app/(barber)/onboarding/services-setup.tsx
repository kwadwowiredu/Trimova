import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Plus, Clock, Sparkles, ChevronRight } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useOnboardingStore, type OnboardingService } from '@/stores/onboardingStore';
import { useSuggestionStore } from '@/stores/suggestionStore';
import { servicesService } from '@/services/services';

const DURATIONS = [
  { label: '15m', mins: 15 },
  { label: '30m', mins: 30 },
  { label: '45m', mins: 45 },
  { label: '1h',  mins: 60 },
];

function fmtDuration(m: number) {
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`;
}

export default function OnboardingServicesScreen() {
  const insets = useSafeAreaInsets();
  const { services, setServices } = useOnboardingStore();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [saving, setSaving] = useState(false);

  // When returning from the "See suggestions" screen, pull the picked name in.
  useFocusEffect(
    useCallback(() => {
      const { picked, clear } = useSuggestionStore.getState();
      if (picked) { setName(picked); clear(); }
    }, []),
  );

  function addService() {
    if (!name.trim() || !(Number(price) > 0)) return;
    setServices([...services, { name: name.trim(), price: Number(price), durationMins }]);
    setName(''); setPrice(''); setDurationMins(60);
  }

  async function handleContinue() {
    setSaving(true);
    try {
      // Persist any services entered during onboarding.
      for (const s of services) {
        await servicesService.create({ name: s.name, description: '', price: s.price, durationMins: s.durationMins });
      }
    } catch {
      // best-effort — kept in the onboarding store
    } finally {
      setSaving(false);
      router.push('/(barber)/onboarding/working-hours');
    }
  }

  const inputStyle = {
    backgroundColor: OB.surfaceContainerLowest, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: OB.onSurface, borderWidth: 1, borderColor: OB.border,
  } as const;
  const fieldLabel = { fontSize: 14, fontWeight: '700' as const, color: OB.onSurface, marginBottom: 6 };

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={4} onBack={() => router.back()} onSkip={() => router.push('/(barber)/onboarding/working-hours')} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground }}>Services & Pricing</Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 6 }}>
          Set up at least one service to start receiving bookings.
        </Text>

        {/* See suggestions — fills the service name for you */}
        <Pressable
          onPress={() => router.push('/(barber)/service-suggestions')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: OB.surfaceContainerHigh, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 20 }}
        >
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: OB.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={17} color={OB.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: OB.onSurface }}>See suggestions</Text>
            <Text style={{ fontSize: 12, color: OB.onSurfaceVariant, marginTop: 1 }}>Pick from common cuts instead of typing</Text>
          </View>
          <ChevronRight size={18} color={OB.outline} />
        </Pressable>

        {/* Service creation form */}
        <View style={{ backgroundColor: OB.surfaceContainerLow, borderRadius: 12, borderWidth: 1, borderColor: OB.border, padding: 16, marginTop: 14, gap: 16 }}>
          <View>
            <Text style={fieldLabel}>Service Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Executive Fade" placeholderTextColor={OB.textFaint} style={inputStyle} />
          </View>
          <View>
            <Text style={fieldLabel}>Price (GHS)</Text>
            <TextInput value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={OB.textFaint} keyboardType="numeric" style={inputStyle} />
          </View>
          <View>
            <Text style={fieldLabel}>Duration</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {DURATIONS.map((d) => {
                const on = durationMins === d.mins;
                return (
                  <Pressable
                    key={d.mins}
                    onPress={() => setDurationMins(d.mins)}
                    style={{ flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center', backgroundColor: on ? OB.primaryContainer : OB.surfaceContainerLowest, borderWidth: 1, borderColor: on ? OB.primaryContainer : OB.outlineVariant }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on ? OB.onPrimary : OB.onSurfaceVariant }}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Pressable
            onPress={addService}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: OB.outlineVariant, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 14 }}
          >
            <Plus size={18} color={OB.primary} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: OB.primary }}>Add Service</Text>
          </Pressable>
        </View>

        {/* Added services */}
        {services.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, color: OB.onSurfaceVariant, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 }}>
              Added Services
            </Text>
            <View style={{ gap: 10 }}>
              {services.map((s: OnboardingService, i) => (
                <View key={i} style={{ backgroundColor: OB.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: OB.border, padding: 16, borderLeftWidth: 3, borderLeftColor: OB.primaryContainer }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface }}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Clock size={13} color={OB.onSurfaceVariant} />
                    <Text style={{ fontSize: 13, color: OB.onSurfaceVariant }}>{fmtDuration(s.durationMins)}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: OB.primary }}>GHS {s.price.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Branding banner */}
        <ImageBackground
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../../../assets/step 4 pic.jpg')}
          style={{ marginTop: 22, height: 130, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' }}
          imageStyle={{ borderRadius: 16 }}
        >
          <View style={{ ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }), backgroundColor: 'rgba(42,48,61,0.72)' }} />
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', letterSpacing: 2, color: OB.inverseOnSurface }}>CRAFTING EXCELLENCE</Text>
            <Text style={{ fontSize: 14, color: OB.inverseOnSurface, marginTop: 4, opacity: 0.9 }}>Define your value through your menu.</Text>
          </View>
        </ImageBackground>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleContinue}
        loading={saving}
        canContinue={services.length > 0}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
