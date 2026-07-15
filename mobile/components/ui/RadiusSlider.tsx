import { useRef, useState } from 'react';
import { View, Text, PanResponder, type LayoutChangeEvent } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

const THUMB = 26;

/**
 * Dependency-free slider (PanResponder) for picking a travel radius in km.
 * Drag the thumb or tap anywhere on the track.
 */
export function RadiusSlider({
  value,
  onChange,
  min = 1,
  max = 50,
  label = 'Travel radius',
}: {
  value: number;
  onChange: (km: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const c = useThemeColors();
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    setTrackW(w);
    trackWRef.current = w;
  }

  function kmFromX(x: number) {
    const w = trackWRef.current - THUMB;
    if (w <= 0) return valueRef.current;
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / w));
    return Math.round(min + ratio * (max - min));
  }

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChange(kmFromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChange(kmFromX(e.nativeEvent.locationX)),
    }),
  ).current;

  const ratio = (value - min) / (max - min);
  const thumbLeft = trackW > 0 ? ratio * (trackW - THUMB) : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: c.textFaint, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          {label}
        </Text>
        <View style={{ backgroundColor: c.accentSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.accent }}>{value} km</Text>
        </View>
      </View>

      {/* Track (generous hit area for dragging) */}
      <View onLayout={onLayout} {...pan.panHandlers} style={{ height: 40, justifyContent: 'center' }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surfaceAlt }} />
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, width: thumbLeft + THUMB / 2, height: 6, borderRadius: 3, backgroundColor: c.accent }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: thumbLeft,
            width: THUMB, height: THUMB, borderRadius: THUMB / 2,
            backgroundColor: c.accent, borderWidth: 3, borderColor: '#fff',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ fontSize: 11, color: c.textFaint }}>{min} km</Text>
        <Text style={{ fontSize: 11, color: c.textFaint }}>{max} km</Text>
      </View>
    </View>
  );
}
