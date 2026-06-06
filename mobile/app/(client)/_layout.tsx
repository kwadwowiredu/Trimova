import { Stack } from 'expo-router';

/**
 * Client group layout. Uses a Stack so detail screens like barber/[id],
 * booking flow, and notifications can push on top of the tab navigator.
 */
export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
