import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ImageBackground,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User,
  Building2,
  Layers,
  Star,
  Scissors,
  BarChart3,
  Tag,
  ChevronRight,
  MapPin,
  LogOut,
  Calendar,
  CreditCard,
  Settings2,
  Archive,
  TrendingUp,
  Navigation,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import type { BarberProfile } from '@/types/user';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// Mock analytics until the real endpoints exist.
// Owner's monthly commission-tier progress (mirrors Platform Rewards).
const TIER = { name: 'Silver' as 'Bronze' | 'Silver' | 'Gold', fee: '7%', cuts: 175, nextName: 'Gold', nextAt: 301, nextFee: '5%' };

// Medal artwork + fill color per tier (assets: bronze.jpg / silver.jpg / gold.jpg).
const TIER_ART: Record<'Bronze' | 'Silver' | 'Gold', { img: number; fill: string }> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Bronze: { img: require('../../../assets/bronze.jpg'), fill: '#CD7F32' },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Silver: { img: require('../../../assets/silver.jpg'), fill: '#9BA3AF' },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Gold:   { img: require('../../../assets/gold.jpg'),   fill: '#D4A017' },
};

// ─── Layout constants ─────────────────────────────────────────────────────────

const AVATAR_SIZE   = 84;
const AVATAR_BORDER = 5;
const AVATAR_TOTAL  = AVATAR_SIZE + AVATAR_BORDER * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children, c }: { children: string; c: ThemeColors }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
      {children}
    </Text>
  );
}

interface MenuRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLast?: boolean;
  c: ThemeColors;
}

function MenuRow({ icon, title, subtitle, onPress, isLast = false, c }: MenuRowProps) {
  return (
    <>
      <Pressable
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 8 }}
        className="active:opacity-70"
      >
        <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.text }}>{title}</Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{subtitle}</Text>
        </View>
        <ChevronRight size={20} color={c.textFaint} />
      </Pressable>
      {!isLast && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 44 }} />}
    </>
  );
}

