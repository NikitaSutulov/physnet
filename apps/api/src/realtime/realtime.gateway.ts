import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  DASHBOARD_ROOM,
  floorRoom,
  REALTIME_NAMESPACE,
  type ClientToServerEvents,
  type JwtPayload,
  type ServerToClientEvents,
  type SystemEvent,
} from '@physnet/shared';
import { SYSTEM_EVENT } from '../events/system-events.service.js';
import {
  FLOOR_EVENT,
  type FloorEventEnvelope,
} from './topology-events.service.js';

type Server = Namespace<ClientToServerEvents, ServerToClientEvents>;
type Client = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { user: JwtPayload; expiry?: NodeJS.Timeout }
>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@WebSocketGateway({ namespace: REALTIME_NAMESPACE })
export class RealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwt: JwtService) {}

  afterInit(server: Server) {
    server.use((socket: Client, next) => {
      const token: unknown = socket.handshake.auth?.['token'];
      if (typeof token !== 'string' || !token) {
        next(new Error('Unauthorized'));
        return;
      }
      this.jwt
        .verifyAsync<JwtPayload>(token)
        .then((user) => {
          socket.data.user = user;
          if (user.exp) {
            const ms = user.exp * 1000 - Date.now();
            socket.data.expiry = setTimeout(() => socket.disconnect(true), ms);
          }
          next();
        })
        .catch(() => next(new Error('Unauthorized')));
    });
  }

  handleDisconnect(client: Client) {
    clearTimeout(client.data.expiry);
  }

  @SubscribeMessage('floor:join')
  async joinFloor(
    @ConnectedSocket() client: Client,
    @MessageBody() floorPlanId: unknown,
  ): Promise<boolean> {
    if (typeof floorPlanId !== 'string' || !UUID_RE.test(floorPlanId)) {
      return false;
    }
    for (const room of client.rooms) {
      if (room.startsWith('floor:')) await client.leave(room);
    }
    await client.join(floorRoom(floorPlanId));
    return true;
  }

  @SubscribeMessage('floor:leave')
  async leaveFloor(
    @ConnectedSocket() client: Client,
    @MessageBody() floorPlanId: unknown,
  ): Promise<void> {
    if (typeof floorPlanId === 'string') {
      await client.leave(floorRoom(floorPlanId));
    }
  }

  @SubscribeMessage('dashboard:join')
  async joinDashboard(@ConnectedSocket() client: Client): Promise<void> {
    await client.join(DASHBOARD_ROOM);
  }

  @SubscribeMessage('dashboard:leave')
  async leaveDashboard(@ConnectedSocket() client: Client): Promise<void> {
    await client.leave(DASHBOARD_ROOM);
  }

  @OnEvent(FLOOR_EVENT)
  forwardFloorEvent(envelope: FloorEventEnvelope) {
    if (!this.server) return;
    let target = this.server.to(floorRoom(envelope.payload.floorPlanId));
    if (envelope.origin) target = target.except(envelope.origin);
    switch (envelope.event) {
      case 'device:moved':
        target.emit(envelope.event, envelope.payload);
        break;
      case 'device:unplaced':
        target.emit(envelope.event, envelope.payload);
        break;
      case 'link:updated':
        target.emit(envelope.event, envelope.payload);
        break;
      case 'link:deleted':
        target.emit(envelope.event, envelope.payload);
        break;
    }
  }

  @OnEvent(SYSTEM_EVENT)
  forwardSystemEvent(event: SystemEvent) {
    if (!this.server) return;
    const rooms = [
      DASHBOARD_ROOM,
      ...(event.floorPlanIds ?? []).map(floorRoom),
    ];
    this.server.to(rooms).emit('system:event', event);
  }
}
