import { useState, useEffect, useRef } from 'react';
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
import { Bell, Plus, X, Clock, Info } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Event types ──────────────────────────────────────────────────────────────

interface ScheduleEvent extends ICalendarEventBase {
  color: string;
  serviceName: string;
  eventType: 'appointment' | 'break';
}

// ─── Mock data (replace with useQuery when API is ready) ─────────────────────

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
    endTime:   new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 14, 20).toISOString(),
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

// ─── Calendar layout constant ─────────────────────────────────────────────────

/** Height (px) of each 1-hour row in the timeline. */
const HOUR_ROW_HEIGHT = 80;

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

// ─── NowHourLabel ─────────────────────────────────────────────────────────────
// A module-level component with its OWN clock state. This is the only way to
// put a live time label next to BigCalendar's native now-indicator line:
// HourGuideColumn is memoised with `() => true` so it never re-renders from
// its parent — but a child component that manages its own state CAN re-render
// independently of the memo barrier.
//
// BigCalendar renders it as:
//   <View style={{ height: cellHeight }}>   ← 80 px outer container
//     <NowHourLabel hour={hour} ampm={ampm} />
//   </View>
//
// For non-current hours we mimic the default label.
// For the current hour we overlay the live "HH:mm" text at the exact
// minute-fractional pixel position, aligned with the native red line.

