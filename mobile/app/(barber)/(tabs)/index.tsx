import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as BigCalendar, type ICalendarEventBase } from 'react-native-big-calendar';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Bell, Plus, X, Clock } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

// ─── Event types ──────────────────────────────────────────────────────────────

interface ScheduleEvent extends ICalendarEventBase {
  color: string;
  serviceName: string;
  eventType: 'appointment' | 'break';
}

// ─── Mock data (ISO timestamps — replace with useQuery when API is ready) ─────

const TODAY = new Date();

const MOCK_DB_APPOINTMENTS = [
  {
    id: '1',
    clientName: 'Kwadwo Yiadom',
    clientAvatar: null as string | null,
    serviceName: 'Haircut & Beard',
    startTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 0).toISOString(),
    endTime:   new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 45).toISOString(),
    status: 'confirmed' as const,
    color: '#7C3AED',
  },
  {
    id: '2',
    clientName: 'Kofi Mensah',
    clientAvatar: null as string | null,
    serviceName: 'Executive Fade',
    startTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 0).toISOString(),
    endTime:   new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 30).toISOString(),
    status: 'confirmed' as const,
    color: '#2563EB',
  },
  {
    id: '3',
    clientName: 'Ama Asante',
    clientAvatar: null as string | null,
    serviceName: 'Beard Trim',
    startTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 14, 0).toISOString(),
    endTime:   new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 14, 30).toISOString(),
    status: 'pending' as const,
    color: '#059669',
  },
];

function toScheduleEvents(
  appointments: typeof MOCK_DB_APPOINTMENTS,
  breaks: ScheduleEvent[] = [],
): ScheduleEvent[] {
  return [
    ...appointments.map((a) => ({
      title:       a.clientName,
      start:       new Date(a.startTime),
      end:         new Date(a.endTime),
      color:       a.color,
      serviceName: a.serviceName,
      eventType:   'appointment' as const,
    })),
    ...breaks,
  ];
}

// ─── Calendar layout constants ────────────────────────────────────────────────

/**
 * Height (px) of each 1-hour row in the timeline.
 * 80 vs the ~60 default gives readable 30-min slots.
 */
const HOUR_ROW_HEIGHT = 80;

/**
 * The static "now" line sits at 35% from the top of the calendar area.
 * On first load the calendar scrolls so the current time lands here.
 */
const ANCHOR_RATIO = 0.35;

// ─── Week day selector ────────────────────────────────────────────────────────

