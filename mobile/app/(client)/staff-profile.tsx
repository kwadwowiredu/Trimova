import { useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, Linking, Animated, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, Star, CalendarCheck, ImageOff, Phone, Mail, Heart, Scissors, MoreHorizontal,
} from 'lucide-react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { barbersService } from '@/services/barbers';
import { reviewsService } from '@/services/reviews';
import { ReviewRow } from '@/components/barber/ReviewRow';
import { tapLight, tapSelect, tapMedium } from '@/utils/haptics';

const TABS = ['About', 'Services', 'Portfolio', 'Reviews'] as const;
type TabName = (typeof TABS)[number];

function fmtDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${mins} mins`;
}

/** Frosty circular control over the hero photo. */
function GlassButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress}>
      <BlurView
        intensity={90}
        tint="light"
        style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' }}
      >
        {children}
      </BlurView>
    </Pressable>
  );
}

interface StaffProfileData {
  name: string;
  role: string;
  rating: number;
  reviewCount: number;
  appointmentsCompleted: number;
  phone: string;
  email: string;
  services: { name: string; price: number; durationMinutes: number }[];
  portfolio: string[];
  heroUri: string | null;
  isOwner: boolean;
}

/**
 * Public profile of one barber in a shop — hero photo with a rounded sheet
 * over it (per the inspo), then About / Services / Portfolio / Reviews tabs.
 * `staffId === 'owner'` loads the REAL shop owner from the API.
 */
export default function ClientStaffProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { staffId, barberId, shopName } = useLocalSearchParams<{ staffId: string; barberId?: string; shopName?: string }>();
  const [activeTab, setActiveTab] = useState<TabName>('About');
  const [liked, setLiked] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isOwner = staffId === 'owner';
  const HERO_H = Math.round(width * 0.92);

  // The owner comes from the barber profile; staff come from the shop roster.
  const { data } = useQuery({
    queryKey: ['barber', barberId],
    queryFn: () => barbersService.getById(barberId!),
    enabled: isOwner && !!barberId,
  });
  const owner = data?.data.data as unknown as {
    fullName: string; rating: number; reviewCount: number; phone: string | null; email: string;
    avatarUrl: string | null; coverPhotoUrl?: string | null; portfolioImages: string[];
    services?: { id: string; name: string; price: number; durationMinutes: number }[];
  } | undefined;

  // A staff member's own record, pulled from the shop's real roster.
  const { data: staffRes } = useQuery({
    queryKey: ['shop-staff', barberId],
    queryFn: () => reviewsService.getShopStaff(barberId!),
    enabled: !isOwner && !!barberId,
  });
  const staffMember = (staffRes?.data.data ?? []).find((s) => s.id === staffId);

  // Reviews follow the barber who earned them, not the shop.
  const { data: reviewsRes } = useQuery({
    queryKey: ['reviews', barberId, staffId],
    queryFn: () => reviewsService.getBarberReviews(barberId!, isOwner ? undefined : staffId),
    enabled: !!barberId,
  });
  const reviews = reviewsRes?.data.data ?? [];

  const profile: StaffProfileData | null = isOwner
    ? owner
      ? {
          name: owner.fullName,
          role: 'Owner · Barber',
          rating: owner.rating > 0 ? owner.rating : 5.0,
          reviewCount: owner.reviewCount,
          appointmentsCompleted: 56, // TODO: real owner analytics
          phone: owner.phone ?? '',
          email: owner.email,
          services: (owner.services ?? []).map((s) => ({ name: s.name, price: s.price, durationMinutes: s.durationMinutes })),
          portfolio: owner.portfolioImages ?? [],
          heroUri: owner.avatarUrl || owner.coverPhotoUrl || null,
          isOwner: true,
        }
      : null // still loading
    : staffMember
      ? {
          name: staffMember.name,
          role: staffMember.role,
          rating: staffMember.rating,
          reviewCount: staffMember.reviewCount,
          // A staff barber's completed count comes from the shop's own
          // bookings view; not exposed publicly, so it stays at zero here.
          appointmentsCompleted: 0,
          // Contact details belong to the shop, not to individual staff.
          phone: '',
          email: '',
          // Staff serve the shop's menu; per-barber service lists aren't a
          // thing yet, so the shop profile is where a client picks a service.
          services: [],
          portfolio: [],
          heroUri: staffMember.avatarUrl,
          isOwner: false,
        }
      : null;

  if (!profile) {
    // Loading (owner fetch) or unknown staff id.
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <View style={{ height: HERO_H, backgroundColor: T.inputDeep }} />
        <View style={{ padding: 20, gap: 12, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28 }}>
          <View style={{ height: 24, width: '55%', borderRadius: 8, backgroundColor: T.inputDeep }} />
          <View style={{ height: 14, width: '40%', borderRadius: 7, backgroundColor: T.input }} />
        </View>
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
          <GlassButton onPress={() => router.back()}>
            <ChevronLeft size={22} color={T.text} />
          </GlassButton>
        </View>
      </View>
    );
  }

  const initials = profile.name.split(' ').slice(0, 2).map((n) => n[0]).join('');

  function handleBook() {
    tapMedium();
    router.push({
      pathname: '/(client)/booking/service',
      params: {
        barberId: barberId ?? '',
        professionalId: staffId,
        professionalName: profile!.name,
      },
    } as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >

        {/* ── Hero photo — stretchy zoom on pull-down (no white gap) ── */}
        <View style={{ height: HERO_H, backgroundColor: T.inputDeep }}>
          <Animated.View
            style={{
              width, height: HERO_H,
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [-HERO_H, 0],
                    outputRange: [-HERO_H / 2, 0],
                    extrapolateRight: 'clamp',
                  }),
                },
                {
                  scale: scrollY.interpolate({
                    inputRange: [-HERO_H, 0],
                    outputRange: [2, 1],
                    extrapolateRight: 'clamp',
                  }),
                },
              ],
            }}
          >
            {profile.heroUri ? (
              <Image source={{ uri: profile.heroUri }} style={{ width, height: HERO_H }} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={[T.accentWash, T.inputDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: T.accent, fontSize: 84, fontWeight: '600' }}>{initials}</Text>
              </LinearGradient>
            )}
          </Animated.View>

          {/* Floating controls */}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <GlassButton onPress={() => { tapLight(); router.back(); }}>
              <ChevronLeft size={22} color={T.text} />
            </GlassButton>
          </View>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16 }}>
            <GlassButton onPress={() => tapLight()}>
              <MoreHorizontal size={20} color={T.text} />
            </GlassButton>
          </View>
        </View>

        {/* ── Rounded identity sheet over the photo (inspo look) ── */}
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -30, paddingTop: 22, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: T.text }}>{profile.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <Star size={14} color={T.star} fill={T.star} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: T.text }}>
                  {profile.rating.toFixed(1)}
                  <Text style={{ fontWeight: '600', color: T.textFaint }}> ({profile.reviewCount})</Text>
                </Text>
                {shopName ? (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: T.textFaint }} numberOfLines={1}>
                    {shopName}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 12.5, color: T.textFaint, marginTop: 4 }}>{profile.role}</Text>
            </View>

            {/* Heart */}
            <Pressable
              onPress={() => { tapLight(); setLiked((v) => !v); }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 }}
            >
              <Heart size={20} color={liked ? T.onError : T.text} fill={liked ? T.onError : 'transparent'} />
            </Pressable>
          </View>

          {/* ── Tab bar ─────────────────────────────────────────── */}
          <View style={{ flexDirection: 'row', borderBottomWidth: HAIRLINE, borderBottomColor: T.accent, marginTop: 18, marginHorizontal: -20, paddingHorizontal: 8 }}>
            {TABS.map((tab) => {
              const on = tab === activeTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => { tapSelect(); setActiveTab(tab); }}
                  style={{ flex: 1, alignItems: 'center', paddingVertical: 13 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: on ? T.accent : T.textFaint }}>{tab}</Text>
                  {on && <View style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2.5, borderRadius: 2, backgroundColor: T.accent }} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── Tab content ─────────────────────────────────────── */}
          {activeTab === 'About' && (
            <View style={{ paddingVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f9fa', padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.17, shadowRadius: 8, elevation: 4 }}>
                <CalendarCheck size={20} color={T.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: T.accent }}>{profile.appointmentsCompleted}</Text>
                  <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>Appointments completed</Text>
                </View>
              </View>

              {profile.phone ? (
                <Pressable
                  onPress={() => { tapLight(); Linking.openURL(`tel:${profile.phone}`).catch(() => {}); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f9fa', padding: 16, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.17, shadowRadius: 8, elevation: 4 }}
                >
                  <Phone size={18} color={T.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: T.accent }}>{profile.phone}</Text>
                    <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>Phone number</Text>
                  </View>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => { tapLight(); Linking.openURL(`mailto:${profile.email}`).catch(() => {}); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8f9fa', padding: 16, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.17, shadowRadius: 8, elevation: 4 }}
              >
                <Mail size={18} color={T.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: T.accent }}>{profile.email}</Text>
                  <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>Email</Text>
                </View>
              </Pressable>
            </View>
          )}

          {activeTab === 'Services' && (
            <View style={{ paddingBottom: 20 }}>
              {profile.services.length === 0 ? (
                <Text style={{ fontSize: 13, color: T.textFaint, paddingVertical: 30, textAlign: 'center' }}>
                  No services listed yet.
                </Text>
              ) : (
                profile.services.map((s, i) => (
                  <View key={s.name} style={{ paddingVertical: 15, borderTopWidth: i === 0 ? 0 : HAIRLINE, borderTopColor: T.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: T.accent }}>{s.name}</Text>
                        <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 2 }}>{fmtDuration(s.durationMinutes)}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#52b788', marginTop: 4 }}>GH₵{s.price.toFixed(0)}</Text>
                      </View>
                      <Pressable
                        onPress={handleBook}
                        style={{ borderWidth: HAIRLINE, borderColor: T.accent, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 }}
                      >
                        <Text style={{ fontSize: 14.5, fontWeight: '600', color: T.accent }}>Book</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'Portfolio' && (
            <View style={{ paddingVertical: 20 }}>
              {profile.portfolio.length === 0 ? (
                <View style={{ backgroundColor: T.input, borderRadius: 16, paddingVertical: 30, alignItems: 'center', gap: 8 }}>
                  <ImageOff size={26} color={T.textDisabled} />
                  <Text style={{ fontSize: 13, color: T.textFaint }}>No portfolio photos yet.</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {profile.portfolio.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={{ width: (width - 56) / 3, height: (width - 56) / 3, borderRadius: 12 }} resizeMode="cover" />
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View style={{ paddingBottom: 20 }}>
              {reviews.length === 0 ? (
                <Text style={{ fontSize: 13, color: T.textFaint, paddingVertical: 30, textAlign: 'center' }}>
                  No reviews for this barber yet.
                </Text>
              ) : (
                reviews.map((r, i) => <ReviewRow key={r.id} review={r} showStaff={false} isFirst={i === 0} />)
              )}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Sticky Book bar ─────────────────────────────────────── */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', '#ffffff']}
          style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Scissors size={16} color={T.textFaint} />
            <Text style={{ fontSize: 15, color: T.accent, fontWeight: '600' }}>
              {profile.services.length} service{profile.services.length === 1 ? '' : 's'}
            </Text>
          </View>
          <Pressable
            onPress={handleBook}
            style={{ backgroundColor: T.accent, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>Book now</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </View>
  );
}
