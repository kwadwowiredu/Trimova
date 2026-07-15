import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Star, MessageSquare } from 'lucide-react-native';
import { useThemeColors, type ThemeColors } from '@/hooks/useThemeColors';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';

interface Review {
  id: string;
  clientName: string;
  date: string;
  rating: number;
  text: string;
  serviceName: string;
}

const MOCK_REVIEWS: Review[] = [
  { id: '1', clientName: 'Kwame Mensah', date: '15 Jun 2026', rating: 5, serviceName: 'Executive Fade', text: 'Absolutely flawless work! The fade was clean and sharp. Will definitely be coming back every two weeks.' },
  { id: '2', clientName: 'Ama Boateng', date: '12 Jun 2026', rating: 5, serviceName: 'Haircut & Beard', text: 'Best barber in Accra hands down. Very professional and great attention to detail.' },
  { id: '3', clientName: 'Kofi Asante', date: '8 Jun 2026', rating: 4, serviceName: 'Beard Trim', text: 'Great service as usual. The beard shaping was perfect, though I waited a bit longer than expected.' },
  { id: '4', clientName: 'Yaw Mensah', date: '2 Jun 2026', rating: 5, serviceName: 'Skin Fade', text: 'Top tier! My skin fade came out looking fresh. Highly recommend to anyone looking for quality barbering.' },
  { id: '5', clientName: 'Abena Osei', date: '28 May 2026', rating: 4, serviceName: 'Kids Haircut', text: 'Very patient with my son and did a wonderful job. He was happy with his cut!' },
  { id: '6', clientName: 'Fiifi Andoh', date: '20 May 2026', rating: 3, serviceName: 'Haircut & Beard', text: 'Good work overall but the shop was a bit noisy. The cut itself was fine though.' },
];

const AVG_RATING = parseFloat((MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length).toFixed(1));

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
  const [loading, setLoading] = useState(true);

  // TODO: replace with the real reviews fetch once the reviews endpoint exists.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const ratingCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: MOCK_REVIEWS.filter((r) => r.rating === s).length,
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
        data={MOCK_REVIEWS}
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
                  <Text style={{ fontSize: 52, fontWeight: '800', color: c.text, lineHeight: 60 }}>{AVG_RATING}</Text>
                  <Text style={{ fontSize: 12, color: '#D69E2E', fontWeight: '700' }}>out of 5</Text>
                  <StarRow rating={Math.round(AVG_RATING)} size={16} />
                  <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{MOCK_REVIEWS.length} reviews</Text>
                </View>

                {/* Distribution bars */}
                <View style={{ flex: 1 }}>
                  {ratingCounts.map(({ stars, count }) => (
                    <RatingBar key={stars} stars={stars} count={count} total={MOCK_REVIEWS.length} c={c} />
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
