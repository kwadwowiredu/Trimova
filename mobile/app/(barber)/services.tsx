import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Scissors,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Clock,
  ChevronDown,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Popover, PopoverMenu, useAnchor } from '@/components/ui/Popover';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { servicesService } from '@/services/services';
import { useSuggestionStore } from '@/stores/suggestionStore';
import { getApiErrorMessage } from '@/services/api';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMins: number;
}

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90, 120];

function formatDuration(mins: number) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins} min`;
}

// ─── Service form modal ────────────────────────────────────────────────────────

interface FormState { name: string; description: string; price: string; durationMins: number; }

function ServiceFormModal({
  visible, initial, isEdit: isEditProp, onClose, onSubmit,
}: {
  visible: boolean;
  initial: FormState | null;
  /** Explicit edit flag — a prefilled suggestion still counts as "Add". */
  isEdit?: boolean;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const [name,     setName]     = useState('');
  const [desc,     setDesc]     = useState('');
  const [price,    setPrice]    = useState('');
  const [duration, setDuration] = useState(30);
  const [nameErr,  setNameErr]  = useState('');
  const [priceErr, setPriceErr] = useState('');
  const durPop = useAnchor();

  // Reset form every time the modal opens
  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
      setPrice(initial?.price ?? '');
      setDuration(initial?.durationMins ?? 30);
      setNameErr('');
      setPriceErr('');
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEdit = isEditProp ?? !!initial;

  function handleSubmit() {
    let valid = true;
    if (!name.trim()) { setNameErr('Service name is required'); valid = false; } else setNameErr('');
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0) {
      setPriceErr('Enter a valid price'); valid = false;
    } else setPriceErr('');
    if (!valid) return;
    onSubmit({ name: name.trim(), description: desc.trim(), price, durationMins: duration });
    onClose();
  }

  const inputStyle = {
    backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.border,
  } as const;
  const labelStyle = { fontSize: 11, fontWeight: '800' as const, color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 5 };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{isEdit ? 'Edit Service' : 'Add Service'}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={22} color={c.textMuted} /></Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}>

            {/* Name */}
            <Text style={labelStyle}>Service Name *</Text>
            <TextInput
              value={name} onChangeText={setName} placeholder="e.g. Executive Fade"
              placeholderTextColor={c.textFaint}
              style={{ ...inputStyle, borderColor: nameErr ? c.danger : c.border, marginBottom: nameErr ? 4 : 14 }}
            />
            {nameErr ? <Text style={{ color: c.danger, fontSize: 11, marginBottom: 10 }}>{nameErr}</Text> : null}

            {/* Description */}
            <Text style={labelStyle}>Description (optional)</Text>
            <TextInput
              value={desc} onChangeText={setDesc} placeholder="Brief description of the service"
              placeholderTextColor={c.textFaint} multiline numberOfLines={3}
              style={{ ...inputStyle, marginBottom: 14, textAlignVertical: 'top', minHeight: 80 }}
            />

            {/* Price + Duration side by side */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              {/* Price */}
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Price (GHS)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1.5, borderColor: priceErr ? c.danger : c.border }}>
                  <Text style={{ fontSize: 14, color: c.success, fontWeight: '700', marginRight: 4 }}>₵</Text>
                  <TextInput
                    value={price} onChangeText={setPrice} placeholder="0.00"
                    placeholderTextColor={c.textFaint} keyboardType="decimal-pad"
                    style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: c.success, fontWeight: '700' }}
                  />
                </View>
                {priceErr ? <Text style={{ color: c.danger, fontSize: 10, marginTop: 3 }}>{priceErr}</Text> : null}
              </View>

              {/* Duration */}
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Duration</Text>
                <Pressable
                  ref={durPop.ref}
                  onPress={durPop.open}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1.5, borderColor: durPop.isOpen ? c.accent : c.border, gap: 6 }}
                >
                  <Clock size={14} color={c.accent} />
                  <Text style={{ flex: 1, fontSize: 14, color: c.text, fontWeight: '600' }}>{formatDuration(duration)}</Text>
                  <ChevronDown size={14} color={c.textFaint} />
                </Pressable>
              </View>
            </View>

            <Pressable onPress={handleSubmit} style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{isEdit ? 'Save Changes' : 'Add Service'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Floating duration popover (opens above the field inside the sheet) */}
      <Popover anchor={durPop.anchor} onClose={durPop.close} width={150} placement="above">
        <PopoverMenu
          options={DURATION_OPTIONS.map((m) => ({ label: formatDuration(m), value: String(m) }))}
          selected={String(duration)}
          onSelect={(v) => { setDuration(Number(v)); durPop.close(); }}
        />
      </Popover>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [services,   setServices]   = useState<Service[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [prefill,    setPrefill]    = useState<FormState | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  // Returning from "See suggestions" opens the Add-Service form pre-filled.
  useFocusEffect(
    useCallback(() => {
      const { picked, clear } = useSuggestionStore.getState();
      if (picked) {
        setEditTarget(null);
        setPrefill({ name: picked, description: '', price: '', durationMins: 30 });
        setShowModal(true);
        clear();
      }
    }, []),
  );

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk,  setToastOk]  = useState(true);

  // Load this barber's own services from the DB on mount (per-account).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await servicesService.getMine();
        if (active) setServices(res.data.data.map((s) => ({
          id: s.id, name: s.name, description: s.description, price: s.price, durationMins: s.durationMins,
        })));
      } catch {
        // leave empty; the empty-state UI handles it
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function showToast(msg: string, ok = true) {
    setToastMsg(msg);
    setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  async function handleAddOrEdit(form: FormState) {
    const payload = { name: form.name, description: form.description, price: Number(form.price), durationMins: form.durationMins };
    const target = editTarget;
    setEditTarget(null);
    try {
      if (target) {
        const res = await servicesService.update(target.id, payload);
        const u = res.data.data;
        setServices((prev) => prev.map((s) => s.id === target.id
          ? { id: u.id, name: u.name, description: u.description, price: u.price, durationMins: u.durationMins } : s));
        showToast('Service updated', true);
      } else {
        const res = await servicesService.create(payload);
        const u = res.data.data;
        setServices((prev) => [{ id: u.id, name: u.name, description: u.description, price: u.price, durationMins: u.durationMins }, ...prev]);
        showToast('Service added', true);
      }
    } catch (e) {
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const id = deleteId;
    const previous = services;
    setServices((prev) => prev.filter((s) => s.id !== id)); // optimistic
    setDeleteId(null);
    try {
      await servicesService.remove(id);
      showToast('Service removed', true);
    } catch (e) {
      setServices(previous); // roll back
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Services</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Manage your services & pricing</Text>
        </View>
        <Text style={{ fontSize: 13, color: c.textFaint }}>{services.length} services</Text>
      </View>

      {/* See suggestions — quick-fill a service name */}
      <Pressable
        onPress={() => router.push('/(barber)/service-suggestions')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 }}
      >
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={17} color={c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>See suggestions</Text>
          <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>Pick from common cuts instead of typing</Text>
        </View>
        <ChevronRight size={18} color={c.textFaint} />
      </Pressable>

      {loading ? (
        <ListSkeleton count={4} />
      ) : services.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
          <Scissors size={52} color={c.textFaint} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>No services added yet</Text>
          <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>
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
              backgroundColor: c.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              padding: 16,
              marginBottom: 10,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors size={18} color={c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{item.name}</Text>
                  {item.description ? (
                    <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 2 }} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Clock size={11} color={c.textMuted} />
                    <Text style={{ fontSize: 12, color: c.textMuted }}>{formatDuration(item.durationMins)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: c.success }}>₵{item.price}</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Pressable onPress={() => { setEditTarget(item); setShowModal(true); }} hitSlop={8}>
                      <Pencil size={15} color={c.textFaint} />
                    </Pressable>
                    <Pressable onPress={() => setDeleteId(item.id)} hitSlop={8}>
                      <Trash2 size={15} color={c.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
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
          backgroundColor: c.accent,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
        }}
      >
        <Plus size={26} color="#ffffff" />
      </Pressable>

      <ServiceFormModal
        visible={showModal}
        isEdit={!!editTarget}
        initial={editTarget
          ? { name: editTarget.name, description: editTarget.description, price: String(editTarget.price), durationMins: editTarget.durationMins }
          : prefill}
        onClose={() => { setShowModal(false); setEditTarget(null); setPrefill(null); }}
        onSubmit={handleAddOrEdit}
      />

      <ConfirmModal
        visible={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Remove Service"
        message="This service will be removed from your menu. Existing bookings won't be affected."
        confirmLabel="Remove Service"
        cancelLabel="Keep"
        variant="danger"
      />

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: toastOk ? c.success : c.danger, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        {toastOk ? <Check size={18} color="#fff" /> : <X size={18} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 }}>{toastMsg}</Text>
      </Animated.View>
    </View>
  );
}
