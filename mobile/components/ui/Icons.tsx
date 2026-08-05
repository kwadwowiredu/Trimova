import { View, Image, type ImageStyle, type StyleProp } from 'react-native';
import { T } from '@/constants/clientTheme';

// Brand artwork. Used in exactly two places so the rest of the app keeps the
// consistent lucide icon set:
//   • StarIcon      — the "Recommended" heading on the client home
//   • StarBadge     — the My Reviews empty state
//   • CalendarBadge — the Bookings empty state
//
// eslint-disable-next-line @typescript-eslint/no-require-imports
const STAR_IMG = require('../../assets/star.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CALENDAR_IMG = require('../../assets/calendar_image.png');

/** Brand star mark. */
export function StarIcon({ size = 16, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={STAR_IMG} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/** Brand calendar mark. */
export function CalendarIcon({ size = 22, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  return <Image source={CALENDAR_IMG} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}

/**
 * Empty-state artwork. The image sits on the screen's own canvas colour so a
 * non-transparent source blends in rather than showing a white square.
 */
function EmptyBadge({ children, size }: { children: React.ReactNode; size: number }) {
  return (
    <View
      style={{
        width: size * 2.1,
        height: size * 2.1,
        borderRadius: size * 1.05,
        backgroundColor: T.canvas,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

export function StarBadge({ size = 52 }: { size?: number }) {
  return <EmptyBadge size={size}><StarIcon size={size} /></EmptyBadge>;
}

export function CalendarBadge({ size = 52 }: { size?: number }) {
  return <EmptyBadge size={size}><CalendarIcon size={size} /></EmptyBadge>;
}
