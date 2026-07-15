import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  TrendingUp,
  Calendar,
  Scissors,
  CheckSquare,
  Square,
  Trash2,
  Save,
  Phone,
  Mail,
  Pencil,
  X,
} from 'lucide-react-native';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MOCK_STAFF, type StaffMember } from '@/app/(barber)/(tabs)/staff';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

// ─── Mock today's appointments ────────────────────────────────────────────────

const TODAY = new Date();

function makeTodayAppt(
  h: number,
  m: number,
  dur: number,
  client: string,
  service: string,
  status: 'confirmed' | 'pending' | 'completed',
) {
  const start = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), h, m);
  const end   = new Date(start.getTime() + dur * 60_000);
  return { client, service, status, start, end };
}

const MOCK_TODAY_APPTS = [
  makeTodayAppt(10,  0, 45, 'Ama Osei',      'Executive Fade',  'completed'),
  makeTodayAppt(11, 30, 30, 'Kwesi Poku',     'Beard Trim',      'completed'),
  makeTodayAppt(13,  0, 45, 'Daniel Nkrumah', 'Haircut & Beard', 'confirmed'),
  makeTodayAppt(14, 30, 30, 'Fiifi Asante',   'Skin Fade',       'confirmed'),
  makeTodayAppt(16,  0, 45, 'Yaw Owusu',      'Executive Fade',  'pending'),
];

const ALL_SERVICES = [
  'Haircut & Beard',
  'Executive Fade',
  'Beard Trim',
  'Skin Fade',
  'Shampoo & Style',
  'Head Shave',
  'Kids Haircut',
];

const MOCK_REVIEWS = [
  {
    id: '1',
    clientName: 'Ama Osei',
    rating: 5,
    comment: 'Excellent fade — very precise and professional.',
    date: '2026-06-08',
  },
  {
    id: '2',
    clientName: 'Kwesi Poku',
    rating: 4,
    comment: 'Great work. Slightly delayed but worth the wait.',
    date: '2026-06-05',
  },
  {
    id: '3',
    clientName: 'Daniel Nkrumah',
    rating: 5,
    comment: "Best haircut I've had in a long time. Highly recommend.",
    date: '2026-06-02',
  },
];

const FILTER_PERIODS = ['This Week', 'This Month', 'Last 3 Months', 'All Time'] as const;
type FilterPeriod = (typeof FILTER_PERIODS)[number];

// ─── Tab names ────────────────────────────────────────────────────────────────

type TabName = 'Overview' | 'Personal' | 'Workspace';
const TABS: TabName[] = ['Overview', 'Personal', 'Workspace'];

