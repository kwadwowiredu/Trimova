import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Image, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  Camera,
  Heart,
  Star,
  Gift,
  Archive,
  ShieldCheck,
  HelpCircle,
  Settings2,
  UserPen,
  Scissors,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useClientBrowseStore } from '@/stores/clientBrowseStore';
import { authService } from '@/services/auth';
import { uploadImage } from '@/services/uploads';

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] font-extrabold text-neutral-400 uppercase px-4 mb-1 mt-6" style={{ letterSpacing: 1.2 }}>
      {children}
    </Text>
  );
}

function MenuRow({ icon, label, subtitle, onPress, isLast = false }: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} className="flex-row items-center px-4 py-4 gap-3 active:bg-neutral-50">
        <View className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center">{icon}</View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-neutral-800">{label}</Text>
          {subtitle ? <Text className="text-xs text-neutral-400 mt-0.5">{subtitle}</Text> : null}
        </View>
        <ChevronRight size={16} color="#CBD5E0" />
      </Pressable>
      {!isLast && <View className="h-px bg-neutral-100 ml-16" />}
    </>
  );
}

export default function ClientProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser, mergeUser } = useAuthStore();
  const favorites = useClientBrowseStore((s) => s.favorites);
  const [uploading, setUploading] = useState(false);

  const initials = (user?.fullName ?? 'C')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  // Clients can upload a profile photo straight from here.
  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const localUri = res.assets[0].uri;
    updateUser({ avatarUrl: localUri }); // instant preview
    setUploading(true);
    try {
      const url = await uploadImage(localUri, 'avatars');
      const apiRes = await authService.updateProfile({ avatarUrl: url });
      mergeUser(apiRes.data.data as unknown as Record<string, unknown>);
    } catch {
      Alert.alert('Upload failed', "Couldn't save your photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Gradient header with avatar ───────────────────────── */}
      <LinearGradient
        colors={['#eef0ff', '#faf7ff', '#ffffff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ paddingTop: insets.top + 18, paddingBottom: 20, alignItems: 'center' }}
      >
        <Pressable onPress={pickAvatar} disabled={uploading} style={{ opacity: uploading ? 0.6 : 1 }}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#ffffff' }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff' }}>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>{initials}</Text>
            </View>
          )}
          <View style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#161c27', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' }}>
            <Camera size={14} color="#ffffff" />
          </View>
        </Pressable>
        <Text className="text-xl font-extrabold text-neutral-800 mt-3">{user?.fullName ?? 'Client'}</Text>
        <Text className="text-sm text-neutral-400 mt-0.5">{user?.email}</Text>

        <Pressable
          onPress={() => router.push('/(client)/edit-profile' as never)}
          className="flex-row items-center gap-2 mt-4 bg-white rounded-full px-5 py-2.5 active:opacity-70"
          style={{ shadowColor: '#3c3cb9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3 }}
        >
          <UserPen size={15} color="#3c3cb9" />
          <Text className="text-[13px] font-bold" style={{ color: '#3c3cb9' }}>Edit Profile</Text>
        </Pressable>
      </LinearGradient>

      {/* ── Favorites row ─────────────────────────────────────── */}
      <SectionLabel>Favorites</SectionLabel>
      {favorites.length === 0 ? (
        <View className="mx-4 rounded-2xl bg-neutral-50 px-4 py-5 flex-row items-center gap-3">
          <Heart size={18} color="#CBD5E0" />
          <Text className="flex-1 text-[13px] text-neutral-400 leading-5">
            Tap the ♥ on a barber's profile to save them here for quick booking.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 6 }}>
          {favorites.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => router.push(`/(client)/barber/${b.id}` as never)}
              style={{ width: 92, alignItems: 'center' }}
              className="active:opacity-70"
            >
              {b.avatarUrl || b.coverPhotoUrl || b.portfolioImages?.[0] ? (
                <Image
                  source={{ uri: b.avatarUrl || b.coverPhotoUrl || b.portfolioImages?.[0] }}
                  style={{ width: 68, height: 68, borderRadius: 34 }}
                />
              ) : (
                <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#3c3cb9', alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors size={24} color="#ffffff" />
                </View>
              )}
              <Text className="text-[11.5px] font-semibold text-neutral-700 mt-1.5 text-center" numberOfLines={2}>
                {b.businessName || b.fullName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Activity ──────────────────────────────────────────── */}
      <SectionLabel>Activity</SectionLabel>
      <View>
        <MenuRow
          icon={<Star size={17} color="#D69E2E" />}
          label="My Reviews"
          subtitle="Reviews you've left for barbers"
          onPress={() => Alert.alert('My Reviews', 'Your reviews will appear here once the review system launches.')}
        />
        <MenuRow
          icon={<Gift size={17} color="#3c3cb9" />}
          label="My Rewards"
          subtitle="Loyalty progress with your barbers"
          onPress={() => Alert.alert('My Rewards', 'Loyalty rewards tracking is coming soon!')}
        />
        <MenuRow
          icon={<Archive size={17} color="#4A5568" />}
          label="Appointment History"
          subtitle="Every past booking"
          onPress={() => router.push('/(client)/(tabs)/bookings' as never)}
          isLast
        />
      </View>

      {/* ── Account & Security ────────────────────────────────── */}
      <SectionLabel>Account & Security</SectionLabel>
      <View>
        <MenuRow
          icon={<ShieldCheck size={17} color="#38A169" />}
          label="Account Security"
          subtitle="Change password · 2FA (coming soon)"
          onPress={() => router.push('/(client)/security' as never)}
        />
        <MenuRow
          icon={<HelpCircle size={17} color="#3182CE" />}
          label="Help & Support"
          subtitle="Contact the Trimova team"
          onPress={() =>
            Linking.openURL('mailto:support@trimova.app?subject=Trimova%20Support').catch(() =>
              Alert.alert('Contact us', 'Email us at support@trimova.app'),
            )
          }
        />
        <MenuRow
          icon={<Settings2 size={17} color="#4A5568" />}
          label="Settings"
          subtitle="Privacy, appearance, account"
          onPress={() => router.push('/(client)/settings' as never)}
          isLast
        />
      </View>

      <Text className="text-center text-xs text-neutral-300 mt-8">Trimova v1.0.0</Text>
    </ScrollView>
  );
}
