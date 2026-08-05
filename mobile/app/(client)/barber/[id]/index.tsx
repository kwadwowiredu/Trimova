import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  Image,
  Modal,
  Share,
  Linking,
  useWindowDimensions,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Star, MapPin, Scissors, Heart, BadgeCheck, Navigation,
  Share2, X, Phone, Clock,
} from 'lucide-react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { barbersService } from '@/services/barbers';
import { useClientBrowseStore } from '@/stores/clientBrowseStore';
import { chip } from '@/constants/clientTheme';
import { MOCK_SHOP_STAFF, MOCK_SHOP_REVIEWS } from '@/utils/mockShopData';
import { ReviewRow } from '@/components/barber/ReviewRow';
import { tapLight, tapSelect, tapMedium } from '@/utils/haptics';
import { barberProfileLink } from '@/utils/constants';
import type { BarberProfile, BarberListItem } from '@/types/user';

interface BarberService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

interface OpeningDay {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

type BarberDetail = BarberProfile & {
  coverPhotoUrl?: string | null;
  locationAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  isBookable?: boolean;
  services?: BarberService[];
  workingHours?: OpeningDay[] | null;
};

const SECTIONS = ['Services', 'Staff', 'Reviews', 'Portfolio', 'About'] as const;
type SectionName = (typeof SECTIONS)[number];

function fmtDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h} hr`;
  }
  return `${mins} mins`;
}

/** "09:00" → "9:00 am" */
function fmt12(t: string) {
  const [hStr, m] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

function openStatus(hours: OpeningDay[] | null | undefined): { text: string; open: boolean } | null {
  if (!hours || hours.length === 0) return null;
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const today = hours.find((d) => d.day === todayName);
  if (!today || !today.isOpen) return { text: 'Closed today', open: false };
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = (t: string) => Number(t.split(':')[0]) * 60 + Number(t.split(':')[1]);
  if (mins < toMins(today.openTime))  return { text: `Closed – opens at ${fmt12(today.openTime)}`, open: false };
  if (mins >= toMins(today.closeTime)) return { text: `Closed – opened until ${fmt12(today.closeTime)}`, open: false };
  return { text: `Open now · closes ${fmt12(today.closeTime)}`, open: true };
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={T.star} fill={value >= i - 0.25 ? T.star : 'transparent'} />
      ))}
    </View>
  );
}

/** Frosty translucent circular icon button (hero overlay controls). */
function GlassButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress}>
      <BlurView
        intensity={40}
        tint="light"
        style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}
      >
        {children}
      </BlurView>
    </Pressable>
  );
}

/** Staff card per the inspo: round photo, rating pill overlapping the bottom. */
function StaffFaceCard({ name, role, rating, avatarUrl, onPress }: {
  name: string;
  role: string;
  rating: number;
  avatarUrl?: string | null;
  onPress?: () => void;
}) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('');
  return (
    <Pressable onPress={onPress} style={{ width: 112, alignItems: 'center' }} className="active:opacity-80">
      <View style={{ alignItems: 'center' }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} resizeMode="cover" />
        ) : (
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: '#eef0ff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: T.accent }}>{initials.charAt(0)}</Text>
          </View>
        )}
        {/* Rating pill overlapping the photo's bottom edge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ffffff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: -14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 3 }}>
          <Star size={12} color={T.star} fill={T.star} />
          <Text style={{ fontSize: 13, fontWeight: '800', color: T.text }}>{rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '800', color: T.text, marginTop: 8, textAlign: 'center' }} numberOfLines={1}>
        {name.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>{role}</Text>
    </Pressable>
  );
}

export default function ClientBarberDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionName>('Services');

  const { toggleFavorite, recordView, removeBarber } = useClientBrowseStore();
  const liked = useClientBrowseStore((s) => s.favorites.some((b) => b.id === id));

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const sectionY = useRef<Partial<Record<SectionName, number>>>({});

  const HERO_H = Math.round(width * 0.78);
  const SHEET_OVERLAP = 26;
  const TABBAR_H = insets.top + 54;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['barber', id],
    queryFn: () => barbersService.getById(id!),
    enabled: !!id,
  });

  const barber = data?.data.data as BarberDetail | undefined;
  const services = barber?.services ?? [];
  const cover = barber?.coverPhotoUrl || barber?.portfolioImages?.[0] || null;
  const portfolio = barber?.portfolioImages ?? [];
  const title = barber?.businessName || barber?.fullName || '';
  const status = openStatus(barber?.workingHours);
  const isShop = barber?.barberType !== 'mobile';
  const recentReviews = MOCK_SHOP_REVIEWS.slice(0, 5);

  // Sticky section tab bar: fades/slides in once the hero scrolls away.
  const tabBarOpacity = scrollY.interpolate({
    inputRange: [HERO_H - 170, HERO_H - 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const tabBarTranslate = scrollY.interpolate({
    inputRange: [HERO_H - 170, HERO_H - 90],
    outputRange: [-24, 0],
    extrapolate: 'clamp',
  });

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    // Scroll-spy: highlight the section currently under the sticky bar.
    let current: SectionName = 'Services';
    for (const s of SECTIONS) {
      const sy = sectionY.current[s];
      if (sy !== undefined && y >= sy - TABBAR_H - 40) current = s;
    }
    if (current !== activeSection) setActiveSection(current);
  }

  function jumpTo(section: SectionName) {
    tapSelect();
    const sy = sectionY.current[section];
    if (sy !== undefined) scrollRef.current?.scrollTo({ y: sy - TABBAR_H + 6, animated: true });
  }

  // Section wrapper that registers its absolute Y position for the scroll-spy.
  function SectionAnchor({ name, children }: { name: SectionName; children: React.ReactNode }) {
    return (
      <View
        onLayout={(e) => {
          // Sections are children of the sheet, which starts at HERO_H - SHEET_OVERLAP.
          sectionY.current[name] = HERO_H - SHEET_OVERLAP + e.nativeEvent.layout.y;
        }}
      >
        {children}
      </View>
    );
  }

  const asListItem = (): BarberListItem | null =>
    barber
      ? {
          id: barber.id,
          fullName: barber.fullName,
          avatarUrl: barber.avatarUrl,
          barberType: barber.barberType,
          businessName: barber.businessName ?? null,
          rating: barber.rating,
          reviewCount: barber.reviewCount,
          isVerified: barber.isVerified,
          isAvailable: barber.isAvailable,
          serviceRadius: barber.serviceRadius,
          locationAddress: barber.locationAddress ?? null,
          portfolioImages: barber.portfolioImages ?? [],
          coverPhotoUrl: barber.coverPhotoUrl ?? null,
        }
      : null;

  useEffect(() => {
    const item = asListItem();
    if (item) recordView(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barber?.id]);

  function handleLike() {
    tapLight();
    const item = asListItem();
    if (item) toggleFavorite(item);
  }

  async function handleShare() {
    tapLight();
    await Share.share({ message: `Check out ${title} on Trimova: ${barberProfileLink(id!)}` });
  }

  function handleBack() {
    tapLight();
    router.back();
  }

  /** Opens the booking wizard, pre-selecting the tapped service when given. */
  function handleBook(serviceId?: string) {
    tapMedium();
    router.push({
      pathname: '/(client)/booking/service',
      params: { barberId: id, shopName: title, ...(serviceId ? { serviceId } : {}) },
    } as never);
  }

  function openDirections() {
    tapLight();
    if (!barber) return;
    const dest = barber.lat != null && barber.lng != null
      ? `${barber.lat},${barber.lng}`
      : encodeURIComponent(barber.locationAddress ?? title);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`).catch(() => {});
  }

  function callShop() {
    tapLight();
    if (barber?.phone) Linking.openURL(`tel:${barber.phone}`).catch(() => {});
  }

  // ── Loading / error shells ──────────────────────────────────
  if (isLoading || (!barber && !isError)) {
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        <View style={{ height: HERO_H, backgroundColor: T.inputDeep }} />
        <View style={{ padding: 20, gap: 12, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -SHEET_OVERLAP }}>
          <View style={{ height: 28, width: '65%', borderRadius: 8, backgroundColor: T.inputDeep }} />
          <View style={{ height: 14, width: '45%', borderRadius: 7, backgroundColor: T.input }} />
          <View style={{ height: 14, width: '75%', borderRadius: 7, backgroundColor: T.input }} />
        </View>
        <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
          <GlassButton onPress={() => router.back()}>
            <ChevronLeft size={22} color={T.text} />
          </GlassButton>
        </View>
      </View>
    );
  }

  if (isError || !barber) {
    // A 404 means this barber deleted their account. Their name/photo only
    // survive in this device's cached favourites + recently-viewed snapshots,
    // so drop them now instead of leaving a dead card behind.
    const gone = (error as { response?: { status?: number } } | null)?.response?.status === 404;
    return (
      <View style={{ flex: 1, backgroundColor: T.canvas, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center' }}>
          {gone ? 'This barber is no longer on Trimova' : "Couldn't load this barber"}
        </Text>
        {gone ? (
          <>
            <Text style={{ fontSize: 13.5, color: T.textFaint, textAlign: 'center', lineHeight: 20 }}>
              They've closed their account, so their profile has been removed.
            </Text>
            <Pressable
              onPress={() => { if (id) removeBarber(id); router.back(); }}
              style={{ backgroundColor: T.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}
            >
              <Text style={{ color: T.onAccent, fontWeight: '700' }}>Remove from my list</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={() => refetch()} style={{ backgroundColor: T.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}>
              <Text style={{ color: T.onAccent, fontWeight: '700' }}>Retry</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={{ marginTop: 4 }}>
              <Text style={{ color: T.textFaint, fontWeight: '600' }}>Go back</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const GRID_GAP = 8;
  const gridW = (width - 40 - 2 * GRID_GAP) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      <Animated.ScrollView
        ref={scrollRef as React.RefObject<ScrollView>}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true, listener: handleScroll },
        )}
      >
        {/* ── Hero cover photo (single — portfolio has its own section) ──
            Stretchy-zoom: dragging the sheet down subtly scales the cover up
            so it always fills the space above — no white gap on overscroll. */}
        <View style={{ height: HERO_H, backgroundColor: T.inputDeep }}>
          <Animated.View
            style={{
              width,
              height: HERO_H,
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
            {cover ? (
              <Pressable onPress={() => setViewerUri(cover)}>
                <Image source={{ uri: cover }} style={{ width, height: HERO_H }} resizeMode="cover" />
              </Pressable>
            ) : (
              <LinearGradient
                colors={[T.accentWash, T.inputDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Scissors size={44} color={T.textDisabled} />
              </LinearGradient>
            )}
          </Animated.View>

          {/* Floating frosty controls */}
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <GlassButton onPress={handleBack}>
              <ChevronLeft size={22} color={T.text} />
            </GlassButton>
          </View>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16, flexDirection: 'row', gap: 10 }}>
            <GlassButton onPress={handleShare}>
              <Share2 size={18} color={T.text} />
            </GlassButton>
            <GlassButton onPress={handleLike}>
              <Heart size={19} color={liked ? T.onError : T.text} fill={liked ? T.onError : 'transparent'} />
            </GlassButton>
          </View>
        </View>

        {/* ── Content sheet — rounded top corners like a modal ──── */}
        <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -SHEET_OVERLAP, paddingTop: 10 }}>
          {/* grab handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: 'center', marginBottom: 8 }} />

          {/* ── Identity ─────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 27, fontWeight: '800', color: T.text, flexShrink: 1 }}>{title}</Text>
              {barber.isVerified && <BadgeCheck size={21} color={T.accent} />}
            </View>
            {/* Venue type — not the barber's name */}
            <Text style={{ fontSize: 13.5, fontWeight: '600', color: T.textFaint, marginTop: 3 }}>
              {isShop ? 'Barbershop' : 'Mobile Barber'}
            </Text>

            {/* Avg rating + stars + (reviews) — no "New" text */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: T.text }}>
                {barber.rating > 0 ? barber.rating.toFixed(1) : '–'}
              </Text>
              <Stars value={barber.rating} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.accent }}>({barber.reviewCount})</Text>
            </View>

            {/* Location with icon */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
              <MapPin size={15} color={T.textFaint} style={{ marginTop: 3 }} />
              <Text style={{ flex: 1, fontSize: 15, color: T.textMuted, lineHeight: 22 }}>
                {barber.locationAddress ?? 'Location not set'}
              </Text>
            </View>

            {/* Open/closed with clock icon — green open, red closed */}
            {status && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
                <Clock size={14} color={status.open ? T.onSuccess : T.onError} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: status.open ? T.onSuccess : T.onError }}>
                  {status.text}
                </Text>
              </View>
            )}

            {/* Range is checked during booking, once the client types their
                address — no device-location permission needed here. */}
            {barber.barberType === 'mobile' && (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: chip('success').bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Navigation size={13} color={chip('success').fg} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: chip('success').fg }}>
                    Travels up to {barber.serviceRadius ?? '–'} km · further by request
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Services ─────────────────────────────────────────── */}
          <SectionAnchor name="Services">
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, paddingHorizontal: 20, marginTop: 30, marginBottom: 8 }}>Services</Text>
            <View style={{ paddingHorizontal: 20 }}>
              {services.length === 0 ? (
                <Text style={{ fontSize: 13, color: T.textFaint }}>This barber hasn't listed services yet.</Text>
              ) : (
                <>
                  {services.slice(0, 5).map((s, i) => (
                    <View key={s.id} style={{ paddingVertical: 15, borderTopWidth: i === 0 ? 0 : HAIRLINE, borderTopColor: T.border }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={{ fontSize: 16.5, fontWeight: '700', color: T.text }}>{s.name}</Text>
                          <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 2 }}>{fmtDuration(s.durationMinutes)}</Text>
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
                  ))}
                  {services.length > 5 && (
                    <Pressable
                      onPress={() => { tapLight(); router.push(`/(client)/barber/${id}/services` as never); }}
                      style={{ borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>See all ({services.length})</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </SectionAnchor>

          {/* ── Staff ────────────────────────────────────────────── */}
          {isShop && (
            <SectionAnchor name="Staff">
              <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, paddingHorizontal: 20, marginTop: 30, marginBottom: 16 }}>Staff</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                {/* The shop owner appears when their "Bookable" toggle is ON */}
                {barber.isBookable !== false && (
                  <StaffFaceCard
                    name={barber.fullName}
                    role="Owner · Barber"
                    rating={barber.rating > 0 ? barber.rating : 5.0}
                    avatarUrl={barber.avatarUrl}
                    onPress={() => {
                      tapLight();
                      router.push({ pathname: '/(client)/staff-profile', params: { staffId: 'owner', barberId: id, shopName: title } } as never);
                    }}
                  />
                )}
                {MOCK_SHOP_STAFF.map((st) => (
                  <StaffFaceCard
                    key={st.id}
                    name={st.name}
                    role={st.role}
                    rating={st.rating}
                    onPress={() => {
                      tapLight();
                      router.push({ pathname: '/(client)/staff-profile', params: { staffId: st.id, barberId: id, shopName: title } } as never);
                    }}
                  />
                ))}
              </ScrollView>
            </SectionAnchor>
          )}

          {/* ── Reviews (recent 5; single See-all button below) ──── */}
          <SectionAnchor name="Reviews">
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, paddingHorizontal: 20, marginTop: 30, marginBottom: 8 }}>Reviews</Text>
            <View style={{ paddingHorizontal: 20 }}>
              {recentReviews.map((r, i) => (
                <ReviewRow key={r.id} review={r} isFirst={i === 0} />
              ))}
              <Pressable
                onPress={() => { tapLight(); router.push(`/(client)/barber/${id}/reviews` as never); }}
                style={{ borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 8 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: T.text }}>See all reviews</Text>
              </Pressable>
            </View>
          </SectionAnchor>

          {/* ── Portfolio (own section — not mixed into the cover) ─ */}
          <SectionAnchor name="Portfolio">
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, paddingHorizontal: 20, marginTop: 30, marginBottom: 12 }}>Portfolio</Text>
            {portfolio.length === 0 ? (
              <View style={{ marginHorizontal: 20, backgroundColor: T.input, borderRadius: 16, paddingVertical: 26, alignItems: 'center', gap: 8 }}>
                <Scissors size={26} color={T.textDisabled} />
                <Text style={{ fontSize: 13, color: T.textFaint }}>No portfolio photos yet.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, paddingHorizontal: 20 }}>
                {portfolio.map((uri, i) => (
                  <Pressable key={i} onPress={() => { tapLight(); setViewerUri(uri); }}>
                    <Image source={{ uri }} style={{ width: gridW, height: gridW, borderRadius: 12 }} resizeMode="cover" />
                  </Pressable>
                ))}
              </View>
            )}
          </SectionAnchor>

          {/* ── About ────────────────────────────────────────────── */}
          <SectionAnchor name="About">
            <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, paddingHorizontal: 20, marginTop: 30, marginBottom: 8 }}>About</Text>
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 15, color: T.textMuted, lineHeight: 23 }}>
                {barber.bio || `${title} is on Trimova. Book an appointment to experience their services.`}
              </Text>

              {barber.lat != null && barber.lng != null && (
                <View style={{ marginTop: 18, borderRadius: 16, overflow: 'hidden', height: 160 }}>
                  <MapView
                    style={{ flex: 1 }}
                    pointerEvents="none"
                    initialRegion={{ latitude: barber.lat, longitude: barber.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                  >
                    <Marker coordinate={{ latitude: barber.lat, longitude: barber.lng }} />
                  </MapView>
                </View>
              )}
              <Pressable
                onPress={openDirections}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: T.input, borderRadius: 14, padding: 14 }}
              >
                <Navigation size={17} color={T.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>Get directions</Text>
                  <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }} numberOfLines={1}>
                    {barber.locationAddress ?? 'Open in maps'}
                  </Text>
                </View>
                <ChevronRight size={16} color={T.textFaint} />
              </Pressable>

              {barber.phone ? (
                <Pressable
                  onPress={callShop}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, backgroundColor: T.input, borderRadius: 14, padding: 14 }}
                >
                  <Phone size={17} color={T.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>Call {isShop ? 'the shop' : 'the barber'}</Text>
                    <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>{barber.phone}</Text>
                  </View>
                  <ChevronRight size={16} color={T.textFaint} />
                </Pressable>
              ) : null}

              <Text style={{ fontSize: 22, fontWeight: '800', color: T.text, marginTop: 28, marginBottom: 12 }}>
                Opening times
              </Text>
              {barber.workingHours && barber.workingHours.length > 0 ? (
                barber.workingHours.map((d) => {
                  const isToday = d.day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  return (
                    <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.isOpen ? T.onSuccess : T.border, marginRight: 14 }} />
                      <Text style={{ flex: 1, fontSize: 15.5, fontWeight: isToday ? '800' : '500', color: T.text }}>{d.day}</Text>
                      <Text style={{ fontSize: 15, fontWeight: isToday ? '800' : '500', color: d.isOpen ? T.text : T.textFaint }}>
                        {d.isOpen ? `${fmt12(d.openTime)} – ${fmt12(d.closeTime)}` : 'Closed'}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Clock size={14} color={T.textFaint} />
                  <Text style={{ fontSize: 13, color: T.textFaint }}>Opening times not set yet.</Text>
                </View>
              )}
            </View>
          </SectionAnchor>
        </View>
      </Animated.ScrollView>

      {/* ── Sticky section tab bar (slides in past the hero) ────── */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          opacity: tabBarOpacity,
          transform: [{ translateY: tabBarTranslate }],
        }}
      >
        <View style={{ backgroundColor: '#ffffff', paddingTop: insets.top, borderBottomWidth: HAIRLINE, borderBottomColor: T.border, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={handleBack} hitSlop={10} style={{ paddingHorizontal: 14, paddingVertical: 13 }}>
              <ChevronLeft size={22} color={T.text} />
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
              {SECTIONS.filter((s) => s !== 'Staff' || isShop).map((s) => {
                const on = s === activeSection;
                return (
                  <Pressable key={s} onPress={() => jumpTo(s)} style={{ paddingHorizontal: 11, paddingVertical: 13 }}>
                    <Text style={{ fontSize: 15, fontWeight: on ? '800' : '600', color: on ? T.text : T.textFaint }}>{s}</Text>
                    {on && <View style={{ position: 'absolute', bottom: 0, left: 11, right: 11, height: 2.5, borderRadius: 2, backgroundColor: T.text }} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Animated.View>

      {/* ── Sticky booking bar ─────────────────────────────────── */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', '#ffffff']}
          style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Text style={{ flex: 1, fontSize: 14, color: T.textMuted, fontWeight: '600' }}>
            {services.length} service{services.length === 1 ? '' : 's'} available
          </Text>
          <Pressable
            onPress={() => handleBook()}
            style={{ backgroundColor: T.text, borderRadius: 999, paddingHorizontal: 32, paddingVertical: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '800' }}>Book now</Text>
          </Pressable>
        </LinearGradient>
      </View>

      {/* ── Fullscreen photo viewer ─────────────────────────────── */}
      <Modal visible={viewerUri !== null} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' }}>
          {viewerUri && (
            <Image source={{ uri: viewerUri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          )}
          <Pressable
            onPress={() => setViewerUri(null)}
            style={{ position: 'absolute', top: insets.top + 12, right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
