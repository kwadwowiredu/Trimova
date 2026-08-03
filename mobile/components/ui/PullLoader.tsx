import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

/** Three dots that bounce in sequence while a refresh is in flight. */
function BouncyDots({ color = '#14213d' }: { color?: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 140),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginLeft: 3 }}>
      {dots.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5, height: 5, borderRadius: 2.5, backgroundColor: color,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
          }}
        />
      ))}
    </View>
  );
}

/**
 * Hidden "Loading" strip that lives above the top of the screen and only
 * becomes visible as the user drags the page down (or while a refresh runs) —
 * the TikTok-style pull-to-refresh cue.
 *
 * Render as the FIRST child of a scroll view, with `scrollY` fed by that view's
 * onScroll. Overscroll makes scrollY negative, which fades this in.
 */
export function PullLoader({
  scrollY,
  refreshing,
  background = '#fed9b7',
  color = '#14213d',
}: {
  scrollY: Animated.Value;
  refreshing: boolean;
  background?: string;
  color?: string;
}) {
  // Fades in over the first ~70px of pull.
  const pullOpacity = scrollY.interpolate({
    inputRange: [-70, -18, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: -600, left: 0, right: 0, height: 600,
        backgroundColor: background,
        alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18,
      }}
    >
      <Animated.View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 2,
          opacity: refreshing ? 1 : pullOpacity,
        }}
      >
        <Text style={{ fontSize: 13.5, fontWeight: '700', color, letterSpacing: 0.3 }}>Loading</Text>
        <BouncyDots color={color} />
      </Animated.View>
    </View>
  );
}
