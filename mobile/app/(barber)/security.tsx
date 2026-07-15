import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Eye, EyeOff, Shield, FileText, Check } from 'lucide-react-native';
import { authService } from '@/services/auth';
import { useThemeColors } from '@/hooks/useThemeColors';

function PasswordInput({
  label, value, onChangeText, placeholder, error,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; error?: string;
}) {
  const c = useThemeColors();
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: error ? c.danger : c.border }}>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={c.textFaint} secureTextEntry={!show}
          style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: c.text }}
        />
        <Pressable onPress={() => setShow((p) => !p)} hitSlop={8}>
          {show ? <EyeOff size={18} color={c.textFaint} /> : <Eye size={18} color={c.textFaint} />}
        </Pressable>
      </View>
      {error ? <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast() {
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  const changePasswordMutation = useMutation({
    mutationFn: () => authService.changePassword(currentPw, newPw),
    onSuccess: () => {
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setErrors({});
      showToast();
    },
    onError: () => {
      setErrors((prev) => ({ ...prev, currentPw: 'Current password is incorrect.' }));
    },
  });

  function handleChangePassword() {
    const errs: Record<string, string> = {};
    if (!currentPw) errs.currentPw = 'Current password is required';
    if (newPw.length < 8) errs.newPw = 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(newPw)) errs.newPw = errs.newPw ?? 'Must include at least one uppercase letter';
    if (!/[0-9]/.test(newPw)) errs.newPw = errs.newPw ?? 'Must include at least one number';
    if (newPw !== confirmPw) errs.confirmPw = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    changePasswordMutation.mutate();
  }

  const cardStyle = {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Login & Security</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Change password & account security</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Change password */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>Change Password</Text>
        <View style={{ ...cardStyle, padding: 18, marginBottom: 20 }}>
          <PasswordInput label="Current Password" value={currentPw} onChangeText={setCurrentPw} placeholder="Enter current password" error={errors.currentPw} />
          <PasswordInput label="New Password"     value={newPw}     onChangeText={setNewPw}     placeholder="At least 8 chars, 1 uppercase, 1 number" error={errors.newPw} />
          <PasswordInput label="Confirm Password" value={confirmPw} onChangeText={setConfirmPw} placeholder="Repeat new password" error={errors.confirmPw} />

          {/* Requirements */}
          {[
            { rule: 'At least 8 characters',   met: newPw.length >= 8 },
            { rule: '1 uppercase letter',       met: /[A-Z]/.test(newPw) },
            { rule: '1 number',                 met: /[0-9]/.test(newPw) },
            { rule: 'Passwords match',          met: newPw === confirmPw && confirmPw.length > 0 },
          ].map(({ rule, met }) => (
            <View key={rule} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: met ? c.success : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                {met && <Check size={10} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={{ fontSize: 12, color: met ? c.success : c.textFaint }}>{rule}</Text>
            </View>
          ))}

          <Pressable
            onPress={handleChangePassword}
            disabled={changePasswordMutation.isPending}
            style={{ backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16, opacity: changePasswordMutation.isPending ? 0.6 : 1 }}
          >
            {changePasswordMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Update Password</Text>
            }
          </Pressable>
        </View>

        {/* Coming soon rows */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>Advanced Security</Text>
        <View style={{ ...cardStyle, overflow: 'hidden' }}>
          {[
            { icon: <Shield size={17} color={c.textFaint} />, label: 'Two-Factor Authentication', subtitle: 'Add an extra layer of security' },
            { icon: <FileText size={17} color={c.textFaint} />, label: 'Privacy Policy', subtitle: 'View our data handling policy' },
          ].map(({ icon, label, subtitle }, i) => (
            <View key={label}>
              {i > 0 && <View style={{ height: 1, backgroundColor: c.border, marginHorizontal: 16 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14, opacity: 0.6 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: c.textMuted }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 1 }}>{subtitle}</Text>
                </View>
                <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.textFaint }}>Coming Soon</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Toast */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: insets.top + 70, left: 20, right: 20,
          backgroundColor: c.success, borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        <Check size={18} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Password updated successfully</Text>
      </Animated.View>
    </View>
  );
}
