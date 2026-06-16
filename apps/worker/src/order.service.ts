import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@tradehook/database';

import {

  BinanceRestClient,

  ExecuteOrderJob,

  computeStopLossPrice,

  computeTakeProfitPrice,

  fetchPublicPrice,

  isTradingViewPlaceholder,

  resolvePriceFeedTestnet,

  SlTpMode,

} from '@tradehook/shared';

import { PrismaService } from './prisma.service';

import { CryptoService } from './crypto.service';

import { RealtimePublisher } from './realtime.publisher';

import { loadWorkerConfig } from './config';



interface ExecutionOutcome {

  binanceOrderId: string | null;

  price: number;

  quantity: number;

  quoteQuantity: number;

  isMock: boolean;

}



@Injectable()

export class OrderService {

  private readonly logger = new Logger(OrderService.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly crypto: CryptoService,

    private readonly realtime: RealtimePublisher,

  ) {}



  async execute(job: ExecuteOrderJob, isFinalAttempt: boolean): Promise<void> {

    const config = loadWorkerConfig();

    const trigger = job.trigger ?? 'WEBHOOK';



    const alert = await this.prisma.alert.findUnique({

      where: { id: job.alertId },

      include: { user: { include: { binanceAccount: true, subscription: true } } },

    });

    if (!alert?.user) throw new Error('Alert or user no longer exists');



    const subscription = alert.user.subscription;

    if (

      subscription &&

      subscription.monthlyTradeCount >= subscription.monthlyTradeLimit

    ) {

      throw new Error('Monthly trade limit reached');

    }



    const account = alert.user.binanceAccount;

    if (!account) throw new Error('No Binance account connected');



    try {

      const balanceBefore = config.mockTrading

        ? await this.getMockBalanceBefore(job.userId)

        : await this.getLiveBalanceBefore(account, config.binanceUseTestnet);



      const outcome = config.mockTrading

        ? await this.executeMock(job, account.useTestnet ?? config.binanceUseTestnet)

        : await this.executeReal(job, account, config.binanceUseTestnet);



      const balanceAfter = config.mockTrading

        ? this.computeMockBalanceAfter(

            balanceBefore,

            job.side,

            outcome.quoteQuantity,

          )

        : await this.getLiveBalanceAfter(account, config.binanceUseTestnet);



      const order = await this.prisma.order.create({

        data: {

          userId: job.userId,

          alertId: job.alertId,

          webhookLogId: job.webhookLogId ?? null,

          symbol: job.symbol,

          side: job.side,

          type: 'MARKET',

          quantity: new Prisma.Decimal(outcome.quantity),

          price: new Prisma.Decimal(outcome.price),

          quoteQuantity: new Prisma.Decimal(outcome.quoteQuantity),

          balanceBeforeUsdt: new Prisma.Decimal(balanceBefore),

          balanceAfterUsdt: new Prisma.Decimal(balanceAfter),

          trigger,

          positionId: job.positionId ?? null,

          status: 'FILLED',

          binanceOrderId: outcome.binanceOrderId,

          isMock: outcome.isMock,

          executedAt: new Date(),

        },

      });



      if (job.webhookLogId) {

        await this.prisma.webhookLog.update({

          where: { id: job.webhookLogId },

          data: { status: 'PROCESSED' },

        });

      }



      if (job.positionId) {

        await this.prisma.position.update({

          where: { id: job.positionId },

          data: { exitOrderId: order.id },

        });

      }



      if (

        trigger === 'WEBHOOK' &&

        job.side === 'BUY' &&

        (alert.stopLossEnabled || alert.takeProfitEnabled)

      ) {

        await this.openMonitoredPosition(alert, order.id, outcome);

      }



      if (subscription) {

        await this.prisma.subscription.update({

          where: { id: subscription.id },

          data: { monthlyTradeCount: { increment: 1 } },

        });

      }



      await this.realtime.publish('trade:executed', job.userId, {

        id: order.id,

        symbol: order.symbol,

        side: order.side,

        status: order.status,

        price: outcome.price,

        quantity: outcome.quantity,

        trigger,

        isMock: outcome.isMock,

        createdAt: order.createdAt,

      });



      this.logger.log(

        `Order ${order.id} FILLED ${job.side} ${job.symbol} [${trigger}] (${outcome.isMock ? 'mock' : 'live'})`,

      );

    } catch (err) {

      const message = err instanceof Error ? err.message : 'Unknown error';

      this.logger.error(`Order job failed: ${message}`);



      if (isFinalAttempt) {

        await this.recordFailure(job, message);

      }

      throw err;

    }

  }



