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
  Clock,
  Tag,
  ChevronRight,
  MapPin,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Layout constants ─────────────────────────────────────────────────────────

const AVATAR_SIZE   = 84;
const AVATAR_BORDER = 5;    // white ring thickness
const AVATAR_TOTAL  = AVATAR_SIZE + AVATAR_BORDER * 2; // 94 px

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-2 ml-1">
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
}

function MenuRow({ icon, title, subtitle, onPress, isLast = false }: MenuRowProps) {
  return (
    <>
      <Pressable
        onPress={onPress}
        className="flex-row items-center px-4 py-3.5 gap-3 active:bg-neutral-50"
      >
        <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-neutral-800">{title}</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">{subtitle}</Text>
        </View>
        <ChevronRight size={16} color="#CBD5E0" />
      </Pressable>
      {!isLast && <View className="h-px bg-neutral-100 mx-4" />}
    </>
  );
}

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <SectionLabel>{label}</SectionLabel>
      <View
        className="bg-white rounded-2xl overflow-hidden"
        style={{
          borderWidth:   1,
          borderColor:   '#E2E8F0',
          shadowColor:   '#1A202C',
          shadowOffset:  { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius:  4,
          elevation:     2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberProfileScreen() {
  const insets                  = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { user, logout }        = useAuthStore();
  const barber                  = user as BarberProfile | null;
  const [showSignOut, setShowSignOut] = useState(false);

  // Cover photo occupies the top ~22 % of usable screen height + safe-area top
  const COVER_H = Math.round(screenHeight * 0.22) + insets.top;

  const initials = (user?.fullName ?? 'B')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  function handleSignOut() {
    logout();
    router.replace('/(auth)/login');
  }

  // ── Inline avatar (uses accent blue, not the primary orange of Avatar.tsx) ──
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
          width:           AVATAR_SIZE,
          height:          AVATAR_SIZE,
          borderRadius:    AVATAR_SIZE / 2,
          backgroundColor: '#3c3cb9',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700' }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-neutral-50"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover photo + avatar + metadata ──────────────────── */}
        <View>
          {/* Cover photo */}
          {barber?.coverPhotoUrl ? (
            <ImageBackground
              source={{ uri: barber.coverPhotoUrl }}
              style={{ height: COVER_H }}
              resizeMode="cover"
            >
              {/* Subtle dark overlay for legibility */}
              <View
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
              />
            </ImageBackground>
          ) : (
            /* Placeholder — two-layer deep-purple-to-lavender blob */
            <View style={{ height: COVER_H, backgroundColor: '#2D27A8', overflow: 'hidden' }}>
              {/* Large decorative blob — simulates the gradient orb from the screenshots */}
              <View
                style={{
                  position:        'absolute',
                  width:           COVER_H * 1.8,
                  height:          COVER_H * 1.8,
                  borderRadius:    COVER_H,
                  backgroundColor: '#7B5BC4',
                  opacity:         0.55,
                  top:             -COVER_H * 0.7,
                  right:           -COVER_H * 0.3,
                }}
              />
              <View
                style={{
                  position:        'absolute',
                  width:           COVER_H,
                  height:          COVER_H,
                  borderRadius:    COVER_H / 2,
                  backgroundColor: '#C084FC',
                  opacity:         0.25,
                  bottom:          -COVER_H * 0.3,
                  left:            -COVER_H * 0.1,
                }}
              />
            </View>
          )}

          {/* White content card
              Pulled up by AVATAR_TOTAL/2 so the avatar straddles the cover/card boundary.
              The avatar sits at y=0 within this card; its top half is visually "above"
              the card's own top edge and renders over the cover (higher z-order). */}
          <View
            className="bg-white items-center pb-6"
            style={{
              marginTop:          -(AVATAR_TOTAL / 2),
              borderTopLeftRadius:  28,
              borderTopRightRadius: 28,
            }}
          >
            {/* Avatar with white border ring */}
            <View
              style={{
                width:           AVATAR_TOTAL,
                height:          AVATAR_TOTAL,
                borderRadius:    AVATAR_TOTAL / 2,
                backgroundColor: '#ffffff',
                alignItems:      'center',
                justifyContent:  'center',
                shadowColor:     '#1A202C',
                shadowOffset:    { width: 0, height: 3 },
                shadowOpacity:   0.14,
                shadowRadius:    10,
                elevation:       6,
              }}
            >
              <ProfileAvatar />
            </View>

            {/* Name */}
            <Text className="text-2xl font-bold text-neutral-800 mt-4 text-center px-6">
              {user?.fullName ?? 'Barber Name'}
            </Text>

            {/* Shop name */}
            {barber?.businessName && (
              <Text className="text-sm font-semibold text-neutral-500 mt-1 text-center">
                {barber.businessName}
              </Text>
            )}

            {/* Location */}
            <View className="flex-row items-center gap-1.5 mt-2">
              <MapPin size={13} color="#A0AEC0" />
              <Text className="text-sm text-neutral-400">
                {barber?.location?.address ?? 'East Legon, Accra'}
              </Text>
            </View>

            {/* Rating pill */}
            {barber?.rating != null && barber.rating > 0 && (
              <View className="flex-row items-center gap-1.5 mt-3 bg-neutral-100 px-3 py-1.5 rounded-full">
                <Star size={12} color="#D69E2E" fill="#D69E2E" />
                <Text className="text-xs font-bold text-neutral-700">
                  {barber.rating.toFixed(1)}
                </Text>
                <Text className="text-xs text-neutral-500">
                  ({barber.reviewCount ?? 0} reviews)
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Section cards ─────────────────────────────────────── */}
        <View className="px-4 mt-5">

          {/* Account */}
          <SectionCard label="Account">
            <MenuRow
              icon={<User size={17} color="#3c3cb9" />}
              title="Personal Info"
              subtitle="Edit profile & social links"
              onPress={() => {}}
            />
            <MenuRow
              icon={<Building2 size={17} color="#3c3cb9" />}
              title="Business Details"
              subtitle="Edit business details"
              onPress={() => {}}
            />
            <MenuRow
              icon={<Layers size={17} color="#3c3cb9" />}
              title="Portfolio"
              subtitle="Showcase your work"
              onPress={() => {}}
            />
            <MenuRow
              icon={<Star size={17} color="#3c3cb9" />}
              title="Reviews & Ratings"
              subtitle="Client feedback & scores"
              onPress={() => {}}
              isLast
            />
          </SectionCard>

          {/* Work */}
          <SectionCard label="Work">
            <MenuRow
              icon={<Scissors size={17} color="#3c3cb9" />}
              title="Services"
              subtitle="Manage your services & pricing"
              onPress={() => {}}
            />
            <MenuRow
              icon={<BarChart3 size={17} color="#3c3cb9" />}
              title="Statistics"
              subtitle="Revenue, bookings & trends"
              onPress={() => {}}
            />
            <MenuRow
              icon={<Clock size={17} color="#3c3cb9" />}
              title="History"
              subtitle="Past appointments"
              onPress={() => {}}
              isLast
            />
          </SectionCard>

          {/* Marketing & Growth */}
          <SectionCard label="Marketing & Growth">
            <MenuRow
              icon={<Tag size={17} color="#3c3cb9" />}
              title="Loyalty Programs"
              subtitle="Configure flash promotions and client digital stamp cards"
              onPress={() => router.push('/loyalty' as any)}
              isLast
            />
          </SectionCard>

          {/* Sign out */}
          <Pressable
            onPress={() => setShowSignOut(true)}
            className="flex-row items-center justify-center gap-2 bg-white rounded-2xl py-4 mb-5 active:opacity-70"
            style={{
              borderWidth:   1,
              borderColor:   '#FED7D7',
              shadowColor:   '#1A202C',
              shadowOffset:  { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius:  4,
              elevation:     1,
            }}
          >
            <LogOut size={16} color="#E53E3E" />
            <Text className="text-sm font-bold text-danger">Sign Out</Text>
          </Pressable>

          <Text className="text-center text-xs text-neutral-300 pb-2">
            Trimova v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Sign-out confirmation */}
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
