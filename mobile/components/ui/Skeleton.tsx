import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface SkeletonProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width, height = 16, borderRadius = 8, className }: SkeletonProps) {
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
          backgroundColor: '#E2E8F0',
          opacity,
        },
      ]}
      className={className}
    />
  );
}

export function CardSkeleton() {
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm gap-3">
      <View className="flex-row items-center gap-3">
        <Skeleton width={44} height={44} borderRadius={22} />
        <View className="flex-1 gap-2">
          <Skeleton height={14} width="60%" />
          <Skeleton height={12} width="40%" />
        </View>
      </View>
      <Skeleton height={12} width="80%" />
      <Skeleton height={12} width="55%" />
    </View>
  );
}
