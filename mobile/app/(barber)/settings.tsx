import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Bell,
  Shield,
  RefreshCw,
  Trash2,
  X,
  Check,
  LogOut,
  CalendarClock,
  Scissors,
  Trophy,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { authService } from '@/services/auth';

// ─── Mock shops for the workspace switcher ─────────────────────────────────────

const MOCK_SHOPS = [
  { id: 'shop_1', name: 'A4N Cutz – East Legon', location: 'East Legon, Accra', isActive: true },
  { id: 'shop_2', name: 'A4N Cutz – Kumasi',     location: 'Adum, Kumasi',       isActive: false },
  { id: 'shop_3', name: 'Royale Cuts & Grooming', location: 'Osu, Accra',        isActive: false },
];

// ─── Row components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  const c = useThemeColors();
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
      {children}
    </Text>
  );
}

function SettingsRow({
  icon, label, subtitle, onPress, right, danger = false, isLast = false,
}: {
  icon: React.ReactNode; label: string; subtitle?: string;
  onPress?: () => void; right?: React.ReactNode; danger?: boolean; isLast?: boolean;
}) {
  const c = useThemeColors();
  return (
    <>
      <Pressable
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}
        className={onPress ? 'active:opacity-70' : undefined}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? (c.isDark ? '#3A1B1B' : '#FED7D7') : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? c.danger : c.text }}>{label}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>{subtitle}</Text>}
        </View>
        {right ?? (onPress ? <ChevronRight size={16} color={c.textFaint} /> : null)}
      </Pressable>
      {!isLast && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
    </>
  );
}

// ─── Workspace switcher modal ─────────────────────────────────────────────────

function WorkspaceSwitcherModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [activeShopId, setActiveShopId] = useState('shop_1');

  function switchShop(id: string) {
    setActiveShopId(id);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Switch Shop</Text>
          <Pressable onPress={onClose} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
        </View>

        {MOCK_SHOPS.map((shop, i) => {
          const isActive = shop.id === activeShopId;
          return (
            <View key={shop.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 20 }} />}
              <Pressable
                onPress={() => switchShop(shop.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 }}
              >
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: isActive ? c.accent : c.surfaceAlt,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: isActive ? '#fff' : c.textFaint }}>
                    {shop.name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{shop.name}</Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>{shop.location}</Text>
                </View>
                {isActive && (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 12, color: c.textFaint, textAlign: 'center', lineHeight: 18 }}>
            Switching shops updates your entire workspace — bookings, staff, and services — instantly.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { logout, user, mergeUser } = useAuthStore();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  // Bookable toggle — shop-linked barbers only (freelancers are always bookable).
  const u = user as (typeof user & { isBookable?: boolean; barberType?: string }) | null;
  const isFreelance = u?.barberType === 'mobile';
  const [bookable, setBookable] = useState(u?.isBookable ?? true);
  const [savingBookable, setSavingBookable] = useState(false);

  async function toggleBookable(next: boolean) {
    setBookable(next); // optimistic
    setSavingBookable(true);
    try {
      const res = await authService.updateProfile({ isBookable: next });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
    } catch {
      setBookable(!next); // revert on failure
    } finally {
      setSavingBookable(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  const cardStyle = {
    backgroundColor: c.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: c.isDark ? 0.2 : 0.04,
    shadowRadius: 4,
    elevation: 1,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Settings</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Appearance, account & security</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Personalisation */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Personalisation</SectionLabel>
          <View style={cardStyle}>
            <SettingsRow
              icon={<Moon size={17} color={c.accent} />}
              label="Appearance"
              subtitle="Light & dark mode"
              onPress={() => router.push('/appearance' as any)}
            />
            <SettingsRow
              icon={<Bell size={17} color={c.accent} />}
              label="Push Notifications"
              subtitle="Manage notification preferences"
              onPress={() => router.push('/notifications' as any)}
              isLast
            />
          </View>
        </View>

        {/* Scheduling */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Scheduling</SectionLabel>
          <View style={cardStyle}>
            <SettingsRow
              icon={<CalendarClock size={17} color={c.accent} />}
              label="Booking Rules"
              subtitle="How far ahead clients can book & reschedule"
              onPress={() => router.push('/booking-rules' as any)}
              isLast={isFreelance}
            />
            {!isFreelance && (
              <SettingsRow
                icon={<Scissors size={17} color={c.accent} />}
                label="Bookable Status"
                subtitle={bookable ? 'Clients can book you directly' : 'Admin only — not bookable'}
                right={
                  <Switch
                    value={bookable}
                    onValueChange={toggleBookable}
                    disabled={savingBookable}
                    trackColor={{ false: c.border, true: c.accent }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={c.border}
                  />
                }
                isLast
              />
            )}
          </View>
        </View>

        {/* Growth */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Growth</SectionLabel>
          <View style={cardStyle}>
            <SettingsRow
              icon={<Trophy size={17} color={c.accent} />}
              label="Platform Rewards"
              subtitle="Commission tiers & search ranking boost"
              onPress={() => router.push('/platform-rewards' as any)}
              isLast
            />
          </View>
        </View>

        {/* Account */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Account</SectionLabel>
          <View style={cardStyle}>
            <SettingsRow
              icon={<Shield size={17} color={c.accent} />}
              label="Login & Security"
              subtitle="Change password, 2FA"
              onPress={() => router.push('/security' as any)}
            />
            <SettingsRow
              icon={<RefreshCw size={17} color={c.accent} />}
              label="Switch Shop"
              subtitle="Change active workspace"
              onPress={() => setShowSwitcher(true)}
              isLast
            />
          </View>
        </View>

        {/* Danger zone */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Danger Zone</SectionLabel>
          <View style={{ ...cardStyle, borderColor: c.isDark ? '#5A2424' : '#FED7D7' }}>
            <SettingsRow
              icon={<Trash2 size={17} color={c.danger} />}
              label="Delete Account"
              subtitle="Permanently destroy your account and data"
              onPress={() => router.push('/delete-account' as any)}
              danger
              isLast
            />
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={() => setShowSignOut(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: c.surface, borderRadius: 16, paddingVertical: 16,
            borderWidth: 1, borderColor: c.isDark ? '#5A2424' : '#FED7D7',
          }}
          className="active:opacity-70"
        >
          <LogOut size={19} color={c.danger} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: c.danger }}>Sign Out</Text>
        </Pressable>

      </ScrollView>

      <WorkspaceSwitcherModal visible={showSwitcher} onClose={() => setShowSwitcher(false)} />

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
    </View>
  );
}
