import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Switch,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { UserPlus, Star, X, Bell } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { CompleteProfileBanner, isProfileIncomplete } from '@/components/barber/CompleteProfileBanner';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import type { BarberProfile } from '@/types/user';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  rating: number;
  avatarUrl: string | null;
  isActive: boolean;
  totalAppointments: number;
  revenueThisMonth: number; // GHS
  phoneNumber: string;
  email: string;
  joinedDate: string; // ISO
  assignedServices: string[];
}

// ─── Mock data (replace with useQuery / API) ──────────────────────────────────

export const MOCK_STAFF: StaffMember[] = [
  { id: '1', name: 'Kwame Mensah', role: 'Master Barber', rating: 4.9, avatarUrl: null, isActive: true,  totalAppointments: 48, revenueThisMonth: 1200, phoneNumber: '+233 24 123 4567', email: 'kwame.mensah@example.com', joinedDate: '2025-01-15', assignedServices: ['Executive Fade', 'Haircut & Beard', 'Skin Fade'] },
  { id: '2', name: 'Kofi Asare',   role: 'Staff Barber',  rating: 4.7, avatarUrl: null, isActive: false, totalAppointments: 32, revenueThisMonth: 800,  phoneNumber: '+233 20 987 6543', email: 'kofi.asare@example.com',  joinedDate: '2025-03-10', assignedServices: ['Haircut & Beard', 'Beard Trim'] },
  { id: '3', name: 'Ama Boateng',  role: 'Staff Barber',  rating: 4.5, avatarUrl: null, isActive: true,  totalAppointments: 21, revenueThisMonth: 520,  phoneNumber: '+233 55 456 7890', email: 'ama.boateng@example.com', joinedDate: '2025-05-22', assignedServices: ['Beard Trim', 'Shampoo & Style'] },
  { id: '4', name: 'Yaw Darko',    role: 'Staff Barber',  rating: 4.3, avatarUrl: null, isActive: true,  totalAppointments: 14, revenueThisMonth: 340,  phoneNumber: '+233 27 321 0987', email: 'yaw.darko@example.com',  joinedDate: '2026-02-01', assignedServices: ['Haircut & Beard'] },
];

// ─── Square avatar ────────────────────────────────────────────────────────────

function SquareAvatar({ uri, name, size = 60, c }: { uri: string | null; name: string; size?: number; c: ThemeColors }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 12 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#ffffff', fontSize: Math.round(size * 0.33), fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─── Add Staff modal ──────────────────────────────────────────────────────────

function AddStaffModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useThemeColors();
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [nameError, setNameError]   = useState('');
  const [emailError, setEmailError] = useState('');

  function handleSend() {
    let valid = true;
    if (!name.trim()) { setNameError('Full name is required'); valid = false; } else setNameError('');
    if (!email.trim()) { setEmailError('Email address is required'); valid = false; }
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setEmailError('Enter a valid email address'); valid = false; }
    else setEmailError('');
    if (!valid) return;
    // TODO: POST /api/barbers/me/staff/invite  { name, email, phone }
    handleClose();
  }

  function handleClose() {
    setName(''); setEmail(''); setPhone(''); setNameError(''); setEmailError('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={handleClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="absolute bottom-0 left-0 right-0">
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12 }}>
          {/* Handle */}
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 20 }} />

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 mb-6">
            <Text style={{ fontSize: 22, fontWeight: '600', color: c.text }}>Add Team Member</Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={24} color={c.textMuted} />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView className="px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="gap-5 pb-2">
              <Input label="NAME *" placeholder="Full name" value={name} onChangeText={setName} error={nameError} autoCapitalize="words" returnKeyType="next" />
              <Input label="EMAIL ADDRESS *" placeholder="staff@email.com" value={email} onChangeText={setEmail} error={emailError} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
              <Input label="PHONE (OPTIONAL)" placeholder="+233 ..." value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="done" />

              {/* Info banner */}
              <View style={{ borderRadius: 16, padding: 16, backgroundColor: '#dfe7fd' }}>
                <Text style={{ fontSize: 14, color: '#003049', lineHeight: 22 }}>
                  An invitation will be sent to this barber's email. If they already have a Trimova account, they will be added to your team immediately.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* CTA */}
          <View className="px-1 pt-4" style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 24 }}>
            <Pressable onPress={handleSend} style={{ backgroundColor: c.accent, borderRadius: 10, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }} className="active:opacity-80">
              <UserPlus size={18} color="white" />
              <Text className="text-white font-bold text-base">Send Invitation</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

