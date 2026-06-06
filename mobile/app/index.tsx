import { View, ActivityIndicator } from 'react-native';

/**
 * Root index screen — only visible for the brief moment while the AuthGate
 * in _layout.tsx runs its bootstrap check and calls router.replace().
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#fdb276" />
    </View>
  );
}
