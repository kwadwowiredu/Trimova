import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Scissors,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react-native';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMins: number;
}

const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Executive Fade', description: 'Precision skin fade with lineup', price: 80, durationMins: 45 },
  { id: '2', name: 'Haircut & Beard', description: 'Full haircut + beard shaping and lineup', price: 100, durationMins: 60 },
  { id: '3', name: 'Beard Trim', description: 'Clean beard shape and edge-up', price: 50, durationMins: 30 },
  { id: '4', name: 'Kids Haircut', description: 'Quick and careful cut for kids under 12', price: 45, durationMins: 30 },
];

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120];

// ─── Delete confirm ────────────────────────────────────────────────────────────

// ─── Service form modal ────────────────────────────────────────────────────────

interface FormState { name: string; description: string; price: string; durationMins: number; }

function ServiceFormModal({
  visible,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial: FormState | null;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState(initial?.name     ?? '');
  const [desc,     setDesc]     = useState(initial?.description ?? '');
  const [price,    setPrice]    = useState(initial?.price    ?? '');
  const [duration, setDuration] = useState(initial?.durationMins ?? 30);
  const [nameErr,  setNameErr]  = useState('');
  const [priceErr, setPriceErr] = useState('');

  const isEdit = !!initial;

  function handleSubmit() {
    let valid = true;
    if (!name.trim()) { setNameErr('Service name is required'); valid = false; } else setNameErr('');
    if (!price.trim() || isNaN(Number(price))) { setPriceErr('Enter a valid price'); valid = false; } else setPriceErr('');
    if (!valid) return;
    onSubmit({ name: name.trim(), description: desc.trim(), price, durationMins: duration });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A202C' }}>{isEdit ? 'Edit Service' : 'Add Service'}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={22} color="#4A5568" /></Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>

            {/* Name */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Service Name *</Text>
            <TextInput
              value={name} onChangeText={setName} placeholder="e.g. Executive Fade"
              placeholderTextColor="#CBD5E0"
              style={{ backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A202C', borderWidth: 1.5, borderColor: nameErr ? '#E53E3E' : '#E2E8F0', marginBottom: nameErr ? 4 : 14 }}
            />
            {nameErr ? <Text style={{ color: '#E53E3E', fontSize: 11, marginBottom: 10 }}>{nameErr}</Text> : null}

            {/* Description */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Description (optional)</Text>
            <TextInput
              value={desc} onChangeText={setDesc} placeholder="Brief description of the service"
              placeholderTextColor="#CBD5E0" multiline numberOfLines={3}
              style={{ backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A202C', borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 14, textAlignVertical: 'top', minHeight: 80 }}
            />

            {/* Price */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Price (GHS) *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: priceErr ? '#E53E3E' : '#E2E8F0', marginBottom: priceErr ? 4 : 14 }}>
              <Text style={{ fontSize: 15, color: '#A0AEC0', marginRight: 4 }}>₵</Text>
              <TextInput value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor="#CBD5E0" keyboardType="decimal-pad" style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: '#1A202C' }} />
            </View>
            {priceErr ? <Text style={{ color: '#E53E3E', fontSize: 11, marginBottom: 10 }}>{priceErr}</Text> : null}

            {/* Duration */}
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 20 }}>
              {DURATION_OPTIONS.map((mins) => (
                <Pressable key={mins} onPress={() => setDuration(mins)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: duration === mins ? '#3c3cb9' : '#f1f2f3', borderWidth: 1.5, borderColor: duration === mins ? '#3c3cb9' : 'transparent' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: duration === mins ? '#fff' : '#4A5568' }}>
                    {mins >= 60 ? `${mins / 60}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={handleSubmit} style={{ backgroundColor: '#3c3cb9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{isEdit ? 'Save Changes' : 'Add Service'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();

  const [services,   setServices]   = useState<Service[]>(INITIAL_SERVICES);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  function handleAddOrEdit(form: FormState) {
    if (editTarget) {
      setServices((prev) => prev.map((s) => s.id === editTarget.id ? { ...s, ...form, price: Number(form.price) } : s));
    } else {
      setServices((prev) => [{ id: Date.now().toString(), ...form, price: Number(form.price) }, ...prev]);
    }
    setEditTarget(null);
    // TODO: POST/PATCH /api/barber/services
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete Service', 'Remove this service from your menu?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setServices((prev) => prev.filter((s) => s.id !== id));
        // TODO: DELETE /api/barber/services/:id
      }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Services</Text>
        <Text style={{ fontSize: 13, color: '#A0AEC0' }}>{services.length} services</Text>
      </View>

      {services.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
          <Scissors size={52} color="#CBD5E0" />
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A202C', textAlign: 'center' }}>No services added yet</Text>
          <Text style={{ fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20 }}>
            Add your barbering services so clients can book them from your profile.
          </Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 16,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
            }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0e0ff', alignItems: 'center', justifyContent: 'center' }}>
                <Scissors size={18} color="#3c3cb9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C' }}>{item.name}</Text>
                <Text style={{ fontSize: 12, color: '#A0AEC0', marginTop: 1 }}>
                  {item.durationMins >= 60 ? `${Math.floor(item.durationMins / 60)}h${item.durationMins % 60 ? ` ${item.durationMins % 60}m` : ''}` : `${item.durationMins}m`}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#3c3cb9' }}>₵{item.price}</Text>
              <Pressable onPress={() => { setEditTarget(item); setShowModal(true); }} hitSlop={8}>
                <Pencil size={16} color="#A0AEC0" />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8}>
                <Trash2 size={16} color="#E53E3E" />
              </Pressable>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => { setEditTarget(null); setShowModal(true); }}
        style={{
          position: 'absolute', bottom: insets.bottom + 24, right: 20,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#3c3cb9',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#3c3cb9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
        }}
      >
        <Plus size={26} color="#ffffff" />
      </Pressable>

      <ServiceFormModal
        visible={showModal}
        initial={editTarget ? { name: editTarget.name, description: editTarget.description, price: String(editTarget.price), durationMins: editTarget.durationMins } : null}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSubmit={handleAddOrEdit}
      />
    </View>
  );
}
