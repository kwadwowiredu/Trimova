import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { T, HAIRLINE } from '@/constants/clientTheme';

/**
 * Skeletons for the client app.
 *
 * The shared components/ui/Skeleton reads the barber app's themed palette;
 * the client system uses fixed tokens, so it gets its own. A skeleton that
 * mirrors the real card's layout tells the user what's coming — a spinner
 * only tells them to wait.
 */
function Bar({ width, height = 14, radius = 7 }: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: width ?? '100%',
        height,
        borderRadius: radius,
        backgroundColor: T.inputDeep,
        opacity,
      }}
    />
  );
}

/** Mirrors the booking card: status chips, barber row, time, actions. */
export function BookingCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: T.card, borderRadius: 18,
        borderWidth: HAIRLINE, borderColor: T.border,
        padding: 16, marginBottom: 12,
      }}
    >
      {/* Status + type chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <Bar width={86} height={22} radius={11} />
        <Bar width={70} height={22} radius={11} />
      </View>

      {/* Avatar + service + price */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Bar width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 7 }}>
          <Bar width="70%" height={15} />
          <Bar width="45%" height={12} />
        </View>
        <Bar width={62} height={17} />
      </View>

      {/* When */}
      <View style={{ marginTop: 16 }}>
        <Bar width="55%" height={13} />
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Bar width={86} height={40} radius={12} />
        <Bar width={128} height={40} radius={12} />
      </View>
    </View>
  );
}

export function BookingListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <BookingCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Mirrors a notification row: icon circle, title, body, timestamp. */
export function NotificationRowSkeleton() {
  return (
    <View
      style={{
        flexDirection: 'row', gap: 13, padding: 15, marginBottom: 10,
        borderRadius: 16, backgroundColor: T.card,
        borderWidth: HAIRLINE, borderColor: T.border,
      }}
    >
      <Bar width={38} height={38} radius={19} />
      <View style={{ flex: 1, gap: 8 }}>
        <Bar width="45%" height={14} />
        <Bar width="90%" height={12} />
        <Bar width="65%" height={12} />
        <Bar width={54} height={10} />
      </View>
    </View>
  );
}

export function NotificationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ padding: 16 }}>
      {Array.from({ length: count }, (_, i) => (
        <NotificationRowSkeleton key={i} />
      ))}
    </View>
  );
}
