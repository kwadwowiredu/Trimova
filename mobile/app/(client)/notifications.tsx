import {
  View, Text, Pressable, FlatList, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, BellOff, CheckCheck, ChevronRight } from 'lucide-react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationIcon } from '@/components/ui/NotificationIcon';
import { NotificationListSkeleton } from '@/components/client/BookingSkeleton';
import { notificationLook, timeAgo } from '@/utils/notificationDisplay';
import { tapLight, tapSelect } from '@/utils/haptics';
import { T, HAIRLINE, chip } from '@/constants/clientTheme';
import type { AppNotification } from '@/services/notifications';

/** Everything that happened to this client's bookings, newest first. */
export default function ClientNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, isLoading, isRefetching, refetch, markRead, markAllRead } =
    useNotifications();

  const unread = notifications.filter((n) => !n.readAt).length;

  function open(item: AppNotification) {
    tapSelect();
    if (!item.readAt) markRead(item.id);
    // Most notifications are about one appointment — take them straight to it.
    if (item.bookingId) {
      router.push('/(client)/(tabs)/bookings' as never);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.canvas }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12,
          backgroundColor: T.card, borderBottomWidth: HAIRLINE, borderBottomColor: T.border,
        }}
      >
        <Pressable onPress={() => { tapLight(); router.back(); }} hitSlop={12}>
          <ArrowLeft size={23} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: T.text }}>Notifications</Text>
          {unread > 0 && (
            <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 1 }}>
              {unread} unread
            </Text>
          )}
        </View>
        {unread > 0 && (
          <Pressable
            onPress={() => { tapLight(); markAllRead(); }}
            hitSlop={10}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <CheckCheck size={16} color={T.accent} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: T.accent }}>Mark all</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <NotificationListSkeleton />
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: T.input, alignItems: 'center', justifyContent: 'center' }}>
            <BellOff size={30} color={T.textFaint} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: T.text, marginTop: 18 }}>
            Nothing yet
          </Text>
          <Text style={{ fontSize: 14, color: T.textFaint, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Updates about your appointments — confirmations, reminders and
            payments — will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          renderItem={({ item }) => {
            const look = notificationLook(item.type);
            const tone = chip(look.tone);
            const isUnread = !item.readAt;

            return (
              <Pressable
                onPress={() => open(item)}
                style={{
                  flexDirection: 'row', gap: 13, padding: 15, marginBottom: 10,
                  borderRadius: 16,
                  // Unread rows sit on the accent wash so the eye lands on them
                  // first without needing a dot.
                  backgroundColor: isUnread ? T.accentWash : T.card,
                  borderWidth: HAIRLINE,
                  borderColor: isUnread ? 'transparent' : T.border,
                }}
              >
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <NotificationIcon name={look.icon} color={tone.fg} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: isUnread ? '800' : '700', color: T.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 13.5, color: T.textMuted, marginTop: 3, lineHeight: 19 }}>
                    {item.body}
                  </Text>
                  <Text style={{ fontSize: 12, color: T.textFaint, marginTop: 6 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                {item.bookingId && (
                  <ChevronRight size={17} color={T.textDisabled} style={{ marginTop: 10 }} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
