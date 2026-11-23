'use client';

import { useEffect, type ReactNode } from 'react';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';
import { useRealtimeStore } from '@/store/realtimeStore';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const signedIn = useAuthStore((s) => s.status === 'authenticated');

  useEffect(() => {
    if (!signedIn) return;
    const socket = getSocket();
    const { setStatus } = useRealtimeStore.getState();
    const online = () => setStatus('online');
    const connecting = () => setStatus('connecting');
    socket.on('connect', online);
    socket.on('disconnect', connecting);
    socket.on('connect_error', connecting);
    setStatus('connecting');
    socket.connect();
    return () => {
      socket.off('connect', online);
      socket.off('disconnect', connecting);
      socket.off('connect_error', connecting);
      socket.disconnect();
      setStatus('offline');
    };
  }, [signedIn]);

  return children;
}
