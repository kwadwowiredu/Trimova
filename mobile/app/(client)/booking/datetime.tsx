import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, Animated, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
// Imported from its own subpath (not the package barrel) so Metro never has to
// pull in Timeline / TimelineList / agenda / recyclerlistview — we only need
// the month calendar, and the barrel's raw-TS entry is fragile to resolve.
import Calendar from 'react-native-calendars/src/calendar';
import { useQuery } from '@tanstack/react-query';
import { CalendarX, Clock, AlertTriangle, ChevronDown, UserRound } from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import { bookingsService } from '@/services/bookings';
import { useBookingStore, fmt12, addMinutes, toDateTime } from '@/stores/bookingStore';
import { generateSlots, groupSlots } from '@/utils/slots';
import { BookingHeader, ServiceCartBar } from '@/components/booking/BookingHeader';
import { tapSelect, tapLight } from '@/utils/haptics';
import { T, HAIRLINE } from '@/constants/clientTheme';

/** Local "YYYY-MM-DD" (never UTC — that shifts the day in Ghana's timezone). */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Step 3 — pick a date, then a start time that actually fits the service. */
export default function BookingDateTimeScreen() {
  const { barberId, service, professional, date, time, setDateTime } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<string | null>(date);
  const [selectedTime, setSelectedTime] = useState<string | null>(time);

  const { data } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: !!barberId,
  });
  const shop = data?.data.data as unknown as {
    barberType?: string;
    bookingRules?: { leadMinutes: number; futureDays: number };
  } | undefined;
  // Mobile barbers need to know where to travel, so they get an address step.
  const isMobile = shop?.barberType === 'mobile';

  const futureDays = shop?.bookingRules?.futureDays ?? 90;

  const today = new Date();
  const maxDate = new Date(today.getTime() + futureDays * 86_400_000);

  // Only a real staff member narrows the calendar; 'any'/'owner' means the
  // shop's own calendar, which is what the barberId already selects.
  const staffId =
    professional && professional.id !== 'any' && professional.id !== 'owner'
      ? professional.id
      : undefined;

  /**
   * Which days can still fit this service — one request for the whole booking
   * window, so the calendar can grey out closed and fully-booked days.
   */
  const { data: monthData, isLoading: loadingMonth } = useQuery({
    queryKey: ['availability-month', barberId, staffId, service?.durationMinutes, futureDays],
    queryFn: () =>
      bookingsService.getMonthAvailability({
        barberId: barberId!,
        staffBarberId: staffId,
        from: ymd(today),
        to: ymd(maxDate),
        durationMinutes: service!.durationMinutes,
      }),
    enabled: !!barberId && !!service,
    // Someone else can take a slot while this client is deciding, so treat
    // availability as always stale and re-check it on every visit.
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const monthDates = monthData?.data.data.dates ?? {};

  /** The chosen day's real opening hours, breaks and taken slots. */
  const { data: dayData, isFetching: loadingDay } = useQuery({
    queryKey: ['availability-day', barberId, staffId, selectedDate],
    queryFn: () =>
      bookingsService.getAvailability({
        barberId: barberId!,
        staffBarberId: staffId,
        date: selectedDate!,
      }),
    enabled: !!barberId && !!selectedDate,
    staleTime: 0,
    refetchOnMount: 'always',
    // Keep the grid honest while the client browses: a slot taken by someone
    // else should grey out here, not fail at checkout.
    refetchInterval: 30_000,
  });
  const day = dayData?.data.data;

  // ── Toast for "that time has passed" ─────────────────────────
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  function showToast(msg: string) {
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  // The API sends the day's raw calendar; turning it into start times is the
  // same arithmetic on both sides (see utils/slots.ts).
  const slots = useMemo(() => {
    if (!service || !day?.isOpen || !day.openTime || !day.closeTime) return [];
    return generateSlots({
      openTime: day.openTime,
      closeTime: day.closeTime,
      busy: day.busy,
      durationMinutes: service.durationMinutes,
      isToday: selectedDate === ymd(today),
      leadMinutes: day.leadMinutes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, service, selectedDate]);

  const grouped = useMemo(() => groupSlots(slots), [slots]);

  // Green = bookable, greyed = closed or fully booked.
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    for (let i = 0; i <= futureDays; i++) {
      const d = new Date(today.getTime() + i * 86_400_000);
      const key = ymd(d);
      const bookable = monthDates[key]?.available ?? false;
      marks[key] = bookable
        ? {
            customStyles: {
              container: { backgroundColor: T.successWash, borderRadius: 12 },
              text: { color: T.onSuccess, fontWeight: '700' },
            },
          }
        : {
            disabled: true,
            disableTouchEvent: true,
            customStyles: { container: {}, text: { color: T.textDisabled } },
          };
    }
    if (selectedDate) {
      // The one accent moment on this screen.
      marks[selectedDate] = {
        customStyles: {
          container: { backgroundColor: T.accent, borderRadius: 12 },
          text: { color: T.onAccent, fontWeight: '800' },
        },
      };
    }
    return marks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDates, selectedDate, futureDays]);

  // If the clock passes the selected start time, drop it and tell them.
  useEffect(() => {
    if (!selectedDate || !selectedTime) return;
    const check = setInterval(() => {
      if (toDateTime(selectedDate, selectedTime).getTime() <= Date.now()) {
        setSelectedTime(null);
        showToast('That time has already passed — please pick another slot.');
      }
    }, 15_000);
    return () => clearInterval(check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    if (selectedTime && !slots.includes(selectedTime)) setSelectedTime(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  function handleContinue() {
    if (!selectedDate || !selectedTime) return;
    if (toDateTime(selectedDate, selectedTime).getTime() <= Date.now()) {
      setSelectedTime(null);
      showToast('That time has already passed — please pick another slot.');
      return;
    }
    setDateTime(selectedDate, selectedTime);
    router.push(
      (isMobile ? '/(client)/booking/address' : '/(client)/booking/summary') as never,
    );
  }

  const initials = professional?.name.split(' ').slice(0, 2).map((n) => n[0]).join('') ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <BookingHeader title="Book an appointment" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* ── Staff chip — tap to change the barber ─────────────── */}
        {professional && (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Pressable
              onPress={() => { tapLight(); router.back(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'flex-start',
                backgroundColor: T.card,
                borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 999,
                paddingLeft: 5, paddingRight: 14, paddingVertical: 5,
              }}
            >
              {professional.id === 'any' ? (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
                  <UserRound size={16} color={T.textFaint} />
                </View>
              ) : professional.avatarUrl ? (
                <Image source={{ uri: professional.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: T.accent, fontSize: 12, fontWeight: '800' }}>{initials}</Text>
                </View>
              )}
              <Text style={{ fontSize: 15, fontWeight: '600', color: T.text }} numberOfLines={1}>
                {professional.name.split(' ')[0]}
              </Text>
              <ChevronDown size={17} color={T.textMuted} />
            </Pressable>
          </View>
        )}

        {/* ── Calendar ─────────────────────────────────────────── */}
        <Calendar
          minDate={ymd(today)}
          maxDate={ymd(maxDate)}
          onDayPress={(d: { dateString: string }) => {
            tapSelect();
            setSelectedDate(d.dateString);
            setSelectedTime(null);
          }}
          markedDates={markedDates}
          markingType="custom"
          firstDay={1}
          enableSwipeMonths
          hideExtraDays={false}
          theme={{
            calendarBackground: T.card,
            todayTextColor: T.accent,
            arrowColor: T.text,
            monthTextColor: T.text,
            textMonthFontSize: 18,
            textMonthFontWeight: '600',
            textDayFontSize: 15.5,
            textDayFontWeight: '500',
            textDayHeaderFontSize: 11.5,
            textDayHeaderFontWeight: '700',
            textSectionTitleColor: T.textFaint,
            textDisabledColor: T.textDisabled,
            dayTextColor: T.text,
          }}
          // Layer 1 white card holding the calendar
          style={{
            marginHorizontal: 20, marginTop: 10, paddingBottom: 8,
            backgroundColor: T.card, borderRadius: 18,
            borderWidth: HAIRLINE, borderColor: T.border, overflow: 'hidden',
          }}
        />

        {/* Legend */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: T.successWash }} />
            <Text style={{ fontSize: 12, color: T.textFaint }}>Available</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 11, height: 11, borderRadius: 4, backgroundColor: T.input }} />
            <Text style={{ fontSize: 12, color: T.textFaint }}>Unavailable</Text>
          </View>
          {loadingMonth && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <ActivityIndicator size="small" color={T.textFaint} />
              <Text style={{ fontSize: 12, color: T.textFaint }}>Loading dates…</Text>
            </View>
          )}
        </View>

        {/* ── Time slots ───────────────────────────────────────── */}
        <View style={{ marginTop: 10 }}>
          {!selectedDate ? (
            <View style={{ alignItems: 'center', paddingVertical: 26, gap: 8 }}>
              <Clock size={24} color={T.textDisabled} />
              <Text style={{ fontSize: 13.5, color: T.textFaint }}>Choose a date to see available times.</Text>
            </View>
          ) : loadingDay ? (
            <View style={{ alignItems: 'center', paddingVertical: 26, gap: 10 }}>
              <ActivityIndicator color={T.accent} />
              <Text style={{ fontSize: 13.5, color: T.textFaint }}>Checking available times…</Text>
            </View>
          ) : !day?.isOpen ? (
            <View style={{ alignItems: 'center', paddingVertical: 26, gap: 8 }}>
              <CalendarX size={28} color={T.textDisabled} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted }}>Closed on this day</Text>
              <Text style={{ fontSize: 13, color: T.textFaint }}>Please pick another date.</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 26, gap: 8, paddingHorizontal: 40 }}>
              <CalendarX size={28} color={T.textDisabled} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted }}>Fully booked</Text>
              <Text style={{ fontSize: 13, color: T.textFaint, textAlign: 'center', lineHeight: 19 }}>
                No {service?.durationMinutes}-minute openings left on this day. Try another date or barber.
              </Text>
            </View>
          ) : (
            grouped.map((g) => (
              <View key={g.label} style={{ marginBottom: 18 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 10 }}>
                  {g.label}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                  {g.slots.map((s) => {
                    const on = s === selectedTime;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => { tapSelect(); setSelectedTime(s); }}
                        style={{
                          borderWidth: on ? 0 : HAIRLINE,
                          borderColor: T.border,
                          backgroundColor: on ? T.accent : T.card,
                          borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12,
                        }}
                      >
                        <Text style={{ fontSize: 14.5, fontWeight: '600', color: on ? T.onAccent : T.text }}>
                          {fmt12(s)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Cart bar with the running selection */}
      {service && (
        <ServiceCartBar
          serviceName={service.name}
          price={service.price}
          durationMinutes={service.durationMinutes}
          actionLabel={
            selectedTime
              ? `Continue · ${fmt12(selectedTime)} – ${fmt12(addMinutes(selectedTime, service.durationMinutes))}`
              : 'Select a time'
          }
          disabled={!selectedDate || !selectedTime}
          onPress={handleContinue}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', bottom: 190, left: 20, right: 20,
          backgroundColor: T.errorWash, borderRadius: 14,
          borderWidth: HAIRLINE, borderColor: T.onError,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <AlertTriangle size={17} color={T.onError} />
        <Text style={{ flex: 1, color: T.onError, fontSize: 13.5, fontWeight: '600' }}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}
