import {

  Injectable,

  Logger,

  OnModuleDestroy,

  OnModuleInit,

} from '@nestjs/common';

import { loadWorkerConfig } from './config';

import { PriceMonitorService } from './price-monitor.service';



@Injectable()

export class PriceMonitorProcessor implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PriceMonitorProcessor.name);

  private timer: ReturnType<typeof setInterval> | null = null;



  constructor(private readonly monitor: PriceMonitorService) {}



  onModuleInit() {

    const intervalMs = Number(process.env.PRICE_MONITOR_INTERVAL_MS ?? 5_000);



    void this.monitor.tick();

    this.timer = setInterval(() => {

      void this.monitor.tick();

    }, intervalMs);



    this.logger.log(`Price monitor ticking every ${intervalMs}ms`);

  }



  onModuleDestroy() {

    if (this.timer) clearInterval(this.timer);

  }

}


