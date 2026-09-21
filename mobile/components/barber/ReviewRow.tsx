import { View, Text, Image } from 'react-native';
import { Star } from 'lucide-react-native';
import { avatarColorFor, fmtReviewDate } from '@/utils/reviewDisplay';
import type { Review } from '@/services/reviews';
import { T, HAIRLINE } from '@/constants/clientTheme';

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} color={T.star} fill={value >= i - 0.25 ? T.star : 'transparent'} />
      ))}
    </View>
  );
}

/**
 * One client review: profile photo when they have one, otherwise a colored
 * initials avatar (color is stable per client name).
 */
export function ReviewRow({ review, showStaff = true, isFirst = false }: {
  review: Review;
  showStaff?: boolean;
  isFirst?: boolean;
}) {
  const initials = review.clientName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, borderTopWidth: isFirst ? 0 : HAIRLINE, borderTopColor: T.border }}>
      {/* Avatar */}
      {review.clientAvatarUrl ? (
        <Image source={{ uri: review.clientAvatarUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: avatarColorFor(review.clientName), alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{initials}</Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: T.text }}>{review.clientName}</Text>
          <Text style={{ fontSize: 12, color: T.textFaint }}>{fmtReviewDate(review.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Stars value={review.rating} />
          {showStaff && review.staffName && (
            <Text style={{ fontSize: 11.5, color: T.textFaint }}>with {review.staffName}</Text>
          )}
        </View>
        <Text style={{ fontSize: 13.5, color: T.textMuted, lineHeight: 19, marginTop: 6 }}>{review.comment}</Text>
      </View>
    </View>
  );
}
