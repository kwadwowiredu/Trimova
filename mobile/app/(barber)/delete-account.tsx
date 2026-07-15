import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';
import { useThemeColors } from '@/hooks/useThemeColors';

type Step = 1 | 2 | 3;

export default function DeleteAccountScreen() {
  const insets    = useSafeAreaInsets();
  const c = useThemeColors();
  const { logout } = useAuthStore();

  const [step,          setStep]          = useState<Step>(1);
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [confirmText,   setConfirmText]   = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showFinal,     setShowFinal]     = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [verifying,     setVerifying]     = useState(false);

  const canProceedStep2 = password.length >= 6;
  const canProceedStep3 = confirmText === 'DELETE';

  const dangerRing = c.isDark ? '#3A1B1B' : '#FED7D7';
  const dangerTint = c.isDark ? '#241015' : '#FFF5F5';

  // Verify the password against the backend BEFORE letting the user reach the
  // "type DELETE" step, so a wrong password is caught immediately and clearly.
  async function handleStep2() {
    if (!canProceedStep2 || verifying) return;
    setVerifying(true);
    setPasswordError('');
    try {
      await authService.verifyPassword(password);
      setVerifying(false);
      setStep(3);
    } catch (err) {
      setVerifying(false);
      setPasswordError(getApiErrorMessage(err));
    }
  }

  async function handleFinalDelete() {
    setDeleting(true);
    try {
      // Wipe the account + all owned data from the database.
      await authService.deleteAccount(password);
      // Clear the local (user-scoped) cache + token, then leave.
      await logout();
      router.replace('/(auth)/login' as any);
    } catch (err) {
      // Password was already verified at step 2, so this is most likely a
      // connectivity/server problem — surface the real reason, don't blame the password.
      setDeleting(false);
      setShowFinal(false);
      setStep(2);
      setPasswordError(getApiErrorMessage(err));
    }
  }

  const CONSEQUENCES = [
    'Your shop profile and all data will be permanently destroyed',
    'All booking history and client records will be deleted',
    'Your services, staff access, and portfolio will be removed',
    'Any pending payouts may be forfeited',
    'This action cannot be undone',
  ];

  const cancelBtn = { borderRadius: 14, paddingVertical: 16, alignItems: 'center' as const, backgroundColor: c.surfaceAlt };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: c.danger }}>Delete Account</Text>
      </View>

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 8, alignItems: 'center', backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: s < 3 ? 6 : 0 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: step >= s ? c.danger : c.surfaceAlt,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: step >= s ? '#fff' : c.textFaint }}>{s}</Text>
            </View>
            {s < 3 && <View style={{ flex: 1, height: 2, backgroundColor: step > s ? c.danger : c.surfaceAlt, borderRadius: 1 }} />}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* STEP 1: Warning */}
        {step === 1 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: dangerRing, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={38} color={c.danger} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 8 }}>
                This is permanent.
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 }}>
                Deleting your account will immediately and irreversibly destroy your entire Trimova workspace.
              </Text>
            </View>

            {/* Consequences */}
            <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1.5, borderColor: dangerRing, padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: c.danger, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>What will be destroyed</Text>
              {CONSEQUENCES.map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.danger, marginTop: 6 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 20 }}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setStep(2)}
              style={{ backgroundColor: c.danger, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>I understand — Continue</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={cancelBtn}>
              <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 15 }}>Cancel — Keep My Account</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 2: Password verification */}
        {step === 2 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: dangerRing, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 28 }}>🔐</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 6 }}>Verify Your Identity</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>
                Enter your current password to confirm this is really you.
              </Text>
            </View>

            <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Current Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: passwordError ? c.danger : c.border }}>
                <TextInput
                  value={password} onChangeText={setPassword} placeholder="Enter your password"
                  placeholderTextColor={c.textFaint} secureTextEntry={!showPassword}
                  style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: c.text }}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                  {showPassword ? <EyeOff size={18} color={c.textFaint} /> : <Eye size={18} color={c.textFaint} />}
                </Pressable>
              </View>
              {passwordError ? <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{passwordError}</Text> : null}
            </View>

            <Pressable
              onPress={handleStep2}
              disabled={!canProceedStep2 || verifying}
              style={{ backgroundColor: canProceedStep2 ? c.danger : c.textFaint, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12, opacity: verifying ? 0.6 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{verifying ? 'Verifying…' : 'Verify & Continue'}</Text>
            </Pressable>
            <Pressable onPress={() => setStep(1)} style={cancelBtn}>
              <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 15 }}>Go Back</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 3: Type DELETE */}
        {step === 3 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: dangerRing, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={30} color={c.danger} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 6 }}>Final Confirmation</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>
                Type <Text style={{ fontWeight: '800', color: c.danger }}>DELETE</Text> in the field below to unlock the destruction button.
              </Text>
            </View>

            <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Type "DELETE" to confirm</Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder='Type DELETE here'
                placeholderTextColor={c.textFaint}
                autoCapitalize="characters"
                style={{
                  backgroundColor: confirmText === 'DELETE' ? dangerTint : c.surfaceAlt,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                  fontSize: 18, fontWeight: '800', color: c.danger, letterSpacing: 4,
                  borderWidth: 1.5, borderColor: confirmText === 'DELETE' ? c.danger : c.border,
                  textAlign: 'center',
                }}
              />
            </View>

            <Pressable
              onPress={() => setShowFinal(true)}
              disabled={!canProceedStep3}
              style={{
                backgroundColor: canProceedStep3 ? c.danger : c.textFaint,
                borderRadius: 14, paddingVertical: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
              }}
            >
              <Trash2 size={17} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Confirm Permanent Destruction</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={cancelBtn}>
              <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 15 }}>Cancel — Keep My Account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Final confirmation modal */}
      <Modal visible={showFinal} animationType="fade" transparent onRequestClose={() => setShowFinal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setShowFinal(false)}>
          <Pressable style={{ backgroundColor: c.surface, borderRadius: 24, overflow: 'hidden', width: '100%' }} onPress={() => {}}>
            <View style={{ backgroundColor: dangerTint, alignItems: 'center', paddingVertical: 28 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: dangerRing, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={32} color={c.danger} />
              </View>
            </View>
            <View style={{ padding: 24, gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'center' }}>Are you absolutely sure?</Text>
              <Text style={{ fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>
                This will permanently destroy your account, shop data, and remove all staff access. There is no going back.
              </Text>
              <Pressable onPress={handleFinalDelete} disabled={deleting} style={{ backgroundColor: c.danger, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16, opacity: deleting ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{deleting ? 'Deleting…' : 'Yes, Delete Everything'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowFinal(false)} disabled={deleting} style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 15 }}>No, Keep My Account</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
