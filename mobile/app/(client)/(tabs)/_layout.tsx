import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Search, Calendar } from 'lucide-react-native';
import { useRefreshSignal } from '@/stores/refreshSignal';
import { AvatarTabIcon } from '@/components/ui/AvatarTabIcon';
import { tapSelect } from '@/utils/haptics';
import { T, HAIRLINE } from '@/constants/clientTheme';

type TabIconProps = { color: string; size: number; focused: boolean };

export default function ClientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Accent restraint: the active tab is one of the few accent moments.
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textFaint,
        tabBarStyle: {
          backgroundColor: T.card,
          borderTopColor: T.border,
          borderTopWidth: HAIRLINE,
          paddingTop: 6,
          // Respect the iOS home indicator
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
      // Subtle haptic tick on every tab switch.
      screenListeners={{ tabPress: () => tapSelect() }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Home size={size} color={color} />
          ),
        }}
        // Instagram/TikTok behaviour: pressing Home only refreshes when the
        // user is ALREADY on Home — not when switching over from another tab.
        listeners={({ navigation }) => ({
          tabPress: () => {
            if (navigation.isFocused()) useRefreshSignal.getState().bumpClientHome();
          },
        })}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          // The user's own photo instead of a generic person icon.
          tabBarIcon: ({ color, size, focused }: TabIconProps) => (
            <AvatarTabIcon color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
