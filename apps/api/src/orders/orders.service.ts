import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { alert: { select: { name: true } } },
    });
    return orders.map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      executedAt: o.executedAt,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.quantity ? Number(o.quantity) : null,
      price: o.price ? Number(o.price) : null,
      quoteQuantity: o.quoteQuantity ? Number(o.quoteQuantity) : null,
      balanceBeforeUsdt: o.balanceBeforeUsdt
        ? Number(o.balanceBeforeUsdt)
        : null,
      balanceAfterUsdt: o.balanceAfterUsdt
        ? Number(o.balanceAfterUsdt)
        : null,
      trigger: o.trigger,
      status: o.status,
      binanceOrderId: o.binanceOrderId,
      isMock: o.isMock,
      alertName: o.alert?.name ?? null,
      errorMessage: o.errorMessage,
    }));
  }
}
