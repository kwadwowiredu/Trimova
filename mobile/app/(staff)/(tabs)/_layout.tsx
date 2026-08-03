import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { HomeIcon, CalendarCheck } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AvatarTabIcon } from '@/components/ui/AvatarTabIcon';
import { tapSelect } from '@/utils/haptics';

/** Three tabs only — no Staff Management tab for staff barbers. */
export default function StaffTabsLayout() {
  const c = useThemeColors();
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
      screenListeners={{ tabPress: () => tapSelect() }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: 'Bookings', tabBarIcon: ({ color }) => <CalendarCheck size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <AvatarTabIcon color={color} size={22} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
