import { View, Text, Pressable } from 'react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
        <Text className="text-3xl">⚠️</Text>
      </View>
      <Text className="text-lg font-semibold text-neutral-700 mt-4 text-center">
        Something went wrong
      </Text>
      <Text className="text-sm text-neutral-500 mt-2 text-center">{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="border border-neutral-300 rounded-lg px-6 py-3 mt-6 active:opacity-80"
        >
          <Text className="text-neutral-700 font-semibold">Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}