function WeekDaySelector({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today     = new Date();

  return (
    <View className="flex-row px-2 py-2 bg-white border-b border-neutral-100">
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday    = isSameDay(day, today);
        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(day)}
            className={`flex-1 items-center py-1.5 rounded-xl ${isSelected ? 'bg-accent' : ''}`}
          >
            <Text
              className={`text-[10px] font-semibold ${
                isSelected ? 'text-white' : 'text-neutral-400'
              }`}
            >
              {format(day, 'EEE').toUpperCase()}
            </Text>
            <Text
              className={`text-[15px] font-bold mt-1 ${
                isSelected ? 'text-white' : isToday ? 'text-accent' : 'text-neutral-800'
              }`}
            >
              {format(day, 'd')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Break modal ──────────────────────────────────────────────────────────────

const BREAK_DURATIONS = [15, 30, 45, 60, 90];

function BreakModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (breakEvent: ScheduleEvent) => void;
}) {
  const [startHour, setStartHour] = useState(13);
  const [duration, setDuration]   = useState(30);

  function handleAdd() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, 0);
    const end   = new Date(start.getTime() + duration * 60 * 1000);
    onAdd({
      title:       'Break',
      start,
      end,
      color:       '#9CA3AF',
      serviceName: '',
      eventType:   'break',
    });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pt-3 pb-10">
        <View className="w-9 h-1 rounded-full bg-neutral-200 self-center mb-4" />

        <View className="flex-row items-center justify-between px-5 mb-5">
          <Text className="text-[17px] font-bold text-neutral-800">Add Break Time</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color="#4A5568" />
          </Pressable>
        </View>

        <Text className="text-[11px] font-bold text-neutral-400 tracking-widest ml-5 mb-2.5 uppercase">
          Start time
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
            <Pressable
              key={h}
              onPress={() => setStartHour(h)}
              className={`px-3.5 py-2 rounded-full ${startHour === h ? 'bg-accent' : 'bg-neutral-100'}`}
            >
              <Text className={`text-sm font-semibold ${startHour === h ? 'text-white' : 'text-neutral-500'}`}>
                {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text className="text-[11px] font-bold text-neutral-400 tracking-widest ml-5 mb-2.5 uppercase">
          Duration
        </Text>
        <View className="flex-row gap-2.5 px-5 mb-6">
          {BREAK_DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              className={`flex-1 py-2.5 rounded-2xl items-center ${duration === d ? 'bg-accent' : 'bg-neutral-100'}`}
            >
              <Text className={`text-sm font-bold ${duration === d ? 'text-white' : 'text-neutral-500'}`}>
                {d >= 60 ? `${d / 60}h` : `${d}m`}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          className="flex-row items-center justify-center gap-2 bg-accent rounded-full mx-5 py-4 active:opacity-80"
          onPress={handleAdd}
        >
          <Clock size={16} color="white" />
          <Text className="text-white font-bold text-base">Add Break</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── Working hours ────────────────────────────────────────────────────────────

const OPEN_HOUR  = 10;
const CLOSE_HOUR = 19;

/**
 * FAB shadow — plain const (not StyleSheet.create) because:
 * - Coloured shadowColor (#3c3cb9) cannot be expressed as a Tailwind class
 * - Android `elevation` cannot be expressed as a Tailwind class
 */
const FAB_SHADOW = {
  shadowColor:   '#3c3cb9',
  shadowOffset:  { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius:  10,
  elevation:     10,
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberHomeScreen() {
  const insets                   = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { user }                 = useAuthStore();
  const barber                   = user as BarberProfile | null;

  const [selectedDate, setSelectedDate]     = useState(new Date());
  const [breaks, setBreaks]                 = useState<ScheduleEvent[]>([]);
  const [showBreakModal, setShowBreakModal] = useState(false);

  // ── Live clock (updates every minute for the "now" indicator label) ──────────
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // ── Layout calculations ──────────────────────────────────────────────────────
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 62;
  const HEADER_HEIGHT  = 90;
  const WEEK_HEIGHT    = 72;
  const calendarHeight = screenHeight - insets.top - HEADER_HEIGHT - WEEK_HEIGHT - TAB_BAR_HEIGHT;

  // Y-position (px) where the static "now" line is drawn
  const ANCHOR_Y = calendarHeight * ANCHOR_RATIO;

  // How many minutes of timeline correspond to ANCHOR_Y pixels from the top
  const ANCHOR_MINUTES = (ANCHOR_Y / HOUR_ROW_HEIGHT) * 60;

  // Initial scroll offset: aligns current time with the "now" line on first render.
  // For non-today dates, scroll to 1 hour before open.
  const nowMinutes      = now.getHours() * 60 + now.getMinutes();
  const isViewingToday  = isSameDay(selectedDate, new Date());
  const scrollMinutes   = isViewingToday
    ? Math.max(0, nowMinutes - ANCHOR_MINUTES)
    : Math.max(0, OPEN_HOUR * 60 - 60);

  // Re-mounting BigCalendar on date change resets scroll to the correct position.
  // We do NOT re-mount every minute (that would reset user-scroll state).
  const calendarKey = selectedDate.toDateString();

  const events       = toScheduleEvents(MOCK_DB_APPOINTMENTS, breaks);
  const businessName = barber?.businessName ?? 'My Barbershop';
  const workingHours = `${OPEN_HOUR}:00 – ${CLOSE_HOUR}:00`;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 border-b border-neutral-100 h-[70]">
        <View className="flex-1 mr-3">
          <Text className="text-[17px] font-bold text-neutral-800" numberOfLines={1}>
            {businessName}
          </Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            {format(selectedDate, 'EEE, d MMM')}
            {'  ·  '}
            {workingHours}
          </Text>
        </View>
        <Pressable className="relative p-1" hitSlop={10}>
          <Bell size={22} color="#4A5568" />
          <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-2 border-white" />
        </Pressable>
      </View>

      {/* ── Week strip ──────────────────────────────────────── */}
      <WeekDaySelector selectedDate={selectedDate} onSelect={setSelectedDate} />

      {/* ── Timeline calendar + static now indicator ────────── */}
      <View className="flex-1 bg-white">
        <BigCalendar<ScheduleEvent>
          key={calendarKey}
          events={events}
          height={calendarHeight}
          mode="day"
          date={selectedDate}
          hourRowHeight={HOUR_ROW_HEIGHT}
          scrollOffsetMinutes={scrollMinutes}
          hideNowIndicator   // we draw our own fixed-position indicator below
          ampm={false}
          showTime
          swipeEnabled
          onSwipeEnd={setSelectedDate}
          headerContainerStyle={{ height: 0, overflow: 'hidden' }}
          bodyContainerStyle={{ backgroundColor: '#ffffff' }}
          calendarCellStyle={(hour) => ({
            backgroundColor:
              hour < OPEN_HOUR || hour >= CLOSE_HOUR ? '#F9FAFB' : 'transparent',
          })}
          renderEvent={(event, touchableOpacityProps) => {
            // Extract `key` from the spread so React doesn't warn about key-in-spread
            const { key, ...restProps } = touchableOpacityProps;

            // Duration-aware layout: compact horizontal row for ≤25 min slots
            const durationMinutes =
              (event.end.getTime() - event.start.getTime()) / 60_000;
            const isCompact = durationMinutes <= 25;

            return (
              <TouchableOpacity
                key={key}
                {...restProps}
                style={[
                  restProps.style,
                  {
                    backgroundColor: event.color,
                    borderRadius: 7,
                    padding: isCompact ? 4 : 6,
                    overflow: 'hidden',
                  },
                ]}
                onPress={() =>
                  event.eventType === 'appointment' &&
                  Alert.alert(event.title, event.serviceName)
                }
              >
                {isCompact ? (
                  // ── Single-row layout for short (≤25 min) slots ──────────
                  // Dynamic layout depending on runtime event duration — inline justified
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <Text
                      style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.95)', flexShrink: 0 }}
                    >
                      {format(event.start, 'HH:mm')}
                    </Text>
                    <Text
                      style={{ fontSize: 10, fontWeight: '600', color: 'white', flexShrink: 1 }}
                      numberOfLines={1}
                    >
                      · {event.eventType === 'appointment' ? event.title : 'Break'}
                    </Text>
                  </View>
                ) : (
                  // ── Stacked layout for normal / long slots ──────────────
                  <>
                    <Text
                      style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.95)', lineHeight: 13 }}
                    >
                      {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                    </Text>
                    {event.eventType === 'appointment' ? (
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: 'white', marginTop: 2 }}>
                          {event.title}
                        </Text>
                        <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                          {event.serviceName}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: 'white', marginTop: 2 }}>
                        Break
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          }}
        />

        {/*
          Static "now" indicator — absolute overlay, always at ANCHOR_Y from the
          top of the calendar area. pointerEvents="none" so all touches fall
          through to BigCalendar beneath it.

          ANCHOR_Y depends on calendarHeight (device-specific runtime value), and
          the dot/label positions are pixel-precise against BigCalendar's internal
          layout — both justified for inline styles per AGENTS.md.
        */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: ANCHOR_Y, left: 0, right: 0, zIndex: 10 }}
        >
          {/* Full-width red line */}
          <View style={{ height: 2, backgroundColor: '#E53E3E' }} />

          {/* Circle dot at the junction between the time-label column and events area */}
          <View
            style={{
              position: 'absolute',
              top: -4,
              left: 54,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#E53E3E',
            }}
          />

          {/*
            Time label pill — overlays the BigCalendar time-label column.
            Updates every minute via `now` state; BigCalendar does NOT re-mount.
          */}
          <View
            style={{
              position: 'absolute',
              top: -11,
              left: 2,
              backgroundColor: '#E53E3E',
              borderRadius: 4,
              paddingHorizontal: 5,
              paddingVertical: 2,
              width: 46,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 }}>
              {format(now, 'HH:mm')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── FAB ─────────────────────────────────────────────── */}
      <Pressable
        className="absolute right-5 w-14 h-14 rounded-full bg-accent items-center justify-center active:opacity-80"
        style={[FAB_SHADOW, { bottom: TAB_BAR_HEIGHT + 16 }]}
        onPress={() => setShowBreakModal(true)}
      >
        <Plus size={26} color="white" />
      </Pressable>

      {/* ── Break modal ──────────────────────────────────────── */}
      <BreakModal
        visible={showBreakModal}
        onClose={() => setShowBreakModal(false)}
        onAdd={(breakEvent) => setBreaks((prev) => [...prev, breakEvent])}
      />
    </View>
  );
}
