import { View, Text, Pressable, Modal } from 'react-native';
import { XCircle, AlertTriangle } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  /** Label for the dismiss / "go back" button. Defaults to "Keep". */
  cancelLabel?: string;
  /** "danger" = red icon + red confirm button. "warning" = amber. Defaults to "danger". */
  variant?: 'danger' | 'warning';
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep',
  variant = 'danger',
}: ConfirmModalProps) {
  const c = useThemeColors();
  const isDanger = variant === 'danger';

  const bannerBg = isDanger
    ? (c.isDark ? '#3A1B1B' : '#FFF5F5')
    : (c.isDark ? '#3A2E12' : '#FFFBEB');
  const iconRingBg = isDanger
    ? (c.isDark ? '#5A2424' : '#FED7D7')
    : (c.isDark ? '#5A4718' : '#FEEBC8');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Full-screen backdrop — tap to dismiss */}
      <Pressable
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.52)' }}
        onPress={onClose}
      >
        {/* Card — stop propagation so tapping inside doesn't close modal */}
        <Pressable
          className="w-full rounded-3xl overflow-hidden"
          style={{ backgroundColor: c.surface }}
          onPress={() => { /* absorb tap */ }}
        >
          {/* ── Icon banner ──────────────────────────────────── */}
          <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: bannerBg }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: iconRingBg }}>
              {isDanger ? (
                <XCircle size={36} color={c.danger} />
              ) : (
                <AlertTriangle size={36} color={c.warning} />
              )}
            </View>
          </View>

          {/* ── Text + buttons ────────────────────────────────── */}
          <View className="px-6 pt-5 pb-7 gap-5">
            {/* Title + message */}
            <View className="gap-2 items-center">
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>
                {title}
              </Text>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 }}>
                {message}
              </Text>
            </View>

            {/* Action buttons */}
            <View className="gap-3">
              <Pressable
                onPress={onConfirm}
                className="py-4 rounded-2xl items-center active:opacity-75"
                style={{ backgroundColor: isDanger ? c.danger : c.warning }}
              >
                <Text className="text-white font-bold text-[15px]">
                  {confirmLabel}
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                className="py-4 rounded-2xl items-center active:opacity-75"
                style={{ backgroundColor: c.surfaceAlt }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>
                  {cancelLabel}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
