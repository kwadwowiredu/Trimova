import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Pencil,
  Check,
  X,
  Phone,
  Building2,
  ChevronDown,
} from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';

interface PayoutMethod {
  provider: string;
  accountName: string;
  accountNumber: string;
  type: 'mobile_money' | 'bank';
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: 'success' | 'pending';
  reference: string;
}

const PROVIDERS = ['MTN MoMo', 'Telecel Cash', 'AT Money', 'GCB Bank', 'Ecobank', 'Fidelity Bank', 'Standard Chartered'];

const EMPTY_METHOD: PayoutMethod = {
  provider: 'MTN MoMo',
  accountName: '',
  accountNumber: '',
  type: 'mobile_money',
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '15 Jun 2026', amount: 1240,  status: 'success', reference: 'TRV-2026-0615' },
  { id: '2', date: '1 Jun 2026',  amount: 980,   status: 'success', reference: 'TRV-2026-0601' },
  { id: '3', date: '15 May 2026', amount: 1560,  status: 'success', reference: 'TRV-2026-0515' },
  { id: '4', date: '1 May 2026',  amount: 820,   status: 'success', reference: 'TRV-2026-0501' },
  { id: '5', date: '15 Apr 2026', amount: 640,   status: 'pending', reference: 'TRV-2026-0415' },
];

function ProviderPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, paddingHorizontal: 20, paddingVertical: 14 }}>Select Provider</Text>
        {PROVIDERS.map((p) => (
          <Pressable
            key={p}
            onPress={() => { onSelect(p); onClose(); }}
            style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: c.border }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

export default function PayoutScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user, updateUser, mergeUser } = useAuthStore();
  const savedMethod = (user as (typeof user & { payout?: PayoutMethod }) | null)?.payout;

  const [method,     setMethod]     = useState<PayoutMethod>(savedMethod ?? EMPTY_METHOD);
  const [isEditing,  setIsEditing]  = useState(false);
  const [draft,      setDraft]      = useState<PayoutMethod>(savedMethod ?? EMPTY_METHOD);
  const [showPicker, setShowPicker] = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Re-seed when the background sync delivers fresh data after mount.
  useEffect(() => {
    if (isEditing || saving || !savedMethod) return;
    setMethod(savedMethod);
    setDraft(savedMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('Payout method updated');
  const [toastOk,  setToastOk]  = useState(true);

  function showToast(msg: string, ok: boolean) {
    setToastMsg(msg);
    setToastOk(ok);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        payoutProvider:      draft.provider,
        payoutAccountName:   draft.accountName,
        payoutAccountNumber: draft.accountNumber,
        payoutType:          draft.type,
      });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      setMethod({ ...draft });
      setIsEditing(false);
      showToast('Payout method saved', true);
    } catch (e) {
      // Honest server feedback — no optimistic success.
      showToast(getApiErrorMessage(e) || "Couldn't reach the server", false);
    } finally {
      setSaving(false);
    }
  }

  const activeProvider = isEditing ? draft.provider : method.provider;
  const isMoMo = ['momo', 'cash', 'money', 'at'].some((k) => activeProvider.toLowerCase().includes(k));

  const labelStyle = { fontSize: 11, fontWeight: '800' as const, color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 5 };
  const inputStyle = { backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: c.text, borderWidth: 1.5, borderColor: c.accent } as const;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Payout Method</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Mobile Money & bank payouts</Text>
        </View>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => { setDraft(method); setIsEditing(false); }} disabled={saving} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.5 : 1 }}>
              <X size={18} color={c.textMuted} />
            </Pressable>
            <Pressable onPress={handleSave} disabled={saving} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Check size={18} color="#ffffff" />}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { setDraft(method); setIsEditing(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={17} color={c.accent} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Active method card (brand purple in both themes) */}
        {!isEditing ? (
          <View style={{
            backgroundColor: '#2D27A8',
            borderRadius: 24,
            padding: 22,
            marginBottom: 16,
            overflow: 'hidden',
            shadowColor: '#2D27A8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
          }}>
            <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#7B5BC4', opacity: 0.4, top: -40, right: -40 }} />
            <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#C084FC', opacity: 0.2, bottom: -20, left: -20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                {method.type === 'mobile_money' ? <Phone size={20} color="#ffffff" /> : <Building2 size={20} color="#ffffff" />}
              </View>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Active Payout Method</Text>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>{method.provider}</Text>
              </View>
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 }}>Account Name</Text>
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 12 }}>{method.accountName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 }}>
              {method.type === 'mobile_money' ? 'Phone Number' : 'Account Number'}
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '600' }}>{method.accountNumber}</Text>
          </View>
        ) : (
          /* Edit form */
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 16, gap: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 4 }}>Update Payout Details</Text>

            {/* Provider picker */}
            <View>
              <Text style={labelStyle}>Provider</Text>
              <Pressable onPress={() => setShowPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: c.accent }}>
                <Text style={{ flex: 1, fontSize: 14, color: c.text, fontWeight: '500' }}>{draft.provider}</Text>
                <ChevronDown size={16} color={c.textFaint} />
              </Pressable>
            </View>

            {/* Account name */}
            <View>
              <Text style={labelStyle}>Account Name</Text>
              <TextInput
                value={draft.accountName} onChangeText={(t) => setDraft((p) => ({ ...p, accountName: t }))}
                placeholder="Full name on account" placeholderTextColor={c.textFaint}
                style={inputStyle}
              />
            </View>

            {/* Phone / account number */}
            <View>
              <Text style={labelStyle}>{isMoMo ? 'Phone Number' : 'Account Number'}</Text>
              <TextInput
                value={draft.accountNumber} onChangeText={(t) => setDraft((p) => ({ ...p, accountNumber: t }))}
                placeholder={isMoMo ? '024 000 0000' : 'Account number'}
                placeholderTextColor={c.textFaint} keyboardType={isMoMo ? 'phone-pad' : 'default'}
                style={inputStyle}
              />
            </View>

            <View style={{ backgroundColor: c.accentSoft, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 12, color: c.accent, lineHeight: 18 }}>
                Payouts are processed every 1st and 15th of the month. Changes apply to the next payout cycle.
              </Text>
            </View>
          </View>
        )}

        {/* Transaction history */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Payout History
        </Text>
        {MOCK_TRANSACTIONS.map((tx) => (
          <View key={tx.id} style={{
            backgroundColor: c.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
            padding: 14,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>₵{tx.amount.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 2 }}>{tx.date}  ·  {tx.reference}</Text>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
              backgroundColor: tx.status === 'success' ? 'rgba(56,161,105,0.12)' : 'rgba(214,158,46,0.12)',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tx.status === 'success' ? c.success : c.warning }}>
                {tx.status === 'success' ? 'Success' : 'Pending'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <ProviderPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(p) => setDraft((prev) => ({ ...prev, provider: p, type: ['GCB Bank','Ecobank','Fidelity Bank','Standard Chartered'].includes(p) ? 'bank' : 'mobile_money' }))}
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
