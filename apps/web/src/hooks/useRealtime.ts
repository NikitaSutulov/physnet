import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { FloorEvents, SystemEvent, TopologyResponse } from '@physnet/shared';
import { applySystemEvent, REFETCH } from '@/lib/realtime';
import { withLink, withoutDevice, withoutLink } from '@/lib/topology';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { topologyKeys } from './useTopology';

export function useRealtime(planId: string) {
  const queryClient = useQueryClient();
  const signedIn = useAuthStore((s) => s.status === 'authenticated');

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSocket();
    const topologyKey = topologyKeys.detail(planId);
    const unplacedKey = topologyKeys.unplaced(planId);

    const patch = (update: (t: TopologyResponse) => TopologyResponse) =>
      queryClient.setQueryData<TopologyResponse>(topologyKey, (t) => t && update(t));
    const refetch = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: topologyKey }),
        queryClient.invalidateQueries({ queryKey: unplacedKey }),
      ]);
    const mine = (e: { floorPlanId: string }) => e.floorPlanId === planId;

    const onMoved = (e: FloorEvents['device:moved']) => {
      const topology = queryClient.getQueryData<TopologyResponse>(topologyKey);
      if (!mine(e) || !topology) return;
      const placedNow = !topology.devices.some((d) => d.id === e.device.id);
      queryClient.setQueryData<TopologyResponse>(topologyKey, {
        ...topology,
        devices: placedNow
          ? [...topology.devices, e.device]
          : topology.devices.map((d) => (d.id === e.device.id ? e.device : d)),
      });
      if (placedNow) void queryClient.invalidateQueries({ queryKey: unplacedKey });
    };
    const onUnplaced = (e: FloorEvents['device:unplaced']) => {
      if (!mine(e)) return;
      patch((t) => withoutDevice(t, e.deviceId));
      void queryClient.invalidateQueries({ queryKey: unplacedKey });
    };
    const onLinkUpdated = (e: FloorEvents['link:updated']) => {
      if (mine(e)) patch((t) => withLink(t, e.link));
    };
    const onLinkDeleted = (e: FloorEvents['link:deleted']) => {
      if (mine(e)) patch((t) => withoutLink(t, e.linkId));
    };
    const onSystemEvent = (e: SystemEvent) => {
      if (!e.floorPlanIds?.includes(planId)) return;
      const topology = queryClient.getQueryData<TopologyResponse>(topologyKey);
      if (!topology) return;
      const next = applySystemEvent(topology, e);
      if (next === REFETCH) void refetch();
      else if (next !== topology) queryClient.setQueryData(topologyKey, next);
    };

    let connectedBefore = false;
    const join = () => {
      socket.emit('floor:join', planId, () => undefined);
      // Events may have been missed while the connection was down.
      if (connectedBefore) void refetch();
      connectedBefore = true;
    };

    socket.on('device:moved', onMoved);
    socket.on('device:unplaced', onUnplaced);
    socket.on('link:updated', onLinkUpdated);
    socket.on('link:deleted', onLinkDeleted);
    socket.on('system:event', onSystemEvent);
    socket.on('connect', join);
    if (socket.connected) join();

    return () => {
      socket.off('device:moved', onMoved);
      socket.off('device:unplaced', onUnplaced);
      socket.off('link:updated', onLinkUpdated);
      socket.off('link:deleted', onLinkDeleted);
      socket.off('system:event', onSystemEvent);
      socket.off('connect', join);
      if (socket.connected) socket.emit('floor:leave', planId);
    };
  }, [planId, signedIn, queryClient]);
}
