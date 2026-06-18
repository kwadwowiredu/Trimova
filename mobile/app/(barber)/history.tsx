import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
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
} from 'lucide-react-native';

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
  { id: '1',  clientName: 'Kwame Mensah',  serviceName: 'Executive Fade',    date: '15 Jun 2026', time: '10:00', price: 80,  staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '2',  clientName: 'Ama Boateng',   serviceName: 'Haircut & Beard',   date: '14 Jun 2026', time: '11:30', price: 100, staffName: 'Kwame Mensah',  isArchived: false },
  { id: '3',  clientName: 'Kofi Asante',   serviceName: 'Beard Trim',        date: '13 Jun 2026', time: '14:00', price: 50,  staffName: 'Kofi Asare',    isArchived: false },
  { id: '4',  clientName: 'Yaw Mensah',    serviceName: 'Skin Fade',         date: '12 Jun 2026', time: '09:00', price: 90,  staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '5',  clientName: 'Abena Osei',    serviceName: 'Kids Haircut',      date: '11 Jun 2026', time: '15:00', price: 45,  staffName: 'Ama Boateng',   isArchived: false },
  { id: '6',  clientName: 'Fiifi Andoh',   serviceName: 'Haircut & Beard',   date: '10 Jun 2026', time: '16:30', price: 100, staffName: 'Kwadwo Yiadom', isArchived: false },
  { id: '7',  clientName: 'Akua Frempong', serviceName: 'Shampoo & Style',   date: '9 Jun 2026',  time: '11:00', price: 70,  staffName: 'Ama Boateng',   isArchived: false },
  { id: '8',  clientName: 'Nana Kwame',    serviceName: 'Executive Fade',    date: '8 Jun 2026',  time: '13:00', price: 80,  staffName: 'Kofi Asare',    isArchived: false },
];

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();

  const [items,      setItems]      = useState<HistoryItem[]>(MOCK_HISTORY);
  const [isArchive,  setIsArchive]  = useState(false);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());

  const visible = items.filter((i) => !i.isArchived);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === visible.length) setSelected(new Set());
    else setSelected(new Set(visible.map((i) => i.id)));
  }

  function handleArchive() {
    const ids = Array.from(selected);
    setItems((prev) => prev.map((i) => ids.includes(i.id) ? { ...i, isArchived: true } : i));
    setSelected(new Set());
    setIsArchive(false);
    // TODO: PATCH /api/barber/appointments/:id/archive for each id
  }

  function exitArchive() {
    setIsArchive(false);
    setSelected(new Set());
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>History</Text>
        <Pressable
          onPress={isArchive ? exitArchive : () => setIsArchive(true)}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isArchive ? '#f1f2f3' : '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}
        >
          {isArchive ? <X size={18} color="#4A5568" /> : <Archive size={17} color="#3c3cb9" />}
        </Pressable>
      </View>

      {visible.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
          <Archive size={52} color="#CBD5E0" />
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A202C', textAlign: 'center' }}>No history yet</Text>
          <Text style={{ fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20 }}>
            Completed appointments will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: isArchive ? 120 : 48 }}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            return (
              <Pressable
                onPress={() => isArchive ? toggleSelect(item.id) : undefined}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#3c3cb9' : '#E2E8F0',
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
                }}
              >
                {isArchive && (
                  <View>
                    {isSelected
                      ? <CheckSquare size={20} color="#3c3cb9" />
                      : <Square size={20} color="#CBD5E0" />}
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C' }}>{item.clientName}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#38A169' }}>₵{item.price}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Scissors size={11} color="#A0AEC0" />
                    <Text style={{ fontSize: 12, color: '#718096' }}>{item.serviceName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} color="#CBD5E0" />
                      <Text style={{ fontSize: 11, color: '#A0AEC0' }}>{item.date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} color="#CBD5E0" />
                      <Text style={{ fontSize: 11, color: '#A0AEC0' }}>{item.time}</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Archive action bar */}
      {isArchive && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: '#fff',
          borderTopWidth: 1, borderTopColor: '#f1f2f3',
          paddingHorizontal: 20, paddingVertical: 16,
          paddingBottom: insets.bottom + 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
        }}>
          <Pressable onPress={toggleAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {selected.size === visible.length && visible.length > 0
              ? <CheckSquare size={18} color="#3c3cb9" />
              : <Square size={18} color="#A0AEC0" />}
            <Text style={{ fontSize: 13, fontWeight: '600', color: selected.size === visible.length && visible.length > 0 ? '#3c3cb9' : '#A0AEC0' }}>
              {selected.size === visible.length && visible.length > 0 ? 'Deselect All' : 'Select All'}
            </Text>
          </Pressable>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#4A5568', textAlign: 'center' }}>
            {selected.size > 0 ? `${selected.size} selected` : 'Tap to select'}
          </Text>
          <Pressable
            onPress={handleArchive}
            disabled={selected.size === 0}
            style={{
              backgroundColor: selected.size === 0 ? '#f1f2f3' : '#3c3cb9',
              borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            <Archive size={15} color={selected.size === 0 ? '#A0AEC0' : '#fff'} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: selected.size === 0 ? '#A0AEC0' : '#fff' }}>Archive</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
