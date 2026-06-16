import { Injectable, Logger } from '@nestjs/common';
import { fetchPublicPrice, resolvePriceFeedTestnet } from '@tradehook/shared';
import { PrismaService } from './prisma.service';
import { QueueProducerService } from './queue.producer';
import { RealtimePublisher } from './realtime.publisher';
import { loadWorkerConfig } from './config';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueProducerService,
    private readonly realtime: RealtimePublisher,
  ) {}

  async tick(): Promise<void> {
    const positions = await this.prisma.position.findMany({
      where: {
        status: 'OPEN',
        OR: [
          { stopLossPrice: { not: null } },
          { takeProfitPrice: { not: null } },
        ],
      },
      include: {
        user: { include: { binanceAccount: true } },
        alert: true,
      },
    });

    if (!positions.length) return;

    const config = loadWorkerConfig();
    const priceCache = new Map<string, number>();

    for (const pos of positions) {
      if (!pos.alertId || !pos.alert) continue;

      const tradingTestnet =
        pos.user.binanceAccount?.useTestnet ?? config.binanceUseTestnet;
      const useTestnet = resolvePriceFeedTestnet(
        config.mockTrading,
        tradingTestnet,
      );
      const cacheKey = `${useTestnet ? 't' : 'm'}:${pos.symbol}`;

      let currentPrice = priceCache.get(cacheKey);
      if (currentPrice == null) {
        try {
          currentPrice = await fetchPublicPrice(pos.symbol, useTestnet);
          priceCache.set(cacheKey, currentPrice);
        } catch (err) {
          this.logger.warn(
            `Price fetch failed for ${pos.symbol}: ${err instanceof Error ? err.message : err}`,
          );
          continue;
        }
      }

      const entry = Number(pos.entryPrice);
      const qty = Number(pos.quantity);
      const unrealized = (currentPrice - entry) * qty;

      await this.prisma.position.update({
        where: { id: pos.id },
        data: {
          currentPrice,
          unrealizedPnl: unrealized,
        },
      });

      await this.realtime
        .publish('position:updated', pos.userId, {
          id: pos.id,
          symbol: pos.symbol,
          currentPrice,
          entryPrice: entry,
          stopLossPrice: pos.stopLossPrice ? Number(pos.stopLossPrice) : null,
          takeProfitPrice: pos.takeProfitPrice
            ? Number(pos.takeProfitPrice)
            : null,
        })
        .catch(() => undefined);

      const sl = pos.stopLossPrice ? Number(pos.stopLossPrice) : null;
      const tp = pos.takeProfitPrice ? Number(pos.takeProfitPrice) : null;

      if (sl != null && currentPrice <= sl) {
        await this.triggerClose(pos.id, 'STOP_LOSS', pos, qty);
        continue;
      }
      if (tp != null && currentPrice >= tp) {
        await this.triggerClose(pos.id, 'TAKE_PROFIT', pos, qty);
      }
    }
  }

  private async triggerClose(
    positionId: string,
    reason: 'STOP_LOSS' | 'TAKE_PROFIT',
    pos: {
      id: string;
      userId: string;
      alertId: string | null;
      symbol: string;
    },
    quantity: number,
  ) {
    const closed = await this.prisma.position.updateMany({
      where: { id: positionId, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closeReason: reason,
        closedAt: new Date(),
      },
    });
    if (closed.count === 0) return;

    if (!pos.alertId) return;

    await this.queue.enqueueOrder(
      {
        alertId: pos.alertId,
        userId: pos.userId,
        symbol: pos.symbol,
        side: 'SELL',
        quantity,
        positionId: pos.id,
        trigger: reason,
      },
      `sltp-${positionId}-${reason}`,
    );

    this.logger.log(
      `${reason} triggered for ${pos.symbol} position ${positionId} — SELL enqueued`,
    );

    await this.realtime
      .publish('position:closed', pos.userId, {
        id: positionId,
        symbol: pos.symbol,
        reason,
      })
      .catch(() => undefined);
  }
}
