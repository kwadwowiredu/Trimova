import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MessageSquare } from 'lucide-react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { reviewsService } from '@/services/reviews';
import { ReviewRow } from '@/components/barber/ReviewRow';
import { tapLight } from '@/utils/haptics';

/** Every review this shop has had — reviews belong to the barber who earned them. */
export default function AllReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsService.getBarberReviews(id!),
    enabled: !!id,
  });

  const reviews = data?.data.data ?? [];
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
          {reviews.length > 0 && (
            <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>
              {reviews.length} review{reviews.length === 1 ? '' : 's'} · {avg.toFixed(1)} average
            </Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : reviews.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={28} color={T.textFaint} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: T.text, marginTop: 16 }}>
            No reviews yet
          </Text>
          <Text style={{ fontSize: 13.5, color: T.textFaint, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Once clients finish an appointment here, their reviews will show up.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: r, index: i }) => <ReviewRow review={r} isFirst={i === 0} />}
        />
      )}
    </View>
  );
}
