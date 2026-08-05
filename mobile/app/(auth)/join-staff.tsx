import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Check, Store, MailX } from 'lucide-react-native';
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
 * Staff join screen — reached ONLY by tapping the invitation link we emailed
 * (`trimova://join-staff?token=…`).
 *
 * The invite is bound to an email address, so the address is fixed and shown
 * read-only; all the staff member does is choose a password.
 */
export default function JoinStaffScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setAuth } = useAuthStore();

  const [invite, setInvite] = useState<InviteLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [checking, setChecking] = useState(true);

  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setLookupError('This link is missing its invitation details.');
      return;
    }
    let active = true;
    staffService.lookupInvite({ token })
      .then((res) => { if (active) setInvite(res.data.data); })
      .catch((e) => { if (active) setLookupError(getApiErrorMessage(e) || "We couldn't find that invitation."); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [token]);

  async function handleJoin() {
    if (!invite || !token) return;
    if (!meetsAllPasswordRules(password)) {
      setSubmitError('Password must be 8+ characters with an uppercase letter and a number.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await staffService.acceptInvite({
        token,
        email: invite.email,   // bound by the invite — not user-editable
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

          {checking ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
              <ActivityIndicator color={ACCENT} />
              <Text style={{ fontSize: 14, color: MUTED }}>Checking your invitation…</Text>
            </View>
          ) : !invite ? (
            /* Invalid / expired / revoked link */
            <View style={{ backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 22, alignItems: 'center' }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#ffe9e9', alignItems: 'center', justifyContent: 'center' }}>
                <MailX size={24} color="#d00000" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: NAVY, marginTop: 14, textAlign: 'center' }}>
                This invitation isn't valid
              </Text>
              <Text style={{ fontSize: 14, color: MUTED, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                {lookupError || 'Ask the shop owner to send you a new invitation email.'}
              </Text>
              <Pressable
                onPress={() => router.replace('/(auth)/login')}
                style={{ backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 20 }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Back to sign in</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Who / where */}
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
                  Your account will be created with this address.
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
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
