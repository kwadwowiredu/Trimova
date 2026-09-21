import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator,
  Alert, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Calendar, Clock, MapPin, Phone, Car, Store, Wallet, Navigation, Check,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { fmt12, fmtDateLong } from '@/stores/bookingStore';
import { splitScheduled } from '@/utils/bookingStatus';
import { checkTravelRange } from '@/utils/distance';
import { tapLight, tapMedium } from '@/utils/haptics';
import type { BarberProfile } from '@/types/user';

interface AppointmentSheetProps {
  bookingId: string | null;
  onClose: () => void;
  /** The signed-in barber, used to measure travel distance. */
  barber: BarberProfile | null;
}

/**
 * Everything about one appointment, and every action a barber can take on it.
 *
 * This is where a mobile barber sets their travel fee: accepting a request
 * straight off the card gave no way to charge for the journey, and no way to
 * see where they were even being asked to go.
 */
export function AppointmentSheet({ bookingId, onClose, barber }: AppointmentSheetProps) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const queryClient = useQueryClient();

  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsService.getById(bookingId!),
    enabled: !!bookingId,
  });
  const booking = data?.data.data;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
  }

  /** Run an action, keeping the sheet honest about what's in flight. */
  async function run(fn: () => Promise<unknown>, closeAfter = true) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      refresh();
      if (closeAfter) onClose();
    } catch (err) {
      Alert.alert('Something went wrong', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const travel = booking?.clientLocation
    ? checkTravelRange(
        { lat: booking.clientLocation.lat, lng: booking.clientLocation.lng },
        barber ?? {},
      )
    : null;

  const needsApproval = !!booking?.requiresApproval && !booking.approvedAt;
  const feeValue = Number(fee || 0);
  const feeValid = fee === '' || (Number.isFinite(feeValue) && feeValue >= 0);

  return (
    <Modal
      visible={bookingId !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingTop: 12, maxHeight: '88%',
          }}
        >
          {/* Grab handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 14 }} />

          {isLoading || !booking ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: c.text }}>
                    {booking.clientName}
                  </Text>
                  <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 2 }}>
                    {booking.serviceName}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={19} color={c.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                style={{ paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* When + where */}
                <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 15, gap: 11 }}>
                  <Row icon={<Calendar size={15} color={c.textFaint} />} c={c}>
                    {fmtDateLong(splitScheduled(booking.scheduledAt).date)}
                  </Row>
                  <Row icon={<Clock size={15} color={c.textFaint} />} c={c}>
                    {fmt12(splitScheduled(booking.scheduledAt).time)} –{' '}
                    {fmt12(splitScheduled(booking.endsAt).time)}
                  </Row>
                  <Row
                    icon={booking.clientLocation
                      ? <Car size={15} color={c.textFaint} />
                      : <Store size={15} color={c.textFaint} />}
                    c={c}
                  >
                    {booking.clientLocation ? 'You travel to the client' : 'At your shop'}
                  </Row>

                  {booking.clientLocation && (
                    <Row icon={<MapPin size={15} color={c.textFaint} />} c={c}>
                      {booking.clientLocation.address}
                    </Row>
                  )}

                  {travel?.distance != null && (
                    <Row icon={<Navigation size={15} color={travel.needsRequest ? c.warning : c.textFaint} />} c={c}>
                      <Text style={{ color: travel.needsRequest ? c.warning : c.textMuted, fontWeight: travel.needsRequest ? '700' : '400' }}>
                        {travel.distance.toFixed(1)} km away
                        {travel.needsRequest ? ` — outside your ${travel.radius} km range` : ''}
                      </Text>
                    </Row>
                  )}

                  {booking.clientPhone && (
                    <Pressable onPress={() => Linking.openURL(`tel:${booking.clientPhone}`)}>
                      <Row icon={<Phone size={15} color={c.accent} />} c={c}>
                        <Text style={{ color: c.accent, fontWeight: '600' }}>{booking.clientPhone}</Text>
                      </Row>
                    </Pressable>
                  )}
                </View>

                {/* Money */}
                <View style={{ marginTop: 14, backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 15 }}>
                  <Line label={booking.serviceName} value={`₵${booking.servicePrice.toFixed(2)}`} c={c} />
                  {booking.travelFee > 0 && (
                    <Line label="Travel fee" value={`₵${booking.travelFee.toFixed(2)}`} c={c} />
                  )}
                  <View style={{ height: 1, backgroundColor: c.border, marginVertical: 10 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Wallet size={15} color={c.textFaint} style={{ marginRight: 8 }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.text }}>
                      {booking.paymentStatus === 'paid' ? 'Client paid' : 'Client owes'}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: booking.paymentStatus === 'paid' ? c.success : c.text }}>
                      ₵{booking.total.toFixed(2)}
                    </Text>
                  </View>
                  {booking.paymentStatus === 'paid' && (
                    <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 6 }}>
                      Trimova is holding this until you mark the appointment complete.
                    </Text>
                  )}
                </View>

                {booking.notes && (
                  <View style={{ marginTop: 14, backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 15 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      Client note
                    </Text>
                    <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 6, lineHeight: 20 }}>
                      {booking.notes}
                    </Text>
                  </View>
                )}

                {/*
                  Travel fee entry, shown only while the request is still
                  pending. Once accepted the fee is part of what the client was
                  quoted, so changing it here would move the price out from
                  under them — cancel and re-request instead.
                */}
                {needsApproval && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
                      Travel fee (GHS)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: feeValid ? c.accent : c.danger }}>
                      <Car size={17} color={c.accent} />
                      <TextInput
                        value={fee}
                        onChangeText={setFee}
                        placeholder="0.00"
                        placeholderTextColor={c.textFaint}
                        keyboardType="decimal-pad"
                        style={{ flex: 1, paddingVertical: 14, marginLeft: 10, fontSize: 16, fontWeight: '700', color: c.text }}
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 6, lineHeight: 17 }}>
                      {travel?.needsRequest
                        ? "This client is outside your usual range. Whatever you add here is shown to them before they pay."
                        : 'Leave at 0 if you’re not charging for travel.'}
                    </Text>
                    {feeValid && fee !== '' && (
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.success, marginTop: 8 }}>
                        Client pays ₵{(booking.servicePrice + feeValue).toFixed(2)} in total
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ height: 16 }} />
              </ScrollView>

              {/* Actions */}
              <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 16, borderTopWidth: 1, borderTopColor: c.border, gap: 10 }}>
                {busy ? (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator color={c.accent} />
                  </View>
                ) : needsApproval ? (
                  <>
                    <Pressable
                      onPress={() => {
                        if (!feeValid) {
                          Alert.alert('Invalid fee', 'Enter a travel fee of 0 or more.');
                          return;
                        }
                        tapMedium();
                        run(() => bookingsService.confirm(booking.id, feeValue));
                      }}
                      style={{ backgroundColor: c.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
                        Accept{fee !== '' && feeValue > 0 ? ` with ₵${feeValue.toFixed(2)} travel fee` : ''}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        tapLight();
                        Alert.alert('Decline request?', `Let ${booking.clientName} know you can't take this one.`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Decline',
                            style: 'destructive',
                            onPress: () => run(() => bookingsService.decline(booking.id)),
                          },
                        ]);
                      }}
                      style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: c.danger }}
                    >
                      <Text style={{ color: c.danger, fontSize: 14.5, fontWeight: '700' }}>Decline request</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {/*
                      There's no "mark complete" button on purpose. A booking
                      completes itself once its end time passes, so a barber
                      can't collect on a cut they never gave — and can't lose
                      money by forgetting to tap something either.
                    */}
                    {['pending', 'confirmed', 'in_progress'].includes(booking.status) && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingBottom: 4 }}>
                        <Check size={14} color={c.textFaint} style={{ marginTop: 2 }} />
                        <Text style={{ flex: 1, fontSize: 12.5, color: c.textFaint, lineHeight: 18 }}>
                          {booking.paymentStatus === 'paid'
                            ? `Completes automatically after ${fmt12(splitScheduled(booking.endsAt).time)}, when ₵${booking.total.toFixed(2)} is released to you.`
                            : `Completes automatically after ${fmt12(splitScheduled(booking.endsAt).time)}.`}
                        </Text>
                      </View>
                    )}
                    {['pending', 'confirmed', 'in_progress'].includes(booking.status) && (
                      <Pressable
                        onPress={() => {
                          tapLight();
                          Alert.alert(
                            'Cancel appointment?',
                            booking.paymentStatus === 'paid'
                              ? 'The client will be refunded in full and told you cancelled.'
                              : 'The slot will be freed and the client notified.',
                            [
                              { text: 'Keep it', style: 'cancel' },
                              {
                                text: 'Cancel appointment',
                                style: 'destructive',
                                onPress: () => run(() => bookingsService.cancel(booking.id)),
                              },
                            ],
                          );
                        }}
                        style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: c.danger }}
                      >
                        <Text style={{ color: c.danger, fontSize: 14.5, fontWeight: '700' }}>Cancel appointment</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({
  icon,
  children,
  c,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  c: { textMuted: string };
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ marginTop: 1 }}>{icon}</View>
      <Text style={{ flex: 1, fontSize: 14, color: c.textMuted, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

function Line({
  label,
  value,
  c,
}: {
  label: string;
  value: string;
  c: { text: string; textMuted: string };
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
      <Text style={{ flex: 1, fontSize: 13.5, color: c.textMuted }} numberOfLines={1}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{value}</Text>
    </View>
  );
}
