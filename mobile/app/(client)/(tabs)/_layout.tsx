import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, Search, Calendar, User } from 'lucide-react-native';
import { useRefreshSignal } from '@/stores/refreshSignal';

type TabIconProps = { color: string; size: number };

export default function ClientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fdb276',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
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
          tabBarIcon: ({ color, size }: TabIconProps) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
