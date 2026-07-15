import { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Clock, ChevronRight } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { workingHoursService, type DaySchedule } from '@/services/workingHours';

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Monday',    isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Tuesday',   isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Wednesday', isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Thursday',  isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Friday',    isOpen: true,  openTime: '09:00', closeTime: '19:00', breaks: [] },
  { day: 'Saturday',  isOpen: true,  openTime: '08:00', closeTime: '17:00', breaks: [] },
  { day: 'Sunday',    isOpen: false, openTime: '10:00', closeTime: '15:00', breaks: [] },
];

export default function OnboardingWorkingHoursScreen() {
  const insets = useSafeAreaInsets();
  const { workingHours, setWorkingHours } = useOnboardingStore();
  const [saving, setSaving] = useState(false);

  // Seed defaults into the store the first time this flow is entered.
  useEffect(() => {
    if (!workingHours) setWorkingHours(DEFAULT_SCHEDULE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedule = workingHours ?? DEFAULT_SCHEDULE;
  const openCount = schedule.filter((d) => d.isOpen).length;

  function goNext() {
    const isFreelance = useOnboardingStore.getState().barberType === 'mobile';
    router.push(isFreelance ? '/(barber)/onboarding/payout-setup' : '/(barber)/onboarding/bookable');
  }

  async function handleContinue() {
    setSaving(true);
    try {
      await workingHoursService.save(schedule);
    } catch {
      // best-effort — refine later in Settings › Schedule.
    } finally {
      setSaving(false);
      goNext();
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={5} onBack={() => router.back()} onSkip={goNext} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground }}>Working Hours</Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 6 }}>
          Set the days and times clients can book you. Tap a day to adjust its hours.
        </Text>

        {/* Day list */}
        <View style={{ marginTop: 20, backgroundColor: OB.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: OB.border, overflow: 'hidden' }}>
          {schedule.map((d, idx) => (
            <Pressable
              key={d.day}
              onPress={() => router.push({ pathname: '/(barber)/onboarding/working-hours-day', params: { index: String(idx) } })}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: OB.border }}
            >
              <Text style={{ width: 108, fontSize: 15, fontWeight: '700', color: OB.onSurface }}>{d.day}</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: d.isOpen ? OB.onSurfaceVariant : OB.textFaint }}>
                {d.isOpen ? `${d.openTime} – ${d.closeTime}` : 'Closed'}
              </Text>
              <ChevronRight size={18} color={OB.outline} />
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <Clock size={14} color={OB.onSurfaceVariant} />
          <Text style={{ fontSize: 13, color: OB.onSurfaceVariant }}>
            {openCount > 0 ? `Open ${openCount} day${openCount > 1 ? 's' : ''} a week` : 'Mark at least one day as open to continue'}
          </Text>
        </View>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleContinue}
        loading={saving}
        canContinue={openCount > 0}
        insetBottom={insets.bottom}
      />
    </View>
  );
}
