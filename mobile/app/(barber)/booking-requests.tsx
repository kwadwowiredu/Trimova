import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Modal,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft, Navigation, Clock, Calendar, Inbox, Car, X,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useBookingRequestStore, type BookingRequest } from '@/stores/bookingRequestStore';
import { fmt12, fmtDateLong } from '@/stores/bookingStore';

/**
 * Travel requests from clients who fall OUTSIDE this mobile barber's radius.
 * The barber sets a travel fee when approving; that fee is added to the
 * client's total before they pay.
 */
export default function BookingRequestsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();
  const { requests, approve, decline } = useBookingRequestStore();

  const [active, setActive] = useState<BookingRequest | null>(null);
  const [fee, setFee] = useState('');

  // Requests addressed to this barber (all of them in the local simulation).
  const mine = requests.filter((r) => !user?.id || r.barberId === user.id || true);
  const pending = mine.filter((r) => r.status === 'pending');
  const settled = mine.filter((r) => r.status !== 'pending');

  function openApprove(r: BookingRequest) {
    setActive(r);
    setFee('');
  }

  function confirmApprove() {
    if (!active) return;
    const value = Number(fee);
    if (!(value >= 0)) {
      Alert.alert('Invalid fee', 'Enter a travel fee of 0 or more.');
      return;
    }
    approve(active.id, value);
    setActive(null);
    Alert.alert('Request approved', 'The client has been notified and can now pay for the appointment.');
  }

  function handleDecline(r: BookingRequest) {
    Alert.alert('Decline request?', `Let ${r.clientName} know you can't travel that far.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => decline(r.id, 'Outside travel range') },
    ]);
  }

  function Card({ r }: { r: BookingRequest }) {
    const isPending = r.status === 'pending';
    return (
      <View style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: c.text }}>{r.clientName}</Text>
          <View style={{
            backgroundColor: isPending ? c.accentSoft : r.status === 'approved' ? '#e3f8ec' : '#ffe9e9',
            borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: isPending ? c.accent : r.status === 'approved' ? '#007243' : '#b3261e' }}>
              {isPending ? 'PENDING' : r.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 14, color: c.textMuted, marginTop: 6 }}>{r.serviceName}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Calendar size={13} color={c.textFaint} />
          <Text style={{ fontSize: 13, color: c.textMuted }}>{fmtDateLong(r.date)}</Text>
          <Clock size={13} color={c.textFaint} style={{ marginLeft: 6 }} />
          <Text style={{ fontSize: 13, color: c.textMuted }}>{fmt12(r.time)}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Navigation size={13} color="#B7791F" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#7B5804' }}>
            {r.distanceKm.toFixed(1)} km away — outside your usual range
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
          <Text style={{ flex: 1, fontSize: 13, color: c.textMuted }}>Service</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>₵{r.servicePrice.toFixed(2)}</Text>
        </View>
        {r.travelFee != null && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ flex: 1, fontSize: 13, color: c.textMuted }}>Travel fee</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>₵{r.travelFee.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: c.text }}>Client pays</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.success }}>
                ₵{(r.servicePrice + r.travelFee).toFixed(2)}
              </Text>
            </View>
          </>
        )}

        {isPending && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={() => handleDecline(r)}
              style={{ flex: 1, borderWidth: 1.5, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.textMuted }}>Decline</Text>
            </Pressable>
            <Pressable
              onPress={() => openApprove(r)}
              style={{ flex: 1.4, backgroundColor: c.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Set fee & approve</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Travel requests</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Clients outside your travel range</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {pending.length === 0 && settled.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={28} color={c.textFaint} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>No travel requests</Text>
            <Text style={{ fontSize: 13, color: c.textFaint, textAlign: 'center', lineHeight: 19, paddingHorizontal: 40 }}>
              When a client outside your travel radius wants to book, their request lands here.
            </Text>
          </View>
        ) : (
          <>
            {pending.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Awaiting your response
              </Text>
            )}
            {pending.map((r) => <Card key={r.id} r={r} />)}

            {settled.length > 0 && (
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 10 }}>
                Answered
              </Text>
            )}
            {settled.map((r) => <Card key={r.id} r={r} />)}
          </>
        )}
      </ScrollView>

      {/* ── Travel fee sheet ─────────────────────────────────── */}
      <Modal visible={!!active} transparent animationType="slide" onRequestClose={() => setActive(null)}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={() => setActive(null)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: c.text }}>Set travel fee</Text>
              <Pressable onPress={() => setActive(null)} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
            </View>
            <Text style={{ fontSize: 13.5, color: c.textMuted, lineHeight: 19, marginBottom: 16 }}>
              {active ? `${active.clientName} is ${active.distanceKm.toFixed(1)} km away. Add what you'd charge to travel — it's added to their bill and shown before they pay.` : ''}
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
              disabled={fee === ''}
              style={{ backgroundColor: fee === '' ? c.surfaceAlt : c.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 18 }}
            >
              <Text style={{ color: fee === '' ? c.textFaint : '#fff', fontSize: 15, fontWeight: '800' }}>
                Approve request
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