  private async openMonitoredPosition(

    alert: {

      id: string;

      userId: string;

      symbol: string;

      stopLossEnabled: boolean;

      stopLossMode: string | null;

      stopLossValue: Prisma.Decimal | null;

      takeProfitEnabled: boolean;

      takeProfitMode: string | null;

      takeProfitValue: Prisma.Decimal | null;

    },

    entryOrderId: string,

    outcome: ExecutionOutcome,

  ) {

    const entryPrice = outcome.price;

    let stopLossPrice: number | null = null;

    let takeProfitPrice: number | null = null;



    if (

      alert.stopLossEnabled &&

      alert.stopLossMode &&

      alert.stopLossValue != null

    ) {

      stopLossPrice = computeStopLossPrice(

        entryPrice,

        alert.stopLossMode as SlTpMode,

        Number(alert.stopLossValue),

      );

    }

    if (

      alert.takeProfitEnabled &&

      alert.takeProfitMode &&

      alert.takeProfitValue != null

    ) {

      takeProfitPrice = computeTakeProfitPrice(

        entryPrice,

        alert.takeProfitMode as SlTpMode,

        Number(alert.takeProfitValue),

      );

    }



    const position = await this.prisma.position.create({

      data: {

        userId: alert.userId,

        alertId: alert.id,

        entryOrderId,

        symbol: alert.symbol,

        side: 'BUY',

        entryPrice: new Prisma.Decimal(entryPrice),

        quantity: new Prisma.Decimal(outcome.quantity),

        stopLossPrice:

          stopLossPrice != null

            ? new Prisma.Decimal(stopLossPrice)

            : null,

        takeProfitPrice:

          takeProfitPrice != null

            ? new Prisma.Decimal(takeProfitPrice)

            : null,

        currentPrice: new Prisma.Decimal(entryPrice),

        status: 'OPEN',

      },

    });



    this.logger.log(

      `Monitoring ${alert.symbol} @ ${entryPrice} | SL=${stopLossPrice ?? '-'} TP=${takeProfitPrice ?? '-'}`,

    );



    await this.realtime

      .publish('position:updated', alert.userId, {

        id: position.id,

        symbol: alert.symbol,

        entryPrice,

        stopLossPrice,

        takeProfitPrice,

        quantity: outcome.quantity,

      })

      .catch(() => undefined);

  }



  private async getMockBalanceBefore(userId: string): Promise<number> {

    const last = await this.prisma.order.findFirst({

      where: { userId, balanceAfterUsdt: { not: null } },

      orderBy: { createdAt: 'desc' },

      select: { balanceAfterUsdt: true },

    });

    if (last?.balanceAfterUsdt) return Number(last.balanceAfterUsdt);

    return 10_000;

  }



  private computeMockBalanceAfter(

    before: number,

    side: string,

    quoteAmount: number,

  ): number {

    if (side === 'BUY') return before - quoteAmount;

    return before + quoteAmount;

  }



  private async getLiveBalanceBefore(

    account: { apiKeyEncrypted: string; secretEncrypted: string; useTestnet: boolean },

    fallbackTestnet: boolean,

  ): Promise<number> {

    const client = new BinanceRestClient(

      this.crypto.decrypt(account.apiKeyEncrypted),

      this.crypto.decrypt(account.secretEncrypted),

      account.useTestnet ?? fallbackTestnet,

    );

    return client.getUsdtBalance();

  }



  private async getLiveBalanceAfter(

    account: { apiKeyEncrypted: string; secretEncrypted: string; useTestnet: boolean },

    fallbackTestnet: boolean,

  ): Promise<number> {

    return this.getLiveBalanceBefore(account, fallbackTestnet);

  }



