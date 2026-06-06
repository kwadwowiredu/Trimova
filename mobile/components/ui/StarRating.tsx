import { View, Pressable, Text } from 'react-native';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  isInteractive?: boolean;
  onRate?: (rating: number) => void;
  showCount?: boolean;
  reviewCount?: number;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  isInteractive = false,
  onRate,
  showCount = false,
  reviewCount,
}: StarRatingProps) {
  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: maxStars }).map((_, i) => {
        const isFilled = i < Math.round(rating);
        const star = isFilled ? '★' : '☆';

        if (isInteractive && onRate) {
          return (
            <Pressable key={i} onPress={() => onRate(i + 1)}>
              <Text style={{ fontSize: size, color: isFilled ? '#D69E2E' : '#CBD5E0' }}>
                {star}
              </Text>
            </Pressable>
          );
        }

        return (
          <Text key={i} style={{ fontSize: size, color: isFilled ? '#D69E2E' : '#CBD5E0' }}>
            {star}
          </Text>
        );
      })}
      {showCount && reviewCount !== undefined && (
        <Text className="text-xs text-neutral-500 ml-1">({reviewCount})</Text>
      )}
    </View>
  );
}
