import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@tradehook/database';
import {
  TradingViewWebhookSchema,
  buildWebhookIdempotencyKey,
  isSymbolTradableOnBinanceTr,
} from '@tradehook/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface WebhookResult {
  accepted: boolean;
  status: string;
  reason?: string;
  webhookLogId?: string;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async handle(token: string, rawBody: unknown): Promise<WebhookResult> {
    const parsed = TradingViewWebhookSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new BadRequestException('Invalid webhook payload');
    }
    const payload = parsed.data;

    const alert = await this.prisma.alert.findUnique({
      where: { webhookToken: token },
      include: {
        user: { include: { binanceAccount: true } },
        pairAsBuy: true,
        pairAsSell: true,
      },
    });

    const idempotencyKey = buildWebhookIdempotencyKey(token, payload);

    // Creating the log with a unique idempotency key is what prevents duplicate
    // signals from being executed twice.
    let log: { id: string };
    try {
      log = await this.prisma.webhookLog.create({
        data: {
          idempotencyKey,
          alertId: alert?.id ?? null,
          userId: alert?.userId ?? null,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
        select: { id: true },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        this.logger.warn(`Duplicate signal ignored: ${idempotencyKey}`);
        return { accepted: false, status: 'DUPLICATE' };
      }
      throw err;
    }

    const reject = async (reason: string): Promise<WebhookResult> => {
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { status: 'REJECTED', errorMessage: reason },
      });
      return { accepted: false, status: 'REJECTED', reason };
    };

    if (!alert) return reject('Unknown webhook token');
    if (payload.secret !== alert.webhookSecret) {
      return reject('Invalid secret');
    }
    if (!alert.isActive) return reject('Alert is not active');
    if (!alert.user) return reject('User not found');

    const allowance = await this.subscriptions.checkCanTrade(alert.userId);
    if (!allowance.allowed) {
      return reject(allowance.reason ?? 'Subscription does not allow trading');
    }

    if (!alert.user.binanceAccount || !alert.user.binanceAccount.isActive) {
      return reject('No active Binance connection');
    }

    if (alert.user.binanceAccount.exchange === 'TR') {
      const tradable = await isSymbolTradableOnBinanceTr(alert.symbol);
      if (!tradable) {
        return reject(
          `${alert.symbol} is not listed on Binance TR — update the alert symbol`,
        );
      }
    }

    await this.prisma.webhookLog.update({
      where: { id: log.id },
      data: { status: 'QUEUED' },
    });

    let riskValue: number | undefined;
    let quantity: number | undefined;

    if (alert.riskType === 'FULL_POSITION') {
      const pair = alert.pairAsSell;
      if (!pair?.heldQuantity || Number(pair.heldQuantity) <= 0) {
        return reject(
          'No open position to sell — wait for a buy signal first',
        );
      }
      quantity = Number(pair.heldQuantity);
    } else if (alert.riskType === 'COMPOUND_USDT') {
      const pair = alert.pairAsBuy;
      if (pair?.heldQuantity && Number(pair.heldQuantity) > 0) {
        return reject(
          'Already in a position — wait for the sell signal before buying again',
        );
      }
      riskValue = pair
        ? Number(pair.compoundUsdt ?? pair.initialUsdt)
        : Number(alert.riskValue);
    } else {
      riskValue = Number(alert.riskValue);
    }

    await this.queue.enqueueOrder({
      webhookLogId: log.id,
      alertId: alert.id,
      userId: alert.userId,
      symbol: alert.symbol,
      side: alert.side,
      riskValue,
      quantity,
    });

    return { accepted: true, status: 'QUEUED', webhookLogId: log.id };
  }

}
