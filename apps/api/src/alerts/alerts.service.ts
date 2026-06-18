import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { Prisma } from '@tradehook/database';

import { PrismaService } from '../prisma/prisma.service';

import { loadConfig } from '../config/configuration';

import { BinanceService } from '../binance/binance.service';

import { CreateAlertDto, CreateAlertPairDto, UpdateAlertDto } from './dto/alert.dto';



type AlertRecord = {

  id: string;

  name: string;

  symbol: string;

  marketType: string;

  side: string;

  orderType: string;

  riskType: string;

  riskValue: Prisma.Decimal;

  isActive: boolean;

  webhookToken: string;

  webhookSecret: string;

  stopLossEnabled: boolean;

  stopLossMode: string | null;

  stopLossValue: Prisma.Decimal | null;

  takeProfitEnabled: boolean;

  takeProfitMode: string | null;

  takeProfitValue: Prisma.Decimal | null;

  createdAt: Date;

};



@Injectable()

export class AlertsService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly binance: BinanceService,

  ) {}



  async create(userId: string, dto: CreateAlertDto) {

    if (dto.riskType !== 'FULL_POSITION') {
      await this.assertRiskWithinBalance(userId, dto.riskValue);
    }

    this.validateSlTp(dto);

    await this.binance.assertSymbolTradable(userId, dto.symbol);

    const alert = await this.prisma.alert.create({

      data: {

        userId,

        name: dto.name,

        symbol: dto.symbol.toUpperCase(),

        marketType: dto.marketType ?? 'SPOT',

        side: dto.side,

        orderType: dto.orderType ?? 'MARKET',

        riskType: dto.riskType ?? 'FIXED_USDT',

        riskValue: new Prisma.Decimal(dto.riskValue),

        isActive: dto.isActive ?? true,

        stopLossEnabled: dto.stopLossEnabled ?? false,

        stopLossMode: dto.stopLossEnabled ? dto.stopLossMode : null,

        stopLossValue:

          dto.stopLossEnabled && dto.stopLossValue != null

            ? new Prisma.Decimal(dto.stopLossValue)

            : null,

        takeProfitEnabled: dto.takeProfitEnabled ?? false,

        takeProfitMode: dto.takeProfitEnabled ? dto.takeProfitMode : null,

        takeProfitValue:

          dto.takeProfitEnabled && dto.takeProfitValue != null

            ? new Prisma.Decimal(dto.takeProfitValue)

            : null,

      },

    });

    return this.present(alert);

  }



  async createPair(userId: string, dto: CreateAlertPairDto) {

    await this.assertRiskWithinBalance(userId, dto.initialUsdt);

    await this.binance.assertSymbolTradable(userId, dto.symbol);

    const symbol = dto.symbol.toUpperCase();

    const buyAlert = await this.prisma.alert.create({

      data: {

        userId,

        name: `${dto.name} (Buy)`,

        symbol,

        side: 'BUY',

        riskType: 'COMPOUND_USDT',

        riskValue: new Prisma.Decimal(dto.initialUsdt),

      },

    });



    const sellAlert = await this.prisma.alert.create({

      data: {

        userId,

        name: `${dto.name} (Sell)`,

        symbol,

        side: 'SELL',

        riskType: 'FULL_POSITION',

        riskValue: new Prisma.Decimal(0),

      },

    });



    const pair = await this.prisma.alertPair.create({

      data: {

        userId,

        name: dto.name,

        symbol,

        initialUsdt: new Prisma.Decimal(dto.initialUsdt),

        buyAlertId: buyAlert.id,

        sellAlertId: sellAlert.id,

      },

      include: { buyAlert: true, sellAlert: true },

    });



    return this.presentPair(pair);

  }



  async findAll(userId: string) {

    const pairs = await this.prisma.alertPair.findMany({

      where: { userId },

      include: { buyAlert: true, sellAlert: true },

      orderBy: { createdAt: 'desc' },

    });

    const pairedIds = new Set(

      pairs.flatMap((p) => [p.buyAlertId, p.sellAlertId]),

    );

    const standalone = await this.prisma.alert.findMany({

      where: {

        userId,

        ...(pairedIds.size > 0 ? { id: { notIn: [...pairedIds] } } : {}),

      },

      orderBy: { createdAt: 'desc' },

    });

    return {

      pairs: pairs.map((p) => this.presentPair(p)),

      alerts: standalone.map((a) => this.present(a)),

    };

  }



  async findOne(userId: string, id: string) {

    const alert = await this.getOwned(userId, id);

    return this.present(alert);

  }



  async update(userId: string, id: string, dto: UpdateAlertDto) {

    await this.getOwned(userId, id);

    if (dto.riskValue != null) {

      await this.assertRiskWithinBalance(userId, dto.riskValue);

    }

    const alert = await this.prisma.alert.update({

      where: { id },

      data: {

        ...(dto.name !== undefined ? { name: dto.name } : {}),

        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),

        ...(dto.side !== undefined ? { side: dto.side } : {}),

        ...(dto.riskValue !== undefined

          ? { riskValue: new Prisma.Decimal(dto.riskValue) }

          : {}),

      },

    });

    return this.present(alert);

  }



  async remove(userId: string, id: string) {

    const pair = await this.prisma.alertPair.findFirst({

      where: {

        userId,

        OR: [{ buyAlertId: id }, { sellAlertId: id }],

      },

    });

    if (pair) {

      await this.prisma.alertPair.delete({ where: { id: pair.id } });

      return { deleted: true };

    }

    await this.getOwned(userId, id);

    await this.prisma.alert.delete({ where: { id } });

    return { deleted: true };

  }



  async removePair(userId: string, pairId: string) {

    const pair = await this.prisma.alertPair.findUnique({ where: { id: pairId } });

    if (!pair) throw new NotFoundException('Strategy not found');

    if (pair.userId !== userId) throw new ForbiddenException();

    await this.prisma.alertPair.delete({ where: { id: pairId } });

    return { deleted: true };

  }



  private async assertRiskWithinBalance(userId: string, riskValue: number) {

    const balance = await this.binance.getBalance(userId);

    const max = balance.availableUsdt;

    if (riskValue > max) {

      throw new BadRequestException(

        `Risk (${riskValue} USDT) exceeds available balance (${max.toFixed(2)} USDT)`,

      );

    }

  }



  private validateSlTp(dto: CreateAlertDto) {

    if (dto.stopLossEnabled && (!dto.stopLossMode || dto.stopLossValue == null)) {

      throw new BadRequestException(

        'Stop loss requires mode (PERCENT or USDT) and value',

      );

    }

    if (

      dto.takeProfitEnabled &&

      (!dto.takeProfitMode || dto.takeProfitValue == null)

    ) {

      throw new BadRequestException(

        'Take profit requires mode (PERCENT or USDT) and value',

      );

    }

  }



  private async getOwned(userId: string, id: string) {

    const alert = await this.prisma.alert.findUnique({ where: { id } });

    if (!alert) throw new NotFoundException('Alert not found');

    if (alert.userId !== userId) throw new ForbiddenException();

    return alert;

  }



  private present(alert: AlertRecord) {

    const { webhookPublicUrl, apiUrl } = loadConfig();

    const webhookBase = webhookPublicUrl || apiUrl;

    const webhookUrl = `${webhookBase}/webhooks/tradingview/${alert.webhookToken}`;

    const isLocalWebhook =

      webhookUrl.includes('localhost') || webhookUrl.includes('127.0.0.1');

    const messageJson = {

      secret: alert.webhookSecret,

      signalId: '{{strategy.order.id}}',

      symbol: alert.symbol,

      side: alert.side,

      price: '{{close}}',

      time: '{{timenow}}',

      strategy: alert.name,

    };

    return {

      id: alert.id,

      name: alert.name,

      symbol: alert.symbol,

      marketType: alert.marketType,

      side: alert.side,

      orderType: alert.orderType,

      riskType: alert.riskType,

      riskValue: Number(alert.riskValue),

      isActive: alert.isActive,

      stopLossEnabled: alert.stopLossEnabled,

      stopLossMode: alert.stopLossMode,

      stopLossValue: alert.stopLossValue

        ? Number(alert.stopLossValue)

        : null,

      takeProfitEnabled: alert.takeProfitEnabled,

      takeProfitMode: alert.takeProfitMode,

      takeProfitValue: alert.takeProfitValue

        ? Number(alert.takeProfitValue)

        : null,

      createdAt: alert.createdAt,

      webhookToken: alert.webhookToken,

      webhookUrl,

      isLocalWebhook,

      messageJson,

    };

  }



  private presentPair(

    pair: {

      id: string;

      name: string;

      symbol: string;

      initialUsdt: Prisma.Decimal;

      compoundUsdt: Prisma.Decimal | null;

      heldQuantity: Prisma.Decimal | null;

      createdAt: Date;

      buyAlert: AlertRecord;

      sellAlert: AlertRecord;

    },

  ) {

    const nextBuyUsdt = Number(pair.compoundUsdt ?? pair.initialUsdt);

    return {

      id: pair.id,

      name: pair.name,

      symbol: pair.symbol,

      initialUsdt: Number(pair.initialUsdt),

      compoundUsdt: pair.compoundUsdt ? Number(pair.compoundUsdt) : null,

      nextBuyUsdt,

      heldQuantity: pair.heldQuantity ? Number(pair.heldQuantity) : null,

      inPosition: pair.heldQuantity != null && Number(pair.heldQuantity) > 0,

      createdAt: pair.createdAt,

      buyAlert: this.present(pair.buyAlert),

      sellAlert: this.present(pair.sellAlert),

    };

  }

}


