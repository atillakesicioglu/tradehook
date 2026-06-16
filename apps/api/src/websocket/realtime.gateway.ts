import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import IORedis, { Redis } from 'ioredis';
import { REALTIME_CHANNEL, RealtimeEvent } from '@tradehook/shared';
import { devCorsOrigins } from '../config/cors';
import { loadConfig } from '../config/configuration';
import { FirebaseService } from '../auth/firebase.service';
import { UsersService } from '../users/users.service';

function roomFor(userId: string) {
  return `user:${userId}`;
}

@WebSocketGateway({
  namespace: '/dashboard',
  cors: { origin: devCorsOrigins(), credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private subscriber!: Redis;

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly firebase: FirebaseService,
    private readonly users: UsersService,
  ) {}

  onModuleInit() {
    // Subscribe to events published by the worker and fan them out to the
    // matching user's room.
    this.subscriber = new IORedis(loadConfig().redisUrl, {
      maxRetriesPerRequest: null,
    });
    void this.subscriber.subscribe(REALTIME_CHANNEL);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const event = JSON.parse(message) as RealtimeEvent;
        this.server.to(roomFor(event.userId)).emit(event.type, event.payload);
      } catch (err) {
        this.logger.warn(`Bad realtime message: ${String(err)}`);
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        this.bearerFromHeader(client.handshake.headers.authorization);
      if (!token) throw new Error('missing token');

      const userId = await this.resolveUserId(token);
      await client.join(roomFor(userId));
      client.data.userId = userId;
    } catch (err) {
      this.logger.warn(`Rejected socket: ${String(err)}`);
      client.disconnect(true);
    }
  }

  private bearerFromHeader(header?: string): string | undefined {
    if (!header) return undefined;
    const [type, value] = header.split(' ');
    return type === 'Bearer' ? value : undefined;
  }

  private async resolveUserId(token: string): Promise<string> {
    if (loadConfig().devMockAuth) {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      return payload.sub;
    }
    const fb = await this.firebase.verifyIdToken(token);
    const user = await this.users.ensureFromFirebase(fb);
    return user.id;
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }
}
