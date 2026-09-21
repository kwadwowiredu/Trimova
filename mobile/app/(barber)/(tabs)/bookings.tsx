import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {

  CalendarX,
  XCircle,
  CheckSquare,
  X,
  CheckCircle2,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { BookingCard, type Booking } from '@/components/barber/BookingCard';
import { AppointmentSheet } from '@/components/barber/AppointmentSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { CompleteProfileBanner, isProfileIncomplete } from '@/components/barber/CompleteProfileBanner';
import { useAuthStore } from '@/stores/authStore';
import { bookingsService } from '@/services/bookings';
import { getApiErrorMessage } from '@/services/api';
import type { BarberProfile } from '@/types/user';
import type { Booking as ApiBooking } from '@/types/booking';

/**
 * The card only needs what it draws; the API row carries far more. Keeping the
 * mapping here means the card stays a presentation component.
 */
function toCardBooking(b: ApiBooking): Booking {
  return {
    id: b.id,
    clientName: b.clientName,
    clientAvatar: b.clientAvatarUrl,
    serviceName: b.serviceName,
    status: b.status,
    startTime: b.scheduledAt,
    endTime: b.endsAt,
    // In-shop jobs happen at the shop, so only mobile jobs carry an address.
    locationAddress: b.clientLocation?.address ?? '',
    requiresApproval: b.requiresApproval,
    approvedAt: b.approvedAt,
  };
}

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const;
type TabName = (typeof TABS)[number];

function filterBookings(bookings: Booking[], tab: TabName): Booking[] {
  if (tab === 'Upcoming') {
    return bookings.filter((b) =>
      b.status === 'confirmed' || b.status === 'pending' || b.status === 'in_progress',
    );
  }
  if (tab === 'Completed') return bookings.filter((b) => b.status === 'completed');
  return bookings.filter((b) => b.status === 'cancelled' || b.status === 'declined');
}

// ─── Modal config ─────────────────────────────────────────────────────────────

/**
 * Past appointments can't be deleted — they're the record behind the money
 * ledger and the admin panel's audit trail. Cancelling is the only way to
 * close one out, and that keeps the row.
 */
interface ModalConfig {
  type: 'cancel' | 'cancel_batch' | 'decline';
  ids: string[];
}

function getModalContent(config: ModalConfig) {
  const { type, ids } = config;
  const n = ids.length;
  switch (type) {
    case 'cancel':
      return {
        title: 'Cancel Appointment',
        message: 'Are you sure you want to cancel this appointment? The client will be notified.',
        confirmLabel: 'Yes, Cancel It',
      };
    case 'cancel_batch':
      return {
        title: `Cancel ${n} Appointment${n > 1 ? 's' : ''}`,
        message: `Are you sure you want to cancel these ${n} appointments? All affected clients will be notified.`,
        confirmLabel: `Cancel ${n} Appointment${n > 1 ? 's' : ''}`,
      };
    case 'decline':
      return {
        title: 'Decline Request',
        message: 'The client will be told you turned this request down, and the slot will be freed.',
        confirmLabel: 'Decline Request',
      };
  }
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  activeTab: TabName;
  /** Called with (tab, pageIndex) so parent can scroll the pager */
  onSelect: (tab: TabName, index: number) => void;
  upcomingCount: number;
  /** Driven by BOTH tab press (withTiming) and pager scroll (live value) */
  indicatorX: SharedValue<number>;
  tabWidth: number;
}

function TabBar({ activeTab, onSelect, upcomingCount, indicatorX, tabWidth }: TabBarProps) {
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View className="bg-white border-b border-neutral-100">
      <View className="flex-row">
        {TABS.map((tab, i) => (
          <Pressable
            key={tab}
            // tabWidth is a runtime device-dimension value — must stay inline
            style={{ width: tabWidth }}
            className="items-center py-3.5"
            onPress={() => onSelect(tab, i)}
          >
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-accent' : 'text-neutral-400'
                }`}
              >
                {tab}
              </Text>
              {tab === 'Upcoming' && upcomingCount > 0 && (
                <View className="bg-danger rounded-full min-w-[20px] h-5 items-center justify-center px-1.5">
                  <Text className="text-white text-[11px] font-extrabold">
                    {upcomingCount > 9 ? '9+' : upcomingCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      {/*
        Animated underline — style prop required by Reanimated API;
        width and backgroundColor depend on runtime values.
      */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            height: 2.5,
            width: tabWidth,
            backgroundColor: '#3c3cb9',
            borderRadius: 2,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabName }) {
  const messages: Record<TabName, { title: string; subtitle: string }> = {
    Upcoming:  { title: 'No upcoming bookings',  subtitle: 'New client appointments will appear here.' },
    Completed: { title: 'No completed bookings', subtitle: 'Finished appointments will show up here.' },
    Cancelled: { title: 'No cancelled bookings', subtitle: 'Cancelled appointments will appear here.' },
  };
  const { title, subtitle } = messages[tab];
  return (
    <View className="flex-1 items-center pt-20 px-10 gap-3">
      <CalendarX size={52} color="#CBD5E0" />
      <Text className="text-base font-bold text-neutral-600 text-center">{title}</Text>
      <Text className="text-sm text-neutral-400 text-center leading-5">{subtitle}</Text>
    </View>
  );
}

// ─── Swipeable card item ──────────────────────────────────────────────────────

interface SwipeCardItemProps {
  item: Booking;
  tab: TabName;
  isSelectionMode: boolean;
  isSelected: boolean;
  onLongPress: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onCancelPress: (id: string) => void;
  /** Present only for freelance barbers — enables the Accept/Decline request flow. */
  onAcceptPress?: (id: string) => void;
  onDeclinePress?: (id: string) => void;
  onOpenPress: (id: string) => void;
}

function SwipeCardItem({
  item,
  tab,
  isSelectionMode,
  isSelected,
  onLongPress,
  onToggleSelect,
  onCancelPress,
  onAcceptPress,
  onDeclinePress,
  onOpenPress,
}: SwipeCardItemProps) {
  const swipeRef = useRef<Swipeable>(null);
  const isUpcoming = tab === 'Upcoming';

  function handleActionPress() {
    swipeRef.current?.close();
    onCancelPress(item.id);
  }

  const card = (
    <BookingCard
      booking={item}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      onLongPress={onLongPress}
      onPress={onToggleSelect}
      onAccept={onAcceptPress}
      onDecline={onAcceptPress ? onDeclinePress : undefined}
      onOpen={onOpenPress}
    />
  );

  // Disable swipe while in batch-selection mode
  if (isSelectionMode) {
    return <View className="mx-4 mb-3">{card}</View>;
  }

  // A closed booking has nothing left to act on — the record stays.
  if (!isUpcoming) {
    return <View className="mx-4 mb-3">{card}</View>;
  }

  return (
    <View className="mx-4 mb-3">
      <Swipeable
        ref={swipeRef}
        overshootRight={false}
        rightThreshold={50}
        renderRightActions={() => (
          <TouchableOpacity
            onPress={handleActionPress}
            activeOpacity={0.85}
            style={{
              width: 76,
              backgroundColor: '#E53E3E',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <XCircle size={22} color="white" />
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        )}
      >
        {card}
      </Swipeable>
    </View>
  );
}

// ─── Batch selection bar ──────────────────────────────────────────────────────

interface SelectionBarProps {
  count: number;
  totalCount: number;
  onToggleAll: () => void;
  onExit: () => void;
  onAction: () => void;
}

/** Only ever shown on Upcoming, where cancelling is the one batch action. */
function SelectionBar({ count, totalCount, onToggleAll, onExit, onAction }: SelectionBarProps) {
  const allSelected = totalCount > 0 && count === totalCount;

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View className="flex-row items-center px-5 py-4 gap-3">
        {/* Exit selection mode */}
        <Pressable onPress={onExit} hitSlop={8} className="active:opacity-60">
          <X size={22} color="#4A5568" />
        </Pressable>

        {/* Count label */}
        <Text className="flex-1 text-sm font-bold text-neutral-800">
          {count === 0 ? 'Select bookings' : `${count} selected`}
        </Text>

        {/*
          Select / Deselect All — toggles between selecting all and deselecting all
          Tapping when everything is selected deselects all.
        */}
        <Pressable
          onPress={onToggleAll}
          className="flex-row items-center gap-1.5 active:opacity-60"
        >
          <CheckSquare size={17} color={allSelected ? '#3c3cb9' : '#A0AEC0'} />
          <Text
            className={`text-sm font-semibold ${allSelected ? 'text-accent' : 'text-neutral-400'}`}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Text>
        </Pressable>

        {/* Primary action */}
        <Pressable
          onPress={onAction}
          disabled={count === 0}
          className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full active:opacity-80 bg-danger ${
            count === 0 ? 'opacity-40' : ''
          }`}
        >
          <XCircle size={15} color="white" />
          <Text className="text-white text-sm font-bold">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BarberBookingsScreen() {
  const insets         = useSafeAreaInsets();
  const { width }      = useWindowDimensions();
  const { user }       = useAuthStore();
  const barber         = user as BarberProfile | null;

  const tabWidth = width / TABS.length;

  // Freelance (mobile) barbers must accept each request; shop bookings auto-confirm.
  const isFreelance = barber?.barberType === 'mobile';

  // ── State ────────────────────────────────────────────────────────────────────
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab]         = useState<TabName>('Upcoming');
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelection] = useState(false);
  const [modalConfig, setModalConfig]     = useState<ModalConfig | null>(null);
  const [acceptToast, setAcceptToast]     = useState('');
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  // Everything a client books at this shop lands here.
  //
  // Polled rather than pulled: a barber shouldn't have to think about
  // refreshing to find out someone just booked them. Fifteen seconds is short
  // enough to feel immediate and long enough to be cheap.
  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ['bookings', 'barber'],
    queryFn: () => bookingsService.getBarberBookings({ page: 1 }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  // Pull-to-refresh keeps its own flag — driving RefreshControl from the
  // query's isRefetching makes the spinner reappear on every poll.
  const [pulling, setPulling] = useState(false);
  async function pullToRefresh() {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  }

  const apiBookings = useMemo(() => data?.data.data ?? [], [data]);
  const bookings = useMemo(() => apiBookings.map(toCardBooking), [apiBookings]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  }

  /**
   * A freelance barber has a travel fee to set and an address to look at
   * before they agree to anything, so "accept" opens the detail sheet rather
   * than confirming blind.
   */
  function handleAccept(id: string) {
    setOpenBookingId(id);
  }

  // ── Animated values ──────────────────────────────────────────────────────────
  /*
    indicatorX drives TabBar underline.
    It is updated by BOTH:
      - tab press → withTiming (smooth jump)
      - pager swipe → live from useAnimatedScrollHandler (follows finger)
  */
  const indicatorX = useSharedValue(0);

  // ── Pager ref + scroll handler ────────────────────────────────────────────────
  const pagerRef = useRef<ScrollView>(null);

  const pagerScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      indicatorX.value = (event.contentOffset.x / width) * tabWidth;
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const upcomingCount      = filterBookings(bookings, 'Upcoming').length;
  const activePageBookings = filterBookings(bookings, activeTab);

  // ── Selection helpers ────────────────────────────────────────────────────────

  function enterSelectionMode(id: string) {
    // Closed bookings have no batch action, so selection only makes sense
    // where cancelling does.
    if (activeTab !== 'Upcoming') return;
    setIsSelection(true);
    setSelectedIds(new Set([id]));
  }

  function exitSelectionMode() {
    setIsSelection(false);
    setSelectedIds(new Set());
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setIsSelection(false);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /**
   * Select All / Deselect All toggle:
   * If every item on the current page is already selected → deselect all.
   * Otherwise → select all items on the current page.
   */
  function toggleSelectAll() {
    const pageBookings = filterBookings(bookings, activeTab);
    const allSelected  = pageBookings.length > 0 && pageBookings.every((b) => selectedIds.has(b.id));
    if (allSelected) {
      // Deselect all but stay in selection mode
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageBookings.map((b) => b.id)));
    }
  }

  // ── Tab navigation ───────────────────────────────────────────────────────────

  function handleTabPress(tab: TabName, index: number) {
    indicatorX.value = withTiming(index * tabWidth, { duration: 220 });
    setActiveTab(tab);
    exitSelectionMode();
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  }

  function handlePagerMomentumEnd(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const pageIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    const newTab    = TABS[pageIndex];
    if (newTab !== activeTab) {
      setActiveTab(newTab);
      exitSelectionMode();
    }
  }

  // ── Swipe actions ────────────────────────────────────────────────────────────

  function handleSwipeCancel(id: string) {
    setModalConfig({ type: 'cancel', ids: [id] });
  }

  function handleDecline(id: string) {
    setModalConfig({ type: 'decline', ids: [id] });
  }

  // ── Batch actions ────────────────────────────────────────────────────────────

  function handleBatchAction() {
    setModalConfig({ type: 'cancel_batch', ids: Array.from(selectedIds) });
  }

  // ── Modal confirm ────────────────────────────────────────────────────────────

  async function executeAction() {
    if (!modalConfig) return;
    const { type, ids } = modalConfig;
    setModalConfig(null);

    try {
      // Declining is only for a request the barber never took money for;
      // cancelling closes a live booking and refunds anything already paid.
      await Promise.all(
        ids.map((id) =>
          type === 'decline' ? bookingsService.decline(id) : bookingsService.cancel(id),
        ),
      );
    } catch (err) {
      Alert.alert('Something went wrong', getApiErrorMessage(err));
    } finally {
      refresh();
      exitSelectionMode();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const modalContent = modalConfig ? getModalContent(modalConfig) : null;

  const showBanner = isProfileIncomplete(barber);

  return (
    <View className="flex-1 bg-white">

      {/* ── Complete-profile banner (very top, full width, static) ── */}
      <CompleteProfileBanner insetTop={insets.top} />

      {/* ── Purple decorative header ─────────────────────────── */}
      <View
        style={{
          backgroundColor: '#2D27A8',
          paddingTop:       showBanner ? 0 : insets.top,
          overflow:         'hidden',
        }}
      >
        {/* decorative blobs */}
        <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140,
          backgroundColor: '#7B5BC4', opacity: 0.5, top: -100, right: -50 }} />
        <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80,
          backgroundColor: '#C084FC', opacity: 0.22, bottom: -30, left: -20 }} />

        {/* Top row: shop name + bell */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
            {barber?.businessName ?? 'My Barbershop'}
          </Text>
          <NotificationBell
            route="/(barber)/notifications"
            color="rgba(255,255,255,0.9)"
            badgeBorderColor="#2D27A8"
          />
        </View>

        {/* Page title */}
        <View className="px-5 pt-1 pb-5">
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Bookings</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            Manage your schedule and requests.
          </Text>
        </View>
      </View>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <TabBar
        activeTab={activeTab}
        onSelect={handleTabPress}
        upcomingCount={upcomingCount}
        indicatorX={indicatorX}
        tabWidth={tabWidth}
      />

      {/* ── Swipeable pager — one FlatList per tab page ───────── */}
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#F5F6F8' }}>
          <ListSkeleton count={3} />
        </View>
      ) : (
      <Animated.ScrollView
        ref={pagerRef as React.RefObject<Animated.ScrollView>}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={pagerScrollHandler}
        onMomentumScrollEnd={handlePagerMomentumEnd}
        // nestedScrollEnabled allows vertical scroll inside each page on Android
        nestedScrollEnabled
        className="flex-1"
      >
        {TABS.map((tab) => {
          const pageBookings = filterBookings(bookings, tab);
          return (
            // Each page is exactly one screen wide — pagingEnabled requires this
            <View key={tab} style={{ width, backgroundColor: '#F5F6F8' }}>
              <FlatList
                data={pageBookings}
                keyExtractor={(item) => item.id}
                style={{ backgroundColor: '#F5F6F8' }}
                contentContainerStyle={{
                  paddingTop: 12,
                  paddingBottom: isSelectionMode ? 100 : 32,
                  flexGrow: 1,
                }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<EmptyState tab={tab} />}
                refreshControl={
                  <RefreshControl refreshing={pulling} onRefresh={pullToRefresh} tintColor="#3c3cb9" />
                }
                renderItem={({ item }) => (
                  <SwipeCardItem
                    item={item}
                    tab={tab}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(item.id)}
                    onLongPress={enterSelectionMode}
                    onToggleSelect={toggleSelection}
                    onCancelPress={handleSwipeCancel}
                    onAcceptPress={isFreelance ? handleAccept : undefined}
                    onDeclinePress={handleDecline}
                    onOpenPress={setOpenBookingId}
                  />
                )}
              />
            </View>
          );
        })}
      </Animated.ScrollView>
      )}

      {/* ── Selection bar — absolute overlay above tab bar ────── */}
      {isSelectionMode && (
        <SelectionBar
          count={selectedIds.size}
          totalCount={activePageBookings.length}
          onToggleAll={toggleSelectAll}
          onExit={exitSelectionMode}
          onAction={handleBatchAction}
        />
      )}

      {/* ── Full appointment detail + every action ─────────────── */}
      <AppointmentSheet
        bookingId={openBookingId}
        onClose={() => setOpenBookingId(null)}
        barber={barber}
      />

      {/* ── Confirmation modal ─────────────────────────────────── */}
      {modalContent && (
        <ConfirmModal
          visible={modalConfig !== null}
          onClose={() => setModalConfig(null)}
          onConfirm={executeAction}
          title={modalContent.title}
          message={modalContent.message}
          confirmLabel={modalContent.confirmLabel}
          cancelLabel="Keep"
          variant="danger"
        />
      )}

      {/* ── Accept confirmation toast ──────────────────────────── */}
      {acceptToast !== '' && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: insets.top + 60, left: 20, right: 20,
            backgroundColor: '#38A169', borderRadius: 14,
            paddingVertical: 14, paddingHorizontal: 18,
            flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
          }}
        >
          <CheckCircle2 size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 }}>{acceptToast}</Text>
        </View>
      )}
    </View>
  );
}
