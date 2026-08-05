import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { StarBadge } from '@/components/ui/Icons';

/**
 * Reviews this client has written for barbers. No review system exists yet,
 * so this renders the empty state — the list plugs in once reviews launch.
 */
export default function MyReviewsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F7' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft size={26} color="#161c27" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: '#023047' }}>My Reviews</Text>
      </View>

      {/* Empty state */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 60 }}>
        <StarBadge size={64} />
        <Text style={{ fontSize: 17, fontWeight: '600', color: '#161c27', marginTop: 22, textAlign: 'center' }}>
          No reviews yet
        </Text>
        <Text style={{ fontSize: 14, color: '#8a89a3', lineHeight: 21, marginTop: 8, textAlign: 'center' }}>
          After a completed appointment you'll be able to rate your barber; your reviews will live here.
        </Text>
        <Pressable
          onPress={() => router.push('/(client)/(tabs)/search' as never)}
          style={{ backgroundColor: '#023047', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, marginTop: 24 }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>Find a barber</Text>
        </Pressable>
      </View>
    </View>
  );
}
