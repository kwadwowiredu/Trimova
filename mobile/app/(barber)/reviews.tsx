import { useQuery } from '@tanstack/react-query';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Star, MessageSquare } from 'lucide-react-native';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/authStore';
import { reviewsService } from '@/services/reviews';
import { fmtReviewDate } from '@/utils/reviewDisplay';

/** The shape this screen draws — mapped from the API's review record. */
interface Review {
  id: string;
  clientName: string;
  date: string;
  rating: number;
  text: string;
  serviceName: string;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color="#D69E2E" fill={s <= rating ? '#D69E2E' : 'transparent'} />
      ))}
    </View>
  );
}

function RatingBar({ count, total, stars, c }: { count: number; total: number; stars: number; c: ThemeColors }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
      <Text style={{ fontSize: 12, color: c.textMuted, width: 10 }}>{stars}</Text>
      <Star size={10} color="#D69E2E" fill="#D69E2E" />
      <View style={{ flex: 1, height: 6, backgroundColor: c.surfaceAlt, borderRadius: 3 }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#D69E2E', borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 11, color: c.textFaint, width: 20, textAlign: 'right' }}>{count}</Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { user } = useAuthStore();

  // Every review this barber has earned. A staff barber sees their own; an
  // owner sees the ones credited to the shop.
  const { data, isLoading: loading } = useQuery({
    queryKey: ['my-reviews', user?.id],
    queryFn: () => reviewsService.getBarberReviews(user!.id),
    enabled: !!user?.id,
  });

  const reviews: Review[] = (data?.data.data ?? []).map((r) => ({
    id: r.id,
    clientName: r.clientName,
    date: fmtReviewDate(r.createdAt),
    rating: r.rating,
    text: r.comment,
    // The API ties a review to a booking, not a service name, so the staff
    // member who did the work is the more useful line here.
    serviceName: r.staffName ?? '',
  }));

  const avgRating = reviews.length
    ? parseFloat((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: reviews.filter((r) => r.rating === s).length,
  }));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={c.textMuted} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Reviews & Ratings</Text>
            <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Client feedback & scores</Text>
          </View>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {/* Rating hero skeleton */}
          <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 20, flexDirection: 'row', gap: 20 }}>
            <View style={{ alignItems: 'center', gap: 8, minWidth: 80 }}>
              <Skeleton width={70} height={48} borderRadius={10} />
              <Skeleton width={60} height={12} />
            </View>
            <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={8} />)}
            </View>
          </View>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Reviews & Ratings</Text>
          <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>Client feedback & scores</Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        ListHeaderComponent={
          <>
            {/* Average rating hero */}
            <View style={{
              backgroundColor: c.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              padding: 20,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                {/* Big score */}
                <View style={{ alignItems: 'center', minWidth: 80 }}>
                  <Text style={{ fontSize: 52, fontWeight: '800', color: c.text, lineHeight: 60 }}>{avgRating}</Text>
                  <Text style={{ fontSize: 12, color: '#D69E2E', fontWeight: '700' }}>out of 5</Text>
                  <StarRow rating={Math.round(avgRating)} size={16} />
                  <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{reviews.length} reviews</Text>
                </View>

                {/* Distribution bars */}
                <View style={{ flex: 1 }}>
                  {ratingCounts.map(({ stars, count }) => (
                    <RatingBar key={stars} stars={stars} count={count} total={reviews.length} c={c} />
                  ))}
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
              All Reviews
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
            padding: 16,
            marginBottom: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{item.clientName}</Text>
                <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>{item.date} · {item.serviceName}</Text>
              </View>
              <StarRow rating={item.rating} size={13} />
            </View>
            {item.text ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <MessageSquare size={13} color={c.textFaint} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 13, color: c.textMuted, lineHeight: 20 }}>{item.text}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
