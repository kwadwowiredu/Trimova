import { useEffect, useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';

// Per-USER flag so every account sees the intro the first time they open it.
const introKey = (userId: string | undefined) => `has_seen_loyalty_intro_${userId ?? 'guest'}`;

// ─── Screen 1: Loyalty Welcome Intro ────────────────────────────────────────────

export default function LoyaltyWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const seen = await AsyncStorage.getItem(introKey(user?.id));
      if (!active) return;
      if (seen === 'true') router.replace('/loyalty-dashboard' as any);
      else setReady(true);
    })();
    return () => { active = false; };
  }, [user?.id]);

  async function handleEnable() {
    await AsyncStorage.setItem(introKey(user?.id), 'true');
    router.replace('/loyalty-dashboard' as any);
  }

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header — back · title · info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={26} color={c.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: c.text }}>Loyalty Program</Text>
        <Pressable hitSlop={8}>
          <Info size={22} color={c.textMuted} />
        </Pressable>
      </View>

      {/* Intro paragraph */}
      <Text style={{ fontSize: 16, color: c.textMuted, textAlign: 'center', lineHeight: 26, paddingHorizontal: 28, marginTop: 16 }}>
        Reward your clients for their loyalty. Create custom loyalty programs so clients can earn stamps and redeem them for a discount, free service, or product. Choose what works best for your business, including the final reward.
      </Text>

      {/* Illustration — framed in a full circular border */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{
          width: 280, height: 280, borderRadius: 140, overflow: 'hidden',
          borderWidth: 4, borderColor: c.accent,
          backgroundColor: c.surfaceAlt,
          shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 6,
        }}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../assets/stamp_welcome.jpg')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        <Pressable
          onPress={handleEnable}
          style={{ backgroundColor: c.isDark ? c.accent : '#1A202C', borderRadius: 16, paddingVertical: 18, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 }}>ENABLE LOYALTY PROGRAM</Text>
        </Pressable>
      </View>
    </View>
  );
}
