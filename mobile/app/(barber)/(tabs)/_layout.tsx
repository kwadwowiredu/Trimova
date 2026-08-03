import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { HomeIcon, CalendarCheck, Users } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuthStore } from '@/stores/authStore';
import { useRefreshSignal } from '@/stores/refreshSignal';
import { AvatarTabIcon } from '@/components/ui/AvatarTabIcon';
import { tapSelect } from '@/utils/haptics';
import type { BarberProfile } from '@/types/user';

export default function BarberTabsLayout() {
  const c = useThemeColors();
  const { user } = useAuthStore();
  // Freelance (mobile) barbers work solo — no staff management for them.
  const isFreelance = (user as BarberProfile | null)?.barberType === 'mobile';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textFaint,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
      // Subtle haptic tick on every tab switch.
      screenListeners={{ tabPress: () => tapSelect() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon   size={22} color={color} />,
        }}
        // Only refresh when Home is pressed while already focused.
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) useRefreshSignal.getState().bumpBarberHome();
          },
        })}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          title: 'Staff',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          // href: null removes the tab entirely for freelance barbers
          href: isFreelance ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // The barber's own photo instead of a generic person icon.
          tabBarIcon: ({ color, focused }) => <AvatarTabIcon color={color} size={22} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
