import { View, Image, type ImageStyle, type StyleProp } from 'react-native';

// Brand artwork used in place of the generic lucide glyphs on the client side.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const STAR_IMG = require('../../assets/star.jpg');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CALENDAR_IMG = require('../../assets/calendar_image.jpg');

/** Brand star. `size` keeps the same call shape as the lucide <Star size=… />. */
export function StarIcon({ size = 16, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={STAR_IMG} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/** Brand calendar mark used on the booking date screen. */
export function CalendarIcon({ size = 22, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={CALENDAR_IMG} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/**
 * Five-star rating row. The artwork can't be half-filled, so stars past the
 * score are dimmed instead.
 */
export function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} style={{ opacity: value >= i - 0.25 ? 1 : 0.22 }} />
      ))}
    </View>
  );
}
