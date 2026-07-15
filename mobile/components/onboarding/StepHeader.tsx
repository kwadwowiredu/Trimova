import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, Check } from 'lucide-react-native';
import { OB } from './tokens';

function CompletedCircle() {
  return (
    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: OB.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
      <Check size={13} color={OB.onPrimary} strokeWidth={3} />
    </View>
  );
}

/**
 * Progress header for the barber onboarding wizard.
 * Shows: back arrow · a 3-circle stepper window · Skip, with a "Step N of TOTAL" caption.
 */
export function StepHeader({
  step,
  total = 7,
  onBack,
  onSkip,
}: {
  step: number;
  total?: number;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const isLast = step >= total;

  return (
    <View style={{ backgroundColor: OB.background, borderBottomWidth: 1, borderBottomColor: OB.border, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
        <Pressable onPress={onBack} hitSlop={10} style={{ width: 56 }}>
          <ChevronLeft size={26} color={OB.onBackground} />
        </Pressable>

        {/* 3-circle stepper window */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <CompletedCircle />
          <View style={{ width: 28, height: 2, backgroundColor: OB.primary }} />
          {isLast ? (
            <CompletedCircle />
          ) : (
            /* current */
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: OB.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: OB.onPrimary, fontSize: 13, fontWeight: '800' }}>{step}</Text>
            </View>
          )}
          <View style={{ width: 28, height: 2, backgroundColor: isLast ? OB.primary : OB.surfaceContainerHighest }} />
          {isLast ? (
            /* current (final) */
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: OB.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: OB.onPrimary, fontSize: 13, fontWeight: '800' }}>{step}</Text>
            </View>
          ) : (
            /* upcoming */
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: OB.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: OB.textFaint, fontSize: 12, fontWeight: '700' }}>{step + 1}</Text>
            </View>
          )}
        </View>

        <View style={{ width: 56, alignItems: 'flex-end' }}>
          {onSkip && (
            <Pressable onPress={onSkip} hitSlop={10}>
              <Text style={{ color: OB.primary, fontSize: 15, fontWeight: '600' }}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={{ textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, color: OB.onSurfaceVariant }}>
        Step {step} of {total}
      </Text>
    </View>
  );
}

/** Sticky bottom dock: "< Previous" + a primary "Continue" button (gated by canContinue). */
export function OnboardingFooter({
  onPrevious,
  onContinue,
  continueLabel = 'Continue',
  loading = false,
  canContinue = true,
  insetBottom = 0,
}: {
  onPrevious?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  loading?: boolean;
  /** When false, the Continue button is dimmed and does nothing. */
  canContinue?: boolean;
  insetBottom?: number;
}) {
  const blocked = loading || !canContinue;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insetBottom + 12, backgroundColor: OB.background, borderTopWidth: 1, borderTopColor: OB.border }}>
      {onPrevious && (
        <Pressable onPress={onPrevious} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 14 }}>
          <ChevronLeft size={18} color={OB.onSurfaceVariant} />
          <Text style={{ color: OB.onSurfaceVariant, fontSize: 15, fontWeight: '600' }}>Previous</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => { if (!blocked) onContinue(); }}
        disabled={blocked}
        style={{ flex: 1, backgroundColor: canContinue ? OB.primary : OB.surfaceContainerHigh, borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}
      >
        <Text style={{ color: canContinue ? OB.onPrimary : OB.textFaint, fontSize: 15, fontWeight: '800' }}>
          {loading ? 'Saving…' : `${continueLabel} ›`}
        </Text>
      </Pressable>
    </View>
  );
}
