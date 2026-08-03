import { View, Text, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Scissors } from 'lucide-react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { barbersService } from '@/services/barbers';
import { tapLight, tapMedium } from '@/utils/haptics';

interface BarberService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

function fmtDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${mins} mins`;
}

/** Every service this shop offers — reached from the detail screen's "See all". */
export default function AllServicesScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ['barber', id],
    queryFn: () => barbersService.getById(id!),
    enabled: !!id,
  });
  const payload = data?.data.data as unknown as { businessName?: string; fullName?: string; services?: BarberService[] } | undefined;
  const services = payload?.services ?? [];

  function handleBook(serviceId: string) {
    tapMedium();
    router.push({
      pathname: '/(client)/booking/service',
      params: {
        barberId: id,
        serviceId,
        shopName: payload?.businessName || payload?.fullName || '',
      },
    } as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={10}>
          <ChevronLeft size={26} color={T.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }} numberOfLines={1}>All Services</Text>
          <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }} numberOfLines={1}>
            {payload?.businessName || payload?.fullName || ''} · {services.length} services
          </Text>
        </View>
      </View>

      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 10 }}>
            <Scissors size={40} color={T.textDisabled} />
            <Text style={{ fontSize: 14, color: T.textFaint }}>No services listed yet.</Text>
          </View>
        }
        renderItem={({ item: s, index: i }) => (
          <View style={{ paddingVertical: 16, borderTopWidth: i === 0 ? 0 : HAIRLINE, borderTopColor: T.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16.5, fontWeight: '700', color: T.text }}>{s.name}</Text>
                {s.description ? (
                  <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 2 }} numberOfLines={2}>{s.description}</Text>
                ) : null}
                <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 3 }}>{fmtDuration(s.durationMinutes)}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, marginTop: 4 }}>from GH₵{s.price.toFixed(0)}</Text>
              </View>
              <Pressable
                onPress={() => handleBook(s.id)}
                style={{ borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.text }}>Book</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