  private async executeMock(

    job: ExecuteOrderJob,

    useTestnet: boolean,

  ): Promise<ExecutionOutcome> {

    const price = await this.resolvePrice(job, useTestnet);



    if (job.side === 'SELL' && job.quantity != null) {

      const quantity = job.quantity;

      return {

        binanceOrderId: `MOCK-${Date.now()}`,

        price,

        quantity,

        quoteQuantity: quantity * price,

        isMock: true,

      };

    }



    const riskValue = job.riskValue ?? 0;

    const quantity = riskValue / price;

    return {

      binanceOrderId: `MOCK-${Date.now()}`,

      price,

      quantity,

      quoteQuantity: riskValue,

      isMock: true,

    };

  }



  private async executeReal(

    job: ExecuteOrderJob,

    account: { apiKeyEncrypted: string; secretEncrypted: string; useTestnet: boolean },

    fallbackTestnet: boolean,

  ): Promise<ExecutionOutcome> {

    const client = new BinanceRestClient(

      this.crypto.decrypt(account.apiKeyEncrypted),

      this.crypto.decrypt(account.secretEncrypted),

      account.useTestnet ?? fallbackTestnet,

    );



    const price = await client.getPrice(job.symbol);



    if (job.side === 'SELL' && job.quantity != null) {

      const quantity = job.quantity;

      const result = await client.createMarketOrder({

        symbol: job.symbol,

        side: 'SELL',

        quantity: Number(quantity.toFixed(8)),

      });

      const executedQty = Number(result.executedQty) || quantity;

      const quoteQty = Number(result.cummulativeQuoteQty) || quantity * price;

      const avgPrice = executedQty > 0 ? quoteQty / executedQty : price;

      return {

        binanceOrderId: String(result.orderId),

        price: avgPrice,

        quantity: executedQty,

        quoteQuantity: quoteQty,

        isMock: false,

      };

    }



    const riskValue = job.riskValue ?? 0;

    const result = await client.createMarketOrder({

      symbol: job.symbol,

      side: 'BUY',

      quoteOrderQty: riskValue,

    });

    const executedQty = Number(result.executedQty) || riskValue / price;

    const quoteQty = Number(result.cummulativeQuoteQty) || riskValue;

    const avgPrice = executedQty > 0 ? quoteQty / executedQty : price;



    return {

      binanceOrderId: String(result.orderId),

      price: avgPrice,

      quantity: executedQty,

      quoteQuantity: quoteQty,

      isMock: false,

    };

  }



  private async resolvePrice(

    job: ExecuteOrderJob,

    useTestnet: boolean,

  ): Promise<number> {

    const config = loadWorkerConfig();

    const feedTestnet = resolvePriceFeedTestnet(config.mockTrading, useTestnet);

    if (job.webhookLogId) {

      const log = await this.prisma.webhookLog.findUnique({

        where: { id: job.webhookLogId },

        select: { payload: true },

      });

      const payload = (log?.payload ?? {}) as { price?: unknown };

      const raw = payload.price != null ? String(payload.price).trim() : '';

      if (raw && !isTradingViewPlaceholder(raw)) {

        const parsed = Number(raw.replace(',', '.'));

        if (Number.isFinite(parsed) && parsed > 0) return parsed;

      }

    }

    try {

      return fetchPublicPrice(job.symbol, feedTestnet);

    } catch {

      return 100;

    }

  }



  private async recordFailure(job: ExecuteOrderJob, message: string) {

    await this.prisma.order

      .create({

        data: {

          userId: job.userId,

          alertId: job.alertId,

          webhookLogId: job.webhookLogId ?? null,

          symbol: job.symbol,

          side: job.side,

          type: 'MARKET',

          quantity: new Prisma.Decimal(0),

          trigger: job.trigger ?? 'WEBHOOK',

          positionId: job.positionId ?? null,

          status: 'FAILED',

          errorMessage: message,

        },

      })

      .catch(() => undefined);



    if (job.webhookLogId) {

      await this.prisma.webhookLog

        .update({

          where: { id: job.webhookLogId },

          data: { status: 'FAILED', errorMessage: message },

        })

        .catch(() => undefined);

    }



    await this.realtime

      .publish('order:updated', job.userId, {

        symbol: job.symbol,

        side: job.side,

        status: 'FAILED',

        errorMessage: message,

      })

      .catch(() => undefined);

  }

}


