import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Archive,
  X,
  CheckSquare,
  Square,
  Calendar,
  Clock,
  Scissors,
  Check,
  RotateCcw,
} from 'lucide-react-native';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useThemeColors } from '@/hooks/useThemeColors';

interface HistoryItem {
  id: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  price: number;
  staffName: string;
  isArchived: boolean;
}

const MOCK_HISTORY: HistoryItem[] = [
  { id: '1',  clientName: 'Kwame Mensah',  serviceName: 'Executive Fade',  date: '15 Jun 2026', time: '10:00', price: 80,  staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '2',  clientName: 'Ama Boateng',   serviceName: 'Haircut & Beard', date: '14 Jun 2026', time: '11:30', price: 100, staffName: 'Kwame Mensah',  isArchived: false },
  { id: '3',  clientName: 'Kofi Asante',   serviceName: 'Beard Trim',      date: '13 Jun 2026', time: '14:00', price: 50,  staffName: 'Kofi Asare',    isArchived: false },
  { id: '4',  clientName: 'Yaw Mensah',    serviceName: 'Skin Fade',       date: '12 Jun 2026', time: '09:00', price: 90,  staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '5',  clientName: 'Abena Osei',    serviceName: 'Kids Haircut',    date: '11 Jun 2026', time: '15:00', price: 45,  staffName: 'Ama Boateng',   isArchived: false },
  { id: '6',  clientName: 'Fiifi Andoh',   serviceName: 'Haircut & Beard', date: '10 Jun 2026', time: '16:30', price: 100, staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '7',  clientName: 'Akua Frempong', serviceName: 'Shampoo & Style', date: '9 Jun 2026',  time: '11:00', price: 70,  staffName: 'Ama Boateng',   isArchived: false },
  { id: '8',  clientName: 'Nana Kwame',    serviceName: 'Executive Fade',  date: '8 Jun 2026',  time: '13:00', price: 80,  staffName: 'Kofi Asare',    isArchived: false },
  { id: '9',  clientName: 'Esi Boateng',   serviceName: 'Beard Trim',      date: '5 Jun 2026',  time: '10:30', price: 50,  staffName: 'Kwadwo Yiadom', isArchived: true },
  { id: '10', clientName: 'Kojo Mensah',   serviceName: 'Executive Fade',  date: '3 Jun 2026',  time: '14:00', price: 80,  staffName: 'Kofi Asare',    isArchived: true },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [items,       setItems]      = useState<HistoryItem[]>(MOCK_HISTORY);
  const [tab,         setTab]        = useState<'active' | 'archived'>('active');
  const [isSelectMode, setSelectMode] = useState(false);
  const [selected,    setSelected]   = useState<Set<string>>(new Set());
  const [unarchiveId, setUnarchiveId] = useState<string | null>(null);

  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast() {
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  const activeItems   = items.filter((i) => !i.isArchived);
  const archivedItems = items.filter((i) => i.isArchived);
  const listItems     = tab === 'active' ? activeItems : archivedItems;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === activeItems.length) setSelected(new Set());
    else setSelected(new Set(activeItems.map((i) => i.id)));
  }

  function handleArchive() {
    const ids = Array.from(selected);
    setItems((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, isArchived: true } : i));
    setSelected(new Set());
    setSelectMode(false);
    showToast();
    // TODO: PATCH /api/barber/appointments/:id/archive for each id
  }

  function handleUnarchive() {
    if (!unarchiveId) return;
    setItems((prev) => prev.map((i) => i.id === unarchiveId ? { ...i, isArchived: false } : i));
    setUnarchiveId(null);
    showToast();
    // TODO: PATCH /api/barber/appointments/:id/unarchive
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const allSelected = selected.size === activeItems.length && activeItems.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>History</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Your completed appointments</Text>
        </View>
        {tab === 'active' && (
          <Pressable
            onPress={isSelectMode ? exitSelectMode : () => setSelectMode(true)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
          >
            {isSelectMode ? <X size={18} color={c.textMuted} /> : <Archive size={17} color={c.accent} />}
          </Pressable>
        )}
      </View>

      {/* Tab row */}
      <View style={{ flexDirection: 'row', backgroundColor: c.surface, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8 }}>
        {(['active', 'archived'] as const).map((t) => {
          const count = t === 'active' ? activeItems.length : archivedItems.length;
          const isActive = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => { setTab(t); exitSelectMode(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
                backgroundColor: isActive ? c.accent : c.surfaceAlt,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#fff' : c.textFaint }}>
                {t === 'active' ? 'Active' : 'Archived'}
              </Text>
              {count > 0 && (
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : c.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#fff' : c.textMuted }}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {listItems.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
          <Archive size={52} color={c.textFaint} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>
            {tab === 'active' ? 'No history yet' : 'No archived items'}
          </Text>
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>
            {tab === 'active' ? 'Completed appointments will appear here.' : 'Items you archive will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: isSelectMode ? 120 : 48 }}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            return (
              <Pressable
                onPress={() => {
                  if (isSelectMode && tab === 'active') toggleSelect(item.id);
                }}
                onLongPress={() => {
                  if (tab === 'archived') setUnarchiveId(item.id);
                }}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isSelected ? c.accent : c.border,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {isSelectMode && tab === 'active' && (
                  <View>
                    {isSelected
                      ? <CheckSquare size={20} color={c.accent} />
                      : <Square size={20} color={c.textFaint} />}
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{item.clientName}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.success }}>₵{item.price}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Scissors size={11} color={c.textFaint} />
                    <Text style={{ fontSize: 12, color: c.textMuted }}>{item.serviceName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} color={c.textFaint} />
                      <Text style={{ fontSize: 11, color: c.textFaint }}>{item.date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color={c.textFaint} />
                      <Text style={{ fontSize: 11, color: c.textFaint }}>{item.time}</Text>
                    </View>
                  </View>
                </View>

                {tab === 'archived' && (
                  <Pressable onPress={() => setUnarchiveId(item.id)} hitSlop={8} style={{ padding: 6 }}>
                    <RotateCcw size={16} color={c.textMuted} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* Archive action bar */}
      {isSelectMode && tab === 'active' && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: c.surface,
          borderTopWidth: 1, borderTopColor: c.border,
          paddingHorizontal: 20, paddingVertical: 16,
          paddingBottom: insets.bottom + 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
        }}>
          <Pressable onPress={toggleAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {allSelected
              ? <CheckSquare size={18} color={c.accent} />
              : <Square size={18} color={c.textFaint} />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: allSelected ? c.accent : c.textFaint }}>
              {allSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: c.textMuted, textAlign: 'center' }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Tap to select'}
          </Text>
          <Pressable
            onPress={handleArchive}
            disabled={selected.size === 0}
            style={{
              backgroundColor: selected.size === 0 ? c.surfaceAlt : c.accent,
              borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            <Archive size={15} color={selected.size === 0 ? c.textFaint : '#fff'} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: selected.size === 0 ? c.textFaint : '#fff' }}>Archive</Text>
          </Pressable>
        </View>
      )}

      {/* Unarchive confirm */}
      <ConfirmModal
        visible={!!unarchiveId}
        onClose={() => setUnarchiveId(null)}
        onConfirm={handleUnarchive}
        title="Restore Appointment"
        message="Move this appointment back to your active history?"
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="warning"
      />

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: c.success, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        <Check size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
          {tab === 'active' ? 'Items archived' : 'Appointment restored'}
        </Text>
      </Animated.View>
    </View>
  );
}
