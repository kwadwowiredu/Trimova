import { useState } from 'react';
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
import { UserPlus, Star, X, Bell } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
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
  {
    id: '1',
    name: 'Kwame Mensah',
    role: 'Master Barber',
    rating: 4.9,
    avatarUrl: null,
    isActive: true,
    totalAppointments: 48,
    revenueThisMonth: 1200,
    phoneNumber: '+233 24 123 4567',
    email: 'kwame.mensah@example.com',
    joinedDate: '2025-01-15',
    assignedServices: ['Executive Fade', 'Haircut & Beard', 'Skin Fade'],
  },
  {
    id: '2',
    name: 'Kofi Asare',
    role: 'Staff Barber',
    rating: 4.7,
    avatarUrl: null,
    isActive: false,
    totalAppointments: 32,
    revenueThisMonth: 800,
    phoneNumber: '+233 20 987 6543',
    email: 'kofi.asare@example.com',
    joinedDate: '2025-03-10',
    assignedServices: ['Haircut & Beard', 'Beard Trim'],
  },
  {
    id: '3',
    name: 'Ama Boateng',
    role: 'Staff Barber',
    rating: 4.5,
    avatarUrl: null,
    isActive: true,
    totalAppointments: 21,
    revenueThisMonth: 520,
    phoneNumber: '+233 55 456 7890',
    email: 'ama.boateng@example.com',
    joinedDate: '2025-05-22',
    assignedServices: ['Beard Trim', 'Shampoo & Style'],
  },
  {
    id: '4',
    name: 'Yaw Darko',
    role: 'Staff Barber',
    rating: 4.3,
    avatarUrl: null,
    isActive: true,
    totalAppointments: 14,
    revenueThisMonth: 340,
    phoneNumber: '+233 27 321 0987',
    email: 'yaw.darko@example.com',
    joinedDate: '2026-02-01',
    assignedServices: ['Haircut & Beard'],
  },
];

// ─── Square avatar (staff cards use rounded-square, not circle) ───────────────

function SquareAvatar({
  uri,
  name,
  size = 60,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 12 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: '#3c3cb9',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#ffffff',
          fontSize: Math.round(size * 0.33),
          fontWeight: '700',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

// ─── Add Staff modal ──────────────────────────────────────────────────────────

function AddStaffModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [nameError, setNameError]   = useState('');
  const [emailError, setEmailError] = useState('');

  function handleSend() {
    let valid = true;
    if (!name.trim()) {
      setNameError('Full name is required');
      valid = false;
    } else {
      setNameError('');
    }
    if (!email.trim()) {
      setEmailError('Email address is required');
      valid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else {
      setEmailError('');
    }
    if (!valid) return;

    // TODO: POST /api/barbers/me/staff/invite  { name, email, phone }
    setName('');
    setEmail('');
    setPhone('');
    setNameError('');
    setEmailError('');
    onClose();
  }

  function handleClose() {
    setName('');
    setEmail('');
    setPhone('');
    setNameError('');
    setEmailError('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        className="absolute inset-0 bg-black/40"
        onPress={handleClose}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute bottom-0 left-0 right-0"
      >
        <View className="bg-white rounded-t-3xl pt-3">
          {/* Handle */}
          <View className="w-9 h-1 rounded-full bg-neutral-200 self-center mb-5" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 mb-6">
            <Text className="text-2xl font-bold text-neutral-800">
              Add Team Member
            </Text>
            <Pressable onPress={handleClose} hitSlop={12}>
              <X size={24} color="#4A5568" />
            </Pressable>
          </View>

          {/* Form */}
          <ScrollView
            className="px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5 pb-2">
              <Input
                label="NAME *"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                error={nameError}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <Input
                label="EMAIL ADDRESS *"
                placeholder="staff@email.com"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              <Input
                label="PHONE (OPTIONAL)"
                placeholder="+233 ..."
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="done"
              />

              {/* Info banner */}
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: 'rgba(60,60,185,0.07)' }}
              >
                <Text className="text-sm text-accent leading-[22px]">
                  An invitation will be sent to this barber's email. If they
                  already have a Trimova account, they will be added to your
                  team immediately.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* CTA */}
          <View
            className="px-5 pt-4 pb-10"
            style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 24 }}
          >
            <Pressable
              onPress={handleSend}
              className="flex-row items-center justify-center gap-2 bg-accent rounded-2xl py-4 active:opacity-80"
            >
              <UserPlus size={18} color="white" />
              <Text className="text-white font-bold text-base">
                Send Invitation
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

