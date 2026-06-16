import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [SubscriptionsModule, BinanceModule],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
