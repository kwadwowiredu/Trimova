import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Switch,
  Platform,
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
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

// ─── Mock shops for the workspace switcher ─────────────────────────────────────

const MOCK_SHOPS = [
  { id: 'shop_1', name: 'A4N Cutz – East Legon', location: 'East Legon, Accra', isActive: true },
  { id: 'shop_2', name: 'A4N Cutz – Kumasi',     location: 'Adum, Kumasi',       isActive: false },
  { id: 'shop_3', name: 'Royale Cuts & Grooming', location: 'Osu, Accra',        isActive: false },
];

// ─── Row components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
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
  return (
    <>
      <Pressable
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}
        className={onPress ? 'active:opacity-70' : undefined}
      >
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? '#FED7D7' : '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: danger ? '#E53E3E' : '#1A202C' }}>{label}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 1 }}>{subtitle}</Text>}
        </View>
        {right ?? (onPress ? <ChevronRight size={16} color="#CBD5E0" /> : null)}
      </Pressable>
      {!isLast && <View style={{ height: 1, backgroundColor: '#f1f2f3', marginHorizontal: 16 }} />}
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
  const [activeShopId, setActiveShopId] = useState('shop_1');

  function switchShop(id: string) {
    setActiveShopId(id);
    // TODO: update global context activeShopId and refetch workspace data
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A202C' }}>Switch Shop</Text>
          <Pressable onPress={onClose} hitSlop={10}><X size={22} color="#4A5568" /></Pressable>
        </View>

        {MOCK_SHOPS.map((shop, i) => {
          const isActive = shop.id === activeShopId;
          return (
            <View key={shop.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: '#f1f2f3', marginHorizontal: 20 }} />}
              <Pressable
                onPress={() => switchShop(shop.id)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 }}
              >
                <View style={{
                  width: 46, height: 46, borderRadius: 14,
                  backgroundColor: isActive ? '#3c3cb9' : '#f1f2f3',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: isActive ? '#fff' : '#A0AEC0' }}>
                    {shop.name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C' }}>{shop.name}</Text>
                  <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 1 }}>{shop.location}</Text>
                </View>
                {isActive && (
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <Text style={{ fontSize: 12, color: '#A0AEC0', textAlign: 'center', lineHeight: 18 }}>
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
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Personalisation */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Personalisation</SectionLabel>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
            <SettingsRow
              icon={<Moon size={17} color="#3c3cb9" />}
              label="Appearance"
              subtitle="Light & dark mode"
              onPress={() => router.push('/appearance' as any)}
            />
            <SettingsRow
              icon={<Bell size={17} color="#3c3cb9" />}
              label="Push Notifications"
              subtitle="Manage notification preferences"
              onPress={() => router.push('/notifications' as any)}
              isLast
            />
          </View>
        </View>

        {/* Account */}
        <View style={{ marginBottom: 20 }}>
          <SectionLabel>Account</SectionLabel>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
            <SettingsRow
              icon={<Shield size={17} color="#3c3cb9" />}
              label="Login & Security"
              subtitle="Change password, 2FA"
              onPress={() => router.push('/security' as any)}
            />
            <SettingsRow
              icon={<RefreshCw size={17} color="#3c3cb9" />}
              label="Switch Shop"
              subtitle="Change active workspace"
              onPress={() => setShowSwitcher(true)}
              isLast
            />
          </View>
        </View>

        {/* Danger zone */}
        <View>
          <SectionLabel>Danger Zone</SectionLabel>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#FED7D7', overflow: 'hidden' }}>
            <SettingsRow
              icon={<Trash2 size={17} color="#E53E3E" />}
              label="Delete Account"
              subtitle="Permanently destroy your account and data"
              onPress={() => router.push('/delete-account' as any)}
              danger
              isLast
            />
          </View>
        </View>

      </ScrollView>

      <WorkspaceSwitcherModal visible={showSwitcher} onClose={() => setShowSwitcher(false)} />
    </View>
  );
}
