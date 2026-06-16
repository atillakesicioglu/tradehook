import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TRIAL_MONTHLY_LIMIT = 50;

export interface TradeAllowance {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (existing) return this.rollPeriodIfNeeded(existing);

    return this.prisma.subscription.create({
      data: {
        userId,
        plan: 'STARTER',
        status: 'TRIAL',
        monthlyTradeLimit: TRIAL_MONTHLY_LIMIT,
        monthlyTradeCount: 0,
      },
    });
  }

  /** Resets the monthly counter when the counting window rolls into a new month. */
  private async rollPeriodIfNeeded(subscription: {
    id: string;
    periodStart: Date;
    monthlyTradeCount: number;
  }) {
    const now = new Date();
    const start = new Date(subscription.periodStart);
    const sameWindow =
      start.getUTCFullYear() === now.getUTCFullYear() &&
      start.getUTCMonth() === now.getUTCMonth();
    if (sameWindow) return subscription as never;

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { monthlyTradeCount: 0, periodStart: now },
    });
  }

  async checkCanTrade(userId: string): Promise<TradeAllowance> {
    const sub = await this.getOrCreate(userId);
    if (sub.status === 'INACTIVE') {
      return { allowed: false, reason: 'Subscription is inactive' };
    }
    if (sub.monthlyTradeCount >= sub.monthlyTradeLimit) {
      return { allowed: false, reason: 'Monthly trade limit reached' };
    }
    return { allowed: true };
  }

  async incrementTradeCount(userId: string): Promise<void> {
    const sub = await this.getOrCreate(userId);
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { monthlyTradeCount: { increment: 1 } },
    });
  }
}
