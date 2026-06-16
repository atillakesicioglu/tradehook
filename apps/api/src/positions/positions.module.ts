import { Module } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { MonitoredPositionsService } from './monitored-positions.service';
import { PositionsController } from './positions.controller';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [BinanceModule],
  providers: [PositionsService, MonitoredPositionsService],
  controllers: [PositionsController],
  exports: [PositionsService],
})
export class PositionsModule {}
