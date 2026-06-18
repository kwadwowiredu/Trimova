import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Pencil,
  Check,
  X,
  CreditCard,
  Phone,
  Building2,
  ChevronDown,
} from 'lucide-react-native';

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

const MOCK_METHOD: PayoutMethod = {
  provider: 'MTN MoMo',
  accountName: 'Kwadwo Yiadom',
  accountNumber: '024 123 4567',
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A202C', paddingHorizontal: 20, paddingVertical: 14 }}>Select Provider</Text>
        {PROVIDERS.map((p) => (
          <Pressable
            key={p}
            onPress={() => { onSelect(p); onClose(); }}
            style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f2f3' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A202C' }}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

export default function PayoutScreen() {
  const insets = useSafeAreaInsets();

  const [method,     setMethod]     = useState<PayoutMethod>(MOCK_METHOD);
  const [isEditing,  setIsEditing]  = useState(false);
  const [draft,      setDraft]      = useState<PayoutMethod>(MOCK_METHOD);
  const [showPicker, setShowPicker] = useState(false);

  function handleSave() {
    setMethod(draft);
    setIsEditing(false);
    // TODO: PATCH /api/barber/payout-method
  }

  const isMoMo = (isEditing ? draft.provider : method.provider).toLowerCase().includes('momo') ||
    (isEditing ? draft.provider : method.provider).toLowerCase().includes('cash') ||
    (isEditing ? draft.provider : method.provider).toLowerCase().includes('money') ||
    (isEditing ? draft.provider : method.provider).toLowerCase().includes('at');

  const providerColor = method.provider.includes('MTN') ? '#F59E0B' :
    method.provider.includes('Telecel') ? '#E53E3E' :
    method.provider.includes('AT') ? '#3c3cb9' : '#1A202C';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Payout Method</Text>
        {isEditing ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => { setDraft(method); setIsEditing(false); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} color="#4A5568" />
            </Pressable>
            <Pressable onPress={handleSave} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { setDraft(method); setIsEditing(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={17} color="#3c3cb9" />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Active method card */}
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
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 16, gap: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C', marginBottom: 4 }}>Update Payout Details</Text>

            {/* Provider picker */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Provider</Text>
              <Pressable onPress={() => setShowPicker(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: '#3c3cb9' }}>
                <Text style={{ flex: 1, fontSize: 14, color: '#1A202C', fontWeight: '500' }}>{draft.provider}</Text>
                <ChevronDown size={16} color="#A0AEC0" />
              </Pressable>
            </View>

            {/* Account name */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>Account Name</Text>
              <TextInput
                value={draft.accountName} onChangeText={(t) => setDraft((p) => ({ ...p, accountName: t }))}
                placeholder="Full name on account" placeholderTextColor="#CBD5E0"
                style={{ backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A202C', borderWidth: 1.5, borderColor: '#3c3cb9' }}
              />
            </View>

            {/* Phone / account number */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
                {isMoMo ? 'Phone Number' : 'Account Number'}
              </Text>
              <TextInput
                value={draft.accountNumber} onChangeText={(t) => setDraft((p) => ({ ...p, accountNumber: t }))}
                placeholder={isMoMo ? '024 000 0000' : 'Account number'}
                placeholderTextColor="#CBD5E0" keyboardType={isMoMo ? 'phone-pad' : 'default'}
                style={{ backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: '#1A202C', borderWidth: 1.5, borderColor: '#3c3cb9' }}
              />
            </View>

            <View style={{ backgroundColor: 'rgba(60,60,185,0.07)', borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 12, color: '#3c3cb9', lineHeight: 18 }}>
                Payouts are processed every 1st and 15th of the month. Changes apply to the next payout cycle.
              </Text>
            </View>
          </View>
        )}

        {/* Transaction history */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
          Payout History
        </Text>
        {MOCK_TRANSACTIONS.map((tx) => (
          <View key={tx.id} style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 14,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C' }}>₵{tx.amount.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>{tx.date}  ·  {tx.reference}</Text>
            </View>
            <View style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
              backgroundColor: tx.status === 'success' ? 'rgba(56,161,105,0.1)' : 'rgba(214,158,46,0.1)',
            }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tx.status === 'success' ? '#38A169' : '#D69E2E' }}>
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
    </View>
  );
}
