import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';
import { TOKEN_STORAGE_KEY } from '@/utils/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}

function AuthGate() {
  const { token, role, isLoading, setAuth, logout, setLoading } = useAuthStore();

  useEffect(() => {
    async function bootstrap() {
      const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        await setAuth(storedToken, res.data.data);
      } catch {
        await logout();
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    if (role === 'client') router.replace('/(client)/(tabs)');
    else if (role === 'barber') router.replace('/(barber)/(tabs)');
    else if (role === 'staff_barber') router.replace('/(staff)/(tabs)');
    else router.replace('/(auth)/login');
  }, [isLoading, token, role]);

  // Always render the Stack so the navigator is mounted before router.replace() fires.
  // The index screen shows a spinner while the auth check runs.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}
