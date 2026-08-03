import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Check, Timer, Car, Store, Info, MapPin,
} from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import {
  useBookingStore, fmt12, fmtDateLong, addMinutes, toDateTime, PAYMENT_WINDOW_MS,
} from '@/stores/bookingStore';
import { tapLight, tapSelect } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import { useAuthStore } from '@/stores/authStore';
import { useBookingRequestStore } from '@/stores/bookingRequestStore';
import { checkTravelRange } from '@/utils/distance';

/** Step 4 — review everything, accept the policy, then pay. */
export default function BookingSummaryScreen() {
  const insets = useSafeAreaInsets();
  const {
    barberId, shopName, service, professional, date, time,
    clientAddress, clientCoords, holdExpiresAt, beginHold, clearHold,
  } = useBookingStore();

  const [remaining, setRemaining] = useState(PAYMENT_WINDOW_MS);
  const [agreed, setAgreed] = useState(false);

  const { data } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: !!barberId,
  });
  const shop = data?.data.data as unknown as {
    locationAddress?: string | null; barberType?: string; businessName?: string | null;
    fullName?: string; lat?: number | null; lng?: number | null; serviceRadius?: number | null;
  } | undefined;
  const isMobile = shop?.barberType === 'mobile';

  // Out-of-range clients can't book a mobile barber outright — they send a
  // request, and the barber sets a travel fee before any payment happens.
  // Distance comes from the address the client TYPED on the previous step.
  const { user } = useAuthStore();
  const submitRequest = useBookingRequestStore((s) => s.submit);
  const travel = isMobile ? checkTravelRange(clientCoords, shop ?? {}) : null;
  const needsRequest = !!travel?.needsRequest;

  function handleSendRequest() {
    if (!service || !professional || !date || !time || !travel?.distance) return;
    submitRequest({
      barberId: barberId!,
      barberName: shop?.fullName ?? shopName ?? 'Barber',
      clientName: user?.fullName ?? 'Client',
      clientAddress: clientAddress ?? 'Address not given',
      serviceName: service.name,
      servicePrice: service.price,
      durationMinutes: service.durationMinutes,
      date,
      time,
      distanceKm: travel.distance,
    });
    clearHold();
    Alert.alert(
      'Request sent',
      `${shop?.fullName?.split(' ')[0] ?? 'The barber'} will review your request and set a travel fee. You'll be notified once they respond, and can pay then.`,
      [{ text: 'Done', onPress: () => router.replace('/(client)/(tabs)/bookings' as never) }],
    );
  }

  // Hold the slot from the moment the client reaches this screen.
  useEffect(() => {
    beginHold();
    return () => clearHold();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = setInterval(() => {
      const left = holdExpiresAt - Date.now();
      setRemaining(left);

      if (left <= 0) {
        clearInterval(tick);
        clearHold();
        Alert.alert(
          'Slot released',
          'Your reservation window expired and the slot is available to others again. Please pick a time once more.',
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
  }, [holdExpiresAt, date, time]);

  if (!service || !professional || !date || !time) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 }}>
          <Text style={{ fontSize: 15, color: '#8a89a3', textAlign: 'center' }}>
            Your booking details are incomplete.
          </Text>
          <Pressable onPress={() => router.replace('/(client)/booking/datetime' as never)}>
            <Text style={{ color: '#3c3cb9', fontWeight: '700' }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const endTime = addMinutes(time, service.durationMinutes);
  const mins = Math.max(0, Math.floor(remaining / 60000));
  const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));

  const warn = chip('warn');
  const typeChip = chip('info');

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ── Header ───────────────────────────────────────────── */}
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
          <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={12} style={{ marginBottom: 14 }}>
            <ArrowLeft size={24} color={T.text} strokeWidth={2.2} />
          </Pressable>

          <Text style={{ fontSize: 29, fontWeight: '800', color: T.text, letterSpacing: -0.5 }}>
            Review and confirm
          </Text>
          <Text style={{ fontSize: 17.5, fontWeight: '700', color: T.text, marginTop: 12 }}>
            {fmtDateLong(date)} • {fmt12(time)}
          </Text>
          <Text style={{ fontSize: 14, color: T.textFaint, marginTop: 5, lineHeight: 20 }}>
            {shopName || shop?.businessName}
            {shop?.locationAddress ? ` · ${shop.locationAddress}` : ''}
          </Text>
        </View>

        {/* ── Booking summary card (Layer 1) ───────────────────── */}
        <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 18, padding: 16 }}>
          {/* Dual-tone service-type chip */}
          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: typeChip.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              {isMobile ? <Car size={13} color={typeChip.fg} /> : <Store size={13} color={typeChip.fg} />}
              <Text style={{ fontSize: 12, fontWeight: '600', color: typeChip.fg }}>
                {isMobile ? 'Mobile service' : 'In-shop service'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: T.text }}>{service.name}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: T.text }}>GH₵{service.price.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
            <Text style={{ flex: 1, fontSize: 13.5, color: T.textFaint }}>
              Staff: {professional.name}
            </Text>
            <Text style={{ fontSize: 13.5, color: T.textFaint }}>
              {fmt12(time)} - {fmt12(endTime)}
            </Text>
          </View>

          {/* Where the barber is travelling to */}
          {isMobile && clientAddress ? (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: HAIRLINE, borderTopColor: T.border }}>
              <MapPin size={14} color={T.textFaint} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.textFaint, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  Travelling to
                </Text>
                <Text style={{ fontSize: 13.5, color: T.textMuted, marginTop: 2, lineHeight: 19 }}>{clientAddress}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: HAIRLINE, backgroundColor: T.border, marginVertical: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: T.text }}>Subtotal</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>GH₵{service.price.toFixed(2)}</Text>
          </View>
        </View>

        {/* ── Out-of-range notice (request flow) ───────────────── */}
        {needsRequest ? (
          <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: warn.bg, borderRadius: 16, padding: 15, flexDirection: 'row', gap: 11 }}>
            <Info size={17} color={warn.fg} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: warn.fg }}>
                You're outside the travel range
              </Text>
              <Text style={{ fontSize: 13, color: warn.fg, opacity: 0.85, marginTop: 3, lineHeight: 18 }}>
                You're about {travel!.distance!.toFixed(1)} km away, past this barber's {travel!.radius} km
                range. Send a request — they'll set a travel fee, and you only pay once they accept.
              </Text>
            </View>
          </View>
        ) : (
          /* ── Slot-hold notice — soft tint, deep label ───────── */
          <View style={{ marginHorizontal: 20, marginTop: 14, backgroundColor: warn.bg, borderRadius: 16, padding: 15, flexDirection: 'row', gap: 11 }}>
            <Timer size={17} color={warn.fg} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: warn.fg }}>
                We're holding this slot for {mins}:{String(secs).padStart(2, '0')}
              </Text>
              <Text style={{ fontSize: 13, color: warn.fg, opacity: 0.8, marginTop: 3, lineHeight: 18 }}>
                Complete your payment before the timer ends, or the time goes back up for grabs.
              </Text>
            </View>
          </View>
        )}

        {/* ── Cancellation policy ──────────────────────────────── */}
        <View style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 18, overflow: 'hidden' }}>
          <View style={{ backgroundColor: T.input, paddingHorizontal: 16, paddingVertical: 13 }}>
            <Text style={{ fontSize: 15.5, fontWeight: '700', color: T.text }}>Cancellation policy</Text>
          </View>

          <View style={{ padding: 16 }}>
            {[
              'Cancel or reschedule up to 3 hours before your appointment and you won\'t be charged anything.',
              'Cancellations made within 3 hours of the appointment incur a 50% fee of the total service cost.',
              'No-shows, or cancellations within 1 hour of the appointment, are charged 100% of the service cost.',
            ].map((line, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: i === 2 ? 0 : 12 }}>
                <Text style={{ fontSize: 14, color: T.textFaint, lineHeight: 21 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 14, color: T.textMuted, lineHeight: 21 }}>{line}</Text>
              </View>
            ))}
          </View>

          {/* Agreement checkbox — the accent marks the focus target */}
          <Pressable
            onPress={() => { tapSelect(); setAgreed((v) => !v); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderTopWidth: HAIRLINE, borderTopColor: T.border }}
          >
            <View style={{
              width: 23, height: 23, borderRadius: 7,
              borderWidth: agreed ? 0 : 1.5, borderColor: T.border,
              backgroundColor: agreed ? T.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {agreed && <Check size={14} color={T.onAccent} strokeWidth={3.5} />}
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: agreed ? T.text : T.textFaint }}>
              I agree to the Terms & Cancellation Policy
            </Text>
          </Pressable>
        </View>

        {!agreed && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 12 }}>
            <Info size={14} color={T.textFaint} />
            <Text style={{ flex: 1, fontSize: 12.5, color: T.textFaint }}>
              Accept the policy to continue to payment.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Total + pay ──────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 14, borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ flex: 1, fontSize: 14.5, color: T.textMuted, fontWeight: '600' }}>
            {needsRequest ? 'Service price (travel fee added on approval)' : 'Total booking price'}
          </Text>
          <Text style={{ fontSize: 19, fontWeight: '800', color: T.text }}>GH₵{service.price.toFixed(2)}</Text>
        </View>
        <Pressable
          onPress={() => {
            if (!agreed) return;
            if (needsRequest) handleSendRequest();
            else router.push('/(client)/booking/payment' as never);
          }}
          disabled={!agreed}
          style={{
            backgroundColor: agreed ? T.accent : T.input,
            borderRadius: 16, paddingVertical: 17, alignItems: 'center',
          }}
        >
          <Text style={{ color: agreed ? T.onAccent : T.textDisabled, fontSize: 15.5, fontWeight: '700' }}>
            {needsRequest ? 'Send booking request' : 'Continue to payment'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
