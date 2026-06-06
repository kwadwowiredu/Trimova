import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
  UserPen,
  ShieldCheck,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';

interface MenuRowProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuRow({ icon, label, onPress, danger = false }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-4 gap-3 active:bg-neutral-50"
    >
      <View className="w-8 items-center">{icon}</View>
      <Text
        className={`flex-1 text-sm font-medium ${
          danger ? 'text-danger' : 'text-neutral-700'
        }`}
      >
        {label}
      </Text>
      {!danger && <ChevronRight size={16} color="#CBD5E0" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="px-4 pt-14 pb-4 border-b border-neutral-100">
        <Text className="text-2xl font-bold text-neutral-800">Profile</Text>
      </View>

      {/* Avatar + name card */}
      <View className="items-center px-4 py-8">
        <Avatar
          uri={user?.avatarUrl ?? null}
          name={user?.fullName ?? 'U'}
          size={80}
        />
        <Text className="text-xl font-bold text-neutral-800 mt-3">
          {user?.fullName}
        </Text>
        <Text className="text-sm text-neutral-500 mt-1">{user?.email}</Text>
      </View>

      {/* Menu sections */}
      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-4">
        <MenuRow
          icon={<UserPen size={18} color="#4A5568" />}
          label="Edit Profile"
          onPress={() => {
            // TODO: Stage 5 — profile edit screen
            Alert.alert('Coming soon', 'Profile editing is coming in the next update.');
          }}
        />
        <View className="h-px bg-neutral-100 mx-4" />
        <MenuRow
          icon={<Bell size={18} color="#4A5568" />}
          label="Notifications"
          onPress={() => router.push('/(client)/notifications' as never)}
        />
      </View>

      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-4">
        <MenuRow
          icon={<ShieldCheck size={18} color="#4A5568" />}
          label="Privacy Policy"
          onPress={() => {
            // TODO: open privacy policy URL
          }}
        />
        <View className="h-px bg-neutral-100 mx-4" />
        <MenuRow
          icon={<HelpCircle size={18} color="#4A5568" />}
          label="Help & Support"
          onPress={() => {
            // TODO: open help screen
          }}
        />
      </View>

      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-8">
        <MenuRow
          icon={<LogOut size={18} color="#E53E3E" />}
          label="Sign Out"
          onPress={handleLogout}
          danger
        />
      </View>

      <Text className="text-center text-xs text-neutral-300 pb-8">
        Trimova v1.0.0
      </Text>
    </ScrollView>
  );
}
