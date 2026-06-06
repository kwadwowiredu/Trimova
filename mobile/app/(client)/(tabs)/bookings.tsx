import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { CalendarX } from 'lucide-react-native';

/**
 * Bookings tab — fully wired up in Stage 5 when the bookings API is built.
 * For now shows the correct empty-state UI that a new user sees before
 * making their first booking.
 */
export default function BookingsScreen() {
  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 pt-14 pb-4 border-b border-neutral-100">
        <Text className="text-2xl font-bold text-neutral-800">My Bookings</Text>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-8">
        <CalendarX size={56} color="#CBD5E0" />
        <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">
          No bookings yet
        </Text>
        <Text className="text-sm text-neutral-500 mt-2 text-center">
          Find a barber, pick a service, and book your first appointment!
        </Text>
        <Pressable
          onPress={() => router.push('/(client)/(tabs)/search' as never)}
          className="bg-primary rounded-xl px-8 py-3.5 mt-6 active:opacity-80"
        >
          <Text className="text-white font-bold text-sm">Find a Barber</Text>
        </Pressable>
      </View>
    </View>
  );
}
