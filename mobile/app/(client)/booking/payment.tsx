import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone, CreditCard, ShieldCheck, Timer, CheckCircle2, Car,
} from 'lucide-react-native';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { useBookingStore, fmt12, fmtDateLong } from '@/stores/bookingStore';
import { BookingHeader, BookingFooter } from '@/components/booking/BookingHeader';
import { tapMedium } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';

/**
 * Final step — pay for a booking that already exists on the server.
 *
 * The slot was reserved when the appointment row was created, so this screen
 * only has to move money: initialize a Paystack charge, let the client
 * complete it, then have the API verify it. Paystack is the authority on
 * whether the charge succeeded — the app never decides that for itself.
 *
 * There's deliberately no payment-method picker here. Paystack's own checkout
 * asks for the method (and handles the OTP/PIN steps that go with it), so
 * choosing twice was busywork that could also disagree with what the client
 * actually paid with.
 *
 * Reachable two ways: straight from the booking wizard, and from the bookings
 * list once a mobile barber has accepted a request (`?bookingId=`).
 */
export default function BookingPaymentScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const queryClient = useQueryClient();
  const { bookingId: storeBookingId, holdExpiresAt, clearHold, reset } = useBookingStore();
  const bookingId = params.bookingId ?? storeBookingId;

  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsService.getById(bookingId!),
    enabled: !!bookingId,
  });
  const booking = data?.data.data;

  // The server's hold is the real one; fall back to it if we arrived here
  // without going through the wizard.
  const deadline = holdExpiresAt ?? (booking?.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : null);

  useEffect(() => {
    if (!deadline || done) return;
    const tick = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(tick);
        clearHold();
        Alert.alert(
          'Slot released',
          'Your payment window expired, so the slot is open to others again. Please pick a time once more.',
          [{ text: 'Choose another time', onPress: () => router.replace('/(client)/booking/datetime' as never) }],
        );
      }
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, done]);

  if (!bookingId || (!isLoading && !booking)) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <BookingHeader title="Payment" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 15, color: T.textFaint, textAlign: 'center' }}>
            Your booking details are incomplete.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading || !booking) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <BookingHeader title="Payment" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      </View>
    );
  }

  async function handlePay() {
    if (!booking) return;
    tapMedium();
    setPaying(true);
    try {
      const { data: initRes } = await bookingsService.initializePayment(booking.id);
      const init = initRes.data;

      // Demo mode: no Paystack key is configured, so there's no checkout page
      // to visit — the API simulates the charge and we go straight to verify.
      if (!init.demo && init.authorizationUrl) {
        // Paystack's hosted checkout handles mobile money and cards, including
        // the OTP steps. Control returns here when the client closes it.
        await WebBrowser.openBrowserAsync(init.authorizationUrl);
      }

      const { data: verified } = await bookingsService.verifyPayment(booking.id, init.reference);
      clearHold();
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability-day'] });
      queryClient.invalidateQueries({ queryKey: ['availability-month'] });
      queryClient.setQueryData(['booking', booking.id], { data: verified });
      setDone(true);
    } catch (err) {
      Alert.alert('Payment not completed', getApiErrorMessage(err));
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
          <Text style={{ fontSize: 24, fontWeight: '600', color: T.text, marginTop: 24, textAlign: 'center' }}>
            Appointment booked
          </Text>
          <Text style={{ fontSize: 14.5, color: T.textMuted, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
            {booking.serviceName} with {booking.barberName}
            {'\n'}
            {fmtDateLong(booking.scheduledAt.slice(0, 10))} · {fmt12(booking.scheduledAt.slice(11, 16))}
          </Text>
          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 12, textAlign: 'center', lineHeight: 19 }}>
            Trimova holds your payment until the appointment is completed.
          </Text>

          <Pressable
            onPress={() => { reset(); router.replace('/(client)/(tabs)/bookings' as never); }}
            style={{ marginTop: 28, backgroundColor: T.accent, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 15 }}
          >
            <Text style={{ color: T.onAccent, fontSize: 15, fontWeight: '600' }}>View my bookings</Text>
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

  const startTime = booking.scheduledAt.slice(11, 16);

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <BookingHeader title="Payment" subtitle={`${booking.serviceName} · ${fmt12(startTime)}`} />

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

        {/* What Paystack will offer on the next screen — informational, not a
            choice, so the client isn't asked the same question twice. */}
        <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 12 }}>
          How you&apos;ll pay
        </Text>
        <View style={{ backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 16, padding: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={19} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: T.text }}>Mobile Money</Text>
              <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 2 }}>MTN · Telecel · AT Money</Text>
            </View>
          </View>

          <View style={{ height: HAIRLINE, backgroundColor: T.border, marginVertical: 14 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: T.accentWash, alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={19} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: T.text }}>Debit / Credit card</Text>
              <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 2 }}>Visa · Mastercard</Text>
            </View>
          </View>
        </View>

        <Text style={{ fontSize: 12.5, color: T.textFaint, lineHeight: 18, marginBottom: 8 }}>
          You&apos;ll pick one on the secure Paystack page after tapping pay.
        </Text>

        {/* Total — recessed well */}
        <View style={{ backgroundColor: T.input, borderRadius: 18, padding: 18, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 14, color: T.textMuted }}>{booking.serviceName}</Text>
            <Text style={{ fontSize: 14, color: T.textMuted }}>GH₵{booking.servicePrice.toFixed(2)}</Text>
          </View>

          {/* A mobile barber who accepted an out-of-range job adds this. */}
          {booking.travelFee > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Car size={14} color={T.textMuted} style={{ marginRight: 7 }} />
              <Text style={{ flex: 1, fontSize: 14, color: T.textMuted }}>Travel fee</Text>
              <Text style={{ fontSize: 14, color: T.textMuted }}>GH₵{booking.travelFee.toFixed(2)}</Text>
            </View>
          )}

          <View style={{ height: HAIRLINE, backgroundColor: T.border, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: T.text }}>Total due</Text>
            <Text style={{ fontSize: 21, fontWeight: '600', color: '#52b788' }}>GH₵{booking.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <ShieldCheck size={15} color={ok.fg} />
          <Text style={{ flex: 1, fontSize: 12, color: T.textFaint, lineHeight: 17 }}>
            Payments are processed securely by Paystack. Trimova never stores your card details,
            and holds your money until the appointment is completed.
          </Text>
        </View>
      </ScrollView>

      {paying ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center', borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
          <ActivityIndicator color={T.accent} />
          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 8 }}>Processing payment…</Text>
        </View>
      ) : (
        <BookingFooter label={`Pay GH₵${booking.total.toFixed(2)}`} onPress={handlePay} />
      )}
    </View>
  );
}
