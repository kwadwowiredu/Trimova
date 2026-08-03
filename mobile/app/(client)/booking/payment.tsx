import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  Smartphone, CreditCard, Check, ShieldCheck, Timer, CheckCircle2,
} from 'lucide-react-native';
import {
  useBookingStore, fmt12, fmtDateLong, addMinutes, toDateTime,
} from '@/stores/bookingStore';
import { reserveBlock } from '@/utils/slots';
import { BookingHeader, BookingFooter } from '@/components/booking/BookingHeader';
import { tapSelect, tapMedium } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';

type Method = 'momo' | 'card';

/** Final step — choose how to pay, then confirm the appointment. */
export default function BookingPaymentScreen() {
  const {
    service, professional, date, time, holdExpiresAt, clearHold, reset,
  } = useBookingStore();

  const [method, setMethod] = useState<Method>('momo');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [remaining, setRemaining] = useState(0);

  // Keep enforcing the hold + appointment time here too.
  useEffect(() => {
    if (!holdExpiresAt || done) return;
    const tick = setInterval(() => {
      const left = holdExpiresAt - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        clearHold();
        Alert.alert(
          'Slot released',
          'Your payment window expired, so the slot is open to others again. Please pick a time once more.',
          [{ text: 'Choose another time', onPress: () => router.replace('/(client)/booking/datetime' as never) }],
        );
        return;
      }
      if (date && time && toDateTime(date, time).getTime() <= Date.now()) {
        clearInterval(tick);
        clearHold();
        Alert.alert(
          'Booking time has passed',
          'The appointment time you selected has already passed. Please choose another slot.',
          [{ text: 'Choose another time', onPress: () => router.replace('/(client)/booking/datetime' as never) }],
        );
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdExpiresAt, date, time, done]);

  if (!service || !professional || !date || !time) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <BookingHeader title="Payment" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 15, color: '#8a89a3', textAlign: 'center' }}>Your booking details are incomplete.</Text>
        </View>
      </View>
    );
  }

  const endTime = addMinutes(time, service.durationMinutes);

  async function handlePay() {
    tapMedium();
    setPaying(true);
    try {
      // TODO: real Paystack charge (react-native-paystack-webview) + POST /bookings.
      await new Promise((r) => setTimeout(r, 1400));
      // Lock the slot so nobody else can take it.
      reserveBlock(professional!.id, date!, { start: time!, end: endTime });
      clearHold();
      setDone(true);
    } finally {
      setPaying(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (done) {
    const ok = chip('success');
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: ok.bg, alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={48} color={ok.fg} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: T.text, marginTop: 24, textAlign: 'center' }}>
            Appointment booked
          </Text>
          <Text style={{ fontSize: 14.5, color: T.textMuted, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
            {service.name} with {professional.name}
            {'\n'}
            {fmtDateLong(date)} · {fmt12(time)}
          </Text>
          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 12, textAlign: 'center' }}>
            You'll get a reminder before your appointment.
          </Text>

          <Pressable
            onPress={() => { reset(); router.replace('/(client)/(tabs)/bookings' as never); }}
            style={{ marginTop: 28, backgroundColor: T.accent, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 15 }}
          >
            <Text style={{ color: T.onAccent, fontSize: 15, fontWeight: '700' }}>View my bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => { reset(); router.replace('/(client)/(tabs)' as never); }}
            style={{ marginTop: 12, paddingVertical: 8 }}
          >
            <Text style={{ color: T.textFaint, fontSize: 14, fontWeight: '600' }}>Back to home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const mins = Math.max(0, Math.floor(remaining / 60000));
  const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));

  const warn = chip('warn');
  const ok = chip('success');

  const METHODS: { id: Method; icon: React.ReactNode; title: string; sub: string }[] = [
    { id: 'momo', icon: <Smartphone size={19} color={T.accent} />, title: 'Mobile Money', sub: 'MTN · Telecel · AT Money' },
    { id: 'card', icon: <CreditCard size={19} color={T.accent} />, title: 'Debit / Credit card', sub: 'Visa · Mastercard' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <BookingHeader title="Payment" subtitle={`${service.name} · ${fmt12(time)}`} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        {/* Countdown — soft tint, deep label */}
        {remaining > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: warn.bg, borderRadius: 14, padding: 13, marginBottom: 18 }}>
            <Timer size={16} color={warn.fg} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: warn.fg }}>
              Pay within {mins}:{String(secs).padStart(2, '0')} to keep this slot
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 12 }}>Payment method</Text>
        {METHODS.map((m) => {
          const on = method === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => { tapSelect(); setMethod(m.id); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                borderWidth: on ? 1.5 : HAIRLINE, borderColor: on ? T.accent : T.border,
                backgroundColor: T.card,
                borderRadius: 16, padding: 16, marginBottom: 12,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
                {m.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>{m.title}</Text>
                <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 2 }}>{m.sub}</Text>
              </View>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                borderWidth: on ? 0 : 1.5, borderColor: T.border,
                backgroundColor: on ? T.accent : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <Check size={14} color={T.onAccent} strokeWidth={3} />}
              </View>
            </Pressable>
          );
        })}

        {/* Total — recessed well */}
        <View style={{ backgroundColor: T.input, borderRadius: 18, padding: 18, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: T.text }}>Total due</Text>
            <Text style={{ fontSize: 21, fontWeight: '800', color: T.text }}>GH₵{service.price.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <ShieldCheck size={15} color={ok.fg} />
          <Text style={{ flex: 1, fontSize: 12, color: T.textFaint, lineHeight: 17 }}>
            Payments are processed securely by Paystack. Trimova never stores your card details.
          </Text>
        </View>
      </ScrollView>

      {paying ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center', borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
          <ActivityIndicator color={T.accent} />
          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 8 }}>Processing payment…</Text>
        </View>
      ) : (
        <BookingFooter label={`Pay GH₵${service.price.toFixed(2)}`} onPress={handlePay} />
      )}
    </View>
  );
}
