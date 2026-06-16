import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CryptoService } from './crypto.service';
import { RealtimePublisher } from './realtime.publisher';
import { QueueProducerService } from './queue.producer';
import { OrderService } from './order.service';
import { OrderProcessor } from './order.processor';
import { PriceMonitorService } from './price-monitor.service';
import { PriceMonitorProcessor } from './price-monitor.processor';
import { WebhookRecoveryService } from './webhook-recovery.service';

@Module({
  providers: [
    PrismaService,
    CryptoService,
    RealtimePublisher,
    QueueProducerService,
    OrderService,
    OrderProcessor,
    PriceMonitorService,
    PriceMonitorProcessor,
    WebhookRecoveryService,
  ],
})
export class AppModule {}
