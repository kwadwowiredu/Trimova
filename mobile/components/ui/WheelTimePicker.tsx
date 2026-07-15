import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

const ITEM_H = 48;
const VISIBLE = 5;                       // odd number of visible rows
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function nearestMinute(m: string): string {
  const n = parseInt(m, 10) || 0;
  let best = MINUTES[0];
  let bestDiff = Infinity;
  for (const opt of MINUTES) {
    const d = Math.abs(parseInt(opt, 10) - n);
    if (d < bestDiff) { bestDiff = d; best = opt; }
  }
  return best;
}

function WheelColumn({
  data, initial, onChange,
}: { data: string[]; initial: string; onChange: (v: string) => void }) {
  const c = useThemeColors();
  const ref = useRef<ScrollView>(null);
  const startIndex = Math.max(0, data.indexOf(initial));
  const [cur, setCur] = useState(initial);

  // Snap to the initial value once, just after mount.
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: startIndex * ITEM_H, animated: false }), 10);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(data.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    const v = data[i];
    setCur(v);
    onChange(v);
  }

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      nestedScrollEnabled
      onMomentumScrollEnd={handleEnd}
      contentContainerStyle={{ paddingVertical: PAD }}
      style={{ height: ITEM_H * VISIBLE, width: 72 }}
    >
      {data.map((d) => {
        const selected = d === cur;
        return (
          <View key={d} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: selected ? 26 : 19, fontWeight: selected ? '800' : '500', color: selected ? c.text : c.textFaint }}>
              {d}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

export function WheelTimePicker({
  visible, value, label, onChange, onClose,
}: {
  visible: boolean;
  value: string;
  label: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();

  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [openId, setOpenId] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const [hh, mm] = (value || '09:00').split(':');
    setHour((hh ?? '09').padStart(2, '0'));
    setMinute(nearestMinute(mm ?? '00'));
    setOpenId((x) => x + 1); // force the columns to remount + re-snap
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  function confirm() {
    onChange(`${hour}:${minute}`);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} />
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 12 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginTop: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text }}>{label}</Text>
          <Pressable onPress={confirm} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={{ position: 'relative', alignItems: 'center', marginBottom: 8 }}>
          {/* Center selection band (behind the wheels) */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: 40, right: 40, top: PAD, height: ITEM_H, borderRadius: 14, backgroundColor: c.surfaceAlt }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <WheelColumn key={`h${openId}`} data={HOURS} initial={hour} onChange={setHour} />
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, marginHorizontal: 4 }}>:</Text>
            <WheelColumn key={`m${openId}`} data={MINUTES} initial={minute} onChange={setMinute} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
