import { View, Text, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Star, MessageSquare } from 'lucide-react-native';

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

function RatingBar({ count, total, stars }: { count: number; total: number; stars: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
      <Text style={{ fontSize: 12, color: '#718096', width: 10 }}>{stars}</Text>
      <Star size={10} color="#D69E2E" fill="#D69E2E" />
      <View style={{ flex: 1, height: 6, backgroundColor: '#f1f2f3', borderRadius: 3 }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#D69E2E', borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 11, color: '#A0AEC0', width: 20, textAlign: 'right' }}>{count}</Text>
    </View>
  );
}

export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();

  const ratingCounts = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: MOCK_REVIEWS.filter((r) => r.rating === s).length,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8', paddingTop: insets.top }}>

      {/* Header */}
      <View style={{ backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f2f3' }}>
        <Pressable onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f2f3', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color="#4A5568" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#1A202C' }}>Reviews & Ratings</Text>
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
              backgroundColor: '#fff',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              padding: 20,
              marginBottom: 16,
              shadowColor: '#1A202C',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                {/* Big score */}
                <View style={{ alignItems: 'center', minWidth: 80 }}>
                  <Text style={{ fontSize: 52, fontWeight: '800', color: '#1A202C', lineHeight: 60 }}>{AVG_RATING}</Text>
                  <Text style={{ fontSize: 12, color: '#D69E2E', fontWeight: '700' }}>out of 5</Text>
                  <StarRow rating={Math.round(AVG_RATING)} size={16} />
                  <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 4 }}>{MOCK_REVIEWS.length} reviews</Text>
                </View>

                {/* Distribution bars */}
                <View style={{ flex: 1 }}>
                  {ratingCounts.map(({ stars, count }) => (
                    <RatingBar key={stars} stars={stars} count={count} total={MOCK_REVIEWS.length} />
                  ))}
                </View>
              </View>
            </View>

            <Text style={{ fontSize: 11, fontWeight: '800', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginLeft: 2 }}>
              All Reviews
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            padding: 16,
            marginBottom: 10,
            shadowColor: '#1A202C',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A202C' }}>{item.clientName}</Text>
                <Text style={{ fontSize: 11, color: '#A0AEC0', marginTop: 1 }}>{item.date} · {item.serviceName}</Text>
              </View>
              <StarRow rating={item.rating} size={13} />
            </View>
            {item.text ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <MessageSquare size={13} color="#CBD5E0" style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 20 }}>{item.text}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
