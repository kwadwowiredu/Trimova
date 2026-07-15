import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Root index — declarative redirect hub.
 * Shows a spinner while auth bootstrap is in progress, then redirects
 * based on token + role. Using <Redirect> (not router.replace) is
 * timing-safe: Expo Router resolves it after the navigation container
 * is ready, avoiding the "Unmatched route" race condition.
 */
export default function Index() {
  const { token, user, role, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#fdb276" />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  // Registered but never confirmed a role (e.g. quit right after "Create Account").
  if ((user as any)?.roleSelected === false) {
    return <Redirect href="/(auth)/role-selection" />;
  }

  if (role === 'client') {
    return <Redirect href="/(client)/(tabs)" />;
  }

  if (role === 'barber') {
    // If the barber has not completed onboarding, send them there first
    const onboardingComplete = (user as any)?.onboardingComplete as boolean | undefined;
    if (onboardingComplete) {
      return <Redirect href="/(barber)/(tabs)" />;
    }
    return <Redirect href="/(barber)/onboarding/barber-type" />;
  }

  // staff_barber and unknown roles — fall back to login
  return <Redirect href="/(auth)/login" />;
}
