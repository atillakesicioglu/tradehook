import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import IORedis, { Redis } from 'ioredis';
import {
  REALTIME_CHANNEL,
  RealtimeEvent,
  RealtimeEventType,
} from '@tradehook/shared';
import { loadWorkerConfig } from './config';

@Injectable()
export class RealtimePublisher implements OnModuleInit, OnModuleDestroy {
  private publisher!: Redis;

  onModuleInit() {
    this.publisher = new IORedis(loadWorkerConfig().redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  async publish(
    type: RealtimeEventType,
    userId: string,
    payload: unknown,
  ): Promise<void> {
    const event: RealtimeEvent = { type, userId, payload };
    await this.publisher.publish(REALTIME_CHANNEL, JSON.stringify(event));
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
  }
}
