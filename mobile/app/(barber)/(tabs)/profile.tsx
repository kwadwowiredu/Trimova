import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
  UserPen,
  ShieldCheck,
  Star,
  Banknote,
} from 'lucide-react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import type { BarberProfile } from '@/types/user';

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

export default function BarberProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const barber = user as BarberProfile | null;

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
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-4 py-4 border-b border-neutral-100">
        <Text className="text-2xl font-bold text-neutral-800">Profile</Text>
      </View>

      {/* Avatar + info */}
      <View className="items-center px-4 py-8">
        <Avatar uri={user?.avatarUrl ?? null} name={user?.fullName ?? 'B'} size={80} />
        <Text className="text-xl font-bold text-neutral-800 mt-3">{user?.fullName}</Text>
        {barber?.businessName && (
          <Text className="text-sm font-semibold text-accent mt-0.5">
            {barber.businessName}
          </Text>
        )}
        <Text className="text-sm text-neutral-500 mt-0.5">{user?.email}</Text>

        {/* Rating pill */}
        {barber?.rating != null && barber.rating > 0 && (
          <View className="flex-row items-center gap-1 mt-3 bg-neutral-100 px-3 py-1.5 rounded-full">
            <Star size={13} color="#D69E2E" fill="#D69E2E" />
            <Text className="text-xs font-bold text-neutral-700">
              {barber.rating.toFixed(1)}
            </Text>
            <Text className="text-xs text-neutral-500">
              ({barber.reviewCount} reviews)
            </Text>
          </View>
        )}
      </View>

      {/* Account section */}
      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-4">
        <MenuRow
          icon={<UserPen size={18} color="#4A5568" />}
          label="Edit Profile"
          onPress={() => Alert.alert('Coming soon', 'Profile editing is coming soon.')}
        />
        <View className="h-px bg-neutral-100 mx-4" />
        <MenuRow
          icon={<Banknote size={18} color="#4A5568" />}
          label="Payout Methods"
          onPress={() => Alert.alert('Coming soon', 'Payout settings are coming soon.')}
        />
        <View className="h-px bg-neutral-100 mx-4" />
        <MenuRow
          icon={<Bell size={18} color="#4A5568" />}
          label="Notifications"
          onPress={() => Alert.alert('Coming soon')}
        />
      </View>

      {/* Reviews + ratings */}
      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-4">
        <MenuRow
          icon={<Star size={18} color="#4A5568" />}
          label="My Reviews"
          onPress={() => Alert.alert('Coming soon')}
        />
      </View>

      {/* Support */}
      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-4">
        <MenuRow
          icon={<ShieldCheck size={18} color="#4A5568" />}
          label="Privacy Policy"
          onPress={() => {}}
        />
        <View className="h-px bg-neutral-100 mx-4" />
        <MenuRow
          icon={<HelpCircle size={18} color="#4A5568" />}
          label="Help & Support"
          onPress={() => {}}
        />
      </View>

      {/* Sign out */}
      <View className="mx-4 bg-white rounded-xl border border-neutral-100 shadow-sm mb-8">
        <MenuRow
          icon={<LogOut size={18} color="#E53E3E" />}
          label="Sign Out"
          onPress={handleLogout}
          danger
        />
      </View>

      <Text className="text-center text-xs text-neutral-300 pb-8">Trimova v1.0.0</Text>
    </ScrollView>
  );
}
