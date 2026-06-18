import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [userCount, strategyCount, alertCount, filledOrders, webhookLogs] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.alertPair.count(),
        this.prisma.alert.count(),
        this.prisma.order.count({ where: { status: 'FILLED' } }),
        this.prisma.webhookLog.count(),
      ]);

    return {
      userCount,
      strategyCount,
      alertCount,
      filledOrderCount: filledOrders,
      webhookLogCount: webhookLogs,
    };
  }

  async listUsers() {
    const [users, filledByUser] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          binanceAccount: { select: { exchange: true } },
          subscription: {
            select: { plan: true, status: true, monthlyTradeCount: true },
          },
          _count: {
            select: {
              alerts: true,
              alertPairs: true,
              orders: true,
              webhookLogs: true,
            },
          },
        },
      }),
      this.prisma.order.groupBy({
        by: ['userId'],
        where: { status: 'FILLED' },
        _count: { id: true },
      }),
    ]);

    const filledMap = new Map(
      filledByUser.map((row) => [row.userId, row._count.id]),
    );

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      hasBinanceAccount: Boolean(user.binanceAccount),
      binanceExchange: user.binanceAccount?.exchange ?? null,
      subscription: user.subscription
        ? {
            plan: user.subscription.plan,
            status: user.subscription.status,
            monthlyTradeCount: user.subscription.monthlyTradeCount,
          }
        : null,
      alertCount: user._count.alerts,
      strategyCount: user._count.alertPairs,
      orderCount: user._count.orders,
      filledOrderCount: filledMap.get(user.id) ?? 0,
      webhookLogCount: user._count.webhookLogs,
    }));
  }
}
