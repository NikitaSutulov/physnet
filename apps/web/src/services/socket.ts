import { io, type Socket } from 'socket.io-client';
import {
  REALTIME_NAMESPACE,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@physnet/shared';
import { getToken } from '@/lib/auth-cookie';
import { API_URL } from '@/lib/config';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RealtimeSocket | null = null;

export function getSocket(): RealtimeSocket {
  socket ??= io(new URL(API_URL).origin + REALTIME_NAMESPACE, {
    autoConnect: false,
    transports: ['websocket'],
    auth: (cb) => cb({ token: getToken() }),
  });
  return socket;
}

export function currentSocketId(): string | undefined {
  return socket?.connected ? socket.id : undefined;
}
