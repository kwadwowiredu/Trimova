import { useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Calendar from 'react-native-calendars/src/calendar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ArrowLeft, CalendarX, Clock, Info, AlertTriangle } from 'lucide-react-native';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { generateSlots, groupSlots } from '@/utils/slots';
import { fmt12, fmtDateLong, toDateTime } from '@/stores/bookingStore';
import { tapSelect, tapLight, tapMedium } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';

/** Local "YYYY-MM-DD" — never UTC, which shifts the day in Ghana's timezone. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Move an existing appointment.
 *
 * Same picker rules as booking: only times where the whole service fits, and
 * only slots nobody else holds. The cancellation policy applies to late
 * changes, so the cost is shown before anything is committed.
 */
export default function RescheduleScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: bookingRes, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsService.getById(bookingId!),
    enabled: !!bookingId,
  });
  const booking = bookingRes?.data.data;

  // What moving it costs right now, straight from the API so the figure the
  // client sees is the figure that gets charged.
  const { data: policyRes } = useQuery({
    queryKey: ['booking-policy', bookingId],
    queryFn: () => bookingsService.getPolicy(bookingId!),
    enabled: !!bookingId,
  });
  const policy = policyRes?.data.data;

  const staffId = booking?.staffBarberId ?? undefined;
  const today = new Date();
  const maxDate = new Date(today.getTime() + 90 * 86_400_000);

  const { data: monthRes, isLoading: loadingMonth } = useQuery({
    queryKey: ['availability-month', booking?.barberId, staffId, booking?.serviceDuration],
    queryFn: () =>
      bookingsService.getMonthAvailability({
        barberId: booking!.barberId,
        staffBarberId: staffId,
        from: ymd(today),
        to: ymd(maxDate),
        durationMinutes: booking!.serviceDuration,
      }),
    enabled: !!booking,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const monthDates = monthRes?.data.data.dates ?? {};

  const { data: dayRes, isFetching: loadingDay } = useQuery({
    queryKey: ['availability-day', booking?.barberId, staffId, selectedDate],
    queryFn: () =>
      bookingsService.getAvailability({
        barberId: booking!.barberId,
        staffBarberId: staffId,
        date: selectedDate!,
      }),
    enabled: !!booking && !!selectedDate,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const day = dayRes?.data.data;

  const slots = useMemo(() => {
    if (!booking || !day?.isOpen || !day.openTime || !day.closeTime) return [];
    return generateSlots({
      openTime: day.openTime,
      closeTime: day.closeTime,
      busy: day.busy,
      durationMinutes: booking.serviceDuration,
      isToday: selectedDate === ymd(today),
      leadMinutes: day.leadMinutes,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, booking, selectedDate]);

  const grouped = useMemo(() => groupSlots(slots), [slots]);

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    for (let i = 0; i <= 90; i++) {
      const key = ymd(new Date(today.getTime() + i * 86_400_000));
      marks[key] = monthDates[key]?.available
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
      marks[selectedDate] = {
        customStyles: {
          container: { backgroundColor: T.accent, borderRadius: 12 },
          text: { color: T.onAccent, fontWeight: '800' },
        },
      };
    }
    return marks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthDates, selectedDate]);

  async function handleConfirm() {
    if (!selectedDate || !selectedTime || !booking) return;

    const commit = async () => {
      setSaving(true);
      try {
        await bookingsService.reschedule(
          booking.id,
          toDateTime(selectedDate, selectedTime).toISOString(),
        );
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['availability-day'] });
        queryClient.invalidateQueries({ queryKey: ['availability-month'] });
        Alert.alert(
          'Appointment moved',
          `You're now booked for ${fmtDateLong(selectedDate)} at ${fmt12(selectedTime)}.`,
          [{ text: 'Done', onPress: () => router.back() }],
        );
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 409) {
          await queryClient.invalidateQueries({ queryKey: ['availability-day'] });
          setSelectedTime(null);
          Alert.alert('That time was just taken', 'Please pick another slot.');
          return;
        }
        Alert.alert('Not moved', getApiErrorMessage(err));
      } finally {
        setSaving(false);
      }
    };

    // Nothing to forfeit — just do it.
    if (!policy || policy.feeRate === 0) {
      tapMedium();
      await commit();
      return;
    }

    Alert.alert('Moving this costs you', policy.summary, [
      { text: 'Keep current time', style: 'cancel' },
      { text: 'Move anyway', style: 'destructive', onPress: commit },
    ]);
  }

  if (isLoading || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      </View>
    );
  }

  const warn = chip('warn');
  const currentDate = booking.scheduledAt.slice(0, 10);
  const currentTime = booking.scheduledAt.slice(11, 16);

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
          backgroundColor: T.card, borderBottomWidth: HAIRLINE, borderBottomColor: T.border,
        }}
      >
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={12}>
          <ArrowLeft size={23} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Reschedule</Text>
          <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 1 }} numberOfLines={1}>
            {booking.serviceName} with {booking.barberName}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Where it stands now */}
        <View style={{ margin: 16, marginBottom: 8, backgroundColor: T.input, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Clock size={16} color={T.textMuted} />
          <Text style={{ flex: 1, fontSize: 13.5, color: T.textMuted }}>
            Currently {fmtDateLong(currentDate)} at {fmt12(currentTime)}
          </Text>
        </View>

        {/* What a late change costs */}
        {policy && policy.feeRate > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: warn.bg, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 }}>
            <AlertTriangle size={16} color={warn.fg} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: warn.fg, lineHeight: 19 }}>
              {policy.summary}
            </Text>
          </View>
        )}

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
          theme={{
            calendarBackground: T.card,
            todayTextColor: T.accent,
            arrowColor: T.text,
            monthTextColor: T.text,
            textMonthFontSize: 18,
            textMonthFontWeight: '800',
            textDayFontSize: 15.5,
            textDayFontWeight: '600',
            textDayHeaderFontSize: 11.5,
            textDayHeaderFontWeight: '700',
            textSectionTitleColor: T.textFaint,
            textDisabledColor: T.textDisabled,
            dayTextColor: T.text,
          }}
          style={{
            marginHorizontal: 16, marginTop: 8, paddingBottom: 8,
            backgroundColor: T.card, borderRadius: 18,
            borderWidth: HAIRLINE, borderColor: T.border, overflow: 'hidden',
          }}
        />

        {loadingMonth && (
          <Text style={{ fontSize: 12, color: T.textFaint, textAlign: 'center', marginTop: 10 }}>
            Loading dates…
          </Text>
        )}

        {/* Times */}
        <View style={{ marginTop: 18 }}>
          {!selectedDate ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
              <Info size={22} color={T.textDisabled} />
              <Text style={{ fontSize: 13.5, color: T.textFaint }}>Choose a new date.</Text>
            </View>
          ) : loadingDay ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
              <ActivityIndicator color={T.accent} />
            </View>
          ) : slots.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8, paddingHorizontal: 40 }}>
              <CalendarX size={26} color={T.textDisabled} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.textMuted }}>No openings</Text>
              <Text style={{ fontSize: 13, color: T.textFaint, textAlign: 'center' }}>
                Nothing free on this day. Try another date.
              </Text>
            </View>
          ) : (
            grouped.map((g) => (
              <View key={g.label} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 10 }}>
                  {g.label}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                  {g.slots.map((s) => {
                    const on = s === selectedTime;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => { tapSelect(); setSelectedTime(s); }}
                        style={{
                          borderWidth: on ? 0 : HAIRLINE, borderColor: T.border,
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

      {/* Confirm */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 14, borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
        <Pressable
          onPress={handleConfirm}
          disabled={!selectedDate || !selectedTime || saving}
          style={{
            backgroundColor: selectedDate && selectedTime && !saving ? T.accent : T.input,
            borderRadius: 16, paddingVertical: 16, alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color={T.textDisabled} />
          ) : (
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: selectedDate && selectedTime ? T.onAccent : T.textDisabled }}>
              {selectedTime ? `Move to ${fmt12(selectedTime)}` : 'Pick a new time'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
