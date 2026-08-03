import { Stack } from 'expo-router';

/**
 * Staff barber workspace.
 *
 * Deliberately NOT included (owner/admin only):
 *   payouts · shop-wide statistics · staff management · business details
 *   loyalty programs · platform rewards · account/shop deletion
 */
export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
