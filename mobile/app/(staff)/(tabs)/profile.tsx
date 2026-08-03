import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  User, Scissors, Calendar, Layers, Star, BarChart3, Settings2,
  ChevronRight, LogOut, ShieldAlert,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function Row({ icon, title, subtitle, onPress, isLast, c }: {
  icon: React.ReactNode; title: string; subtitle: string;
  onPress: () => void; isLast?: boolean; c: ThemeColors;
}) {
  return (
    <>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 }} className="active:opacity-70">
        <View style={{ width: 36, alignItems: 'center' }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '600', color: c.text }}>{title}</Text>
          <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 1 }}>{subtitle}</Text>
        </View>
        <ChevronRight size={19} color={c.textFaint} />
      </Pressable>
      {!isLast && <View style={{ height: 1, backgroundColor: c.border, marginLeft: 46 }} />}
    </>
  );
}

function SectionLabel({ children, c }: { children: string; c: ThemeColors }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 18 }}>
      {children}
    </Text>
  );
}

/**
 * Staff profile — their OWN settings only.
 *
 * Intentionally absent (owner/admin only): payout method, shop statistics,
 * staff management, business details, loyalty programs, platform rewards,
 * and shop/account deletion.
 */
export default function StaffProfileScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, logout } = useAuthStore();
  const [showSignOut, setShowSignOut] = useState(false);

  const initials = (user?.fullName ?? 'S')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  async function handleSignOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 44 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ backgroundColor: '#2D27A8', paddingTop: insets.top + 16, paddingBottom: 26, alignItems: 'center', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7B5BC4', opacity: 0.45, top: -90, right: -50 }} />
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }} />
          ) : (
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' }}>
              <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>{initials}</Text>
            </View>
          )}
          <Text style={{ fontSize: 21, fontWeight: '800', color: '#ffffff', marginTop: 12 }}>{user?.fullName}</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 }}>STAFF BARBER</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <SectionLabel c={c}>My profile</SectionLabel>
          <Row c={c} icon={<User size={20} color={c.textMuted} />} title="Personal Info" subtitle="Name, photo & contact details" onPress={() => router.push('/personal-info' as never)} />
          <Row c={c} icon={<Layers size={20} color={c.textMuted} />} title="Portfolio" subtitle="Showcase your own work" onPress={() => router.push('/portfolio' as never)} />
          <Row c={c} icon={<Star size={20} color={c.textMuted} />} title="My Reviews" subtitle="Feedback from your clients" onPress={() => router.push('/reviews' as never)} isLast />

          <SectionLabel c={c}>My work</SectionLabel>
          <Row c={c} icon={<Scissors size={20} color={c.textMuted} />} title="My Services" subtitle="Services you personally offer" onPress={() => router.push('/services' as never)} />
          <Row c={c} icon={<Calendar size={20} color={c.textMuted} />} title="My Schedule" subtitle="Your working hours & availability" onPress={() => router.push('/schedule' as never)} />
          <Row c={c} icon={<BarChart3 size={20} color={c.textMuted} />} title="My Performance" subtitle="Your own bookings & ratings" onPress={() => router.push('/statistics' as never)} isLast />

          <SectionLabel c={c}>Preferences</SectionLabel>
          <Row c={c} icon={<Settings2 size={20} color={c.textMuted} />} title="Settings" subtitle="Appearance, notifications & security" onPress={() => router.push('/settings' as never)} isLast />

          {/* Why some things aren't here */}
          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 14, marginTop: 20 }}>
            <ShieldAlert size={17} color={c.textFaint} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12.5, color: c.textMuted, lineHeight: 18 }}>
              Payouts, shop-wide statistics, staff management and business settings are handled
              by the shop owner.
            </Text>
          </View>

          <Pressable
            onPress={() => setShowSignOut(true)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: c.surface, borderRadius: 16, paddingVertical: 16, marginTop: 18,
              borderWidth: 1, borderColor: c.isDark ? '#5A2424' : '#FED7D7',
            }}
            className="active:opacity-70"
          >
            <LogOut size={19} color={c.danger} />
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.danger }}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showSignOut}
        onClose={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="warning"
      />
    </>
  );
}
