import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, ShieldCheck, Check } from 'lucide-react-native';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';
import { meetsAllPasswordRules } from '@/utils/validators';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { tapLight } from '@/utils/haptics';

const labelStyle = {
  fontSize: 11, fontWeight: '800' as const, color: T.textFaint,
  letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6,
};

/**
 * Declared at MODULE level on purpose. Defining this inside the screen makes
 * React see a brand-new component type on every keystroke, which unmounts the
 * TextInput, drops focus and dismisses the keyboard after a single character.
 */
function PwField({
  value, onChange, placeholder, show, onToggleShow,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: T.input, borderRadius: 14, paddingHorizontal: 16,
      borderWidth: HAIRLINE, borderColor: T.border,
    }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={T.textFaint}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: T.text }}
      />
      <Pressable onPress={onToggleShow} hitSlop={8}>
        {show ? <EyeOff size={18} color={T.textFaint} /> : <Eye size={18} color={T.textFaint} />}
      </Pressable>
    </View>
  );
}

export default function ClientSecurityScreen() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const rules = [
    { label: 'At least 8 characters', met: next.length >= 8 },
    { label: '1 uppercase letter',    met: /[A-Z]/.test(next) },
    { label: '1 number',              met: /[0-9]/.test(next) },
  ];

  async function handleChange() {
    if (!current) { Alert.alert('Current password required', 'Enter your current password first.'); return; }
    if (!meetsAllPasswordRules(next)) { Alert.alert('Weak password', 'Your new password must be 8+ characters with an uppercase letter and a number.'); return; }
    if (next !== confirm) { Alert.alert("Passwords don't match", 'Your new password and confirmation must match.'); return; }
    setSaving(true);
    try {
      await authService.changePassword(current, next);
      Alert.alert('Password changed', 'Your password has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Change failed', getApiErrorMessage(e) || "Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const toggleShow = () => setShow((v) => !v);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
          <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={10}>
            <ChevronLeft size={26} color={T.text} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.text }}>Account Security</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          {/* Layer 1 card */}
          <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 18 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: T.text, marginBottom: 16 }}>Change password</Text>

            <Text style={labelStyle}>Current password</Text>
            <View style={{ marginBottom: 16 }}>
              <PwField value={current} onChange={setCurrent} placeholder="Enter current password" show={show} onToggleShow={toggleShow} />
            </View>

            <Text style={labelStyle}>New password</Text>
            <View style={{ marginBottom: 10 }}>
              <PwField value={next} onChange={setNext} placeholder="Enter new password" show={show} onToggleShow={toggleShow} />
            </View>
            <View style={{ gap: 5, marginBottom: 16 }}>
              {rules.map(({ label, met }) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: met ? T.successWash : T.inputDeep, alignItems: 'center', justifyContent: 'center' }}>
                    {met && <Check size={8} color={T.onSuccess} strokeWidth={3.5} />}
                  </View>
                  <Text style={{ fontSize: 11.5, color: met ? T.onSuccess : T.textFaint }}>{label}</Text>
                </View>
              ))}
            </View>

            <Text style={labelStyle}>Confirm new password</Text>
            <View style={{ marginBottom: 20 }}>
              <PwField value={confirm} onChange={setConfirm} placeholder="Re-enter new password" show={show} onToggleShow={toggleShow} />
            </View>

            <Pressable
              onPress={handleChange}
              disabled={saving}
              style={{ backgroundColor: saving ? T.input : T.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
            >
              {saving
                ? <ActivityIndicator color={T.accent} />
                : <Text style={{ color: T.onAccent, fontSize: 15, fontWeight: '700' }}>Update password</Text>}
            </Pressable>
          </View>

          {/* 2FA — coming later */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.card, borderWidth: HAIRLINE, borderColor: T.border, borderRadius: 18, padding: 16, marginTop: 16 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={19} color={T.textFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: T.text }}>Two-factor authentication</Text>
              <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>Coming soon — an extra layer of protection for your account.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
