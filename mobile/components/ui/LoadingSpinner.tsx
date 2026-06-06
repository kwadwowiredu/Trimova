import { View, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size={size} color="#fdb276" />
      </View>
    );
  }

  return (
    <View className="py-8 items-center">
      <ActivityIndicator size={size} color="#fdb276" />
    </View>
  );
}
