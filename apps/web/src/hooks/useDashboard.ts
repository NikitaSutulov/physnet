import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { SystemEvent } from '@physnet/shared';
import { getDashboardStats, listEvents } from '@/services/dashboard';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
  events: (limit: number) => ['dashboard', 'events', limit] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: getDashboardStats,
    refetchInterval: 30_000,
  });
}

export function useEventFeed(limit = 30) {
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((s) => s.status === 'authenticated');
  const key = dashboardKeys.events(limit);
  const query = useQuery({ queryKey: key, queryFn: () => listEvents(limit) });

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSocket();
    const eventsKey = dashboardKeys.events(limit);
    let statsTimer: ReturnType<typeof setTimeout> | undefined;

    const onEvent = (event: SystemEvent) => {
      queryClient.setQueryData<SystemEvent[]>(eventsKey, (list = []) =>
        [event, ...list.filter((e) => e.id !== event.id)].slice(0, limit),
      );
      clearTimeout(statsTimer);
      statsTimer = setTimeout(
        () => void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats }),
        500,
      );
    };
    let connectedBefore = false;
    const join = () => {
      socket.emit('dashboard:join');
      if (connectedBefore) void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      connectedBefore = true;
    };

    socket.on('system:event', onEvent);
    socket.on('connect', join);
    if (socket.connected) join();
    return () => {
      clearTimeout(statsTimer);
      socket.off('system:event', onEvent);
      socket.off('connect', join);
      if (socket.connected) socket.emit('dashboard:leave');
    };
  }, [signedIn, limit, queryClient]);

  return query;
}
