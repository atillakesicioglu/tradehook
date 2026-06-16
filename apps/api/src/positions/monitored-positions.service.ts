import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { fetchPublicPrice, resolvePriceFeedTestnet } from '@tradehook/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { loadConfig } from '../config/configuration';

@Injectable()
export class MonitoredPositionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  private async priceFeedUseTestnet(userId: string): Promise<boolean> {
    const config = loadConfig();
    const account = await this.prisma.binanceAccount.findUnique({
      where: { userId },
    });
    return resolvePriceFeedTestnet(
      config.mockTrading,
      account?.useTestnet ?? config.binanceUseTestnet,
    );
  }

  async findAll(userId: string) {
    const positions = await this.prisma.position.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { alert: { select: { name: true } } },
    });

    const useTestnet = await this.priceFeedUseTestnet(userId);
    const livePrices = new Map<string, number>();

    for (const p of positions) {
      if (p.status !== 'OPEN') continue;
      if (livePrices.has(p.symbol)) continue;
      try {
        livePrices.set(p.symbol, await fetchPublicPrice(p.symbol, useTestnet));
      } catch {
        // keep DB value
      }
    }

    return positions.map((p) => {
      const entry = Number(p.entryPrice);
      const qty = Number(p.quantity);
      const live = livePrices.get(p.symbol);
      const currentPrice =
        live ?? (p.currentPrice ? Number(p.currentPrice) : null);
      const unrealizedPnl =
        currentPrice != null ? (currentPrice - entry) * qty : null;

      return {
        id: p.id,
        symbol: p.symbol,
        alertName: p.alert?.name ?? null,
        entryPrice: entry,
        quantity: qty,
        stopLossPrice: p.stopLossPrice ? Number(p.stopLossPrice) : null,
        takeProfitPrice: p.takeProfitPrice ? Number(p.takeProfitPrice) : null,
        currentPrice,
        unrealizedPnl,
        status: p.status,
        closeReason: p.closeReason,
        closedAt: p.closedAt,
        createdAt: p.createdAt,
      };
    });
  }

  async sellPosition(userId: string, positionId: string) {
    const position = await this.prisma.position.findFirst({
      where: { id: positionId, userId, status: 'OPEN' },
    });
    if (!position) {
      throw new NotFoundException('Open position not found');
    }
    if (!position.alertId) {
      throw new ConflictException('Position has no linked alert');
    }

    const closed = await this.prisma.position.updateMany({
      where: { id: positionId, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closeReason: 'MANUAL',
        closedAt: new Date(),
      },
    });
    if (closed.count === 0) {
      throw new ConflictException('Position already closed');
    }

    const quantity = Number(position.quantity);
    await this.queue.enqueueOrder(
      {
        alertId: position.alertId,
        userId: position.userId,
        symbol: position.symbol,
        side: 'SELL',
        quantity,
        positionId: position.id,
        trigger: 'MANUAL',
      },
      `manual-sell-${positionId}`,
    );

    return { ok: true, positionId };
  }
}
