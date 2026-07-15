import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';

// ─── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ active, c }: { active: boolean; c: ThemeColors }) {
  const bg = active ? (c.isDark ? '#16271C' : 'rgba(56,161,105,0.12)') : c.surfaceAlt;
  const fg = active ? c.success : c.textFaint;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{active ? 'Active' : 'Inactive'}</Text>
    </View>
  );
}

// ─── Program row card (clean, minimal — matches the radio-card inspo, no radio) ──

function ProgramCard({
  title, description, active, onPress, c,
}: {
  title: string; description: string; active: boolean; onPress: () => void; c: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        paddingHorizontal: 18,
        paddingVertical: 18,
      }}
      className="active:opacity-80"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.text }}>{title}</Text>
        <StatusBadge active={active} c={c} />
        <ChevronRight size={20} color={c.textFaint} />
      </View>
      <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 20 }}>{description}</Text>
    </Pressable>
  );
}

// ─── Screen 2: Loyalty Dashboard (program selector) ─────────────────────────────

export default function LoyaltyDashboardScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  // Until the loyalty backend tables exist there are no persisted active records.
  const flashActive = false;
  const stampActive = false;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={26} color={c.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: c.text }}>Loyalty Programs</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

        {/* Brief explanation — borderless */}
        <Text style={{ fontSize: 14, color: c.textMuted, lineHeight: 21, marginTop: 4, marginBottom: 22 }}>
          Choose a marketing structure to reward your regulars and fill empty appointment slots with smart promotions.
        </Text>

        <View style={{ gap: 14 }}>
          <ProgramCard
            c={c}
            title="Flash Promos"
            description="Run time-limited discounts across selected services to fill quiet days and pull in last-minute bookings."
            active={flashActive}
            onPress={() => router.push('/flash-promos' as any)}
          />
          <ProgramCard
            c={c}
            title="Stamp Cards"
            description="Reward repeat visits — clients collect stamps and unlock a reward you choose once they hit the milestone."
            active={stampActive}
            onPress={() => router.push('/stamp-cards' as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}
