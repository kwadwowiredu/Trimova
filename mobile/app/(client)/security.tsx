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

  const label = { fontSize: 11, fontWeight: '800' as const, color: '#8a89a3', letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 };
  const inputWrap = { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: '#F4F5FA', borderRadius: 14, paddingHorizontal: 16 };

  function PwField({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
    return (
      <View style={inputWrap}>
        <TextInput
          value={value} onChangeText={onChange} placeholder={placeholder}
          placeholderTextColor="#A0AEC0" secureTextEntry={!show}
          style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#161c27' }}
        />
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
          {show ? <EyeOff size={18} color="#A0AEC0" /> : <Eye size={18} color="#A0AEC0" />}
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={26} color="#161c27" />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#161c27' }}>Account Security</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#161c27', marginBottom: 14 }}>Change Password</Text>

          <Text style={label}>Current Password</Text>
          <View style={{ marginBottom: 16 }}>
            <PwField value={current} onChange={setCurrent} placeholder="Enter current password" />
          </View>

          <Text style={label}>New Password</Text>
          <View style={{ marginBottom: 10 }}>
            <PwField value={next} onChange={setNext} placeholder="Enter new password" />
          </View>
          <View style={{ gap: 4, marginBottom: 16 }}>
            {rules.map(({ label: l, met }) => (
              <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: met ? '#38A169' : '#E2E8F0', alignItems: 'center', justifyContent: 'center' }}>
                  {met && <Check size={8} color="#fff" strokeWidth={3} />}
                </View>
                <Text style={{ fontSize: 11, color: met ? '#38A169' : '#A0AEC0' }}>{l}</Text>
              </View>
            ))}
          </View>

          <Text style={label}>Confirm New Password</Text>
          <View style={{ marginBottom: 24 }}>
            <PwField value={confirm} onChange={setConfirm} placeholder="Re-enter new password" />
          </View>

          <Pressable
            onPress={handleChange}
            disabled={saving}
            style={{ backgroundColor: '#161c27', borderRadius: 999, paddingVertical: 16, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Update Password</Text>}
          </Pressable>

          {/* 2FA — coming later */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F4F5FA', borderRadius: 16, padding: 16, marginTop: 28 }}>
            <ShieldCheck size={20} color="#8a89a3" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#464554' }}>Two-Factor Authentication</Text>
              <Text style={{ fontSize: 12, color: '#8a89a3', marginTop: 2 }}>Coming soon — an extra layer of protection for your account.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
