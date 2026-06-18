import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';

type Step = 1 | 2 | 3;

export default function DeleteAccountScreen() {
  const insets    = useSafeAreaInsets();
  const { logout } = useAuthStore();

  const [step,          setStep]          = useState<Step>(1);
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [confirmText,   setConfirmText]   = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showFinal,     setShowFinal]     = useState(false);

  const canProceedStep2 = password.length >= 6;
  const canProceedStep3 = confirmText === 'DELETE';

  function handleStep2() {
    if (!canProceedStep2) return;
    // TODO: verify password against backend before advancing
    // POST /api/auth/verify-password { password }
    setPasswordError('');
    setStep(3);
  }

  function handleFinalDelete() {
    // TODO: DELETE /api/barber/account { password }
    logout();
    router.replace('/(auth)/login' as any);
  }

  const CONSEQUENCES = [
    'Your shop profile and all data will be permanently destroyed',
    'All booking history and client records will be deleted',
    'Your services, staff access, and portfolio will be removed',
    'Any pending payouts may be forfeited',
    'This action cannot be undone',
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5F5', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#E53E3E' }}>Delete Account</Text>
      </View>

      {/* Step indicator */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 8, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: s < 3 ? 6 : 0 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: step >= s ? '#E53E3E' : '#f1f2f3',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: step >= s ? '#fff' : '#A0AEC0' }}>{s}</Text>
            </View>
            {s < 3 && <View style={{ flex: 1, height: 2, backgroundColor: step > s ? '#E53E3E' : '#f1f2f3', borderRadius: 1 }} />}
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* STEP 1: Warning */}
        {step === 1 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FED7D7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={38} color="#E53E3E" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#1A202C', textAlign: 'center', marginBottom: 8 }}>
                This is permanent.
              </Text>
              <Text style={{ fontSize: 14, color: '#718096', textAlign: 'center', lineHeight: 22 }}>
                Deleting your account will immediately and irreversibly destroy your entire Trimova workspace.
              </Text>
            </View>

            {/* Consequences */}
            <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5, borderColor: '#FED7D7', padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#E53E3E', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 }}>What will be destroyed</Text>
              {CONSEQUENCES.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53E3E', marginTop: 6 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 20 }}>{c}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => setStep(2)}
              style={{ backgroundColor: '#E53E3E', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>I understand — Continue</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#f1f2f3' }}>
              <Text style={{ color: '#4A5568', fontWeight: '700', fontSize: 15 }}>Cancel — Keep My Account</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 2: Password verification */}
        {step === 2 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FED7D7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Text style={{ fontSize: 28 }}>🔐</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A202C', textAlign: 'center', marginBottom: 6 }}>Verify Your Identity</Text>
              <Text style={{ fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20 }}>
                Enter your current password to confirm this is really you.
              </Text>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Current Password</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: passwordError ? '#E53E3E' : '#E2E8F0' }}>
                <TextInput
                  value={password} onChangeText={setPassword} placeholder="Enter your password"
                  placeholderTextColor="#CBD5E0" secureTextEntry={!showPassword}
                  style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: '#1A202C' }}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)} hitSlop={8}>
                  {showPassword ? <EyeOff size={18} color="#A0AEC0" /> : <Eye size={18} color="#A0AEC0" />}
                </Pressable>
              </View>
              {passwordError ? <Text style={{ color: '#E53E3E', fontSize: 11, marginTop: 4 }}>{passwordError}</Text> : null}
            </View>

            <Pressable
              onPress={handleStep2}
              disabled={!canProceedStep2}
              style={{ backgroundColor: canProceedStep2 ? '#E53E3E' : '#CBD5E0', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Verify & Continue</Text>
            </Pressable>
            <Pressable onPress={() => setStep(1)} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#f1f2f3' }}>
              <Text style={{ color: '#4A5568', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
            </Pressable>
          </View>
        )}

        {/* STEP 3: Type DELETE */}
        {step === 3 && (
          <View>
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FED7D7', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={30} color="#E53E3E" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A202C', textAlign: 'center', marginBottom: 6 }}>Final Confirmation</Text>
              <Text style={{ fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>
                Type <Text style={{ fontWeight: '800', color: '#E53E3E' }}>DELETE</Text> in the field below to unlock the destruction button.
              </Text>
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 24 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Type "DELETE" to confirm</Text>
              <TextInput
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder='Type DELETE here'
                placeholderTextColor="#CBD5E0"
                autoCapitalize="characters"
                style={{
                  backgroundColor: confirmText === 'DELETE' ? '#FFF5F5' : '#F7FAFC',
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
                  fontSize: 18, fontWeight: '800', color: '#E53E3E', letterSpacing: 4,
                  borderWidth: 1.5, borderColor: confirmText === 'DELETE' ? '#E53E3E' : '#E2E8F0',
                  textAlign: 'center',
                }}
              />
            </View>

            <Pressable
              onPress={() => setShowFinal(true)}
              disabled={!canProceedStep3}
              style={{
                backgroundColor: canProceedStep3 ? '#E53E3E' : '#CBD5E0',
                borderRadius: 14, paddingVertical: 16,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
                shadowColor: canProceedStep3 ? '#E53E3E' : 'transparent',
                shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: canProceedStep3 ? 4 : 0,
              }}
            >
              <Trash2 size={17} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Confirm Permanent Destruction</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={{ borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#f1f2f3' }}>
              <Text style={{ color: '#4A5568', fontWeight: '700', fontSize: 15 }}>Cancel — Keep My Account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Final confirmation modal */}
      <Modal visible={showFinal} animationType="fade" transparent onRequestClose={() => setShowFinal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setShowFinal(false)}>
          <Pressable style={{ backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%' }} onPress={() => {}}>
            <View style={{ backgroundColor: '#FFF5F5', alignItems: 'center', paddingVertical: 28 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#FED7D7', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={32} color="#E53E3E" />
              </View>
            </View>
            <View style={{ padding: 24, gap: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A202C', textAlign: 'center' }}>Are you absolutely sure?</Text>
              <Text style={{ fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 20 }}>
                This will permanently destroy your account, shop data, and remove all staff access. There is no going back.
              </Text>
              <Pressable onPress={handleFinalDelete} style={{ backgroundColor: '#E53E3E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Yes, Delete Everything</Text>
              </Pressable>
              <Pressable onPress={() => setShowFinal(false)} style={{ backgroundColor: '#f1f2f3', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 }}>
                <Text style={{ color: '#4A5568', fontWeight: '700', fontSize: 15 }}>No, Keep My Account</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
