import { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Check, X, Clock, CalendarClock, RotateCcw } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';

interface Option { label: string; value: number; }

// Lead-time options (minutes)
const LEAD_OPTIONS: Option[] = [
  { label: 'No advance notice', value: 0 },
  { label: '15 minutes',        value: 15 },
  { label: '30 minutes',        value: 30 },
  { label: '1 hour',            value: 60 },
  { label: '2 hours',           value: 120 },
  { label: '4 hours',           value: 240 },
  { label: '1 day',             value: 1440 },
];

// Future-window options (days)
const FUTURE_OPTIONS: Option[] = [
  { label: '1 week',   value: 7 },
  { label: '2 weeks',  value: 14 },
  { label: '1 month',  value: 30 },
  { label: '2 months', value: 60 },
  { label: '3 months', value: 90 },
  { label: '6 months', value: 180 },
  { label: '1 year',   value: 365 },
];

function labelFor(options: Option[], value: number, fallback: string) {
  return options.find((o) => o.value === value)?.label ?? fallback;
}

interface BookingRules { leadMinutes: number; futureDays: number; rescheduleLeadMinutes: number; }

export default function BookingRulesScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, updateUser, mergeUser } = useAuthStore();
  const saved = (user as (typeof user & { bookingRules?: BookingRules }) | null)?.bookingRules;

  const [leadMinutes, setLeadMinutes]     = useState(saved?.leadMinutes ?? 30);
  const [futureDays, setFutureDays]       = useState(saved?.futureDays ?? 90);
  const [reschedule, setReschedule]       = useState(saved?.rescheduleLeadMinutes ?? 60);
  const [sheet, setSheet] = useState<null | 'lead' | 'future' | 'reschedule'>(null);
  const [saving, setSaving] = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk, setToastOk] = useState(true);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg); setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  async function persist(next: BookingRules) {
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        bookingLeadMinutes: next.leadMinutes,
        bookingFutureDays: next.futureDays,
        rescheduleLeadMinutes: next.rescheduleLeadMinutes,
      });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      showToast('Booking rules saved', true);
    } catch (e) {
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setSaving(false);
    }
  }

  function choose(value: number) {
    let next: BookingRules = { leadMinutes, futureDays, rescheduleLeadMinutes: reschedule };
    if (sheet === 'lead')        { setLeadMinutes(value); next = { ...next, leadMinutes: value }; }
    if (sheet === 'future')      { setFutureDays(value);  next = { ...next, futureDays: value }; }
    if (sheet === 'reschedule')  { setReschedule(value);  next = { ...next, rescheduleLeadMinutes: value }; }
    setSheet(null);
    persist(next);
  }

  const sheetOptions = sheet === 'future' ? FUTURE_OPTIONS : LEAD_OPTIONS;
  const sheetSelected = sheet === 'lead' ? leadMinutes : sheet === 'future' ? futureDays : reschedule;
  const sheetTitle = sheet === 'lead' ? 'Booking Window' : sheet === 'future' ? 'Future Booking Window' : 'Rescheduling Window';

  const rows = [
    { key: 'lead' as const,       icon: <Clock size={17} color={c.accent} />,         label: 'Booking Window',        hint: 'Minimum notice before an appointment', value: `No less than ${labelFor(LEAD_OPTIONS, leadMinutes, `${leadMinutes} min`).toLowerCase()} in advance` },
    { key: 'future' as const,     icon: <CalendarClock size={17} color={c.accent} />, label: 'Future Booking Window',  hint: 'How far ahead clients can book',        value: `Up to ${labelFor(FUTURE_OPTIONS, futureDays, `${futureDays} days`).toLowerCase()} in the future` },
    { key: 'reschedule' as const, icon: <RotateCcw size={17} color={c.accent} />,     label: 'Rescheduling',           hint: 'Minimum notice to reschedule',          value: `No less than ${labelFor(LEAD_OPTIONS, reschedule, `${reschedule} min`).toLowerCase()} in advance` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Booking Rules</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Control when clients can book ahead</Text>
        </View>
        {saving && <ActivityIndicator size="small" color={c.accent} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Booking Rules
        </Text>
        <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <View key={r.key}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
              <Pressable onPress={() => setSheet(r.key)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {r.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginBottom: 2 }}>{r.label}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{r.value}</Text>
                </View>
                <ChevronRight size={18} color={c.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 14, lineHeight: 18, marginHorizontal: 2 }}>
          These rules limit when clients can book, reschedule, or plan appointments with you. Changes are saved automatically.
        </Text>
      </ScrollView>

      {/* Option picker sheet */}
      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setSheet(null)} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{sheetTitle}</Text>
            <Pressable onPress={() => setSheet(null)} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
          </View>
          {sheetOptions.map((opt, i) => {
            const isSel = opt.value === sheetSelected;
            return (
              <Pressable
                key={opt.value}
                onPress={() => choose(opt.value)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border, backgroundColor: isSel ? c.accentSoft : 'transparent' }}
              >
                <Text style={{ fontSize: 15, fontWeight: isSel ? '700' : '500', color: isSel ? c.accent : c.text }}>{opt.label}</Text>
                {isSel && <Check size={18} color={c.accent} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#fff" /> : <X size={18} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}
