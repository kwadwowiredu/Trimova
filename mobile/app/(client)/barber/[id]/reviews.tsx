import { View, Text, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { MOCK_SHOP_REVIEWS } from '@/utils/mockShopData';
import { ReviewRow } from '@/components/barber/ReviewRow';
import { tapLight } from '@/utils/haptics';

/** Every review this shop has had — reviews are per-staff-barber. */
export default function AllReviewsScreen() {
  const insets = useSafeAreaInsets();
  const reviews = MOCK_SHOP_REVIEWS; // TODO: real /barbers/:id/reviews endpoint
  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={10}>
          <ChevronLeft size={26} color={T.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: T.text }}>Reviews</Text>
          <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>{reviews.length} reviews · {avg.toFixed(1)} average</Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: r, index: i }) => <ReviewRow review={r} isFirst={i === 0} />}
      />
    </View>
  );
}
