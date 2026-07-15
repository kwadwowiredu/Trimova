import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { WheelPicker } from '@/components/onboarding/WheelPicker';
import { useOnboardingStore } from '@/stores/onboardingStore';
import type { DaySchedule } from '@/services/workingHours';

export default function WorkingHoursDayScreen() {
  const insets = useSafeAreaInsets();
  const { index } = useLocalSearchParams<{ index: string }>();
  const idx = Number(index ?? 0);
  const { workingHours, setWorkingHours } = useOnboardingStore();
  const schedule = workingHours ?? [];
  const day = schedule[idx] as DaySchedule | undefined;

  // Local editing copy so nothing commits until "Save".
  const [local, setLocal] = useState<DaySchedule>(
    day ?? { day: 'Day', isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
  );

  function save() {
    const next = schedule.map((d, i) => (i === idx ? local : d));
    setWorkingHours(next);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: OB.border }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ width: 40 }}>
          <ChevronLeft size={24} color={OB.onBackground} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: OB.onBackground }}>{local.day}</Text>

        {/* Open / Closed pill */}
        <View style={{ flexDirection: 'row', backgroundColor: OB.surfaceContainerHigh, borderRadius: 999, padding: 3 }}>
          {(['Open', 'Closed'] as const).map((lbl) => {
            const active = (lbl === 'Open') === local.isOpen;
            return (
              <Pressable key={lbl} onPress={() => setLocal((p) => ({ ...p, isOpen: lbl === 'Open' }))} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? (lbl === 'Open' ? OB.primaryContainer : OB.outline) : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: active ? OB.onPrimary : OB.onSurfaceVariant }}>{lbl}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {local.isOpen ? (
          <>
            <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22 }}>
              Scroll to set when you open and close on {local.day}.
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 24 }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: OB.textFaint, marginBottom: 10 }}>Opens</Text>
                <WheelPicker value={local.openTime} onChange={(v) => setLocal((p) => ({ ...p, openTime: v }))} />
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: OB.textFaint, marginBottom: 10 }}>Closes</Text>
                <WheelPicker value={local.closeTime} onChange={(v) => setLocal((p) => ({ ...p, closeTime: v }))} />
              </View>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: OB.textFaint }}>Closed on {local.day}</Text>
            <Text style={{ fontSize: 13, color: OB.textFaint }}>Switch to Open to set hours.</Text>
          </View>
        )}
      </ScrollView>

      {/* Save */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: OB.border }}>
        <Pressable onPress={save} style={{ backgroundColor: OB.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ color: OB.onPrimary, fontSize: 15, fontWeight: '800' }}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}