// ─── Approximate pixel heights for toast positioning ─────────────────────────
// Header row (back btn + avatar + name/role + badge):  ~58 px
// Tab bar row (three text tabs):                       ~48 px
const HEADER_H  = 58;
const TAB_BAR_H = 48;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase mb-3">
      {children}
    </Text>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <View
      className="flex-1 bg-white rounded-2xl p-4"
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
      <View className="w-8 h-8 rounded-xl bg-accent/10 items-center justify-center mb-3">
        {icon}
      </View>
      <Text className="text-xs font-semibold text-neutral-500">{label}</Text>
      <Text className="text-xl font-bold text-neutral-800 mt-0.5">{value}</Text>
      {sub && <Text className="text-xs text-neutral-400 mt-0.5">{sub}</Text>}
    </View>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ member }: { member: StaffMember }) {
  const [period, setPeriod]             = useState<FilterPeriod>('This Month');
  const [showPeriodMenu, setShowMenu]   = useState(false);

  const completedToday = MOCK_TODAY_APPTS.filter((a) => a.status === 'completed').length;

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <View className="px-5 pt-5 pb-10 gap-5">

        {/* Period filter */}
        <View className="flex-row items-center justify-between">
          <SectionLabel>Performance</SectionLabel>
          <View>
            <Pressable
              onPress={() => setShowMenu((v) => !v)}
              className="flex-row items-center gap-1.5 bg-neutral-100 rounded-xl px-3 py-2 active:opacity-70"
            >
              <Text className="text-xs font-semibold text-neutral-700">{period}</Text>
              <ChevronDown size={13} color="#718096" />
            </Pressable>

            {showPeriodMenu && (
              <View
                className="absolute right-0 top-10 bg-white rounded-xl z-50 py-1"
                style={{
                  width:         150,
                  borderWidth:   1,
                  borderColor:   '#E2E8F0',
                  shadowColor:   '#1A202C',
                  shadowOffset:  { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius:  10,
                  elevation:     8,
                }}
              >
                {FILTER_PERIODS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => { setPeriod(p); setShowMenu(false); }}
                    className="px-4 py-3 active:bg-neutral-50"
                  >
                    <Text
                      className={`text-sm ${
                        period === p
                          ? 'font-bold text-accent'
                          : 'font-medium text-neutral-700'
                      }`}
                    >
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Stat cards — row 1 */}
        <View className="flex-row gap-3">
          <StatCard
            label="Appointments"
            value={String(member.totalAppointments)}
            sub="Total received"
            icon={<Calendar size={16} color="#3c3cb9" />}
          />
          <StatCard
            label="Avg Rating"
            value={member.rating.toFixed(1)}
            sub="From clients"
            icon={<Star size={16} color="#D69E2E" />}
          />
        </View>

        {/* Stat cards — row 2 */}
        <View className="flex-row gap-3">
          <StatCard
            label="Revenue"
            value={`GHS ${member.revenueThisMonth.toLocaleString()}`}
            sub={period}
            icon={<TrendingUp size={16} color="#38A169" />}
          />
          <StatCard
            label="Today"
            value={`${completedToday}/${MOCK_TODAY_APPTS.length}`}
            sub="Completed"
            icon={<CheckSquare size={16} color="#3c3cb9" />}
          />
        </View>

        {/* Today's appointments */}
        <View>
          <SectionLabel>Today's Appointments</SectionLabel>
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
            {MOCK_TODAY_APPTS.map((appt, i) => {
              const statusColor: Record<string, string> = {
                completed: '#38A169',
                confirmed: '#3c3cb9',
                pending:   '#D69E2E',
              };
              return (
                <View key={i}>
                  {i > 0 && <View className="h-px bg-neutral-100 mx-4" />}
                  <View className="flex-row items-center px-4 py-3 gap-3">
                    <View
                      className="w-1 h-9 rounded-full"
                      style={{ backgroundColor: statusColor[appt.status] }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-neutral-800">
                        {appt.client}
                      </Text>
                      <Text className="text-xs text-neutral-500 mt-0.5">
                        {appt.service}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs font-semibold text-neutral-700">
                        {appt.start.getHours().toString().padStart(2, '0')}:
                        {appt.start.getMinutes().toString().padStart(2, '0')}
                      </Text>
                      <Text
                        className="text-[10px] font-bold capitalize mt-0.5"
                        style={{ color: statusColor[appt.status] }}
                      >
                        {appt.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

// ─── Personal tab ─────────────────────────────────────────────────────────────

function PersonalTab({
  member,
  onDelete,
  onSaved,
}: {
  member: StaffMember;
  onDelete: () => void;
  onSaved:  () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name,  setName]  = useState(member.name);
  const [phone, setPhone] = useState(member.phoneNumber);

  function handleSave() {
    // TODO: PATCH /api/barbers/me/staff/:id  { name, phone }
    setIsEditing(false);
    onSaved();
  }

  function handleCancel() {
    // Discard changes
    setName(member.name);
    setPhone(member.phoneNumber);
    setIsEditing(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-5 pb-10 gap-5">

          {/* ── Staff Details section ─────────────────────────── */}
          <View>

            {/* Section header + Edit / Cancel toggle */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase">
                Staff Details
              </Text>

              {isEditing ? (
                <Pressable onPress={handleCancel} hitSlop={8}>
                  <Text className="text-sm font-semibold text-neutral-500">Cancel</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setIsEditing(true)}
                  className="flex-row items-center gap-1.5 active:opacity-70"
                  hitSlop={8}
                >
                  <Pencil size={13} color="#3c3cb9" />
                  <Text className="text-sm font-semibold text-accent">Edit</Text>
                </Pressable>
              )}
            </View>

            {/* Details card */}
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                borderWidth:   1,
                borderColor:   isEditing ? '#C7C7F5' : '#E2E8F0',
                shadowColor:   '#1A202C',
                shadowOffset:  { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius:  4,
                elevation:     2,
              }}
            >
              {/* Full Name */}
              <View className="px-4 pt-4 pb-3">
                <Text className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5">
                  Full Name
                </Text>
                {isEditing ? (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    className="text-sm font-semibold text-neutral-800"
                    placeholderTextColor="#A0AEC0"
                    autoCapitalize="words"
                    autoFocus
                  />
                ) : (
                  <Text className="text-sm font-semibold text-neutral-800">{name}</Text>
                )}
              </View>
              <View className="h-px bg-neutral-100 mx-4" />

              {/* Phone */}
              <View className="px-4 pt-3 pb-3">
                <Text className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5">
                  Phone Number
                </Text>
                <View className="flex-row items-center gap-2">
                  <Phone size={14} color="#A0AEC0" />
                  {isEditing ? (
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      className="flex-1 text-sm font-semibold text-neutral-800"
                      placeholderTextColor="#A0AEC0"
                      keyboardType="phone-pad"
                    />
                  ) : (
                    <Text className="text-sm font-semibold text-neutral-800">{phone}</Text>
                  )}
                </View>
              </View>
              <View className="h-px bg-neutral-100 mx-4" />

              {/* Email — always read-only */}
              <View className="px-4 pt-3 pb-3">
                <Text className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5">
                  Email Address
                </Text>
                <View className="flex-row items-center gap-2">
                  <Mail size={14} color="#A0AEC0" />
                  <Text className="text-sm text-neutral-500">{member.email}</Text>
                </View>
              </View>
              <View className="h-px bg-neutral-100 mx-4" />

              {/* Role — read-only */}
              <View className="px-4 pt-3 pb-4">
                <Text className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase mb-1.5">
                  Role
                </Text>
                <Text className="text-sm font-semibold text-neutral-800">
                  {member.role}
                </Text>
              </View>
            </View>

            {/* Save button — only visible in edit mode */}
            {isEditing && (
              <Pressable
                onPress={handleSave}
                className="flex-row items-center justify-center gap-2 bg-accent rounded-2xl py-4 mt-3 active:opacity-80"
              >
                <Save size={17} color="white" />
                <Text className="text-white font-bold text-base">Save Changes</Text>
              </Pressable>
            )}
          </View>

          {/* Joined date */}
          <View className="bg-accent/5 rounded-2xl px-4 py-3 flex-row items-center gap-3">
            <Calendar size={15} color="#3c3cb9" />
            <Text className="text-sm text-accent font-semibold">
              Joined{' '}
              {new Date(member.joinedDate).toLocaleDateString('en-GB', {
                day:   'numeric',
                month: 'long',
                year:  'numeric',
              })}
            </Text>
          </View>

          {/* Danger zone */}
          <View>
            <SectionLabel>Danger Zone</SectionLabel>
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{ borderWidth: 1, borderColor: '#FED7D7' }}
            >
              <Pressable
                onPress={onDelete}
                className="flex-row items-center gap-3 px-4 py-4 active:bg-red-50"
              >
                <View className="w-8 h-8 rounded-xl bg-red-50 items-center justify-center">
                  <Trash2 size={16} color="#E53E3E" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-danger">Remove from Shop</Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    Permanently removes this barber from your team.
                  </Text>
                </View>
                <ChevronRight size={16} color="#E53E3E" />
              </Pressable>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Workspace tab ────────────────────────────────────────────────────────────

function WorkspaceTab({ member }: { member: StaffMember }) {
  const [assignedServices, setAssignedServices] = useState<string[]>(
    member.assignedServices,
  );
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [draftServices, setDraftServices]         = useState<string[]>([]);

  function openServicesModal() {
    setDraftServices([...assignedServices]);
    setShowServicesModal(true);
  }

  function toggleDraft(service: string) {
    setDraftServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service],
    );
  }

  function saveServices() {
    setAssignedServices([...draftServices]);
    setShowServicesModal(false);
  }

  return (
    <View className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 pt-5 pb-10 gap-5">

          {/* ── Assigned Services — collapsed tappable row ───── */}
          <View>
            <SectionLabel>Assigned Services</SectionLabel>
            <Pressable
              onPress={openServicesModal}
              className="bg-white rounded-2xl active:opacity-70"
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
              <View className="flex-row items-center px-4 py-4 gap-3">
                <Scissors size={18} color="#3c3cb9" />
                <Text className="flex-1 text-sm font-semibold text-neutral-800">
                  Assigned Services
                </Text>
                {/* Count badge */}
                <View
                  className="w-6 h-6 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#3c3cb9' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                    {assignedServices.length}
                  </Text>
                </View>
                <ChevronRight size={16} color="#A0AEC0" />
              </View>
            </Pressable>
            <Text className="text-xs text-neutral-400 mt-2 mx-1">
              Clients can only book services assigned to this barber.
            </Text>
          </View>

          {/* ── Recent Reviews ───────────────────────────────── */}
          <View>
            <SectionLabel>Recent Reviews</SectionLabel>
            <View className="gap-3">
              {MOCK_REVIEWS.map((review) => (
                <View
                  key={review.id}
                  className="bg-white rounded-2xl p-4"
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
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-bold text-neutral-800">
                      {review.clientName}
                    </Text>
                    <View className="flex-row items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          color="#D69E2E"
                          fill={i < review.rating ? '#D69E2E' : 'transparent'}
                        />
                      ))}
                    </View>
                  </View>
                  <Text className="text-sm text-neutral-600 leading-5">
                    {review.comment}
                  </Text>
                  <Text className="text-[11px] text-neutral-400 mt-2">
                    {new Date(review.date).toLocaleDateString('en-GB', {
                      day:   'numeric',
                      month: 'short',
                      year:  'numeric',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Services bottom-sheet modal ───────────────────────── */}
      <Modal
        visible={showServicesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServicesModal(false)}
      >
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={() => setShowServicesModal(false)}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="bg-white rounded-t-3xl pt-3">
            {/* Handle */}
            <View className="w-9 h-1 rounded-full bg-neutral-200 self-center mb-4" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 mb-2">
              <Text className="text-xl font-bold text-neutral-800">
                Assigned Services
              </Text>
              <Pressable onPress={() => setShowServicesModal(false)} hitSlop={12}>
                <X size={22} color="#4A5568" />
              </Pressable>
            </View>

            <Text className="text-xs text-neutral-500 px-5 mb-4 leading-[18px]">
              Select the services this barber can perform. Clients can only book
              selected services with them.
            </Text>

            {/* Services list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
            >
              {ALL_SERVICES.map((service, i) => {
                const isSelected = draftServices.includes(service);
                return (
                  <View key={service}>
                    {i > 0 && <View className="h-px bg-neutral-100 mx-5" />}
                    <Pressable
                      onPress={() => toggleDraft(service)}
                      className="flex-row items-center px-5 py-3.5 gap-3 active:bg-neutral-50"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} color="#3c3cb9" />
                      ) : (
                        <Square size={20} color="#CBD5E0" />
                      )}
                      <Text
                        className={`flex-1 text-sm ${
                          isSelected
                            ? 'font-semibold text-neutral-800'
                            : 'text-neutral-500'
                        }`}
                      >
                        {service}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            {/* Save button */}
            <View
              className="px-5 pt-4"
              style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 24 }}
            >
              <Pressable
                onPress={saveServices}
                className="bg-accent rounded-2xl py-4 items-center active:opacity-80"
              >
                <Text className="text-white font-bold text-base">Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StaffDetailScreen() {
  const insets                    = useSafeAreaInsets();
  const { id }                    = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabName>('Overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Toast animation ────────────────────────────────────────────────────────
  const toastOpacity   = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(-20)).current;

  function showToast() {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity,   { toValue: 1,   duration: 250, useNativeDriver: true }),
        Animated.timing(toastTranslate, { toValue: 0,   duration: 250, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.parallel([
        Animated.timing(toastOpacity,   { toValue: 0,   duration: 250, useNativeDriver: true }),
        Animated.timing(toastTranslate, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]),
    ]).start();
  }

  // The shop owner manages themselves through the same screen ("/staff/owner"),
  // with Overview + Workspace only (Personal details are edited in Profile).
  const { user } = useAuthStore();
  const isOwner = id === 'owner';
  const owner = user as (BarberProfile & { isBookable?: boolean }) | null;

  const ownerMember: StaffMember | undefined = isOwner && owner
    ? {
        id: 'owner',
        name: owner.fullName ?? 'You',
        role: 'Owner · Barber',
        rating: owner.rating && owner.rating > 0 ? owner.rating : 5.0,
        avatarUrl: owner.avatarUrl ?? null,
        isActive: true,
        totalAppointments: 56,   // TODO: real owner analytics endpoint
        revenueThisMonth: 1480,
        phoneNumber: owner.phone ?? '',
        email: owner.email ?? '',
        joinedDate: owner.createdAt ?? new Date().toISOString(),
        assignedServices: ['Haircut & Beard', 'Executive Fade', 'Skin Fade'],
      }
    : undefined;

  // In production: fetch from API using id
  const member: StaffMember | undefined = isOwner
    ? ownerMember
    : MOCK_STAFF.find((m) => m.id === id);

  const visibleTabs: TabName[] = isOwner ? ['Overview', 'Workspace'] : TABS;

  if (!member) {
    return (
      <View
        className="flex-1 bg-white items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-neutral-500">Staff member not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-accent font-semibold">Go back</Text>
        </Pressable>
      </View>
    );
  }

  function handleDelete() {
    // TODO: DELETE /api/barbers/me/staff/:id
    setShowDeleteConfirm(false);
    router.back();
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-neutral-100">
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center active:opacity-70"
        >
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>

        {/* Avatar initials */}
        <View
          style={{
            width:           42,
            height:          42,
            borderRadius:    12,
            backgroundColor: '#3c3cb9',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
            {member.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
          </Text>
        </View>

        {/* Name + role */}
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-neutral-800" numberOfLines={1}>
            {member.name}
          </Text>
          <Text className="text-xs text-neutral-500">{member.role}</Text>
        </View>

        {/* Active / Away badge */}
        <View
          className="rounded-full px-3 py-1"
          style={{ backgroundColor: member.isActive ? '#F0FFF4' : '#F7FAFC' }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: member.isActive ? '#276749' : '#A0AEC0' }}
          >
            {member.isActive ? 'Active' : 'Away'}
          </Text>
        </View>
      </View>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <View className="flex-row border-b border-neutral-100 bg-white">
        {visibleTabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 items-center py-3.5"
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-accent' : 'text-neutral-400'
                }`}
              >
                {tab}
              </Text>
              {isActive && (
                <View className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent rounded-full" />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ── Tab content ────────────────────────────────────── */}
      <View className="flex-1 bg-neutral-50">
        {activeTab === 'Overview' && <OverviewTab member={member} />}
        {activeTab === 'Personal' && !isOwner && (
          <PersonalTab
            member={member}
            onDelete={() => setShowDeleteConfirm(true)}
            onSaved={showToast}
          />
        )}
        {activeTab === 'Workspace' && <WorkspaceTab member={member} />}
      </View>

      {/* ── Success toast ───────────────────────────────────── */}
      {/*
        Rendered at the StaffDetailScreen level so it floats above everything
        (including the tab content and any keyboard). pointerEvents="none"
        keeps it non-interactive.
      */}
      <Animated.View
        pointerEvents="none"
        style={{
          position:  'absolute',
          top:       HEADER_H + TAB_BAR_H + 12,
          left:      16,
          right:     16,
          zIndex:    999,
          opacity:   toastOpacity,
          transform: [{ translateY: toastTranslate }],
        }}
      >
        <View
          className="flex-row items-center gap-2.5 px-4 py-3 rounded-2xl"
          style={{ backgroundColor: '#38A169' }}
        >
          {/* Checkmark circle */}
          <View
            className="w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>✓</Text>
          </View>
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
            Changes saved successfully
          </Text>
        </View>
      </Animated.View>

      {/* ── Delete confirmation modal ───────────────────────── */}
      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Remove Staff Member"
        message={`Are you sure you want to permanently remove ${member.name} from your shop? This action cannot be undone.`}
        confirmLabel="Remove Permanently"
        cancelLabel="Cancel"
        variant="danger"
      />
    </View>
  );
}
