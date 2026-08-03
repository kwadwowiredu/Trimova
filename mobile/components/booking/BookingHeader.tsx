import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ShoppingBag, Clock } from 'lucide-react-native';
import { tapLight } from '@/utils/haptics';
import { T, HAIRLINE } from '@/constants/clientTheme';

/** Clean booking header: back arrow + a large bold title on the canvas. */
export function BookingHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6, backgroundColor: T.canvas, borderBottomWidth: HAIRLINE, borderBottomColor: T.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 14, paddingTop: 8 }}>
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={12}>
          <ArrowLeft size={24} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 23, fontWeight: '800', color: T.text, letterSpacing: -0.3 }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, color: T.textFaint, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Sticky bottom action button. The accent is reserved for this target. */
export function BookingFooter({
  label, onPress, disabled = false, hint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, borderTopWidth: HAIRLINE, borderTopColor: T.border, backgroundColor: T.card }}>
      {hint ? (
        <Text style={{ fontSize: 12.5, color: T.textFaint, marginBottom: 10, textAlign: 'center' }}>{hint}</Text>
      ) : null}
      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? T.input : T.accent,
          borderRadius: 16, paddingVertical: 17, alignItems: 'center',
        }}
      >
        <Text style={{ color: disabled ? T.textDisabled : T.onAccent, fontSize: 15.5, fontWeight: '700' }}>{label}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Small "cart" bar that appears once a service is chosen — a recessed basket
 * well inside a white card, with the accent reserved for the action button.
 */
export function ServiceCartBar({
  serviceName, price, durationMinutes, actionLabel, onPress, disabled = false,
}: {
  serviceName: string;
  price: number;
  durationMinutes: number;
  actionLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: T.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: HAIRLINE, borderTopColor: T.border,
        paddingTop: 14, paddingHorizontal: 20, paddingBottom: insets.bottom + 14,
        shadowColor: '#221ea2', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 12,
      }}
    >
      {/* Layer 2 basket well */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.input, borderRadius: 16, padding: 13 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: T.card, alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingBag size={18} color={T.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14.5, fontWeight: '700', color: T.text }} numberOfLines={1}>{serviceName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <Clock size={11} color={T.textFaint} />
            <Text style={{ fontSize: 12, color: T.textFaint }}>{durationMinutes} mins</Text>
          </View>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: T.text }}>GH₵{price.toFixed(0)}</Text>
      </View>

      <Pressable
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? T.input : T.accent,
          borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12,
        }}
      >
        <Text style={{ color: disabled ? T.textDisabled : T.onAccent, fontSize: 15.5, fontWeight: '700' }}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
