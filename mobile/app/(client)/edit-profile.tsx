import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { uploadImage, isLocalUri } from '@/services/uploads';
import { getApiErrorMessage } from '@/services/api';

export default function ClientEditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, mergeUser } = useAuthStore();

  const [name, setName]   = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);

  const initials = (name || 'C').split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!res.canceled && res.assets[0]) setAvatarUri(res.assets[0].uri);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = avatarUri ?? undefined;
      if (avatarUri && isLocalUri(avatarUri)) avatarUrl = await uploadImage(avatarUri, 'avatars');
      const res = await authService.updateProfile({
        fullName: name.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl ?? null,
      });
      mergeUser(res.data.data as unknown as Record<string, unknown>);
      router.back();
    } catch (e) {
      Alert.alert('Save failed', getApiErrorMessage(e) || "Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const label = { fontSize: 11, fontWeight: '600' as const, color: '#6c757d', letterSpacing: 0.6, textTransform: 'uppercase' as const, marginBottom: 6 };
  const input = {
    backgroundColor: '#F4F5FA', borderRadius: 32, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#161c27',
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft size={26} color="#161c27" />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#023047' }}>Edit Profile</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            <Pressable onPress={pickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
              ) : (
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 34, fontWeight: '800' }}>{initials}</Text>
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#161c27', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' }}>
                <Camera size={15} color="#ffffff" />
              </View>
            </Pressable>
            <Text style={{ fontSize: 12, color: '#023047', fontWeight: '600', marginTop: 8 }}>Tap to change photo</Text>
          </View>

          <Text style={label}>Full Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#A0AEC0" style={{ ...input, marginBottom: 18 }} autoCapitalize="words" />

          <Text style={label}>Phone Number</Text>
          <TextInput value={phone} onChangeText={setPhone} placeholder="+233 ..." placeholderTextColor="#A0AEC0" keyboardType="phone-pad" style={{ ...input, marginBottom: 18 }} />

          <Text style={label}>Email</Text>
          <View style={{ ...input, marginBottom: 6, opacity: 0.7 }}>
            <Text style={{ fontSize: 15, color: '#464554' }}>{user?.email}</Text>
          </View>
          <Text style={{ fontSize: 11.5, color: '#A0AEC0', marginLeft: 4 }}>Your email is your login and can't be changed here.</Text>
        </ScrollView>

        {/* Save */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14 }}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: '#023047', borderRadius: 999, paddingVertical: 16, alignItems: 'center', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Save Changes</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