/** Subtle diagonal gradient so the cards aren't flat blocks of one color. */
function cardGradient(c: ThemeColors): [string, string, string] {
  return c.isDark ? ['#1F2531', '#212940', '#252E4A'] : ['#ffffff', '#f7f8ff', '#f2e8cf'];
}

function StaffCard({ member, onToggle, onManage, c }: {
  member: StaffMember;
  onToggle: (id: string, value: boolean) => void;
  onManage: (id: string) => void;
  c: ThemeColors;
}) {
  return (
    <LinearGradient
      colors={cardGradient(c)}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={{ borderRadius: 8, borderWidth: 1, borderColor: c.border }}
    >
      {/* Top: avatar + info */}
      <View className="flex-row items-center gap-3 p-4">
        <SquareAvatar uri={member.avatarUrl} name={member.name} size={55} c={c} />
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }} numberOfLines={1}>{member.name}</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>{member.role}</Text>
          <View className="flex-row items-center gap-1 mt-1.5">
            <Star size={12} color="#D69E2E" fill="#D69E2E" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textMuted }}>{member.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />

      {/* Bottom: toggle + manage */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Switch
            value={member.isActive}
            onValueChange={(val) => onToggle(member.id, val)}
            trackColor={{ false: c.border, true: c.success }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.border}
          />
          <Text style={{ fontSize: 11, fontWeight: '600', color: member.isActive ? c.success : c.textFaint }}>
            {member.isActive ? 'Active' : 'Away'}
          </Text>
        </View>

        <Pressable
          onPress={() => onManage(member.id)}
          className="active:opacity-70"
          style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8 }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>Manage</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

// ─── Owner ("You") card ───────────────────────────────────────────────────────
// The shop owner is themselves a bookable barber when they set "Bookable" during
// onboarding (or in Settings). This card reflects that real state and lets them
// flip it here too, so they always see themselves in their own team roster.

function OwnerCard({ user, bookable, saving, onToggle, onManage, c }: {
  user: (BarberProfile & { isBookable?: boolean }) | null;
  bookable: boolean;
  saving: boolean;
  onToggle: (value: boolean) => void;
  onManage: () => void;
  c: ThemeColors;
}) {
  const name = user?.fullName ?? 'You';
  const rating = user?.rating && user.rating > 0 ? user.rating : 5.0;
  return (
    <LinearGradient
      colors={cardGradient(c)}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={{ borderRadius: 8, borderWidth: 1, borderColor: c.border }}
    >
      <View className="flex-row items-center gap-3 p-4">
        <SquareAvatar uri={user?.avatarUrl ?? null} name={name} size={55} c={c} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }} numberOfLines={1}>{name}</Text>
            <View style={{ backgroundColor: '#dfe7fd', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#003049' }}>YOU · OWNER</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 2 }}>
            {bookable ? 'Bookable barber' : 'Admin only — not bookable'}
          </Text>
          <View className="flex-row items-center gap-1 mt-1.5">
            <Star size={12} color="#D69E2E" fill="#D69E2E" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textMuted }}>{rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />

      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Switch
            value={bookable}
            onValueChange={onToggle}
            disabled={saving}
            trackColor={{ false: c.border, true: c.success }}
            thumbColor="#ffffff"
            ios_backgroundColor={c.border}
          />
          <Text style={{ fontSize: 11, fontWeight: '600', color: bookable ? c.success : c.textFaint }}>
            {bookable ? 'Bookable' : 'Admin only'}
          </Text>
        </View>

        {/* Bookable owners manage themselves like any staff barber (Overview/Workspace) */}
        {bookable && (
          <Pressable
            onPress={onManage}
            className="active:opacity-70"
            style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted }}>Manage</Text>
          </Pressable>
        )}
      </View>
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberStaffScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, mergeUser } = useAuthStore();
  const barber = user as (BarberProfile & { isBookable?: boolean }) | null;
  // Freelance/mobile barbers have no shop team; everyone else is a shop owner.
  const isFreelance = barber?.barberType === 'mobile';

  const [staff, setStaff]            = useState<StaffMember[]>(MOCK_STAFF);
  const [loading, setLoading]        = useState(true);
  const [showAddModal, setShowModal] = useState(false);

  const showBanner = isProfileIncomplete(barber);

  // The owner's own bookable status (from onboarding step 6 / settings).
  const [ownerBookable, setOwnerBookable] = useState(barber?.isBookable ?? true);
  const [savingBookable, setSavingBookable] = useState(false);

  useEffect(() => {
    if (!savingBookable) setOwnerBookable(barber?.isBookable ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggleOwnerBookable(next: boolean) {
    setOwnerBookable(next); // optimistic
    setSavingBookable(true);
    try {
      const res = await authService.updateProfile({ isBookable: next });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
    } catch {
      setOwnerBookable(!next); // revert on failure
    } finally {
      setSavingBookable(false);
    }
  }

  // TODO: replace with the real staff fetch once the staff endpoint exists.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const totalStaff = staff.length;
  const onDuty     = staff.filter((m) => m.isActive).length;

  function handleToggle(id: string, value: boolean) {
    setStaff((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: value } : m)));
  }

  function handleManage(id: string) {
    router.push(`/staff/${id}` as any);
  }

  const statCard = {
    flex: 1, backgroundColor: c.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: c.border,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── Complete-profile banner (very top, full width, static) ── */}
      <CompleteProfileBanner insetTop={insets.top} />

      {/* ── Purple decorative header ─────────────────────────── */}
      <View style={{ backgroundColor: '#2D27A8', paddingTop: showBanner ? 0 : insets.top, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7B5BC4', opacity: 0.5, top: -80, right: -40 }} />
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#C084FC', opacity: 0.22, bottom: -40, left: -20 }} />

        <View className="flex-row items-center justify-between px-5 pt-3 pb-5">
          <View className="flex-1 mr-3">
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Staff Management</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Manage your team and track performance.</Text>
          </View>
          <Pressable className="relative p-1" hitSlop={10}>
            <Bell size={22} color="rgba(255,255,255,0.9)" />
            <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-2 border-white" />
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable content ─────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-5 pt-5 gap-4">

          {/* Add Staff button */}
          <Pressable
            onPress={() => setShowModal(true)}
            style={{ backgroundColor: c.accent, borderRadius: 8, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
            className="active:opacity-80"
          >
            <UserPlus size={18} color="#cddafd" />
            <Text className="text-[#cddafd] font-bold text-[15px]">Add Staff</Text>
          </Pressable>

          {/* Stats row */}
          <View className="flex-row gap-3">
            <View style={statCard}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' }}>Total Staff</Text>
              {loading ? <View style={{ marginTop: 8 }}><Skeleton width={40} height={22} /></View>
                : <Text style={{ fontSize: 24, fontWeight: '600', color: c.text, marginTop: 4 }}>{totalStaff}</Text>}
            </View>
            <View style={statCard}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.textFaint, letterSpacing: 1.5, textTransform: 'uppercase' }}>On Duty</Text>
              {loading ? <View style={{ marginTop: 8 }}><Skeleton width={40} height={22} /></View>
                : (
                  <View className="flex-row items-center gap-2 mt-1">
                    <Text style={{ fontSize: 24, fontWeight: '600', color: c.text }}>{onDuty}</Text>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.success }} />
                  </View>
                )}
            </View>
          </View>

          {/* Staff list */}
          <View className="gap-3 mt-1">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              <>
                {/* The owner themselves, when they run the shop (not freelancers) */}
                {!isFreelance && (
                  <OwnerCard
                    user={barber}
                    bookable={ownerBookable}
                    saving={savingBookable}
                    onToggle={toggleOwnerBookable}
                    onManage={() => router.push('/staff/owner' as any)}
                    c={c}
                  />
                )}
                {staff.map((member) => (
                  <StaffCard key={member.id} member={member} onToggle={handleToggle} onManage={handleManage} c={c} />
                ))}
              </>
            )}
          </View>

        </View>
      </ScrollView>

      <AddStaffModal visible={showAddModal} onClose={() => setShowModal(false)} />
    </View>
  );
}
