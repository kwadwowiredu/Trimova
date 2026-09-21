import {
  View, Text, Pressable, FlatList, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, BellOff, CheckCheck, ChevronRight } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { NotificationIcon } from '@/components/ui/NotificationIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { notificationLook, timeAgo, type NotificationTone } from '@/utils/notificationDisplay';
import { tapLight, tapSelect } from '@/utils/haptics';
import type { AppNotification } from '@/services/notifications';

/**
 * The notifications screen for the barber and staff apps. They differ only in
 * where a tapped booking lands, so the whole screen is shared and that route
 * is passed in.
 */
export function NotificationsList({ bookingsRoute }: { bookingsRoute: string }) {
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const { notifications, isLoading, isRefetching, refetch, markRead, markAllRead } =
    useNotifications();

  const unread = notifications.filter((n) => !n.readAt).length;

  /** Map a shared tone onto this app's themed palette. */
  function toneColors(tone: NotificationTone) {
    switch (tone) {
      case 'success': return { fg: c.success, bg: c.isDark ? '#16271C' : '#F0FFF4' };
      case 'warn':    return { fg: c.warning, bg: c.isDark ? '#3A2E12' : '#FFFAF0' };
      case 'error':   return { fg: c.danger,  bg: c.isDark ? '#3A1B1B' : '#FFF5F5' };
      case 'info':    return { fg: c.accent,  bg: c.accentSoft };
      default:        return { fg: c.textMuted, bg: c.surfaceAlt };
    }
  }

  function open(item: AppNotification) {
    tapSelect();
    if (!item.readAt) markRead(item.id);
    if (item.bookingId) router.push(bookingsRoute as never);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 13,
          backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border,
        }}
      >
        <Pressable
          onPress={() => { tapLight(); router.back(); }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} color={c.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>Notifications</Text>
          {unread > 0 && (
            <Text style={{ fontSize: 11, color: c.textFaint, marginTop: 1 }}>{unread} unread</Text>
          )}
        </View>
        {unread > 0 && (
          <Pressable
            onPress={() => { tapLight(); markAllRead(); }}
            hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <CheckCheck size={16} color={c.accent} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.accent }}>Mark all</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: 16 }}>
          {/* Mirrors the real row so the layout doesn't jump when data lands. */}
          {Array.from({ length: 5 }, (_, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', gap: 13, padding: 15, marginBottom: 10,
                borderRadius: 16, backgroundColor: c.surface,
                borderWidth: 1, borderColor: c.border,
              }}
            >
              <Skeleton width={38} height={38} borderRadius={19} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="90%" height={12} />
                <Skeleton width="65%" height={12} />
                <Skeleton width={54} height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            <BellOff size={28} color={c.textFaint} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, marginTop: 16 }}>
            Nothing yet
          </Text>
          <Text style={{ fontSize: 13.5, color: c.textFaint, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            New bookings, cancellations and payouts will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
          }
          renderItem={({ item }) => {
            const look = notificationLook(item.type);
            const tone = toneColors(look.tone);
            const isUnread = !item.readAt;

            return (
              <Pressable
                onPress={() => open(item)}
                style={{
                  flexDirection: 'row', gap: 13, padding: 15, marginBottom: 10,
                  borderRadius: 16,
                  backgroundColor: isUnread ? c.accentSoft : c.surface,
                  borderWidth: 1,
                  borderColor: isUnread ? 'transparent' : c.border,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <NotificationIcon name={look.icon} color={tone.fg} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: isUnread ? '800' : '700', color: c.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: c.textMuted, marginTop: 3, lineHeight: 19 }}>
                    {item.body}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 6 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                {item.bookingId && (
                  <ChevronRight size={17} color={c.textFaint} style={{ marginTop: 10 }} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
