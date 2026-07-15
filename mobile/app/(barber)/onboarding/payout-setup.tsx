import { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Phone, Building2, ChevronDown, Lock } from 'lucide-react-native';
import { OB } from '@/components/onboarding/tokens';
import { StepHeader, OnboardingFooter } from '@/components/onboarding/StepHeader';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';

type Mode = 'mobile_money' | 'bank';

const MOMO_PROVIDERS = ['MTN Mobile Money', 'Telecel Cash', 'AT Money'];
const BANKS = ['GCB Bank', 'Ecobank', 'Stanbic Bank', 'Fidelity Bank'];

function PickerSheet({
  visible, title, options, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: OB.overlay }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: OB.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: OB.outlineVariant, alignSelf: 'center', marginTop: 10, marginBottom: 4 }} />
        <Text style={{ fontSize: 17, fontWeight: '800', color: OB.onSurface, paddingHorizontal: 20, paddingVertical: 14 }}>{title}</Text>
        {options.map((o) => (
          <Pressable key={o} onPress={() => { onSelect(o); onClose(); }} style={{ paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: OB.border }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: OB.onSurface }}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

export default function OnboardingPayoutScreen() {
  const insets = useSafeAreaInsets();
  const { mergeUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>('mobile_money');
  const [momoProvider, setMomoProvider] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [picker, setPicker] = useState<'momo' | 'bank' | null>(null);
  const [saving, setSaving] = useState(false);

  const canContinue = mode === 'mobile_money'
    ? !!momoProvider && walletNumber.trim().length >= 9 && accountName.trim().length > 0
    : !!bank && accountNumber.trim().length > 0 && accountName.trim().length > 0;

  async function handleComplete() {
    setSaving(true);
    try {
      const payload = mode === 'mobile_money'
        ? { payoutType: 'mobile_money', payoutProvider: momoProvider, payoutAccountNumber: walletNumber.trim(), payoutAccountName: accountName.trim() }
        : { payoutType: 'bank', payoutProvider: bank, payoutAccountNumber: accountNumber.trim(), payoutAccountName: accountName.trim() };
      const res = await authService.updateProfile(payload);
      mergeUser(res.data.data as unknown as Record<string, unknown>);
    } catch {
      // best-effort — editable later in Settings › Payout.
    } finally {
      setSaving(false);
      router.push('/(barber)/onboarding/success');
    }
  }

  const inputStyle = {
    backgroundColor: OB.surfaceContainerLowest, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: OB.onSurface, borderWidth: 1, borderColor: OB.outlineVariant,
  } as const;
  const label = { fontSize: 13, fontWeight: '700' as const, color: OB.onSurface, marginBottom: 7 };

  return (
    <View style={{ flex: 1, backgroundColor: OB.background, paddingTop: insets.top }}>
      <StepHeader step={7} onBack={() => router.back()} onSkip={() => router.push('/(barber)/onboarding/success')} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: OB.onBackground }}>Payout Method</Text>
        <Text style={{ fontSize: 15, color: OB.onSurfaceVariant, lineHeight: 22, marginTop: 6 }}>
          Choose where you'd like to receive your earnings. Payouts run on the 1st and 15th of each month.
        </Text>

        {/* Segmented selector */}
        <View style={{ flexDirection: 'row', backgroundColor: OB.surfaceContainerHigh, borderRadius: 14, padding: 4, marginTop: 22 }}>
          {([['mobile_money', 'Mobile Money'], ['bank', 'Bank Account']] as const).map(([m, txt]) => {
            const on = mode === m;
            return (
              <Pressable key={m} onPress={() => setMode(m)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: on ? OB.primaryContainer : 'transparent' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: on ? OB.onPrimary : OB.onSurfaceVariant }}>{txt}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Mode-specific fields */}
        <View style={{ marginTop: 22, gap: 18 }}>
          {mode === 'mobile_money' ? (
            <>
              <View>
                <Text style={label}>Network Provider</Text>
                <Pressable onPress={() => setPicker('momo')} style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 15, color: momoProvider ? OB.onSurface : OB.textFaint }}>{momoProvider || 'Select network'}</Text>
                  <ChevronDown size={18} color={OB.outline} />
                </Pressable>
              </View>
              <View>
                <Text style={label}>Wallet Number</Text>
                <View style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }}>
                  <Phone size={18} color={OB.outline} />
                  <TextInput
                    value={walletNumber} onChangeText={setWalletNumber}
                    placeholder="024 XXX XXXX" placeholderTextColor={OB.textFaint}
                    keyboardType="number-pad" maxLength={15}
                    style={{ flex: 1, marginLeft: 10, fontSize: 15, color: OB.onSurface, paddingVertical: 14 }}
                  />
                </View>
              </View>
              <View>
                <Text style={label}>Account Name</Text>
                <TextInput
                  value={accountName} onChangeText={setAccountName}
                  placeholder="Name registered on the wallet" placeholderTextColor={OB.textFaint}
                  style={inputStyle}
                />
              </View>
            </>
          ) : (
            <>
              <View>
                <Text style={label}>Bank Name</Text>
                <Pressable onPress={() => setPicker('bank')} style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontSize: 15, color: bank ? OB.onSurface : OB.textFaint }}>{bank || 'Select bank'}</Text>
                  <ChevronDown size={18} color={OB.outline} />
                </Pressable>
              </View>
              <View>
                <Text style={label}>Account Number</Text>
                <TextInput
                  value={accountNumber} onChangeText={setAccountNumber}
                  placeholder="Account number" placeholderTextColor={OB.textFaint}
                  keyboardType="number-pad" style={inputStyle}
                />
              </View>
              <View>
                <Text style={label}>Account Holder Name</Text>
                <TextInput
                  value={accountName} onChangeText={setAccountName}
                  placeholder="Full name on account" placeholderTextColor={OB.textFaint}
                  style={inputStyle}
                />
              </View>
            </>
          )}
        </View>

        {/* Security banner */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, backgroundColor: OB.surfaceContainerLow, borderRadius: 14, borderWidth: 1, borderColor: OB.border, padding: 16 }}>
          <Lock size={18} color={OB.secondary} />
          <Text style={{ flex: 1, fontSize: 12, color: OB.onSurfaceVariant, lineHeight: 18 }}>
            Your payout details are encrypted and stored securely. Trimova never shares them with clients.
          </Text>
        </View>

        {/* Lower graphic */}
        <View style={{ marginTop: 22, borderRadius: 16, overflow: 'hidden' }}>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            source={require('../../../assets/payout.jpg')}
            style={{ width: '100%', height: 130 }}
            resizeMode="cover"
          />
        </View>
      </ScrollView>

      <OnboardingFooter
        onPrevious={() => router.back()}
        onContinue={handleComplete}
        continueLabel="Complete Setup"
        loading={saving}
        canContinue={canContinue}
        insetBottom={insets.bottom}
      />

      <PickerSheet
        visible={picker === 'momo'}
        title="Network Provider"
        options={MOMO_PROVIDERS}
        onSelect={setMomoProvider}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'bank'}
        title="Bank Name"
        options={BANKS}
        onSelect={setBank}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}
