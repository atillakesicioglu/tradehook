import { Injectable } from '@nestjs/common';

import { BinanceService } from '../binance/binance.service';



/** Spot wallet holdings — not leveraged positions. */

@Injectable()

export class PositionsService {

  constructor(private readonly binance: BinanceService) {}



  async findAll(userId: string) {

    return this.binance.getHoldings(userId);

  }

}


