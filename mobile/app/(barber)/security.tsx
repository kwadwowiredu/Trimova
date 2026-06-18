import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef } from 'react';
import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff, Lock, Shield, FileText, Check } from 'lucide-react-native';

function PasswordInput({
  label, value, onChangeText, placeholder, error,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: error ? '#E53E3E' : '#E2E8F0' }}>
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor="#CBD5E0" secureTextEntry={!show}
          style={{ flex: 1, paddingVertical: 13, fontSize: 14, color: '#1A202C' }}
        />
        <Pressable onPress={() => setShow((p) => !p)} hitSlop={8}>
          {show ? <EyeOff size={18} color="#A0AEC0" /> : <Eye size={18} color="#A0AEC0" />}
        </Pressable>
      </View>
      {error ? <Text style={{ color: '#E53E3E', fontSize: 11, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export default function SecurityScreen() {
  const insets = useSafeAreaInsets();

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

  function handleChangePassword() {
    const errs: Record<string, string> = {};
    if (!currentPw) errs.currentPw = 'Current password is required';
    if (newPw.length < 8) errs.newPw = 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(newPw)) errs.newPw = errs.newPw ?? 'Must include at least one uppercase letter';
    if (!/[0-9]/.test(newPw)) errs.newPw = errs.newPw ?? 'Must include at least one number';
    if (newPw !== confirmPw) errs.confirmPw = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    // TODO: POST /api/auth/change-password { currentPassword: currentPw, newPassword: newPw }
    showToast();
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Login & Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Change password */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>Change Password</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', padding: 18, marginBottom: 20, shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
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
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: met ? '#38A169' : '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
                {met && <Check size={10} color="#fff" strokeWidth={3} />}
              </View>
              <Text style={{ fontSize: 12, color: met ? '#38A169' : '#A0AEC0' }}>{rule}</Text>
            </View>
          ))}

          <Pressable onPress={handleChangePassword} style={{ backgroundColor: '#3c3cb9', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Update Password</Text>
          </Pressable>
        </View>

        {/* Coming soon rows */}
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>Advanced Security</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#1A202C', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          {[
            { icon: <Shield size={17} color="#CBD5E0" />, label: 'Two-Factor Authentication', subtitle: 'Add an extra layer of security' },
            { icon: <FileText size={17} color="#CBD5E0" />, label: 'Privacy Policy', subtitle: 'View our data handling policy' },
          ].map(({ icon, label, subtitle }, i) => (
            <View key={label}>
              {i > 0 && <View style={{ height: 1, backgroundColor: '#f1f2f3', marginHorizontal: 16 }} />}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14, opacity: 0.5 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
                  {icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#A0AEC0' }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: '#CBD5E0', marginTop: 1 }}>{subtitle}</Text>
                </View>
                <View style={{ backgroundColor: '#f1f2f3', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#A0AEC0' }}>Coming Soon</Text>
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
          backgroundColor: '#38A169', borderRadius: 14,
          paddingVertical: 14, paddingHorizontal: 18,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          zIndex: 999,
          opacity: toastAnim,
          transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          shadowColor: '#38A169', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
        }}
      >
        <Check size={18} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Password updated successfully</Text>
      </Animated.View>
    </View>
  );
}
