import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';

export default function BarberStaffScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-neutral-100">
        <Text className="text-2xl font-bold text-neutral-800">Staff</Text>
        <Text className="text-sm text-neutral-500 mt-1">Manage your team.</Text>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-10 gap-4">
        <Users size={56} color="#CBD5E0" />
        <Text className="text-base font-bold text-neutral-600 text-center">
          Staff management coming soon
        </Text>
        <Text className="text-sm text-neutral-400 text-center leading-5">
          Add staff members to your barbershop so they can manage their own
          bookings and schedules.
        </Text>
      </View>
    </View>
  );
}
