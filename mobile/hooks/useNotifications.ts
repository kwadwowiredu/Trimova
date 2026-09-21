import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications';

/**
 * Notifications, shared by the client and barber apps.
 *
 * Both poll rather than hold a socket open: a barber's phone sleeping through
 * a websocket reconnect is a worse failure than a 30-second delay, and this
 * keeps the server stateless.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  // Pull-to-refresh owns its own flag. Driving RefreshControl from the query's
  // isRefetching makes the spinner appear on every 30-second poll, and a
  // programmatically-set spinner can stick rather than retract.
  const [pulling, setPulling] = useState(false);

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30_000,
  });

  const pullToRefresh = useCallback(async () => {
    setPulling(true);
    try {
      await list.refetch();
    } finally {
      setPulling(false);
    }
  }, [list]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  return {
    notifications: list.data?.data.data ?? [],
    isLoading: list.isLoading,
    /** Drives RefreshControl — true only during a user-initiated pull. */
    isRefetching: pulling,
    refetch: pullToRefresh,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
  };
}

/** Just the badge number — cheap enough to poll from a tab bar or header. */
export function useUnreadCount() {
  const { data } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 30_000,
  });
  return data?.data.data.count ?? 0;
}