function SectionCard({ label, children, c }: { label: string; children: React.ReactNode; c: ThemeColors }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionLabel c={c}>{label}</SectionLabel>
      <View>
        {children}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberProfileScreen() {
  const insets                  = useSafeAreaInsets();
  const c                       = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();
  const { user, logout }        = useAuthStore();
  const barber                  = user as BarberProfile | null;
  const [showSignOut, setShowSignOut] = useState(false);

  const COVER_H = Math.round(screenHeight * 0.22) + insets.top;

  const initials = (user?.fullName ?? 'B')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  async function handleSignOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  function ProfileAvatar() {
    if (user?.avatarUrl) {
      return (
        <Image
          source={{ uri: user.avatarUrl }}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={{
          width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
          backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700' }}>{initials}</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover photo + avatar + metadata ──────────────────── */}
        <View>
          {barber?.coverPhotoUrl ? (
            <ImageBackground
              source={{ uri: barber.coverPhotoUrl }}
              style={{ height: COVER_H }}
              resizeMode="cover"
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} />
            </ImageBackground>
          ) : (
            <View style={{ height: COVER_H, backgroundColor: '#2D27A8', overflow: 'hidden' }}>
              <View
                style={{
                  position: 'absolute', width: COVER_H * 1.8, height: COVER_H * 1.8,
                  borderRadius: COVER_H, backgroundColor: '#7B5BC4', opacity: 0.55,
                  top: -COVER_H * 0.7, right: -COVER_H * 0.3,
                }}
              />
              <View
                style={{
                  position: 'absolute', width: COVER_H, height: COVER_H,
                  borderRadius: COVER_H / 2, backgroundColor: '#C084FC', opacity: 0.25,
                  bottom: -COVER_H * 0.3, left: -COVER_H * 0.1,
                }}
              />
            </View>
          )}

          {/* White content card */}
          <View
            style={{
              backgroundColor: c.surface, alignItems: 'center', paddingBottom: 24,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingTop: AVATAR_TOTAL / 2 + 16,
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: c.text, textAlign: 'center', paddingHorizontal: 24 }}>
              {user?.fullName ?? 'Barber Name'}
            </Text>

            {barber?.businessName && (
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.textMuted, marginTop: 4, textAlign: 'center' }}>
                {barber.businessName}
              </Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <MapPin size={13} color={c.textFaint} />
              <Text style={{ fontSize: 14, color: c.textFaint }}>
                {barber?.location?.address ?? 'No location set'}
              </Text>
            </View>

            {barber?.rating != null && barber.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: c.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                <Star size={12} color={c.warning} fill={c.warning} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.text }}>{barber.rating.toFixed(1)}</Text>
                <Text style={{ fontSize: 12, color: c.textMuted }}>({barber.reviewCount ?? 0} reviews)</Text>
              </View>
            )}
          </View>

          {/* Avatar */}
          <View
            style={{
              position: 'absolute', top: COVER_H - AVATAR_TOTAL / 2, left: 0, right: 0,
              alignItems: 'center', zIndex: 20,
            }}
          >
            <View
              style={{
                width: AVATAR_TOTAL, height: AVATAR_TOTAL, borderRadius: AVATAR_TOTAL / 2,
                backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 8,
              }}
            >
              <ProfileAvatar />
            </View>
          </View>
        </View>

        {/* ── Section cards ─────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>

          {/* Monthly tier progress summary → Platform Rewards */}
          {(() => {
            const toNext = Math.max(0, TIER.nextAt - TIER.cuts);
            const pct = Math.min(1, TIER.cuts / TIER.nextAt);
            const art = TIER_ART[TIER.name];
            return (
              <Pressable
                onPress={() => router.push('/platform-rewards' as any)}
                style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 16 }}
                className="active:opacity-80"
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Tier medal artwork */}
                  <Image
                    source={art.img}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: c.text }}>{TIER.name} Tier · {TIER.fee} commission</Text>
                    <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>Your monthly progress</Text>
                  </View>
                  <ChevronRight size={18} color={c.textFaint} />
                </View>

                {/* Progress bar filled in the tier's own color */}
                <View style={{ height: 8, borderRadius: 999, backgroundColor: c.surfaceAlt, marginTop: 14, overflow: 'hidden' }}>
                  <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: art.fill, borderRadius: 999 }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <TrendingUp size={13} color={art.fill} />
                  <Text style={{ fontSize: 12, color: c.textMuted, flex: 1 }}>
                    {toNext} more booking{toNext === 1 ? '' : 's'} to reach {TIER.nextName} ({TIER.nextFee} fee)
                  </Text>
                </View>
              </Pressable>
            );
          })()}

          <SectionCard label="Account" c={c}>
            <MenuRow c={c} icon={<User size={20} color={c.textMuted} />} title="Personal Info" subtitle="Edit profile & social links" onPress={() => router.push('/personal-info' as any)} />
            <MenuRow c={c} icon={<Building2 size={20} color={c.textMuted} />} title="Business Details" subtitle="Shop info, address & cover photo" onPress={() => router.push('/business-details' as any)} />
            <MenuRow c={c} icon={<Layers size={20} color={c.textMuted} />} title="Portfolio" subtitle="Showcase your work" onPress={() => router.push('/portfolio' as any)} />
            <MenuRow c={c} icon={<Star size={20} color={c.textMuted} />} title="Reviews & Ratings" subtitle="Client feedback & scores" onPress={() => router.push('/reviews' as any)} />
            <MenuRow c={c} icon={<CreditCard size={20} color={c.textMuted} />} title="Payout Method" subtitle="Mobile Money & bank payouts" onPress={() => router.push('/payout' as any)} isLast />
          </SectionCard>

          {/* Mobile barbers field travel requests from out-of-range clients */}
          {barber?.barberType === 'mobile' && (
            <SectionCard label="Requests" c={c}>
              <MenuRow
                c={c}
                icon={<Navigation size={20} color={c.textMuted} />}
                title="Travel Requests"
                subtitle="Clients outside your travel range"
                onPress={() => router.push('/booking-requests' as any)}
                isLast
              />
            </SectionCard>
          )}

          <SectionCard label="Work" c={c}>
            <MenuRow c={c} icon={<Scissors size={20} color={c.textMuted} />} title="Services" subtitle="Manage your services & pricing" onPress={() => router.push('/services' as any)} />
            <MenuRow c={c} icon={<Calendar size={20} color={c.textMuted} />} title="Schedule" subtitle="Working hours & day availability" onPress={() => router.push('/schedule' as any)} />
            <MenuRow c={c} icon={<BarChart3 size={20} color={c.textMuted} />} title="Statistics" subtitle="Revenue, bookings & trends" onPress={() => router.push('/statistics' as any)} />
            <MenuRow c={c} icon={<Archive size={20} color={c.textMuted} />} title="History" subtitle="Past appointments" onPress={() => router.push('/history' as any)} isLast />
          </SectionCard>

          <SectionCard label="Marketing & Growth" c={c}>
            <MenuRow c={c} icon={<Tag size={20} color={c.textMuted} />} title="Loyalty Programs" subtitle="Flash promotions & digital stamp cards" onPress={() => router.push('/loyalty' as any)} isLast />
          </SectionCard>

          <SectionCard label="Preferences" c={c}>
            <MenuRow c={c} icon={<Settings2 size={20} color={c.textMuted} />} title="Settings" subtitle="Appearance, notifications & security" onPress={() => router.push('/settings' as any)} isLast />
          </SectionCard>

          <Text style={{ textAlign: 'center', fontSize: 12, color: c.textFaint, paddingBottom: 8 }}>
            Trimova v1.0.0
          </Text>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showSignOut}
        onClose={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="warning"
      />
    </>
  );
}
