import { useEffect, useRef } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height = 16, borderRadius = 8, className }: SkeletonProps) {
  const c = useThemeColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius,
          backgroundColor: c.isDark ? c.surfaceAlt : '#E2E8F0',
          opacity,
        },
      ]}
      className={className}
    />
  );
}

export function CardSkeleton() {
  const c = useThemeColors();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton height={14} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={12} width="80%" />
      <Skeleton height={12} width="55%" />
    </View>
  );
}

/** A simple settings-style row skeleton (icon + two text lines). */
export function RowSkeleton() {
  const c = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 16 }}>
      <Skeleton width={38} height={38} borderRadius={10} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={13} width="45%" />
        <Skeleton height={11} width="65%" />
      </View>
      <Skeleton width={40} height={12} />
    </View>
  );
}

/** Full-screen list of card skeletons for screen-level loading states. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}
