import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'nativewind';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
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

function RootLayoutInner() {
  const { syncUser, hasHydrated } = useAuthStore();
  const { loadMode, mode } = useThemeStore();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    loadMode();
  }, []);

  useEffect(() => {
    if (mode === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(mode);
    }
  }, [mode]);

  // Instant load from cache, then a silent background refresh from the backend.
  useEffect(() => {
    if (!hasHydrated) return;
    async function bootstrap() {
      const storedToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        // No session — clear any stale cached profile.
        await useAuthStore.getState().logout();
        return;
      }
      // The cached profile (if any) is already hydrated, so render immediately…
      useAuthStore.setState({ token: storedToken, isLoading: false });
      // …then silently reconcile with the latest server state.
      syncUser();
    }
    bootstrap();
  }, [hasHydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