const CARD_SHADOW = {
  shadowColor: '#1A202C',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

function StaffCard({
  member,
  onToggle,
  onManage,
}: {
  member: StaffMember;
  onToggle: (id: string, value: boolean) => void;
  onManage: (id: string) => void;
}) {
  return (
    <View
      style={[
        CARD_SHADOW,
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
        },
      ]}
    >
      {/* Top: avatar + info */}
      <View className="flex-row items-center gap-3 p-4">
        <SquareAvatar uri={member.avatarUrl} name={member.name} size={55} />

        <View className="flex-1">
          <Text className="text-[14px] font-bold text-neutral-800" numberOfLines={1}>
            {member.name}
          </Text>
          <Text className="text-sm text-neutral-500 mt-0.5">{member.role}</Text>
          <View className="flex-row items-center gap-1 mt-1.5">
            <Star size={12} color="#D69E2E" fill="#D69E2E" />
            <Text className="text-xs font-bold text-neutral-700">
              {member.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View className="h-px bg-neutral-100 mx-4" />

      {/* Bottom: toggle + manage */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Switch
            value={member.isActive}
            onValueChange={(val) => onToggle(member.id, val)}
            trackColor={{ false: '#CBD5E0', true: '#38A169' }}
            thumbColor="#ffffff"
            ios_backgroundColor="#CBD5E0"
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: member.isActive ? '#38A169' : '#A0AEC0',
            }}
          >
            {member.isActive ? 'Active' : 'Away'}
          </Text>
        </View>

        <Pressable
          onPress={() => onManage(member.id)}
          className="active:opacity-70"
          style={{
            borderWidth: 1,
            borderColor: '#CBD5E0',
            borderRadius: 10,
            paddingHorizontal: 22,
            paddingVertical: 8,
          }}
        >
          <Text className="text-sm font-semibold text-neutral-700">Manage</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberStaffScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const barber = user as BarberProfile | null;

  const [staff, setStaff]           = useState<StaffMember[]>(MOCK_STAFF);
  const [showAddModal, setShowModal] = useState(false);

  const totalStaff = staff.length;
  const onDuty     = staff.filter((m) => m.isActive).length;

  function handleToggle(id: string, value: boolean) {
    setStaff((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: value } : m)),
    );
  }

  function handleManage(id: string) {
    router.push(`/staff/${id}` as any);
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-100">
        <View className="flex-1 mr-3">
          <Text className="text-2xl font-bold text-neutral-800">
            Staff Management
          </Text>
          <Text className="text-sm text-neutral-500 mt-0.5">
            Manage your team and track performance.
          </Text>
        </View>
        <Pressable className="relative p-1" hitSlop={10}>
          <Bell size={22} color="#4A5568" />
          <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-2 border-white" />
        </Pressable>
      </View>

      {/* ── Scrollable content ─────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        <View className="px-5 pt-5 gap-4">

          {/* Add Staff button */}
          <Pressable
            onPress={() => setShowModal(true)}
            className="flex-row items-center justify-center gap-2 bg-accent rounded-2xl py-4 active:opacity-80"
            style={{
              shadowColor: '#3c3cb9',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <UserPlus size={18} color="white" />
            <Text className="text-white font-bold text-[15px]">Add Staff</Text>
          </Pressable>

          {/* Stats row */}
          <View className="flex-row gap-3">
            {/* Total Staff */}
            <View
              className="flex-1 bg-white rounded-lg p-4"
              style={{
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#1A202C',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">
                Total Staff
              </Text>
              <Text className="text-2xl font-bold text-neutral-800 mt-1">
                {totalStaff}
              </Text>
            </View>

            {/* On Duty */}
            <View
              className="flex-1 bg-white rounded-lg p-4"
              style={{
                borderWidth: 1,
                borderColor: '#E2E8F0',
                shadowColor: '#1A202C',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">
                On Duty
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Text className="text-2xl font-bold text-neutral-800">
                  {onDuty}
                </Text>
                <View
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#38A169' }}
                />
              </View>
            </View>
          </View>

          {/* Staff list */}
          <View className="gap-3 mt-1">
            {staff.map((member) => (
              <StaffCard
                key={member.id}
                member={member}
                onToggle={handleToggle}
                onManage={handleManage}
              />
            ))}
          </View>

        </View>
      </ScrollView>

      {/* Add Staff modal */}
      <AddStaffModal
        visible={showAddModal}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
}
