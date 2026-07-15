import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Modal,
  Share,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, Star, MapPin, Scissors, Clock, Heart, BadgeCheck, Navigation,
  Share2, X, Users, CircleUserRound,
} from 'lucide-react-native';
import { barbersService } from '@/services/barbers';
import { useClientBrowseStore } from '@/stores/clientBrowseStore';
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
  services?: BarberService[];
  workingHours?: OpeningDay[] | null;
};

const TABS = ['Photos', 'Services', 'Team', 'Reviews', 'About'] as const;
type TabName = (typeof TABS)[number];

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

export default function ClientBarberDetailScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabName>('Photos');
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const { toggleFavorite, recordView } = useClientBrowseStore();
  const liked = useClientBrowseStore((s) => s.favorites.some((b) => b.id === id));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['barber', id],
    queryFn: () => barbersService.getById(id!),
    enabled: !!id,
  });

  const barber = data?.data.data as BarberDetail | undefined;
  const services = barber?.services ?? [];
  const photos = [
    ...(barber?.coverPhotoUrl ? [barber.coverPhotoUrl] : []),
    ...(barber?.portfolioImages ?? []),
  ];
  const title = barber?.businessName || barber?.fullName || '';
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Minimal list-item shape used by favorites + recently-viewed rows/cards.
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

  // Record this profile into "Recently Viewed" once it loads.
  useEffect(() => {
    const item = asListItem();
    if (item) recordView(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barber?.id]);

  function handleLike() {
    const item = asListItem();
    if (item) toggleFavorite(item);
  }

  async function handleShare() {
    await Share.share({ message: `Check out ${title} on Trimova: trimova.app/b/${id}` });
  }

  function handleBook() {
    // TODO: push into the booking flow (service → slot → payment) once built.
    Alert.alert('Booking', 'The booking flow is coming in the next update. Stay tuned!');
  }

  // ── Loading / error shells ──────────────────────────────────
  if (isLoading || (!barber && !isError)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={24} color="#161c27" />
          </Pressable>
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          <View style={{ height: 26, width: '60%', borderRadius: 8, backgroundColor: '#EEF0F8' }} />
          <View style={{ height: 14, width: '40%', borderRadius: 7, backgroundColor: '#F3F4FA' }} />
          <View style={{ height: 220, borderRadius: 16, backgroundColor: '#EEF0F8', marginTop: 12 }} />
        </View>
      </View>
    );
  }

  if (isError || !barber) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#161c27' }}>Couldn't load this barber</Text>
        <Pressable onPress={() => refetch()} style={{ backgroundColor: '#3c3cb9', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 4 }}>
          <Text style={{ color: '#8a89a3', fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const GRID_GAP = 8;
  const gridW = (width - 40 - GRID_GAP) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>

      {/* ── Header: back · title · share · heart ─────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color="#161c27" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: '#161c27' }} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={handleShare} hitSlop={10}>
          <Share2 size={21} color="#161c27" />
        </Pressable>
        <Pressable onPress={handleLike} hitSlop={10}>
          <Heart size={22} color={liked ? '#E53E3E' : '#161c27'} fill={liked ? '#E53E3E' : 'transparent'} />
        </Pressable>
      </View>

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {TABS.map((tab) => {
            const on = tab === activeTab;
            return (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={{ paddingHorizontal: 12, paddingVertical: 13 }}>
                <Text style={{ fontSize: 15.5, fontWeight: on ? '800' : '600', color: on ? '#161c27' : '#8a89a3' }}>{tab}</Text>
                {on && <View style={{ position: 'absolute', bottom: 0, left: 12, right: 12, height: 2.5, borderRadius: 2, backgroundColor: '#161c27' }} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Tab content ──────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {activeTab === 'Photos' && (
          <View style={{ padding: 20 }}>
            {photos.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
                <Scissors size={40} color="#c7c5d6" />
                <Text style={{ fontSize: 14, color: '#8a89a3' }}>No photos uploaded yet.</Text>
              </View>
            ) : (
              <>
                {/* Lead photo */}
                <Pressable onPress={() => setViewerUri(photos[0])}>
                  <Image source={{ uri: photos[0] }} style={{ width: '100%', height: 220, borderRadius: 16 }} resizeMode="cover" />
                </Pressable>
                {/* Grid of the rest — tap any to enlarge */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: GRID_GAP }}>
                  {photos.slice(1).map((uri, i) => (
                    <Pressable key={i} onPress={() => setViewerUri(uri)}>
                      <Image source={{ uri }} style={{ width: gridW, height: gridW, borderRadius: 12 }} resizeMode="cover" />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'Services' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
            {services.length === 0 ? (
              <Text style={{ fontSize: 13, color: '#8a89a3', paddingVertical: 40, textAlign: 'center' }}>
                This barber hasn't listed services yet.
              </Text>
            ) : (
              services.map((s, i) => (
                <View
                  key={s.id}
                  style={{ paddingVertical: 18, borderBottomWidth: i === services.length - 1 ? 0 : 1, borderBottomColor: '#EDF0F7' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#161c27' }}>{s.name}</Text>
                      <Text style={{ fontSize: 13, color: '#8a89a3', marginTop: 3 }}>{fmtDuration(s.durationMinutes)}</Text>
                    </View>
                    <Pressable
                      onPress={handleBook}
                      style={{ borderWidth: 1.5, borderColor: '#DDE2F3', borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 }}
                      className="active:opacity-70"
                    >
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#161c27' }}>Book</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#161c27', marginTop: 8 }}>
                    from GH₵{s.price.toFixed(0)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'Team' && (
          <View style={{ padding: 20 }}>
            {/* The barber/owner themselves — full staff roster comes with the staff API */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f7f8ff', borderRadius: 16, padding: 16 }}>
              {barber.avatarUrl ? (
                <Image source={{ uri: barber.avatarUrl }} style={{ width: 54, height: 54, borderRadius: 27 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                  <CircleUserRound size={26} color="#fff" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#161c27' }}>{barber.fullName}</Text>
                <Text style={{ fontSize: 12.5, color: '#8a89a3', marginTop: 2 }}>
                  {barber.barberType === 'mobile' ? 'Mobile Barber' : 'Owner · Barber'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={13} color="#FFC94D" fill="#FFC94D" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#161c27' }}>
                  {barber.rating > 0 ? barber.rating.toFixed(1) : 'New'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <Users size={14} color="#8a89a3" />
              <Text style={{ fontSize: 12.5, color: '#8a89a3', flex: 1 }}>
                Full team profiles are coming soon.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'Reviews' && (
          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 40, fontWeight: '800', color: '#161c27' }}>
                {barber.rating > 0 ? barber.rating.toFixed(1) : '—'}
              </Text>
              <View>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={15} color="#FFC94D" fill={barber.rating >= i - 0.25 ? '#FFC94D' : 'transparent'} />
                  ))}
                </View>
                <Text style={{ fontSize: 13, color: '#8a89a3', marginTop: 3 }}>{barber.reviewCount} review{barber.reviewCount === 1 ? '' : 's'}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#8a89a3', marginTop: 24, textAlign: 'center', lineHeight: 20 }}>
              {barber.reviewCount > 0
                ? 'Individual review comments are coming soon.'
                : 'No reviews yet — be the first to book and leave one!'}
            </Text>
          </View>
        )}

        {activeTab === 'About' && (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#161c27' }}>About</Text>
            <Text style={{ fontSize: 15, color: '#464554', lineHeight: 23, marginTop: 12 }}>
              {barber.bio || `${title} is on Trimova. Book an appointment to experience their services.`}
            </Text>

            {/* Location */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 18 }}>
              <MapPin size={16} color="#fdb276" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 14, color: '#464554', lineHeight: 20 }}>
                {barber.locationAddress ?? 'Location not set'}
              </Text>
            </View>

            {/* Mobile barber chip */}
            {barber.barberType === 'mobile' && (
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e6f9ee', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Navigation size={13} color="#006d40" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#006d40' }}>
                    Travels up to {barber.serviceRadius ?? '–'} km to you
                  </Text>
                </View>
              </View>
            )}

            {/* Opening times */}
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#161c27', marginTop: 28, marginBottom: 14 }}>
              Opening times
            </Text>
            {barber.workingHours && barber.workingHours.length > 0 ? (
              barber.workingHours.map((d) => {
                const isToday = d.day === todayName;
                return (
                  <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.isOpen ? '#4CD964' : '#E2E8F0', marginRight: 14 }} />
                    <Text style={{ flex: 1, fontSize: 15.5, fontWeight: isToday ? '800' : '500', color: '#161c27' }}>{d.day}</Text>
                    <Text style={{ fontSize: 15, fontWeight: isToday ? '800' : '500', color: d.isOpen ? '#161c27' : '#8a89a3' }}>
                      {d.isOpen ? `${fmt12(d.openTime)} – ${fmt12(d.closeTime)}` : 'Closed'}
                    </Text>
                  </View>
                );
              })
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color="#8a89a3" />
                <Text style={{ fontSize: 13, color: '#8a89a3' }}>Opening times not set yet.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky booking bar ─────────────────────────────────── */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', '#ffffff']}
          style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: insets.bottom + 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Text style={{ flex: 1, fontSize: 14, color: '#464554', fontWeight: '600' }}>
            {services.length} service{services.length === 1 ? '' : 's'} available
          </Text>
          <Pressable
            onPress={handleBook}
            style={{ backgroundColor: '#161c27', borderRadius: 999, paddingHorizontal: 32, paddingVertical: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 }}
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
