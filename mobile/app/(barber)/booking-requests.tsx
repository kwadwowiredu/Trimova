import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Navigation, Clock, Calendar, Inbox, Car, X, MapPin,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import { fmt12, fmtDateLong } from '@/stores/bookingStore';
import { splitScheduled } from '@/utils/bookingStatus';
import { checkTravelRange } from '@/utils/distance';
import type { BarberProfile } from '@/types/user';
import type { Booking } from '@/types/booking';

/**
 * Requests waiting on a mobile barber's decision.
 *
 * A mobile barber vets every job before the client is allowed to pay. If the
 * client also falls outside the usual travel radius, the barber can attach a
 * travel fee when approving — that fee is added to the client's total.
 */
export default function BookingRequestsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const barber = user as BarberProfile | null;
  const queryClient = useQueryClient();

  const [active, setActive] = useState<Booking | null>(null);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['bookings', 'barber', 'requests'],
    queryFn: () =>
      bookingsService.getBarberBookings({
        status: 'pending,confirmed,declined',
        page: 1,
      }),
  });

  // Only bookings that actually needed a decision belong on this screen.
  const requests = (data?.data.data ?? []).filter((b) => b.requiresApproval);
  const pending = requests.filter((b) => b.status === 'pending' && !b.approvedAt);
  const settled = requests.filter((b) => b.status !== 'pending' || !!b.approvedAt);

  /** How far the barber would have to travel, when we know both ends. */
  function travelFor(b: Booking) {
    return checkTravelRange(
      b.clientLocation ? { lat: b.clientLocation.lat, lng: b.clientLocation.lng } : null,
      barber ?? {},
    );
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  }

  function openApprove(b: Booking) {
    setActive(b);
    setFee('');
  }

  async function confirmApprove() {
    if (!active) return;
    const value = Number(fee);
    if (!(value >= 0)) {
      Alert.alert('Invalid fee', 'Enter a travel fee of 0 or more.');
      return;
    }
    setSaving(true);
    try {
      await bookingsService.confirm(active.id, value);
      setActive(null);
      refresh();
      Alert.alert(
        'Request approved',
        'The client has been notified and can now pay for the appointment.',
      );
    } catch (err) {
      Alert.alert('Not approved', getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleDecline(b: Booking) {
    Alert.alert('Decline request?', `Let ${b.clientName} know you can't take this one.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            await bookingsService.decline(b.id, 'Outside travel range');
            refresh();
          } catch (err) {
            Alert.alert('Not declined', getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  function Card({ b }: { b: Booking }) {
    const isPending = b.status === 'pending' && !b.approvedAt;
    const travel = travelFor(b);
    const { date, time } = splitScheduled(b.scheduledAt);
    const declined = b.status === 'declined';
    const label = isPending ? 'PENDING' : declined ? 'DECLINED' : 'APPROVED';

    return (
      <View style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.text }}>{b.clientName}</Text>
          <View style={{
            backgroundColor: isPending ? c.accentSoft : declined ? '#ffe9e9' : '#e3f8ec',
            borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isPending ? c.accent : declined ? '#b3261e' : '#007243' }}>
              {label}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 6 }}>{b.serviceName}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Calendar size={13} color={c.textFaint} />
          <Text style={{ fontSize: 13, color: c.textMuted }}>{fmtDateLong(date)}</Text>
          <Clock size={13} color={c.textFaint} style={{ marginLeft: 6 }} />
          <Text style={{ fontSize: 13, color: c.textMuted }}>{fmt12(time)}</Text>
        </View>

        {b.clientLocation && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
            <MapPin size={13} color={c.textFaint} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 18 }} numberOfLines={2}>
              {b.clientLocation.address}
            </Text>
          </View>
        )}

        {travel.needsRequest && travel.distance != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Navigation size={13} color="#B7791F" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#7B5804' }}>
              {travel.distance.toFixed(1)} km away — outside your usual range
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <Text style={{ flex: 1, fontSize: 13, color: c.textMuted }}>Service</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>₵{b.servicePrice.toFixed(2)}</Text>
        </View>
        {b.travelFee > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ flex: 1, fontSize: 13, color: c.textMuted }}>Travel fee</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>₵{b.travelFee.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: c.text }}>Client pays</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.success }}>
                ₵{b.total.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        {/* Once approved, the ball is in the client's court. */}
        {!isPending && !declined && b.paymentStatus === 'unpaid' && (
          <Text style={{ fontSize: 12.5, color: c.textFaint, marginTop: 10 }}>
            Waiting for the client to pay.
          </Text>
        )}

        {isPending && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => handleDecline(b)}
              style={{ flex: 1, borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.textMuted }}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={() => openApprove(b)}
              style={{ flex: 1.4, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Set fee & approve</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const activeTravel = active ? travelFor(active) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Booking requests</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Approve before the client pays</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
          }
        >
          {pending.length === 0 && settled.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Inbox size={28} color={c.textFaint} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>No booking requests</Text>
              <Text style={{ fontSize: 13, color: c.textFaint, textAlign: 'center', lineHeight: 19, paddingHorizontal: 40 }}>
                When a client asks to book you, their request lands here for you to accept or decline.
              </Text>
            </View>
          ) : (
            <>
              {pending.length > 0 && (
                <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Awaiting your response
                </Text>
              )}
              {pending.map((b) => <Card key={b.id} b={b} />)}

              {settled.length > 0 && (
                <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 10 }}>
                  Answered
                </Text>
              )}
              {settled.map((b) => <Card key={b.id} b={b} />)}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Travel fee sheet ─────────────────────────────────── */}
      <Modal visible={!!active} transparent animationType="slide" onRequestClose={() => setActive(null)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setActive(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: c.text }}>Approve request</Text>
              <Pressable onPress={() => setActive(null)} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
            </View>
            <Text style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 19, marginBottom: 16 }}>
              {active
                ? activeTravel?.distance != null
                  ? `${active.clientName} is ${activeTravel.distance.toFixed(1)} km away. Add what you'd charge to travel — it's added to their bill and shown before they pay.`
                  : `Approving lets ${active.clientName} pay for this appointment. Add a travel fee if you need one, or leave it at 0.`
                : ''}
            </Text>

            <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>
              Travel fee (GHS)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: c.accent }}>
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

            {active && Number(fee) >= 0 && fee !== '' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 14 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.textMuted }}>Client pays in total</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: c.success }}>
                  ₵{(active.servicePrice + Number(fee)).toFixed(2)}
                </Text>
              </View>
            )}

            <Pressable
              onPress={confirmApprove}
              disabled={fee === '' || saving}
              style={{ backgroundColor: fee === '' || saving ? c.surfaceAlt : c.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 18 }}
            >
              {saving ? (
                <ActivityIndicator color={c.textFaint} />
              ) : (
                <Text style={{ color: fee === '' ? c.textFaint : '#fff', fontSize: 15, fontWeight: '800' }}>
                  Approve request
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
