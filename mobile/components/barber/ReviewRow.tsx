import { View, Text, Image } from 'react-native';
import { Star } from 'lucide-react-native';
import { avatarColorFor, fmtReviewDate, type ShopReview } from '@/utils/mockShopData';
import { T, HAIRLINE } from '@/constants/clientTheme';
import { StarIcon, StarRating } from '@/components/ui/Icons';

/**
 * One client review: profile photo when they have one, otherwise a colored
 * initials avatar (color is stable per client name).
 */
export function ReviewRow({ review, showStaff = true, isFirst = false }: {
  review: ShopReview;
  showStaff?: boolean;
  isFirst?: boolean;
}) {
  const initials = review.clientName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: isFirst ? 0 : HAIRLINE, borderTopColor: T.border }}>
      {/* Avatar */}
      {review.avatarUrl ? (
        <Image source={{ uri: review.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarColorFor(review.clientName), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{initials}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: T.text }}>{review.clientName}</Text>
          <Text style={{ fontSize: 12, color: T.textFaint }}>{fmtReviewDate(review.date)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <StarRating value={review.rating} />
          {showStaff && <Text style={{ fontSize: 11.5, color: T.textFaint }}>with {review.staffName}</Text>}
        </View>
        <Text style={{ fontSize: 13.5, color: T.textMuted, lineHeight: 19, marginTop: 6 }}>{review.comment}</Text>
      </View>
    </View>
  );
}
