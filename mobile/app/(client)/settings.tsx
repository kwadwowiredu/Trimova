import { useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Alert, Modal, TextInput, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft, ChevronRight, FileText, Moon, Trash2, LogOut, X,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/services/api';

function Row({ icon, label, subtitle, danger, onPress, isLast = false }: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <>
      <Pressable onPress={onPress} className="flex-row items-center px-4 py-4 gap-3 active:bg-neutral-50">
        <View className="w-9 h-9 items-center justify-center">
          {icon}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold" style={{ color: danger ? '#E53E3E' : '#161c27' }}>{label}</Text>
          {subtitle ? <Text className="text-xs text-neutral-400 mt-0.5">{subtitle}</Text> : null}
        </View>
        <ChevronRight size={16} color="#CBD5E0" />
      </Pressable>
      {!isLast && <View className="h-px bg-neutral-100 ml-16" />}
    </>
  );
}

export default function ClientSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!password) return;
    setDeleting(true);
    try {
      await authService.deleteAccount(password);
      setShowDelete(false);
      await logout();
      router.replace('/(auth)/login');
    } catch (e) {
      Alert.alert('Deletion failed', getApiErrorMessage(e) || "Couldn't reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color="#161c27" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#023047' }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}>
        <Row
          icon={<FileText size={17} color="#718096" />}
          label="Privacy Policy"
          subtitle="How Trimova handles your data"
          onPress={() =>
            Linking.openURL('https://trimova.app/privacy').catch(() =>
              Alert.alert('Privacy Policy', 'Read our privacy policy at trimova.app/privacy'),
            )
          }
        />
        <Row
          icon={<Moon size={17} color="#718096" />}
          label="Appearance"
          subtitle="Light theme (dark mode coming to the client app soon)"
          onPress={() => Alert.alert('Appearance', 'Theme options for the client experience are coming soon.')}
        />
        <Row
          icon={<Trash2 size={17} color="#E53E3E" />}
          label="Delete Account"
          subtitle="Permanently remove your account & data"
          danger
          onPress={() => router.push('/(client)/delete-account' as never)}
        />
        <Row
          icon={<LogOut size={17} color="#E53E3E" />}
          label="Sign Out"
          danger
          onPress={handleSignOut}
          isLast
        />
      </ScrollView>

      {/* ── Delete confirmation (password required) ──────────── */}
      <Modal visible={showDelete} transparent animationType="slide" onRequestClose={() => setShowDelete(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={() => setShowDelete(false)} />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#161c27' }}>Delete Account</Text>
            <Pressable onPress={() => setShowDelete(false)} hitSlop={10}><X size={22} color="#8a89a3" /></Pressable>
          </View>
          <Text style={{ fontSize: 13.5, color: '#464554', lineHeight: 20, marginBottom: 16 }}>
            This permanently deletes your account, bookings and saved data. This cannot be undone. Enter your password to confirm.
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            style={{ backgroundColor: '#F4F5FA', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#161c27', marginBottom: 16 }}
          />
          <Pressable
            onPress={handleDelete}
            disabled={deleting || !password}
            style={{ backgroundColor: '#E53E3E', borderRadius: 999, paddingVertical: 15, alignItems: 'center', opacity: deleting || !password ? 0.5 : 1 }}
          >
            {deleting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Delete My Account</Text>}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
