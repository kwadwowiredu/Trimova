import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, Calendar, ChevronRight } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';

// ─── Screen 1: Barber Onboarding welcome landing ────────────────────────────────

function ValueRow({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: OB.surfaceContainerLow, borderRadius: 16, borderWidth: 1, borderColor: OB.border,
      paddingHorizontal: 16, paddingVertical: 16,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: OB.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: OB.onSurface }}>{title}</Text>
        <Text style={{ fontSize: 12, color: OB.onSurfaceVariant, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function OnboardingWelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>

      {/* Top navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 14, color: OB.onSurfaceVariant }}>Barber Onboarding</Text>
        <Pressable onPress={() => router.replace('/(barber)/(tabs)')} hitSlop={10} style={{ position: 'absolute', right: 16 }}>
          <Text style={{ color: OB.primary, fontSize: 15, fontWeight: '600' }}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Promotional banner */}
        <View style={{ backgroundColor: OB.primaryContainer, borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../../assets/step 1 pic.jpg')}
            style={{ width: '100%', height: 210 }}
            resizeMode="cover"
          />
          {/* Floating badge */}
          <View style={{ position: 'absolute', bottom: 22, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }}>
              <Text style={{ color: OB.onPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }}>LEVEL UP YOUR CAREER</Text>
            </View>
          </View>
        </View>

        {/* Headline + body */}
        <Text style={{ fontSize: 34, fontWeight: '800', color: OB.onBackground, textAlign: 'center', marginTop: 32, lineHeight: 40 }}>
          Complete Your Profile
        </Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, textAlign: 'center', lineHeight: 23, marginTop: 12, paddingHorizontal: 12 }}>
          Set up your profile now to appear in client search results and start receiving bookings.
        </Text>

        {/* Value proposition rows */}
        <View style={{ gap: 12, marginTop: 32 }}>
          <ValueRow
            icon={<Eye size={20} color={OB.primaryContainer} />}
            title="Client Discovery"
            subtitle="Get listed in the local marketplace."
          />
          <ValueRow
            icon={<Calendar size={20} color={OB.primaryContainer} />}
            title="Instant Bookings"
            subtitle="Accept appointments 24/7 automatically."
          />
        </View>
      </View>

      {/* Sticky bottom action */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: OB.background }}>
        <Pressable
          onPress={() => router.push('/(barber)/onboarding/photos')}
          style={{ backgroundColor: OB.primary, borderRadius: 14, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Text style={{ color: OB.onPrimary, fontSize: 16, fontWeight: '800' }}>Get Started</Text>
          <ChevronRight size={18} color={OB.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}
