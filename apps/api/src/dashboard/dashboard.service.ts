import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';

import { BinanceService } from '../binance/binance.service';



@Injectable()

export class DashboardService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly subscriptions: SubscriptionsService,

    private readonly binance: BinanceService,

  ) {}



  async getStats(userId: string) {

    const startOfDay = new Date();

    startOfDay.setHours(0, 0, 0, 0);



    const [

      activeAlerts,

      todayOrders,

      recentOrders,

      subscription,

      binanceAccount,

      balance,

      holdings,

    ] = await Promise.all([

      this.prisma.alert.count({ where: { userId, isActive: true } }),

      this.prisma.order.findMany({

        where: { userId, createdAt: { gte: startOfDay } },

      }),

      this.prisma.order.findMany({

        where: { userId },

        orderBy: { createdAt: 'desc' },

        take: 5,

        include: { alert: { select: { name: true } } },

      }),

      this.subscriptions.getOrCreate(userId),

      this.prisma.binanceAccount.findUnique({ where: { userId } }),

      this.binance.getBalance(userId),

      this.binance.getHoldings(userId),

    ]);



    const heldAssets = holdings.filter(

      (h) => h.asset !== 'USDT' && h.total > 1e-12,

    ).length;



    const totalBalance =

      holdings.length > 0

        ? holdings.reduce((sum, h) => sum + h.valueUsdt, 0)

        : balance.totalUsdt;



    return {

      totalBalance,

      availableUsdt: balance.availableUsdt,

      balanceConnected: balance.connected,

      heldAssets,

      activeAlerts,

      monthlyTradeCount: subscription.monthlyTradeCount,

      monthlyTradeLimit: subscription.monthlyTradeLimit,

      todayTradeCount: todayOrders.length,

      botStatus: binanceAccount?.isActive ? 'ONLINE' : 'OFFLINE',

      recentTrades: recentOrders.map((o) => ({

        id: o.id,

        createdAt: o.createdAt,

        symbol: o.symbol,

        side: o.side,

        type: o.type,

        quantity: o.quantity ? Number(o.quantity) : null,

        price: o.price ? Number(o.price) : null,

        status: o.status,

        alertName: o.alert?.name ?? null,

        balanceBeforeUsdt: o.balanceBeforeUsdt

          ? Number(o.balanceBeforeUsdt)

          : null,

        balanceAfterUsdt: o.balanceAfterUsdt

          ? Number(o.balanceAfterUsdt)

          : null,

      })),

    };

  }

}


