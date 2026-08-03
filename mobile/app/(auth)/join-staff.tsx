import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Check, Store, Ticket } from 'lucide-react-native';
import { staffService, type InviteLookup } from '@/services/staff';
import { useAuthStore } from '@/stores/authStore';
import { getApiErrorMessage } from '@/services/api';
import { meetsAllPasswordRules } from '@/utils/validators';

const NAVY = '#161c27';
const MUTED = '#8a89a3';
const BORDER = '#E2E8F8';
const WELL = '#f1f3ff';
const ACCENT = '#023047';

/**
 * Staff join screen — redeem an invite and create the account.
 *
 * Two entry points, one token: a deep link (`?token=`) or a code typed in by
 * hand. Either way the invite is bound to an email address, so the account can
 * only be created with the address the shop invited.
 */
export default function JoinStaffScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setAuth } = useAuthStore();

  const [code, setCode] = useState('');
  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [checking, setChecking] = useState(false);

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /** Resolve an invite from a deep-link token or a typed code. */
  async function lookup(args: { code?: string; token?: string }) {
    setChecking(true);
    setLookupError('');
    try {
      const res = await staffService.lookupInvite(args);
      setInvite(res.data.data);
    } catch (e) {
      setInvite(null);
      setLookupError(getApiErrorMessage(e) || "We couldn't find that invitation.");
    } finally {
      setChecking(false);
    }
  }

  // Arriving from the emailed link — resolve immediately.
  useEffect(() => {
    if (token) lookup({ token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleJoin() {
    if (!invite) return;
    if (!meetsAllPasswordRules(password)) {
      setSubmitError('Password must be 8+ characters with an uppercase letter and a number.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await staffService.acceptInvite({
        ...(token ? { token } : { code: code.trim().toUpperCase() }),
        email: invite.email,      // bound by the invite — not user-editable
        password,
      });
      const { token: authToken, user } = res.data.data;
      await setAuth(authToken, user);
      router.replace('/(staff)/(tabs)' as never);
    } catch (e) {
      setSubmitError(getApiErrorMessage(e) || "Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: '1 uppercase letter',    met: /[A-Z]/.test(password) },
    { label: '1 number',              met: /[0-9]/.test(password) },
  ];

  const inputStyle = {
    backgroundColor: WELL, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: NAVY, borderWidth: 1, borderColor: BORDER,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#f9f9ff', paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
            <ChevronLeft size={26} color={NAVY} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: NAVY }}>Join a barbershop</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* ── Step 1: identify the invite ───────────────────── */}
          {!invite ? (
            <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20 }}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: WELL, alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={22} color={ACCENT} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: NAVY, marginTop: 14 }}>
                Enter your invite code
              </Text>
              <Text style={{ fontSize: 14, color: MUTED, marginTop: 6, lineHeight: 20 }}>
                Your shop owner will have sent this to you by email, or given it to you directly.
              </Text>

              <TextInput
                value={code}
                onChangeText={(t) => { setCode(t.toUpperCase()); setLookupError(''); }}
                placeholder="TRV-XXXX-XX"
                placeholderTextColor={MUTED}
                autoCapitalize="characters"
                autoCorrect={false}
                style={{
                  ...inputStyle, marginTop: 18, textAlign: 'center',
                  fontSize: 20, fontWeight: '800', letterSpacing: 3,
                }}
              />
              {lookupError ? (
                <Text style={{ color: '#d00000', fontSize: 13, marginTop: 8 }}>{lookupError}</Text>
              ) : null}

              <Pressable
                onPress={() => lookup({ code: code.trim().toUpperCase() })}
                disabled={code.trim().length < 6 || checking}
                style={{
                  backgroundColor: code.trim().length >= 6 && !checking ? ACCENT : WELL,
                  borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16,
                }}
              >
                {checking
                  ? <ActivityIndicator color={ACCENT} />
                  : <Text style={{ color: code.trim().length >= 6 ? '#fff' : MUTED, fontSize: 15, fontWeight: '700' }}>Continue</Text>}
              </Pressable>
            </View>
          ) : (
            /* ── Step 2: confirm + set a password ─────────────── */
            <>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: WELL, alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={21} color={ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      You're joining
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, marginTop: 2 }}>{invite.shopName}</Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: BORDER, marginVertical: 16 }} />

                <Text style={{ fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' }}>Your name</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: NAVY, marginTop: 4 }}>{invite.fullName}</Text>

                <Text style={{ fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14 }}>Email</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: NAVY, marginTop: 4 }}>{invite.email}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                  This invitation only works with this address.
                </Text>
              </View>

              {/* Password */}
              <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 20, marginTop: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: NAVY }}>Create a password</Text>
                <View style={{ ...inputStyle, flexDirection: 'row', alignItems: 'center', paddingVertical: 0, marginTop: 12 }}>
                  <TextInput
                    value={password}
                    onChangeText={(t) => { setPassword(t); setSubmitError(''); }}
                    placeholder="Choose a password"
                    placeholderTextColor={MUTED}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: NAVY }}
                  />
                  <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                    {showPw ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
                  </Pressable>
                </View>

                <View style={{ gap: 5, marginTop: 12 }}>
                  {rules.map(({ label, met }) => (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: met ? '#e3f8ec' : '#e8eeff', alignItems: 'center', justifyContent: 'center' }}>
                        {met && <Check size={8} color="#007243" strokeWidth={3.5} />}
                      </View>
                      <Text style={{ fontSize: 11.5, color: met ? '#007243' : MUTED }}>{label}</Text>
                    </View>
                  ))}
                </View>

                {submitError ? (
                  <Text style={{ color: '#d00000', fontSize: 13, marginTop: 10 }}>{submitError}</Text>
                ) : null}

                <Pressable
                  onPress={handleJoin}
                  disabled={submitting}
                  style={{ backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 18, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Join {invite.shopName}</Text>}
                </Pressable>
              </View>

              <Pressable onPress={() => { setInvite(null); setCode(''); }} style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: MUTED, fontSize: 14, fontWeight: '600' }}>Use a different code</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
