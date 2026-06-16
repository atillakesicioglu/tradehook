import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import {
  ORDER_QUEUE_NAME,
  ExecuteOrderJob,
  parseRedisConnection,
} from '@tradehook/shared';
import { loadWorkerConfig } from './config';
import { OrderService } from './order.service';

@Injectable()
export class OrderProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderProcessor.name);
  private worker!: Worker<ExecuteOrderJob>;

  constructor(private readonly orders: OrderService) {}

  onModuleInit() {
    this.worker = new Worker<ExecuteOrderJob>(
      ORDER_QUEUE_NAME,
      async (job: Job<ExecuteOrderJob>) => {
        const maxAttempts = job.opts.attempts ?? 1;
        const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
        await this.orders.execute(job.data, isFinalAttempt);
      },
      {
        connection: parseRedisConnection(loadWorkerConfig().redisUrl),
        concurrency: 5,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.warn(
        `Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`,
      );
    });

    this.logger.log(`Order worker listening on queue "${ORDER_QUEUE_NAME}"`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
