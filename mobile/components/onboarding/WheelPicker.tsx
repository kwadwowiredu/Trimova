import { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { OB } from './tokens';

const ITEM_H = 46;
const VISIBLE = 5; // odd → one centred row

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
export const MINUTES = ['00', '15', '30', '45'];

function WheelColumn({ data, value, onChange }: { data: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<ScrollView>(null);
  const startIndex = Math.max(0, data.indexOf(value));

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: startIndex * ITEM_H, animated: false }), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function settle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.min(data.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    const v = data[idx];
    if (v && v !== value) onChange(v);
  }

  const pad = Math.floor(VISIBLE / 2);

  return (
    <View style={{ height: ITEM_H * VISIBLE, width: 72, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        contentContainerStyle={{ paddingVertical: pad * ITEM_H }}
      >
        {data.map((d, i) => (
          <Pressable
            key={d}
            style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); onChange(d); }}
          >
            <Text style={{ fontSize: d === value ? 26 : 19, fontWeight: d === value ? '800' : '500', color: d === value ? OB.onSurface : OB.textFaint }}>{d}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Centre selection band */}
      <View pointerEvents="none" style={{ position: 'absolute', top: pad * ITEM_H, left: 0, right: 0, height: ITEM_H, borderTopWidth: 1, borderBottomWidth: 1, borderColor: OB.outlineVariant }} />
    </View>
  );
}

/** Smooth scrollable HH:MM time picker (24h, 15-min steps). */
export function WheelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':');
  const minute = MINUTES.includes(m) ? m : '00';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <WheelColumn data={HOURS} value={h} onChange={(nh) => onChange(`${nh}:${minute}`)} />
      <Text style={{ fontSize: 24, fontWeight: '800', color: OB.onSurface, marginHorizontal: 4 }}>:</Text>
      <WheelColumn data={MINUTES} value={minute} onChange={(nm) => onChange(`${h}:${nm}`)} />
    </View>
  );
}
