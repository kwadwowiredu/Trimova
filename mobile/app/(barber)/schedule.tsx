import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Check,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { WheelTimePicker } from '@/components/ui/WheelTimePicker';
import { Skeleton } from '@/components/ui/Skeleton';
import { workingHoursService } from '@/services/workingHours';
import { getApiErrorMessage } from '@/services/api';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string }[];
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Monday',    isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
  { day: 'Tuesday',   isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [{ start: '13:00', end: '14:00' }] },
  { day: 'Wednesday', isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Thursday',  isOpen: true,  openTime: '09:00', closeTime: '18:00', breaks: [] },
  { day: 'Friday',    isOpen: true,  openTime: '09:00', closeTime: '19:00', breaks: [{ start: '13:00', end: '14:00' }] },
  { day: 'Saturday',  isOpen: true,  openTime: '08:00', closeTime: '17:00', breaks: [] },
  { day: 'Sunday',    isOpen: false, openTime: '10:00', closeTime: '15:00', breaks: [] },
];

// ─── Copy hours modal ─────────────────────────────────────────────────────────

function CopyHoursModal({
  visible, sourceDayIndex, schedule, onApply, onClose,
}: {
  visible: boolean;
  sourceDayIndex: number;
  schedule: DaySchedule[];
  onApply: (targetIndices: number[]) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <ChevronLeft size={22} color={c.textMuted} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.text }}>Copy business hours?</Text>
        </View>
        <Text style={{ fontSize: 12, color: c.textMuted, paddingHorizontal: 20, marginBottom: 10, lineHeight: 18 }}>
          Would you like to apply these hours to other days? Select the days below.
        </Text>
        {schedule.map((d, idx) => {
          if (idx === sourceDayIndex) return (
            <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
              <Check size={18} color={c.textFaint} />
              <Text style={{ fontSize: 15, color: c.textFaint }}>{d.day}</Text>
            </View>
          );
          const isSelected = selected.has(idx);
          return (
            <Pressable
              key={d.day}
              onPress={() => toggle(idx)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, borderTopWidth: 1, borderTopColor: c.border }}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6,
                borderWidth: 1.5, borderColor: isSelected ? c.accent : c.textFaint,
                backgroundColor: isSelected ? c.accent : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && <Check size={13} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={{ fontSize: 15, color: c.text, fontWeight: '500' }}>{d.day}</Text>
            </Pressable>
          );
        })}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}>
          <Pressable
            onPress={() => { onApply([...selected]); setSelected(new Set()); onClose(); }}
            style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Continue</Text>
          </Pressable>
          <Pressable onPress={onClose} style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: c.surfaceAlt }}>
            <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 15 }}>No thanks</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Day detail modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  visible, dayIndex, schedule, onCommit, onClose,
}: {
  visible: boolean;
  dayIndex: number | null;
  schedule: DaySchedule[];
  onCommit: (next: DaySchedule[]) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [local,  setLocal]  = useState<DaySchedule | null>(null);
  const [picker, setPicker] = useState<{ field: 'open' | 'close' | 'breakStart' | 'breakEnd'; breakIdx?: number } | null>(null);
  const [showCopy, setShowCopy] = useState(false);
  // Holds the week with this day's edit applied, pending the copy-to-other-days
  // decision, so the whole flow results in exactly ONE save (one toast).
  const [pending, setPending] = useState<DaySchedule[] | null>(null);
  const committedRef = useRef(false);

  // Sync local copy when modal opens
  if (visible && dayIndex !== null && !local) {
    setLocal(JSON.parse(JSON.stringify(schedule[dayIndex])));
  }
  if (!visible && local) {
    setLocal(null);
    setPending(null);
    committedRef.current = false;
  }

  if (!local || dayIndex === null) return null;

  function updateLocal(patch: Partial<DaySchedule>) {
    setLocal((prev) => prev ? { ...prev, ...patch } : prev);
  }

  function getPickerValue() {
    if (!picker || !local) return '09:00';
    if (picker.field === 'open') return local.openTime;
    if (picker.field === 'close') return local.closeTime;
    const brk = local.breaks[picker.breakIdx ?? 0];
    if (!brk) return '13:00';
    return picker.field === 'breakStart' ? brk.start : brk.end;
  }

  function getPickerLabel() {
    if (!picker) return '';
    const map: Record<string, string> = {
      open: 'Opening Time', close: 'Closing Time', breakStart: 'Break Start', breakEnd: 'Break End',
    };
    return map[picker.field] ?? '';
  }

  function handlePickerChange(val: string) {
    if (!picker || !local) return;
    if (picker.field === 'open') updateLocal({ openTime: val });
    else if (picker.field === 'close') updateLocal({ closeTime: val });
    else {
      const newBreaks = [...local.breaks];
      const idx = picker.breakIdx ?? 0;
      if (!newBreaks[idx]) return;
      if (picker.field === 'breakStart') newBreaks[idx] = { ...newBreaks[idx], start: val };
      else newBreaks[idx] = { ...newBreaks[idx], end: val };
      updateLocal({ breaks: newBreaks });
    }
  }

  function handleOK() {
    if (!local || dayIndex === null) return;
    // Apply this day's edit to a working copy; the actual save happens once,
    // after the copy-to-other-days decision.
    setPending(schedule.map((d, i) => (i === dayIndex ? local : d)));
    setShowCopy(true);
  }

  const breakFill = c.isDark ? '#3A2E12' : '#fffbeb';
  const breakText = c.isDark ? '#F6C36B' : '#92400e';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

        {/* Header */}
        <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Pressable onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <ChevronLeft size={20} color={c.textMuted} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: c.text }}>{local.day}</Text>
          <Switch
            value={local.isOpen}
            onValueChange={(val) => updateLocal({ isOpen: val })}
            trackColor={{ false: c.border, true: c.success }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.border}
          />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          {local.isOpen && (
            <>
              <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 16, lineHeight: 18 }}>
                Set your business hours here.
              </Text>

              {/* Start / End row */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <Pressable
                  onPress={() => setPicker({ field: 'open' })}
                  style={{ flex: 1, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, padding: 14 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>START</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{local.openTime}</Text>
                    <ChevronRight size={16} color={c.textFaint} style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setPicker({ field: 'close' })}
                  style={{ flex: 1, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, padding: 14 }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>END</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: c.text }}>{local.closeTime}</Text>
                    <ChevronRight size={16} color={c.textFaint} style={{ transform: [{ rotate: '90deg' }] }} />
                  </View>
                </Pressable>
              </View>

              {/* Breaks */}
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>Breaks</Text>

              {local.breaks.map((brk, i) => (
                <View key={i} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>Break {i + 1}</Text>
                    <Pressable onPress={() => { const b = [...local.breaks]; b.splice(i, 1); updateLocal({ breaks: b }); }}>
                      <X size={16} color={c.danger} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable
                      onPress={() => setPicker({ field: 'breakStart', breakIdx: i })}
                      style={{ flex: 1, backgroundColor: breakFill, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: breakText }}>{brk.start}</Text>
                      <ChevronRight size={14} color={c.warning} style={{ transform: [{ rotate: '90deg' }] }} />
                    </Pressable>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ fontSize: 12, color: c.textFaint }}>to</Text>
                    </View>
                    <Pressable
                      onPress={() => setPicker({ field: 'breakEnd', breakIdx: i })}
                      style={{ flex: 1, backgroundColor: breakFill, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: breakText }}>{brk.end}</Text>
                      <ChevronRight size={14} color={c.warning} style={{ transform: [{ rotate: '90deg' }] }} />
                    </Pressable>
                  </View>
                </View>
              ))}

              <Pressable
                onPress={() => updateLocal({ breaks: [...local.breaks, { start: '13:00', end: '14:00' }] })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: c.textMuted, lineHeight: 20 }}>+</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.textMuted }}>Add Break</Text>
              </Pressable>
            </>
          )}

          {!local.isOpen && (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.textFaint }}>Closed on {local.day}</Text>
              <Text style={{ fontSize: 13, color: c.textFaint }}>Toggle the switch to set hours for this day.</Text>
            </View>
          )}
        </ScrollView>

        {/* OK button */}
        <View style={{ padding: 16, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
          <Pressable onPress={handleOK} style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>OK</Text>
          </Pressable>
        </View>
      </View>

      {/* Smooth scrollable wheel time picker */}
      {picker && (
        <WheelTimePicker
          visible={!!picker}
          value={getPickerValue()}
          label={getPickerLabel()}
          onChange={handlePickerChange}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Copy hours */}
      <CopyHoursModal
        visible={showCopy}
        sourceDayIndex={dayIndex}
        schedule={pending ?? schedule}
        onApply={(targetIndices) => {
          if (!local) return;
          const base = pending ?? schedule;
          const next = base.map((d, i) =>
            targetIndices.includes(i)
              ? { ...d, isOpen: local.isOpen, openTime: local.openTime, closeTime: local.closeTime, breaks: [...local.breaks] }
              : d,
          );
          committedRef.current = true; // prevent the trailing onClose from double-saving
          onCommit(next);
        }}
        onClose={() => {
          // Runs after onApply (Continue) AND on "No thanks". Save the single-day
          // edit only if a copy didn't already commit — guarantees exactly one save.
          if (!committedRef.current && pending) onCommit(pending);
          setShowCopy(false);
          onClose();
        }}
      />
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  // null = still loading (so we never flash the default before the real data).
  const [schedule,   setSchedule]   = useState<DaySchedule[] | null>(null);
  const [activeDay,  setActiveDay]  = useState<number | null>(null);
  const [saving,     setSaving]     = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('Schedule saved');
  const [toastOk,  setToastOk]  = useState(true);

  // Load this barber's own saved hours from the DB on mount (per-account).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await workingHoursService.getMine();
        if (active) setSchedule(res.data.data && res.data.data.length ? res.data.data : DEFAULT_SCHEDULE);
      } catch {
        if (active) setSchedule(DEFAULT_SCHEDULE);
      }
    })();
    return () => { active = false; };
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg);
    setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  // Persist the whole week to the DB.
  async function saveSchedule(next: DaySchedule[]) {
    setSaving(true);
    try {
      await workingHoursService.save(next);
      showToast('Schedule saved', true);
    } catch (e) {
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setSaving(false);
    }
  }

  // Single source of truth for committing a full week (one save → one toast).
  function commitSchedule(next: DaySchedule[]) {
    setSchedule(next);
    saveSchedule(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Schedule</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>When can clients book with you?</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32 }}>

        <Text style={{ fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 24 }}>
          Your Business Hours
        </Text>

        {schedule === null ? (
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i}>
                {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 19, gap: 16 }}>
                  <Skeleton width={90} height={14} />
                  <Skeleton width={110} height={13} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            {schedule.map((day, idx) => (
              <View key={day.day}>
                {idx > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
                <Pressable
                  onPress={() => setActiveDay(idx)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17 }}
                >
                  <Text style={{ width: 100, fontSize: 15, fontWeight: '600', color: c.text }}>{day.day}</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: day.isOpen ? c.textMuted : c.textFaint }}>
                    {day.isOpen ? `${day.openTime} – ${day.closeTime}` : 'Closed'}
                  </Text>
                  <ChevronRight size={16} color={c.textFaint} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? insets.bottom + 12 : 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>
        <Pressable
          onPress={() => schedule && saveSchedule(schedule)}
          disabled={saving || schedule === null}
          style={{ backgroundColor: c.accent, borderRadius: 16, paddingVertical: 18, alignItems: 'center', opacity: (saving || schedule === null) ? 0.7 : 1 }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save Schedule</Text>}
        </Pressable>
      </View>

      <DayDetailModal
        visible={activeDay !== null}
        dayIndex={activeDay}
        schedule={schedule ?? []}
        onCommit={commitSchedule}
        onClose={() => setActiveDay(null)}
      />

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
