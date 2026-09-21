import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useUnreadCount } from '@/hooks/useNotifications';
import { tapLight } from '@/utils/haptics';

interface NotificationBellProps {
  /** Where tapping goes — each app group has its own notifications screen. */
  route: string;
  color: string;
  size?: number;
  /** Badge fill; defaults to a red that reads on both light and dark headers. */
  badgeColor?: string;
  /** Ring around the badge so it stays legible over a busy header. */
  badgeBorderColor?: string;
}

/**
 * The bell every header shares. Shows a live unread count rather than a bare
 * dot, so a barber can tell one new booking from six at a glance.
 */
export function NotificationBell({
  route,
  color,
  size = 22,
  badgeColor = '#E53E3E',
  badgeBorderColor,
}: NotificationBellProps) {
  const unread = useUnreadCount();

  return (
    <Pressable
      onPress={() => { tapLight(); router.push(route as never); }}
      hitSlop={10}
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      style={{ padding: 4 }}
    >
      <Bell size={size} color={color} />

      {unread > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: badgeColor,
            alignItems: 'center',
            justifyContent: 'center',
            ...(badgeBorderColor ? { borderWidth: 1.5, borderColor: badgeBorderColor } : {}),
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>
            {unread > 9 ? '9+' : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
