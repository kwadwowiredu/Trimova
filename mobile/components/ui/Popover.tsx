import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  useWindowDimensions,
  type View as RNView,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface Anchor { x: number; y: number; width: number; height: number; }

/**
 * useAnchor — attach the returned `ref` to a trigger and call `open()` in its
 * onPress. It measures the trigger in the window so a Popover can float beneath
 * it. `anchor` is null while closed.
 */
export function useAnchor() {
  const ref = useRef<RNView>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const open = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }, []);

  const close = useCallback(() => setAnchor(null), []);

  return { ref, anchor, open, close, isOpen: anchor !== null };
}

const GAP = 8;
const CARET = 9;

/**
 * Floating popover that anchors beneath a trigger with a small caret, dims
 * nothing (transparent backdrop), and closes on outside tap.
 */
export function Popover({
  anchor, onClose, children, width = 200, placement = 'auto',
}: {
  anchor: Anchor | null;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  placement?: 'auto' | 'below' | 'above';
}) {
  const c = useThemeColors();
  const { width: screenW, height: screenH } = useWindowDimensions();
  if (!anchor) return null;

  const triggerCenterX = anchor.x + anchor.width / 2;
  let left = triggerCenterX - width / 2;
  left = Math.max(10, Math.min(left, screenW - width - 10));
  const caretLeft = triggerCenterX - left - CARET;

  const above = placement === 'above' || (placement === 'auto' && anchor.y > screenH * 0.55);

  const cardPos = above
    ? { bottom: screenH - anchor.y + GAP }
    : { top: anchor.y + anchor.height + GAP };

  const caretPos = above
    ? { bottom: screenH - anchor.y + GAP - CARET + 1 }
    : { top: anchor.y + anchor.height + GAP - CARET + 1 };

  const caretBorders = above
    ? { borderTopWidth: CARET, borderTopColor: c.surface }
    : { borderBottomWidth: CARET, borderBottomColor: c.surface };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        {/* Caret */}
        <View
          style={{
            position: 'absolute', left: caretLeft, ...caretPos,
            width: 0, height: 0,
            borderLeftWidth: CARET, borderRightWidth: CARET,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            ...caretBorders,
            zIndex: 2,
          }}
        />
        <View
          style={{
            position: 'absolute', left, width, ...cardPos,
            backgroundColor: c.surface,
            borderRadius: 16,
            borderWidth: 1, borderColor: c.border,
            overflow: 'hidden',
            shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: c.isDark ? 0.5 : 0.18, shadowRadius: 16,
            elevation: 12,
          }}
        >
          {children}
        </View>
      </Pressable>
    </Modal>
  );
}

/** Convenience scrollable option list rendered inside a Popover. */
export function PopoverMenu({
  options, selected, onSelect, maxHeight = 260,
}: {
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  maxHeight?: number;
}) {
  const c = useThemeColors();
  return (
    <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false} bounces={false}>
      {options.map((opt, i) => {
        const isSel = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingVertical: 14,
              borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border,
              backgroundColor: isSel ? c.accentSoft : 'transparent',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: isSel ? '700' : '500', color: isSel ? c.accent : c.text }}>
              {opt.label}
            </Text>
            {isSel && <Check size={16} color={c.accent} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
