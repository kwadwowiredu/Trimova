import { View, Text, Pressable, Modal } from 'react-native';
import { XCircle, AlertTriangle } from 'lucide-react-native';

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
  const isDanger = variant === 'danger';

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
          className="w-full bg-white rounded-3xl overflow-hidden"
          onPress={() => { /* absorb tap */ }}
        >
          {/* ── Icon banner ──────────────────────────────────── */}
          <View
            className={`items-center py-8 ${isDanger ? 'bg-red-50' : 'bg-amber-50'}`}
          >
            <View
              className={`w-[72px] h-[72px] rounded-full items-center justify-center ${
                isDanger ? 'bg-red-100' : 'bg-amber-100'
              }`}
            >
              {isDanger ? (
                <XCircle size={36} color="#E53E3E" />
              ) : (
                <AlertTriangle size={36} color="#D69E2E" />
              )}
            </View>
          </View>

          {/* ── Text + buttons ────────────────────────────────── */}
          <View className="px-6 pt-5 pb-7 gap-5">
            {/* Title + message */}
            <View className="gap-2 items-center">
              <Text className="text-[17px] font-bold text-neutral-800 text-center">
                {title}
              </Text>
              <Text className="text-sm text-neutral-500 text-center leading-[21px]">
                {message}
              </Text>
            </View>

            {/* Action buttons */}
            <View className="gap-3">
              <Pressable
                onPress={onConfirm}
                className={`py-4 rounded-2xl items-center active:opacity-75 ${
                  isDanger ? 'bg-danger' : 'bg-warning'
                }`}
              >
                <Text className="text-white font-bold text-[15px]">
                  {confirmLabel}
                </Text>
              </Pressable>

              <Pressable
                onPress={onClose}
                className="py-4 rounded-2xl items-center active:opacity-75 bg-neutral-100"
              >
                <Text className="text-neutral-700 font-semibold text-[15px]">
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
