import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Pencil, Check, X, Clock } from 'lucide-react-native';

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Monday',    isOpen: true,  openTime: '09:00', closeTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Tuesday',   isOpen: true,  openTime: '09:00', closeTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Wednesday', isOpen: true,  openTime: '09:00', closeTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Thursday',  isOpen: true,  openTime: '09:00', closeTime: '18:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Friday',    isOpen: true,  openTime: '09:00', closeTime: '19:00', breakStart: '13:00', breakEnd: '14:00' },
  { day: 'Saturday',  isOpen: true,  openTime: '08:00', closeTime: '17:00', breakStart: null,    breakEnd: null    },
  { day: 'Sunday',    isOpen: false, openTime: '10:00', closeTime: '15:00', breakStart: null,    breakEnd: null    },
];

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

// ─── Time picker wheel ────────────────────────────────────────────────────────

function TimePicker({ value, onChange, label, onClose }: { value: string; onChange: (v: string) => void; label: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(value);

  return (
    <Modal animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A202C' }}>{label}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={onClose} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
              <X size={17} color="#4A5568" />
            </Pressable>
            <Pressable onPress={() => { onChange(selected); onClose(); }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={17} color="#ffffff" />
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HALF_HOURS.map((time) => (
              <Pressable
                key={time}
                onPress={() => setSelected(time)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
                  backgroundColor: selected === time ? '#3c3cb9' : '#f1f2f3',
                  borderWidth: 1.5, borderColor: selected === time ? '#3c3cb9' : 'transparent',
                  minWidth: 74, alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: selected === time ? '#fff' : '#4A5568' }}>{time}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();

  const [schedule,   setSchedule]   = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [isEditing,  setIsEditing]  = useState(false);
  const [timePicker, setTimePicker] = useState<{ dayIndex: number; field: keyof DaySchedule } | null>(null);

  function updateDay(index: number, patch: Partial<DaySchedule>) {
    setSchedule((prev) => prev.map((d, i) => i === index ? { ...d, ...patch } : d));
  }

  function handleSave() {
    setIsEditing(false);
    // TODO: PATCH /api/barber/schedule { schedule }
  }

  const activeDay = timePicker !== null ? schedule[timePicker.dayIndex] : null;
  const pickerValue = activeDay && timePicker ? (activeDay[timePicker.field] as string | null) ?? '08:00' : '08:00';
  const pickerLabel = timePicker ? `${schedule[timePicker.dayIndex].day} — ${String(timePicker.field).replace(/([A-Z])/g, ' $1').replace(/Start|End/, (m) => m === 'Start' ? '(start)' : '(end)')}` : '';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Schedule</Text>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => setIsEditing(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#4A5568" />
            </Pressable>
            <Pressable onPress={handleSave} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={17} color="#3c3cb9" />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {schedule.map((day, idx) => (
          <View key={day.day} style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 10,
            overflow: 'hidden',
            shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
          }}>
            {/* Day row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: day.isOpen ? '#e0e0ff' : '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: day.isOpen ? '#3c3cb9' : '#A0AEC0' }}>
                  {day.day.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: day.isOpen ? '#1A202C' : '#A0AEC0' }}>{day.day}</Text>
                {day.isOpen ? (
                  <Text style={{ fontSize: 12, color: '#718096', marginTop: 1 }}>
                    {day.openTime} – {day.closeTime}
                    {day.breakStart ? `  ·  Break ${day.breakStart}–${day.breakEnd}` : ''}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, color: '#CBD5E0', marginTop: 1 }}>Closed</Text>
                )}
              </View>
              <Switch
                value={day.isOpen}
                onValueChange={(val) => updateDay(idx, { isOpen: val })}
                trackColor={{ false: '#CBD5E0', true: '#3c3cb9' }}
                thumbColor="#ffffff"
                ios_backgroundColor="#CBD5E0"
                disabled={!isEditing}
              />
            </View>

            {/* Edit time pickers (only when editing and day is open) */}
            {isEditing && day.isOpen && (
              <>
                <View style={{ height: 1, backgroundColor: '#f1f2f3', marginHorizontal: 16 }} />
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => setTimePicker({ dayIndex: idx, field: 'openTime' })}
                      style={{ flex: 1, backgroundColor: '#f1f2f3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="#3c3cb9" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A202C' }}>Opens {day.openTime}</Text>
                    </Pressable>
                    <Pressable onPress={() => setTimePicker({ dayIndex: idx, field: 'closeTime' })}
                      style={{ flex: 1, backgroundColor: '#f1f2f3', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} color="#E53E3E" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A202C' }}>Closes {day.closeTime}</Text>
                    </Pressable>
                  </View>
                  {day.breakStart && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setTimePicker({ dayIndex: idx, field: 'breakStart' })}
                        style={{ flex: 1, backgroundColor: '#fffbeb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} color="#D69E2E" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Break {day.breakStart}</Text>
                      </Pressable>
                      <Pressable onPress={() => setTimePicker({ dayIndex: idx, field: 'breakEnd' })}
                        style={{ flex: 1, backgroundColor: '#fffbeb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} color="#D69E2E" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>Until {day.breakEnd}</Text>
                      </Pressable>
                    </View>
                  )}
                  {!day.breakStart && (
                    <Pressable onPress={() => updateDay(idx, { breakStart: '13:00', breakEnd: '14:00' })}
                      style={{ backgroundColor: '#f1f2f3', borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4A5568' }}>+ Add Break Window</Text>
                    </Pressable>
                  )}
                  {day.breakStart && (
                    <Pressable onPress={() => updateDay(idx, { breakStart: null, breakEnd: null })}
                      style={{ alignItems: 'center', paddingVertical: 4 }}>
                      <Text style={{ fontSize: 12, color: '#E53E3E', fontWeight: '600' }}>Remove Break</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>

      {timePicker && (
        <TimePicker
          value={pickerValue}
          label={pickerLabel}
          onChange={(val) => {
            if (timePicker) {
              updateDay(timePicker.dayIndex, { [timePicker.field]: val });
              setTimePicker(null);
            }
          }}
          onClose={() => setTimePicker(null)}
        />
      )}
    </View>
  );
}
