import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, UserRound } from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import { useBookingStore, type BookingProfessional } from '@/stores/bookingStore';
import { reviewsService } from '@/services/reviews';
import { BookingHeader, ServiceCartBar } from '@/components/booking/BookingHeader';
import { tapSelect } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';

interface OpeningDay { day: string; isOpen: boolean; openTime: string; closeTime: string }

const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Step 2 — pick who performs the service. */
export default function BookingProfessionalScreen() {
  const { barberId, service, professional, setProfessional } = useBookingStore();

  const { data } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: !!barberId,
  });
  const shop = data?.data.data as unknown as {
    fullName: string; avatarUrl: string | null; rating: number;
    barberType: string; isBookable?: boolean; workingHours?: OpeningDay[] | null;
  } | undefined;

  const isShop = shop?.barberType !== 'mobile';

  // A shop's real roster. Freelancers have no staff, so this only runs for shops.
  const { data: staffRes, isLoading: loadingStaff } = useQuery({
    queryKey: ['shop-staff', barberId],
    queryFn: () => reviewsService.getShopStaff(barberId!),
    enabled: !!barberId && isShop,
  });
  const staff = staffRes?.data.data ?? [];

  // Longest working window across the week — a service longer than this can
  // never be completed, which is what drives the "exceeds working hours" note.
  const longestWindow = useMemo(() => {
    const hours = shop?.workingHours ?? [];
    const open = hours.filter((h) => h.isOpen);
    if (open.length === 0) return Infinity; // hours not set up yet — don't block
    return Math.max(...open.map((h) => toMins(h.closeTime) - toMins(h.openTime)));
  }, [shop?.workingHours]);

  const fitsWorkingHours = !service || service.durationMinutes <= longestWindow;

  // Roster: "No preference" + the owner (when bookable) + staff.
  const options: BookingProfessional[] = [];
  if (isShop) options.push({ id: 'any', name: 'No preference', role: 'First available barber' });
  if (shop && shop.isBookable !== false) {
    options.push({
      id: 'owner',
      name: shop.fullName,
      role: isShop ? 'Owner · Barber' : 'Mobile Barber',
      avatarUrl: shop.avatarUrl,
      rating: shop.rating > 0 ? shop.rating : 5.0,
    });
  }
  if (isShop) {
    for (const s of staff) {
      options.push({
        id: s.id,
        name: s.name,
        role: s.role,
        avatarUrl: s.avatarUrl,
        rating: s.rating,
      });
    }
  }

  const okChip = chip('success');
  const badChip = chip('error');

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <BookingHeader title="Staff members" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 20 }}>
        {/* Layer 1: one white card holding the whole roster */}
        {loadingStaff && (
          <View style={{ alignItems: 'center', paddingVertical: 18 }}>
            <ActivityIndicator color={T.accent} />
          </View>
        )}
        <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, overflow: 'hidden' }}>
          {options.map((p, idx) => {
            const on = professional?.id === p.id;
            const available = fitsWorkingHours;

            return (
              <Pressable
                key={p.id}
                onPress={() => { if (available) { tapSelect(); setProfessional(p); } }}
                disabled={!available}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 16, paddingVertical: 15,
                  borderTopWidth: idx === 0 ? 0 : HAIRLINE, borderTopColor: T.border,
                  backgroundColor: on ? T.accentWash : T.card,
                }}
              >
                {/* Avatar (+ selected badge) */}
                <View>
                  {p.id === 'any' ? (
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
                      <UserRound size={21} color={T.textFaint} />
                    </View>
                  ) : p.avatarUrl ? (
                    <Image source={{ uri: p.avatarUrl }} style={{ width: 46, height: 46, borderRadius: 23 }} resizeMode="cover" />
                  ) : (
                    // Most barbers haven't uploaded a photo yet — a default
                    // avatar reads as "no picture", where initials can look
                    // like a deliberate design choice.
                    <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
                      <UserRound size={22} color={T.textFaint} strokeWidth={1.8} />
                    </View>
                  )}
                  {on && (
                    <View style={{ position: 'absolute', top: -2, right: -2, width: 19, height: 19, borderRadius: 10, backgroundColor: T.accent, borderWidth: 2, borderColor: T.card, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={9} color={T.onAccent} strokeWidth={4} />
                    </View>
                  )}
                </View>

                {/* Name + dual-tone availability chip */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: T.text }} numberOfLines={1}>{p.name}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 5 }}>
                    <View style={{
                      backgroundColor: available ? okChip.bg : badChip.bg,
                      borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '600', color: available ? okChip.fg : badChip.fg }} numberOfLines={1}>
                        {available ? 'Available' : 'Exceeds working hours'}
                      </Text>
                    </View>
                  </View>
                </View>

                {on
                  ? <Check size={20} color={T.accent} strokeWidth={2.8} />
                  : available ? <ChevronRight size={19} color={T.textDisabled} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Cart bar — appears once a staff member is chosen */}
      {service && professional && (
        <ServiceCartBar
          serviceName={service.name}
          price={service.price}
          durationMinutes={service.durationMinutes}
          actionLabel="Continue"
          onPress={() => router.push('/(client)/booking/datetime' as never)}
        />
      )}
    </View>
  );
}
