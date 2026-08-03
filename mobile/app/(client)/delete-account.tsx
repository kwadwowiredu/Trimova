import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import { tapLight, tapMedium } from '@/utils/haptics';

type Step = 1 | 2 | 3;

const LOSES = [
  'Your booking history and upcoming appointments',
  'Saved favourite barbershops and barbers',
  'Any loyalty progress or rewards you\'ve earned',
  'Reviews you\'ve written for barbers',
];

/**
 * Client account deletion — mirrors the barbershop flow:
 *   1. what you lose  →  2. confirm password  →  3. type DELETE
 */
export default function ClientDeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();

  const [step, setStep] = useState<Step>(1);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canProceedStep2 = password.length >= 6;
  const canProceedStep3 = confirmText === 'DELETE';
  const danger = chip('error');

  /** Verify the password BEFORE the "type DELETE" step so errors surface early. */
  async function verifyPassword() {
    setVerifying(true);
    setPasswordError('');
    try {
      await authService.verifyPassword(password);
      tapMedium();
      setStep(3);
    } catch (e) {
      setPasswordError(getApiErrorMessage(e) || 'Your password is incorrect.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await authService.deleteAccount(password);
      await logout();
      router.replace('/(auth)/login');
    } catch (e) {
      // The password already passed step 2, so this is almost certainly a
      // connectivity/server problem — report it honestly.
      Alert.alert('Deletion failed', getApiErrorMessage(e) || "Couldn't reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = {
    backgroundColor: T.input, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: T.text, borderWidth: HAIRLINE, borderColor: T.border,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
          <Pressable onPress={() => { tapLight(); step === 1 ? router.back() : setStep((step - 1) as Step); }} hitSlop={10}>
            <ChevronLeft size={26} color={T.text} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: T.text }}>Delete account</Text>
        </View>

        {/* Step indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 16 }}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View key={s} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: step >= s ? danger.fg : T.input,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: step >= s ? '#ffffff' : T.textFaint }}>{s}</Text>
              </View>
              {s < 3 && <View style={{ flex: 1, height: 2, backgroundColor: step > s ? danger.fg : T.input, borderRadius: 1 }} />}
            </View>
          ))}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* STEP 1 — what you lose */}
          {step === 1 && (
            <>
              <View style={{ flexDirection: 'row', gap: 12, backgroundColor: danger.bg, borderRadius: 16, padding: 16 }}>
                <AlertTriangle size={20} color={danger.fg} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: danger.fg }}>This can't be undone</Text>
                  <Text style={{ fontSize: 13, color: danger.fg, opacity: 0.85, marginTop: 3, lineHeight: 18 }}>
                    Deleting your account permanently removes your data from Trimova.
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 18, marginTop: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: T.text, marginBottom: 12 }}>You will lose</Text>
                {LOSES.map((l) => (
                  <View key={l} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <Text style={{ fontSize: 13.5, color: T.textFaint, lineHeight: 20 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 13.5, color: T.textMuted, lineHeight: 20 }}>{l}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => { tapLight(); setStep(2); }}
                style={{ backgroundColor: danger.fg, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 22 }}
              >
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }}>Continue</Text>
              </Pressable>
              <Pressable onPress={() => router.back()} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: T.textFaint, fontSize: 14.5, fontWeight: '600' }}>Keep my account</Text>
              </Pressable>
            </>
          )}

          {/* STEP 2 — confirm password */}
          {step === 2 && (
            <>
              <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 18 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>Confirm it's you</Text>
                <Text style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4, lineHeight: 19 }}>
                  Enter your current password to continue.
                </Text>

                <Text style={{ fontSize: 11, fontWeight: '800', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 }}>
                  Password
                </Text>
                <View style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', paddingVertical: 0, borderColor: passwordError ? danger.fg : T.border }}>
                  <TextInput
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                    placeholder="Enter your password"
                    placeholderTextColor={T.textFaint}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: T.text }}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    {showPw ? <EyeOff size={18} color={T.textFaint} /> : <Eye size={18} color={T.textFaint} />}
                  </Pressable>
                </View>
                {passwordError ? (
                  <Text style={{ color: danger.fg, fontSize: 12, marginTop: 6 }}>{passwordError}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={verifyPassword}
                disabled={!canProceedStep2 || verifying}
                style={{
                  backgroundColor: canProceedStep2 && !verifying ? danger.fg : T.input,
                  borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 22,
                }}
              >
                {verifying
                  ? <ActivityIndicator color={danger.fg} />
                  : <Text style={{ color: canProceedStep2 ? '#ffffff' : T.textDisabled, fontSize: 15, fontWeight: '700' }}>Verify password</Text>}
              </Pressable>
            </>
          )}

          {/* STEP 3 — type DELETE */}
          {step === 3 && (
            <>
              <View style={{ backgroundColor: T.card, borderRadius: 18, borderWidth: HAIRLINE, borderColor: T.border, padding: 18 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>Final confirmation</Text>
                <Text style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4, lineHeight: 20 }}>
                  Type <Text style={{ fontWeight: '800', color: danger.fg }}>DELETE</Text> below to permanently remove your account.
                </Text>

                <Text style={{ fontSize: 11, fontWeight: '800', color: T.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 }}>
                  Type "DELETE" to confirm
                </Text>
                <TextInput
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Type DELETE here"
                  placeholderTextColor={T.textFaint}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={inputStyle}
                />
              </View>

              <Pressable
                onPress={handleDelete}
                disabled={!canProceedStep3 || deleting}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: canProceedStep3 && !deleting ? danger.fg : T.input,
                  borderRadius: 16, paddingVertical: 16, marginTop: 22,
                }}
              >
                {deleting ? (
                  <ActivityIndicator color={danger.fg} />
                ) : (
                  <>
                    <Trash2 size={17} color={canProceedStep3 ? '#ffffff' : T.textDisabled} />
                    <Text style={{ color: canProceedStep3 ? '#ffffff' : T.textDisabled, fontSize: 15, fontWeight: '700' }}>
                      Delete my account permanently
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
