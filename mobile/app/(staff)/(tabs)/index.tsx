import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Clock, CalendarDays, Scissors, Bell } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { workingHoursService, type DaySchedule } from '@/services/workingHours';

// Mock day sheet until the bookings API exists.
const TODAY_APPTS = [
  { id: '1', time: '10:00', client: 'Ama Osei',      service: 'Executive Fade',  mins: 45 },
  { id: '2', time: '11:30', client: 'Kwesi Poku',    service: 'Beard Trim',      mins: 20 },
  { id: '3', time: '14:00', client: 'Daniel Nkrumah', service: 'Haircut & Beard', mins: 60 },
];

/** Staff "Today" — their own day, nothing shop-wide. */
export default function StaffTodayScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<DaySchedule[] | null>(null);

  useEffect(() => {
    let active = true;
    workingHoursService.getMine()
      .then((res) => { if (active) setSchedule(res.data.data ?? null); })
      .catch(() => { if (active) setSchedule(null); });
    return () => { active = false; };
  }, []);

  const todayName = format(new Date(), 'EEEE');
  const today = schedule?.find((d) => d.day === todayName);
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View style={{ backgroundColor: '#2D27A8', paddingTop: insets.top, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#7B5BC4', opacity: 0.45, top: -80, right: -40 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Welcome back</Text>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#ffffff', marginTop: 2 }}>{firstName}</Text>
            <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
              {format(new Date(), 'EEE, d MMM')}
              {today?.isOpen ? `  ·  ${today.openTime} – ${today.closeTime}` : '  ·  Off today'}
            </Text>
          </View>
          <Pressable hitSlop={10}>
            <Bell size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Day stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            <CalendarDays size={18} color={c.accent} />
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.text, marginTop: 8 }}>{TODAY_APPTS.length}</Text>
            <Text style={{ fontSize: 11.5, color: c.textFaint, marginTop: 2 }}>Appointments today</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16 }}>
            <Clock size={18} color={c.accent} />
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.text, marginTop: 8 }}>
              {TODAY_APPTS.reduce((sum, a) => sum + a.mins, 0)}m
            </Text>
            <Text style={{ fontSize: 11.5, color: c.textFaint, marginTop: 2 }}>Booked time</Text>
          </View>
        </View>

        {/* Today's list */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 }}>
          Your schedule
        </Text>

        {TODAY_APPTS.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
            <Scissors size={30} color={c.textFaint} />
            <Text style={{ fontSize: 14, color: c.textFaint }}>Nothing booked today.</Text>
          </View>
        ) : (
          TODAY_APPTS.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', gap: 14, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 10 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 54 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.accent }}>{a.time}</Text>
                <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>{a.mins}m</Text>
              </View>
              <View style={{ width: 1, backgroundColor: c.border }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{a.client}</Text>
                <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{a.service}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', marginTop: 18, lineHeight: 18 }}>
          Appointments shown here are your own. Shop-wide figures are managed by the owner.
        </Text>
      </ScrollView>
    </View>
  );
}
