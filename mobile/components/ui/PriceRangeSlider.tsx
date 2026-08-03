import { useRef, useState } from 'react';
import { View, Text, PanResponder } from 'react-native';
import { T } from '@/constants/clientTheme';

const THUMB = 26;
const STEP = 10;

/**
 * Dual-thumb price range slider (no native dependency — PanResponder based).
 * Values snap to GHS 10 steps. Styled to match the filter-screen inspo:
 * a thin track, round brand-colored thumbs, and value tags under each thumb.
 */
export function PriceRangeSlider({
  min, max, valueMin, valueMax, onChange,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const [trackW, setTrackW] = useState(0);
  // Refs mirror props so PanResponder closures always read fresh values.
  const loRef = useRef(valueMin);
  const hiRef = useRef(valueMax);
  loRef.current = valueMin;
  hiRef.current = valueMax;
  const startLo = useRef(0);
  const startHi = useRef(0);
  const trackWRef = useRef(0);
  trackWRef.current = trackW;

  const toX = (v: number) => ((v - min) / (max - min)) * Math.max(1, trackWRef.current - THUMB);
  const fromDx = (startVal: number, dx: number) => {
    const usable = Math.max(1, trackWRef.current - THUMB);
    const raw = startVal + (dx / usable) * (max - min);
    return Math.round(raw / STEP) * STEP;
  };

  const loPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startLo.current = loRef.current; },
      onPanResponderMove: (_, g) => {
        const next = Math.max(min, Math.min(fromDx(startLo.current, g.dx), hiRef.current - STEP));
        if (next !== loRef.current) onChange(next, hiRef.current);
      },
    }),
  ).current;

  const hiPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startHi.current = hiRef.current; },
      onPanResponderMove: (_, g) => {
        const next = Math.min(max, Math.max(fromDx(startHi.current, g.dx), loRef.current + STEP));
        if (next !== hiRef.current) onChange(loRef.current, next);
      },
    }),
  ).current;

  const loX = toX(valueMin);
  const hiX = toX(valueMax);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: T.textFaint }}>Min Price</Text>
        <Text style={{ fontSize: 12, color: T.textFaint }}>Max Price</Text>
      </View>

      {/* Track */}
      <View
        onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
        style={{ height: THUMB, justifyContent: 'center' }}
      >
        <View style={{ height: 4, borderRadius: 2, backgroundColor: T.inputDeep }} />
        {trackW > 0 && (
          <>
            {/* Active span */}
            <View style={{ position: 'absolute', left: loX + THUMB / 2, width: Math.max(0, hiX - loX), height: 4, borderRadius: 2, backgroundColor: T.accent }} />
            {/* Thumbs */}
            <View
              {...loPan.panHandlers}
              style={{ position: 'absolute', left: loX, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: T.card, borderWidth: 6, borderColor: T.accent, shadowColor: T.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}
            />
            <View
              {...hiPan.panHandlers}
              style={{ position: 'absolute', left: hiX, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: T.card, borderWidth: 6, borderColor: T.accent, shadowColor: T.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 }}
            />
          </>
        )}
      </View>

      {/* Value tags */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <View style={{ backgroundColor: T.input, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>GH₵{valueMin}</Text>
        </View>
        <View style={{ backgroundColor: T.input, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: T.text }}>GH₵{valueMax}{valueMax >= 500 ? '+' : ''}</Text>
        </View>
      </View>
    </View>
  );
}