function NowHourLabel({ hour }: { hour: number; ampm: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Re-render every 30 s — fine-grained enough for a clock label
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const isCurrentHour = now.getHours() === hour;

  // Pixel offset of the current minute within this hour's 80 px cell.
  // Mirrors BigCalendar's own getRelativeTopInDay formula:
  //   relativeTop% × totalHeight = (minutesFromStart / totalMinutes) × totalHeight
  // Within one hour cell: (minutes / 60) × HOUR_ROW_HEIGHT
  const minuteOffset = (now.getMinutes() / 60) * HOUR_ROW_HEIGHT;

  if (!isCurrentHour) {
    // Default hour label — matches BigCalendar's own formatHour(hour, false)
    return (
      <Text
        style={{
          fontSize:     10,
          color:        '#A0AEC0',
          textAlign:    'right',
          paddingRight: 4,
          paddingTop:   2,
        }}
      >
        {`${hour}:00`}
      </Text>
    );
  }

  return (
    <View>
      {/*
        Transparent placeholder keeps the column width identical to a normal
        hour label so layout doesn't shift when we switch to the live label.
      */}
      <Text
        style={{
          fontSize:     10,
          color:        'transparent',
          paddingRight: 4,
          paddingTop:   2,
        }}
      >
        {`${hour}:00`}
      </Text>

      {/*
        Live "HH:mm" label, absolutely positioned at the current minute mark.
        Math.max(0, ...) prevents it from going above the cell top when
        minutes = 0 and the label height (≈10 px) would push it negative.
      */}
      <View
        style={{
          position: 'absolute',
          right:    4,
          top:      Math.max(0, minuteOffset - 7),
        }}
      >
        <Text
          style={{
            fontSize:   9,
            fontWeight: '800',
            color:      '#E53E3E',
            textAlign:  'right',
          }}
        >
          {format(now, 'HH:mm')}
        </Text>
      </View>
    </View>
  );
}

// ─── Wheel picker column ──────────────────────────────────────────────────────

const WHEEL_ITEM_H  = 46;
const WHEEL_VISIBLE = 5; // must be odd — centre row = selected

const HOURS_12       = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES_5      = ['00','05','10','15','20','25','30','35','40','45','50','55'];
const MERIDIEM       = ['AM','PM'];
const BREAK_DURATIONS = [15, 30, 45, 60, 90];

interface WheelColumnProps {
  items:         string[];
  selectedIndex: number;
  onChange:      (index: number) => void;
  /** Fixed pixel width — omit to fill parent flex space. */
  width?:        number;
}

function WheelColumn({ items, selectedIndex, onChange, width }: WheelColumnProps) {
  const ref            = useRef<ScrollView>(null);
  const pad            = Math.floor(WHEEL_VISIBLE / 2); // items above / below centre
  // hasMomentumRef tracks whether a momentum phase is in progress.
  // When the user makes a fast swipe, the sequence is:
  //   onScrollBeginDrag → onMomentumScrollBegin → onMomentumScrollEnd
  // For a slow drag (no fling), it's just:
  //   onScrollBeginDrag → onScrollEndDrag
  //
  // Bug that was here before: snapTo() called both scrollTo({animated:true}) AND
  // onChange(). The animated scroll fires onMomentumScrollEnd when it settles —
  // so if the user starts a new drag before the old animation finishes, the old
  // onMomentumScrollEnd fires last with a stale offset, overriding the new pick.
  // Fix: never call scrollTo() from scroll callbacks; only call onChange().
  const hasMomentumRef = useRef(false);

  // Scroll to the initial selected position after layout (no animation —
  // avoids triggering any momentum callbacks on mount).
  useEffect(() => {
    const id = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_H, animated: false });
    }, 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ width, height: WHEEL_ITEM_H * WHEEL_VISIBLE, overflow: 'hidden' }}>
      {/* Highlight band behind the centre (selected) row */}
      <View
        pointerEvents="none"
        style={{
          position:        'absolute',
          top:             pad * WHEEL_ITEM_H,
          left:            4,
          right:           4,
          height:          WHEEL_ITEM_H,
          backgroundColor: 'rgba(60,60,185,0.08)',
          borderRadius:    10,
        }}
      />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: pad * WHEEL_ITEM_H }}
        onScrollBeginDrag={() => {
          hasMomentumRef.current = false;
        }}
        onMomentumScrollBegin={() => {
          hasMomentumRef.current = true;
        }}
        onScrollEndDrag={(e) => {
          // Only handle slow drags (no momentum). If momentum is starting,
          // onMomentumScrollEnd will handle it — don't double-fire.
          if (!hasMomentumRef.current) {
            const clamped = Math.max(
              0,
              Math.min(
                items.length - 1,
                Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H),
              ),
            );
            onChange(clamped);
          }
        }}
        onMomentumScrollEnd={(e) => {
          hasMomentumRef.current = false;
          const clamped = Math.max(
            0,
            Math.min(
              items.length - 1,
              Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H),
            ),
          );
          onChange(clamped);
        }}
      >
        {items.map((label, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={i}
              style={{ height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                // Tap on an item — scroll directly and notify parent.
                // We call scrollTo here (not from a scroll callback) so there
                // is no risk of the stale-animation feedback loop.
                ref.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
                onChange(i);
              }}
            >
              <Text
                style={{
                  fontSize:   isSelected ? 22 : 17,
                  fontWeight: isSelected ? '700' : '400',
                  color:      isSelected ? '#1A202C' : '#A0AEC0',
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Break modal ──────────────────────────────────────────────────────────────

function BreakModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd:   (breakEvent: ScheduleEvent) => void;
}) {
  // Default: 1:00 PM
  const [hourIdx,     setHourIdx]     = useState(0); // HOURS_12[0] = '1'
  const [minIdx,      setMinIdx]      = useState(0); // MINUTES_5[0] = '00'
  const [meridiemIdx, setMeridiemIdx] = useState(1); // MERIDIEM[1]  = 'PM'
  const [duration,    setDuration]    = useState(30);

  function handleAdd() {
    const hour12 = hourIdx + 1; // 1–12
    const hour24 =
      meridiemIdx === 1            // PM
        ? hour12 === 12 ? 12 : hour12 + 12
        : hour12 === 12 ? 0  : hour12; // AM
    const minute = minIdx * 5;
    const today  = new Date();
    const start  = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minute);
    const end    = new Date(start.getTime() + duration * 60_000);
    onAdd({ title: 'Break', start, end, color: '#9CA3AF', serviceName: '', eventType: 'break' });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />

      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl pt-3 pb-10">
        {/* Handle */}
        <View className="w-9 h-1 rounded-full bg-neutral-200 self-center mb-4" />

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 mb-4">
          <Text className="text-[17px] font-bold text-neutral-800">Add Break Time</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color="#4A5568" />
          </Pressable>
        </View>

        {/* Info banner */}
        <View
          className="mx-5 mb-5 rounded-2xl p-4 flex-row items-start gap-3"
          style={{ backgroundColor: 'rgba(60,60,185,0.07)' }}
        >
          <Info size={16} color="#3c3cb9" style={{ marginTop: 1 }} />
          <Text className="flex-1 text-sm text-accent leading-[20px]">
            Setting a break prevents clients from booking you during this time window.
          </Text>
        </View>

        {/* Start time label */}
        <Text className="text-[11px] font-bold text-neutral-400 tracking-widest ml-5 mb-2 uppercase">
          Start time
        </Text>

        {/* Wheel picker — hours : minutes  AM/PM */}
        <View className="flex-row items-center px-5 mb-5">
          <View className="flex-1">
            <WheelColumn items={HOURS_12} selectedIndex={hourIdx} onChange={setHourIdx} />
          </View>
          <Text
            style={{
              fontSize: 26, fontWeight: '300',
              color: '#CBD5E0', paddingBottom: 4,
              marginHorizontal: 4,
            }}
          >
            :
          </Text>
          <View className="flex-1">
            <WheelColumn items={MINUTES_5} selectedIndex={minIdx} onChange={setMinIdx} />
          </View>
          <View style={{ width: 12 }} />
          <WheelColumn
            items={MERIDIEM}
            selectedIndex={meridiemIdx}
            onChange={setMeridiemIdx}
            width={58}
          />
        </View>

        {/* Duration */}
        <Text className="text-[11px] font-bold text-neutral-400 tracking-widest ml-5 mb-2.5 uppercase">
          Duration
        </Text>
        <View className="flex-row gap-2.5 px-5 mb-6">
          {BREAK_DURATIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDuration(d)}
              className={`flex-1 py-2.5 rounded-2xl items-center ${
                duration === d ? 'bg-accent' : 'bg-neutral-100'
              }`}
            >
              <Text
                className={`text-sm font-bold ${duration === d ? 'text-white' : 'text-neutral-500'}`}
              >
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
 * FAB shadow — plain style object (not StyleSheet.create) because:
 * - Coloured shadowColor (#3c3cb9) can't be expressed as a Tailwind class
 * - Android `elevation` can't be expressed as a Tailwind class
 */
const FAB_SHADOW = {
  shadowColor:   '#3c3cb9',
  shadowOffset:  { width: 0, height: 6 },
  shadowOpacity: 0.4,
  shadowRadius:  10,
  elevation:     10,
};

// ─── BigCalendar theme ────────────────────────────────────────────────────────
// deepMerge is applied by Calendar internally, so partial overrides are safe.
const CALENDAR_THEME = {
  palette: {
    nowIndicator: '#E53E3E', // red line to match brand danger colour
  },
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
  const [breakToDelete, setBreakToDelete]   = useState<ScheduleEvent | null>(null);

  // ── Layout calculations ──────────────────────────────────────────────────────
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 84 : 62;
  const HEADER_HEIGHT  = 90;
  const WEEK_HEIGHT    = 72;
  const calendarHeight = screenHeight - insets.top - HEADER_HEIGHT - WEEK_HEIGHT - TAB_BAR_HEIGHT;

  // Initial scroll: show ~1 hr of context before current time on today;
  // for other dates start just before opening hour.
  const currentTime    = new Date();
  const nowMinutes     = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isViewingToday = isSameDay(selectedDate, new Date());
  const scrollMinutes  = isViewingToday
    ? Math.max(0, nowMinutes - 60)
    : Math.max(0, OPEN_HOUR * 60 - 60);

  // Re-mounting BigCalendar on date change resets the scroll position correctly.
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

      {/* ── Timeline calendar ───────────────────────────────── */}
      <View className="flex-1 bg-white">
        <BigCalendar<ScheduleEvent>
          key={calendarKey}
          events={events}
          height={calendarHeight}
          mode="day"
          date={selectedDate}
          hourRowHeight={HOUR_ROW_HEIGHT}
          scrollOffsetMinutes={scrollMinutes}
          ampm={false}
          showTime
          swipeEnabled
          onSwipeEnd={setSelectedDate}
          theme={CALENDAR_THEME}
          /*
            hourComponent replaces BigCalendar's default "10:00" label in the
            left-hand hour guide column. NowHourLabel has its own interval so
            it updates every 30 s regardless of the memo(() => true) barrier on
            HourGuideColumn. Only the current-hour cell shows the live "HH:mm"
            label; all other cells render their normal grey "H:00" text.
          */
          hourComponent={NowHourLabel}
          headerContainerStyle={{ height: 0, overflow: 'hidden' }}
          bodyContainerStyle={{ backgroundColor: '#ffffff' }}
          calendarCellStyle={(date) => ({
            backgroundColor:
              date && (date.getHours() < OPEN_HOUR || date.getHours() >= CLOSE_HOUR)
                ? '#F9FAFB'
                : 'transparent',
          })}
          /*
            onPressEvent is the KEY fix for break taps.

            BigCalendar's useCalendarTouchableOpacityProps sets:
              disabled: !onPressEvent || !!event.disabled

            Without this prop, disabled = true for EVERY event, so no press
            ever fires — not even the custom onPress we inject in renderEvent.
            Providing onPressEvent flips disabled to false, restoring press
            handling for all events. renderEvent's TouchableOpacity then
            receives disabled: false via the {...restProps} spread and fires
            normally.
          */
          onPressEvent={(event) => {
            if (event.eventType === 'break') {
              setBreakToDelete(event);
            } else {
              Alert.alert(event.title, event.serviceName);
            }
          }}
          renderEvent={(event, touchableOpacityProps) => {
            // Destructure `key` so React doesn't warn about key-in-spread
            const { key, ...restProps } = touchableOpacityProps;
            // restProps now carries: disabled=false, onPress=()=>onPressEvent(event)
            // We do NOT override onPress — the default calls our onPressEvent above.

            const durationMinutes =
              (event.end.getTime() - event.start.getTime()) / 60_000;

            // ≤30 min: compact single-row layout to fit the tight slot height
            const isCompact = durationMinutes <= 30;

            return (
              <TouchableOpacity
                key={key}
                {...restProps}
                style={[
                  restProps.style,
                  {
                    backgroundColor: event.color,
                    borderRadius:    7,
                    padding:         isCompact ? 4 : 6,
                    overflow:        'hidden',
                  },
                ]}
              >
                {isCompact ? (
                  // ── Compact: single row for ≤30 min slots ─────────────────
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text
                      style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.95)' }}
                      numberOfLines={1}
                    >
                      {format(event.start, 'HH:mm')}
                    </Text>
                    <Text
                      style={{ fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.85)', flex: 1 }}
                      numberOfLines={1}
                    >
                      {event.eventType === 'appointment'
                        ? `${event.title}${event.serviceName ? ` · ${event.serviceName}` : ''}`
                        : 'Break · Tap to remove'}
                    </Text>
                  </View>
                ) : (
                  // ── Stacked: normal / long slots ───────────────────────────
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
                      <>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: 'white', marginTop: 2 }}>
                          Break
                        </Text>
                        <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                          Tap to remove
                        </Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── FAB ─────────────────────────────────────────────── */}
      <Pressable
        className="absolute right-5 w-14 h-14 rounded-full bg-accent items-center justify-center active:opacity-80"
        style={[FAB_SHADOW, { bottom: TAB_BAR_HEIGHT - 50 }]}
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

      {/* ── Remove-break confirmation ─────────────────────────── */}
      <ConfirmModal
        visible={breakToDelete !== null}
        onClose={() => setBreakToDelete(null)}
        onConfirm={() => {
          if (breakToDelete) {
            setBreaks((prev) =>
              prev.filter((b) => b.start.getTime() !== breakToDelete.start.getTime()),
            );
          }
          setBreakToDelete(null);
        }}
        title="Remove Break"
        message={
          breakToDelete
            ? `Remove the ${format(breakToDelete.start, 'HH:mm')} break from your schedule?`
            : ''
        }
        confirmLabel="Remove Break"
        cancelLabel="Keep"
        variant="warning"
      />
    </View>
  );
}
