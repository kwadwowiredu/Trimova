import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

/**
 * Runs the auth bootstrap (reads token from SecureStore, validates with API).
 * Redirect logic lives in app/index.tsx using <Redirect> — declarative and
 * timing-safe, unlike router.replace() in a useEffect.
 */
function RootLayoutInner() {
  const { setAuth, logout, setLoading } = useAuthStore();

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

  // Bare Stack — Expo Router auto-discovers all routes.
  // No explicit Stack.Screen declarations needed here.
  return <Stack screenOptions={{ headerShown: false }} />;
}
