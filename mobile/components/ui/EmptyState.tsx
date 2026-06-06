import { View, Text, Pressable } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-16 h-16 rounded-full bg-neutral-100 items-center justify-center mb-4">
        <Text className="text-3xl">✂️</Text>
      </View>
      <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">{title}</Text>
      <Text className="text-sm text-neutral-500 mt-2 text-center">{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          className="bg-accent rounded-lg px-6 py-3 mt-6 active:opacity-80"
        >
          <Text className="text-white font-semibold">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
