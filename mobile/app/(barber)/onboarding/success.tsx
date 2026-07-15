import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Image, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, ChevronLeft, ArrowRight } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { useOnboardingStore } from '@/stores/onboardingStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const HERO = require('../../../assets/step 1 pic.jpg');

const CIRCLE = 104;

// Concentric rings that scale up + fade out on a continuous loop, radiating from
// the checkmark.
function RippleRings() {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const loops = rings.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(v, { toValue: 1, duration: 2100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {rings.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2,
            borderWidth: 2, borderColor: OB.secondary,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          }}
        />
      ))}
    </>
  );
}

export default function OnboardingSuccessScreen() {
  const insets = useSafeAreaInsets();

  function goToDashboard() {
    // Onboarding is done — clear the wizard's in-memory scratch state and reset
    // the navigation stack onto the barber workspace home.
    useOnboardingStore.getState().reset();
    router.replace('/(barber)/(tabs)');
  }

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      {/* Header + divider */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F8' }}>
        <Text style={{ textAlign: 'center', fontSize: 14, fontWeight: '600', color: OB.onSurfaceVariant }}>Barber Onboarding</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
        {/* Check circle with radiating ripple */}
        <View style={{ width: CIRCLE, height: CIRCLE, alignItems: 'center', justifyContent: 'center' }}>
          <RippleRings />
          <View style={{ width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: OB.secondary, alignItems: 'center', justifyContent: 'center', shadowColor: OB.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 }}>
            <Check size={52} color="#ffffff" strokeWidth={3} />
          </View>
        </View>

        <Text style={{ fontSize: 32, fontWeight: '800', color: OB.onBackground, marginTop: 30, textAlign: 'center' }}>
          You're All Set!
        </Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 23, marginTop: 12, textAlign: 'center', paddingHorizontal: 8 }}>
          Your profile is now live. Get ready to grow your business with Trimova.
        </Text>
      </View>

      {/* Triptych */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, height: 120 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
            <Image source={HERO} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 12 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 14 }}>
          <ChevronLeft size={18} color={OB.onSurfaceVariant} />
          <Text style={{ color: OB.onSurfaceVariant, fontSize: 15, fontWeight: '600' }}>Previous</Text>
        </Pressable>
        <Pressable
          onPress={goToDashboard}
          style={{ flex: 1, backgroundColor: OB.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Text style={{ color: OB.onPrimary, fontSize: 15, fontWeight: '800' }}>Go to Dashboard</Text>
          <ArrowRight size={18} color={OB.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
