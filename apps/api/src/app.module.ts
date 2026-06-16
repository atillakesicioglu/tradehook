import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AlertsModule } from './alerts/alerts.module';
import { BinanceModule } from './binance/binance.module';
import { OrdersModule } from './orders/orders.module';
import { PositionsModule } from './positions/positions.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    CryptoModule,
    QueueModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    AlertsModule,
    BinanceModule,
    OrdersModule,
    PositionsModule,
    WebhooksModule,
    WebsocketModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
