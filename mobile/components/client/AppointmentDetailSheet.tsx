import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Calendar, Clock, MapPin, Phone, Car, Store, Receipt, CalendarClock, ShieldCheck,
  HelpCircle, Check,
} from 'lucide-react-native';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { fmt12, fmtDateLong } from '@/stores/bookingStore';
import {
  bookingBadge, isUpcoming, awaitingPayment, awaitingConfirmation, splitScheduled,
} from '@/utils/bookingStatus';
import { tapLight, tapMedium } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';

interface AppointmentDetailSheetProps {
  bookingId: string | null;
  onClose: () => void;
}

/**
 * Everything about one appointment, opened by tapping its card.
 *
 * The card itself stays a glanceable summary — cancelling and rescheduling
 * live here, where there's room to explain what each one costs before the
 * client commits to it.
 */
export function AppointmentDetailSheet({ bookingId, onClose }: AppointmentDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsService.getById(bookingId!),
    enabled: !!bookingId,
  });
  const booking = data?.data.data;

  async function handleCancel() {
    if (!booking || busy) return;
    tapMedium();

    // Ask the API what this actually costs — the client agreed to a policy
    // with real thresholds, so show them the real number.
    let message = 'The slot will be released for someone else to book.';
    try {
      const { data: policy } = await bookingsService.getPolicy(booking.id);
      message = policy.data.summary;
    } catch {
      if (booking.paymentStatus === 'paid') {
        message = 'Your refund will follow the cancellation policy you agreed to.';
      }
    }

    Alert.alert('Cancel this booking?', message, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await bookingsService.cancel(booking.id);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['availability-day'] });
            queryClient.invalidateQueries({ queryKey: ['availability-month'] });
            onClose();
          } catch (err) {
            Alert.alert('Not cancelled', getApiErrorMessage(err));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  /** The client says it went ahead — releases the money straight away. */
  async function handleConfirmService() {
    if (!booking || busy) return;
    tapMedium();
    setBusy(true);
    try {
      await bookingsService.confirmService(booking.id);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      Alert.alert(
        'Thanks for confirming',
        `We've released your payment to ${booking.barberName}.`,
        [{ text: 'Done', onPress: onClose }],
      );
    } catch (err) {
      Alert.alert("Couldn't confirm", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /** The client says it did NOT happen — freezes the money for support. */
  function handleDispute() {
    if (!booking || busy) return;
    tapMedium();

    Alert.alert(
      "Didn't go ahead?",
      `Tell us what happened with your ${booking.serviceName}. We'll hold your GH₵${booking.total.toFixed(2)} while we look into it — nothing is paid to the barber in the meantime.`,
      [
        { text: 'Never mind', style: 'cancel' },
        {
          text: "The barber didn't show",
          style: 'destructive',
          onPress: () => submitDispute('The barber did not show up'),
        },
        {
          text: 'Something else',
          onPress: () => submitDispute('Client reported a problem with the appointment'),
        },
      ],
    );
  }

  async function submitDispute(reason: string) {
    if (!booking) return;
    setBusy(true);
    try {
      await bookingsService.dispute(booking.id, reason);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      Alert.alert(
        'Thanks for telling us',
        "Your payment is on hold and our team will be in touch. You don't need to do anything else.",
        [{ text: 'Done', onPress: onClose }],
      );
    } catch (err) {
      Alert.alert("Couldn't submit that", getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const badge = booking ? bookingBadge(booking) : null;
  const tone = badge ? chip(badge.tone) : null;
  const canPay = booking ? awaitingPayment(booking) : false;
  const canCancel = booking ? isUpcoming(booking) : false;
  const canReschedule =
    booking?.status === 'pending' || booking?.status === 'confirmed';
  const needsConfirmation = booking ? awaitingConfirmation(booking) : false;

  return (
    <Modal
      visible={bookingId !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(22,28,39,0.45)' }} onPress={onClose} />

      <View
        style={{
          backgroundColor: T.canvas,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingTop: 12, maxHeight: '88%',
        }}
      >
        <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 14 }} />

        {isLoading || !booking ? (
          <View style={{ paddingVertical: 70, alignItems: 'center' }}>
            <ActivityIndicator color={T.accent} />
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: T.text }}>
                  {booking.serviceName}
                </Text>
                <Text style={{ fontSize: 14, color: T.textFaint, marginTop: 2 }}>
                  with {booking.barberName}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={19} color={T.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              {/* Status */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {tone && badge && (
                  <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: tone.fg }}>{badge.label}</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.input, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  {booking.clientLocation
                    ? <Car size={13} color={T.textMuted} />
                    : <Store size={13} color={T.textMuted} />}
                  <Text style={{ fontSize: 12, fontWeight: '500', color: T.textMuted }}>
                    {booking.clientLocation ? 'Mobile service' : 'In-shop'}
                  </Text>
                </View>
              </View>

              {/* When and where */}
              <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 16, gap: 12 }}>
                <Row icon={<Calendar size={15} color={T.textFaint} />}>
                  {fmtDateLong(splitScheduled(booking.scheduledAt).date)}
                </Row>
                <Row icon={<Clock size={15} color={T.textFaint} />}>
                  {fmt12(splitScheduled(booking.scheduledAt).time)} –{' '}
                  {fmt12(splitScheduled(booking.endsAt).time)}
                </Row>
                <Row icon={<Store size={15} color={T.textFaint} />}>{booking.shopName}</Row>
                {booking.clientLocation && (
                  <Row icon={<MapPin size={15} color={T.textFaint} />}>
                    {booking.clientLocation.address}
                  </Row>
                )}
                {/* The barber's number — the client already knows their own. */}
                {booking.barberPhone && (
                  <Pressable onPress={() => Linking.openURL(`tel:${booking.barberPhone}`)}>
                    <Row icon={<Phone size={15} color={T.accent} />}>
                      <Text style={{ color: T.accent, fontWeight: '600' }}>
                        {booking.barberPhone}
                      </Text>
                    </Row>
                  </Pressable>
                )}
              </View>

              {/* Money */}
              <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 16, marginTop: 12 }}>
                <Line label={booking.serviceName} value={`GH₵${booking.servicePrice.toFixed(2)}`} />
                {booking.travelFee > 0 && (
                  <Line label="Travel fee" value={`GH₵${booking.travelFee.toFixed(2)}`} />
                )}
                <View style={{ height: HAIRLINE, backgroundColor: T.border, marginVertical: 12 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 15.5, fontWeight: '600', color: '#52b788' }}>
                    {booking.paymentStatus === 'paid' ? 'Paid' : 'Total due'}
                  </Text>
                  <Text style={{ fontSize: 19, fontWeight: '600', color: '#52b788' }}>
                    GH₵{booking.total.toFixed(2)}
                  </Text>
                </View>
                {booking.paymentStatus === 'paid' && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 }}>
                    <ShieldCheck size={14} color={chip('success').fg} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 12.5, color: T.textFaint, lineHeight: 18 }}>
                      Trimova holds your payment until the appointment is completed.
                    </Text>
                  </View>
                )}
              </View>

              {booking.notes && (
                <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 16, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Receipt size={15} color={T.textFaint} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: 14, color: T.textMuted, lineHeight: 20 }}>
                      {booking.notes}
                    </Text>
                  </View>
                </View>
              )}

              {/*
                The escrow question. Trimova can't see whether the haircut
                happened — the client is the only one who can say, and this is
                where they're asked before the money moves.
              */}
              {needsConfirmation && (
                <View style={{ backgroundColor: chip('warn').bg, borderRadius: 18, padding: 16, marginTop: 12, flexDirection: 'row', gap: 11 }}>
                  <HelpCircle size={17} color={chip('warn').fg} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '700', color: chip('warn').fg }}>
                      Did this go ahead?
                    </Text>
                    <Text style={{ fontSize: 13, color: chip('warn').fg, opacity: 0.9, marginTop: 3, lineHeight: 19 }}>
                      We&apos;re holding GH₵{booking.total.toFixed(2)}. Confirm and we&apos;ll pay
                      {' '}{booking.barberName.split(' ')[0]} now, or tell us if it didn&apos;t happen.
                    </Text>
                  </View>
                </View>
              )}

              {/* Once they've spoken, say what that did. */}
              {booking.disputedAt && (
                <View style={{ backgroundColor: chip('error').bg, borderRadius: 18, padding: 16, marginTop: 12, flexDirection: 'row', gap: 11 }}>
                  <ShieldCheck size={17} color={chip('error').fg} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13.5, color: chip('error').fg, lineHeight: 19 }}>
                    You reported a problem with this appointment. Your payment is on hold
                    while our team looks into it.
                  </Text>
                </View>
              )}

              {booking.clientConfirmedAt && !booking.disputedAt && (
                <View style={{ backgroundColor: chip('success').bg, borderRadius: 18, padding: 16, marginTop: 12, flexDirection: 'row', gap: 11 }}>
                  <ShieldCheck size={17} color={chip('success').fg} style={{ marginTop: 1 }} />
                  <Text style={{ flex: 1, fontSize: 13.5, color: chip('success').fg, lineHeight: 19 }}>
                    You confirmed this appointment. Payment has been released.
                  </Text>
                </View>
              )}

              {booking.cancelReason && (
                <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 12, fontStyle: 'italic', lineHeight: 19 }}>
                  {booking.cancelReason}
                </Text>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Actions */}
            {(canPay || canCancel || canReschedule || needsConfirmation) && (
              <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 16, borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card, gap: 10 }}>
                {busy ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator color={T.accent} />
                  </View>
                ) : (
                  <>
                    {/*
                      Confirm is the primary action and "didn't happen" is the
                      quiet one — most appointments do go ahead, and making the
                      complaint path equally loud invites idle taps on money
                      that's already been earned.
                    */}
                    {needsConfirmation && (
                      <>
                        <Pressable
                          onPress={handleConfirmService}
                          style={{ flexDirection: 'row', gap: 8, backgroundColor: chip('success').fg, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Check size={17} color="#ffffff" strokeWidth={3} />
                          <Text style={{ color: '#ffffff', fontSize: 15.5, fontWeight: '700' }}>
                            Yes, it went ahead
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleDispute}
                          style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                        >
                          <Text style={{ color: chip('error').fg, fontSize: 14, fontWeight: '600' }}>
                            It didn&apos;t happen
                          </Text>
                        </Pressable>
                      </>
                    )}

                    {canPay && (
                      <Pressable
                        onPress={() => {
                          tapMedium();
                          onClose();
                          router.push({
                            pathname: '/(client)/booking/payment',
                            params: { bookingId: booking.id },
                          } as never);
                        }}
                        style={{ backgroundColor: T.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
                      >
                        <Text style={{ color: T.onAccent, fontSize: 15, fontWeight: '600' }}>
                          Pay GH₵{booking.total.toFixed(2)}
                        </Text>
                      </Pressable>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {canReschedule && (
                        <Pressable
                          onPress={() => {
                            tapLight();
                            onClose();
                            router.push({
                              pathname: '/(client)/reschedule',
                              params: { bookingId: booking.id },
                            } as never);
                          }}
                          style={{ flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 15, borderWidth: HAIRLINE, borderColor: T.accent }}
                        >
                          <CalendarClock size={16} color={T.accent} />
                          <Text style={{ color: T.accent, fontSize: 14.5, fontWeight: '500' }}>Reschedule</Text>
                        </Pressable>
                      )}
                      {canCancel && (
                        <Pressable
                          onPress={handleCancel}
                          style={{ flex: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: chip('error').fg }}
                        >
                          <Text style={{ color: chip('error').fg, fontSize: 14.5, fontWeight: '500' }}>Cancel</Text>
                        </Pressable>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
      <View style={{ marginTop: 1 }}>{icon}</View>
      <Text style={{ flex: 1, fontSize: 14.5, color: T.textMuted, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3 }}>
      <Text style={{ flex: 1, fontSize: 14, color: T.textMuted }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: '600', color: T.text }}>{value}</Text>
    </View>
  );
}
