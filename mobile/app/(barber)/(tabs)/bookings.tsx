import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
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
  Bell,
  CalendarX,
  XCircle,
  Trash2,
  CheckSquare,
  X,
} from 'lucide-react-native';
import { BookingCard, type Booking, type BookingStatus } from '@/components/barber/BookingCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    clientName: 'Kwame Mensah',
    clientAvatar: null,
    serviceName: 'Executive Fade & Beard Trim',
    status: 'confirmed',
    startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endTime:   new Date(new Date().setHours(14, 45, 0, 0)).toISOString(),
    locationAddress: 'East Legon, Accra',
  },
  {
    id: '2',
    clientName: 'Kwabena Osei',
    clientAvatar: null,
    serviceName: 'Full Head Shave',
    status: 'pending',
    startTime: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
    endTime:   new Date(new Date().setHours(16, 30, 0, 0)).toISOString(),
    locationAddress: 'Kumasi, Ashanti',
  },
  {
    id: '3',
    clientName: 'Akosua Boateng',
    clientAvatar: null,
    serviceName: 'Haircut',
    status: 'completed',
    startTime: new Date(Date.now() - 86_400_000).toISOString(),
    endTime:   new Date(Date.now() - 86_400_000 + 1_800_000).toISOString(),
    locationAddress: 'Osu, Accra',
  },
  {
    id: '4',
    clientName: 'Fiifi Andoh',
    clientAvatar: null,
    serviceName: 'Beard Shaping',
    status: 'cancelled',
    startTime: new Date(Date.now() - 172_800_000).toISOString(),
    endTime:   new Date(Date.now() - 172_800_000 + 1_800_000).toISOString(),
    locationAddress: 'Accra Mall, Accra',
  },
];

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = ['Upcoming', 'Completed', 'Cancelled'] as const;
type TabName = (typeof TABS)[number];

function filterBookings(bookings: Booking[], tab: TabName): Booking[] {
  if (tab === 'Upcoming')  return bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  if (tab === 'Completed') return bookings.filter((b) => b.status === 'completed');
  return bookings.filter((b) => b.status === 'cancelled');
}

// ─── Modal config ─────────────────────────────────────────────────────────────

interface ModalConfig {
  type: 'cancel' | 'cancel_batch' | 'delete' | 'delete_batch';
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
    case 'delete':
      return {
        title: 'Delete Record',
        message: 'This will permanently remove this booking from your records.',
        confirmLabel: 'Delete',
      };
    case 'delete_batch':
      return {
        title: `Delete ${n} Record${n > 1 ? 's' : ''}`,
        message: `This will permanently remove these ${n} bookings from your records.`,
        confirmLabel: `Delete ${n} Record${n > 1 ? 's' : ''}`,
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
  onDeletePress: (id: string) => void;
}

function SwipeCardItem({
  item,
  tab,
  isSelectionMode,
  isSelected,
  onLongPress,
  onToggleSelect,
  onCancelPress,
  onDeletePress,
}: SwipeCardItemProps) {
  const swipeRef = useRef<Swipeable>(null);
  const isUpcoming = tab === 'Upcoming';

  function handleActionPress() {
    swipeRef.current?.close();
    if (isUpcoming) onCancelPress(item.id);
    else             onDeletePress(item.id);
  }

  const card = (
    <BookingCard
      booking={item}
      isSelected={isSelected}
      isSelectionMode={isSelectionMode}
      onLongPress={onLongPress}
      onPress={onToggleSelect}
    />
  );

  // Disable swipe while in batch-selection mode
  if (isSelectionMode) {
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
              backgroundColor: isUpcoming ? '#E53E3E' : '#4A5568',
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {isUpcoming
              ? <XCircle size={22} color="white" />
              : <Trash2  size={22} color="white" />
            }
            <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
              {isUpcoming ? 'Cancel' : 'Delete'}
            </Text>
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
  tab: TabName;
  onToggleAll: () => void;
  onExit: () => void;
  onAction: () => void;
}

function SelectionBar({ count, totalCount, tab, onToggleAll, onExit, onAction }: SelectionBarProps) {
  const allSelected = totalCount > 0 && count === totalCount;
  const isUpcoming  = tab === 'Upcoming';

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
          className={`flex-row items-center gap-2 px-4 py-2.5 rounded-full active:opacity-80 ${
            isUpcoming ? 'bg-danger' : 'bg-neutral-700'
          } ${count === 0 ? 'opacity-40' : ''}`}
        >
          {isUpcoming
            ? <XCircle size={15} color="white" />
            : <Trash2  size={15} color="white" />
          }
          <Text className="text-white text-sm font-bold">
            {isUpcoming ? 'Cancel' : 'Delete'}
          </Text>
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

  // ── State ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]         = useState<TabName>('Upcoming');
  const [bookings, setBookings]           = useState<Booking[]>(MOCK_BOOKINGS);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelection] = useState(false);
  const [modalConfig, setModalConfig]     = useState<ModalConfig | null>(null);

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
  const upcomingCount     = bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending').length;
  const activePageBookings = filterBookings(bookings, activeTab);

  // ── Selection helpers ────────────────────────────────────────────────────────

  function enterSelectionMode(id: string) {
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

  function handleSwipeDelete(id: string) {
    setModalConfig({ type: 'delete', ids: [id] });
  }

  // ── Batch actions ────────────────────────────────────────────────────────────

  function handleBatchAction() {
    const ids = Array.from(selectedIds);
    setModalConfig({
      type: activeTab === 'Upcoming' ? 'cancel_batch' : 'delete_batch',
      ids,
    });
  }

  // ── Modal confirm ────────────────────────────────────────────────────────────

  function executeAction() {
    if (!modalConfig) return;
    const { type, ids } = modalConfig;

    if (type === 'cancel' || type === 'cancel_batch') {
      setBookings((prev) =>
        prev.map((b) => ids.includes(b.id) ? { ...b, status: 'cancelled' as BookingStatus } : b),
      );
    } else {
      setBookings((prev) => prev.filter((b) => !ids.includes(b.id)));
    }

    exitSelectionMode();
    setModalConfig(null);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const modalContent = modalConfig ? getModalContent(modalConfig) : null;

  return (
    // paddingTop is a runtime insets value — must stay inline
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-neutral-100">
        <Text className="text-[17px] font-bold text-neutral-800" numberOfLines={1}>
          {barber?.businessName ?? 'My Barbershop'}
        </Text>
        <Pressable className="relative p-1">
          <Bell size={22} color="#4A5568" />
          {upcomingCount > 0 && (
            <View className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-2 border-white" />
          )}
        </Pressable>
      </View>

      {/* ── Page title ────────────────────────────────────────── */}
      <View className="px-5 pt-4 pb-3.5 bg-white">
        <Text className="text-2xl font-bold text-neutral-800">Bookings</Text>
        <Text className="text-sm text-neutral-500 mt-0.5">
          Manage your schedule and requests.
        </Text>
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
                renderItem={({ item }) => (
                  <SwipeCardItem
                    item={item}
                    tab={tab}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(item.id)}
                    onLongPress={enterSelectionMode}
                    onToggleSelect={toggleSelection}
                    onCancelPress={handleSwipeCancel}
                    onDeletePress={handleSwipeDelete}
                  />
                )}
              />
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* ── Selection bar — absolute overlay above tab bar ────── */}
      {isSelectionMode && (
        <SelectionBar
          count={selectedIds.size}
          totalCount={activePageBookings.length}
          tab={activeTab}
          onToggleAll={toggleSelectAll}
          onExit={exitSelectionMode}
          onAction={handleBatchAction}
        />
      )}

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
    </View>
  );
}
