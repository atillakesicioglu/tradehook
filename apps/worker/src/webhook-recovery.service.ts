import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { QueueProducerService } from './queue.producer';

/** Re-enqueues webhook logs stuck in QUEUED when the worker was down. */
@Injectable()
export class WebhookRecoveryService implements OnModuleInit {
  private readonly logger = new Logger(WebhookRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueProducerService,
  ) {}

  async onModuleInit() {
    const stuck = await this.prisma.webhookLog.findMany({
      where: { status: 'QUEUED' },
      include: { alert: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const log of stuck) {
      if (!log.alertId || !log.alert) continue;

      const existing = await this.prisma.order.findFirst({
        where: { webhookLogId: log.id },
      });
      if (existing) continue;

      await this.queue.enqueueOrder(
        {
          webhookLogId: log.id,
          alertId: log.alertId,
          userId: log.alert.userId,
          symbol: log.alert.symbol,
          side: log.alert.side as 'BUY' | 'SELL',
          riskValue: Number(log.alert.riskValue),
        },
        log.id,
      );

      this.logger.log(`Re-queued stuck webhook ${log.id}`);
    }
  }
}
