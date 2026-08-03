import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, Clock, Scissors } from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import { useBookingStore, type BookingService } from '@/stores/bookingStore';
import { BookingHeader, BookingFooter } from '@/components/booking/BookingHeader';
import { tapSelect } from '@/utils/haptics';
import { T, HAIRLINE } from '@/constants/clientTheme';

function fmtDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${mins} mins`;
}

/** Step 1 — every service the shop offers, with the tapped one pre-selected. */
export default function BookingServiceScreen() {
  const { barberId, serviceId, shopName, professionalId, professionalName } =
    useLocalSearchParams<{
      barberId: string; serviceId?: string; shopName?: string;
      professionalId?: string; professionalName?: string;
    }>();

  const { service, setService, setProfessional, ensureShop } = useBookingStore();

  const { data, isLoading } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: !!barberId,
  });
  const shop = data?.data.data as unknown as {
    businessName?: string; fullName?: string;
    services?: { id: string; name: string; price: number; durationMinutes: number }[];
  } | undefined;
  const services = shop?.services ?? [];
  const title = shopName || shop?.businessName || shop?.fullName || 'Book';

  // Enter the wizard. ensureShop only clears the draft for a DIFFERENT shop,
  // so stepping back from later screens keeps the current selections.
  useEffect(() => {
    if (!barberId) return;
    ensureShop(barberId, title);
    if (professionalId && professionalName) {
      setProfessional({ id: professionalId, name: professionalName });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, title]);

  // Preselect the service the client tapped "Book" on. Runs once per arrival
  // with a given serviceId — a fresh tap on another service re-runs it, while
  // returning from a later step does not (so a manual change is respected).
  const appliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!serviceId || services.length === 0) return;
    if (appliedRef.current === serviceId) return;
    const found = services.find((s) => s.id === serviceId);
    if (found) {
      setService(found as BookingService);
      appliedRef.current = serviceId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, services.length]);

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <BookingHeader title="Select a service" subtitle={title} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ height: 88, borderRadius: 18, backgroundColor: T.input, marginBottom: 12 }} />
          ))
        ) : services.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 10 }}>
            <Scissors size={38} color={T.textDisabled} />
            <Text style={{ fontSize: 14, color: T.textFaint }}>This shop hasn't listed services yet.</Text>
          </View>
        ) : (
          services.map((s) => {
            const on = service?.id === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => { tapSelect(); setService(s as BookingService); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  // Selection is signalled by the accent ring, not a heavy fill.
                  borderWidth: on ? 1.5 : HAIRLINE,
                  borderColor: on ? T.accent : T.border,
                  backgroundColor: T.card,
                  borderRadius: 18, padding: 16, marginBottom: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16.5, fontWeight: '700', color: T.text }}>{s.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 }}>
                    <Clock size={12} color={T.textFaint} />
                    <Text style={{ fontSize: 13, color: T.textFaint }}>{fmtDuration(s.durationMinutes)}</Text>
                  </View>
                  <Text style={{ fontSize: 15.5, fontWeight: '800', color: T.text, marginTop: 7 }}>
                    GH₵{s.price.toFixed(0)}
                  </Text>
                </View>

                <View style={{
                  width: 26, height: 26, borderRadius: 13,
                  borderWidth: on ? 0 : 1.5, borderColor: T.border,
                  backgroundColor: on ? T.accent : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Check size={15} color={T.onAccent} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <BookingFooter
        label="Continue"
        disabled={!service}
        hint={service ? undefined : 'Select a service to continue'}
        onPress={() => router.push('/(client)/booking/professional' as never)}
      />
    </View>
  );
}
