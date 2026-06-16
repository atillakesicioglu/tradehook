import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  ORDER_QUEUE_NAME,
  EXECUTE_ORDER_JOB,
  ExecuteOrderJob,
  parseRedisConnection,
} from '@tradehook/shared';
import { loadConfig } from '../config/configuration';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private orderQueue!: Queue<ExecuteOrderJob>;

  onModuleInit() {
    this.orderQueue = new Queue<ExecuteOrderJob>(ORDER_QUEUE_NAME, {
      connection: parseRedisConnection(loadConfig().redisUrl),
    });
  }

  async enqueueOrder(job: ExecuteOrderJob, jobId?: string): Promise<void> {
    await this.orderQueue.add(EXECUTE_ORDER_JOB, job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
      jobId: jobId ?? job.webhookLogId,
    });
  }

  async onModuleDestroy() {
    await this.orderQueue?.close();
  }
}
