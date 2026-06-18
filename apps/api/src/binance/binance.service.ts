import {

  BadRequestException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import {
  createBinanceSpotClient,
  fetchPublicPrice,
  fetchSpotUsdtSymbols,
  resolvePriceFeedTestnet,
  BinanceExchange,
} from '@tradehook/shared';

import { PrismaService } from '../prisma/prisma.service';

import { CryptoService } from '../crypto/crypto.service';

import { loadConfig } from '../config/configuration';

import { ConnectBinanceDto } from './dto/binance.dto';



export interface TestConnectionResult {

  ok: boolean;

  canTrade: boolean;

  canWithdraw: boolean;

  message: string;

}



export interface BalanceInfo {

  connected: boolean;

  availableUsdt: number;

  totalUsdt: number;

  isMock: boolean;

}



export interface HoldingRow {

  asset: string;

  symbol: string | null;

  free: number;

  locked: number;

  total: number;

  priceUsdt: number;

  valueUsdt: number;

}



@Injectable()

export class BinanceService {

  constructor(

    private readonly prisma: PrismaService,

    private readonly crypto: CryptoService,

  ) {}



  private clientForAccount(account: {
    apiKeyEncrypted: string;
    secretEncrypted: string;
    useTestnet: boolean;
    exchange: BinanceExchange;
  }) {
    return createBinanceSpotClient(
      this.crypto.decrypt(account.apiKeyEncrypted),
      this.crypto.decrypt(account.secretEncrypted),
      {
        exchange: account.exchange,
        useTestnet: account.exchange === 'TR' ? false : account.useTestnet,
      },
    );
  }

  async connect(userId: string, dto: ConnectBinanceDto) {
    const exchange = dto.exchange ?? 'GLOBAL';
    const useTestnet =
      exchange === 'TR'
        ? false
        : (dto.useTestnet ?? loadConfig().binanceUseTestnet);

    const apiKeyEncrypted = this.crypto.encrypt(dto.apiKey);

    const secretEncrypted = this.crypto.encrypt(dto.secretKey);



    await this.prisma.binanceAccount.upsert({

      where: { userId },

      update: {

        apiKeyEncrypted,

        secretEncrypted,

        accountType: dto.accountType ?? 'SPOT',

        exchange,

        useTestnet,

        isActive: true,

      },

      create: {

        userId,

        apiKeyEncrypted,

        secretEncrypted,

        accountType: dto.accountType ?? 'SPOT',

        exchange,

        useTestnet,

      },

    });



    return this.getStatus(userId);

  }



  async getStatus(userId: string) {

    const account = await this.prisma.binanceAccount.findUnique({

      where: { userId },

    });

    if (!account) return { connected: false };

    return {

      connected: true,

      accountType: account.accountType,

      exchange: account.exchange,

      useTestnet: account.useTestnet,

      isActive: account.isActive,

      lastTestedAt: account.lastTestedAt,

      lastTestOk: account.lastTestOk,

      apiKeyHint: CryptoService.mask(

        this.crypto.decrypt(account.apiKeyEncrypted),

      ),

    };

  }



  async testConnection(userId: string): Promise<TestConnectionResult> {

    const account = await this.prisma.binanceAccount.findUnique({

      where: { userId },

    });

    if (!account) {

      throw new NotFoundException('No Binance account connected');

    }



    const client = this.clientForAccount(account);



    try {

      const info = await client.getAccount();



      let withdrawalEnabled = false;

      // Binance TR has no apiRestrictions endpoint; account `canWithdraw` is
      // account-level (usually true for all users), not API key permission.
      if (account.exchange === 'TR') {
        withdrawalEnabled = false;
      } else if (account.useTestnet) {

        withdrawalEnabled = false;

      } else {

        const restrictions = await client.getApiRestrictions();

        withdrawalEnabled = restrictions?.enableWithdrawals ?? false;

      }



      if (withdrawalEnabled) {

        await this.prisma.binanceAccount.update({

          where: { userId },

          data: { lastTestedAt: new Date(), lastTestOk: false },

        });

        throw new BadRequestException(

          'This API key has WITHDRAWAL permission enabled. Disable it on Binance and reconnect.',

        );

      }



      const ok = info.canTrade;

      await this.prisma.binanceAccount.update({

        where: { userId },

        data: { lastTestedAt: new Date(), lastTestOk: ok },

      });



      return {

        ok,

        canTrade: info.canTrade,

        canWithdraw: withdrawalEnabled,

        message: ok
          ? account.exchange === 'TR'
            ? 'Binance TR connection OK. Trading enabled, withdrawals disabled.'
            : account.useTestnet
            ? 'Testnet connection OK. Trading enabled.'
            : 'Connection OK. Trading enabled, withdrawals disabled.'

          : 'Connected, but trading is not enabled on this key.',

      };

    } catch (err) {

      if (err instanceof BadRequestException) throw err;

      await this.prisma.binanceAccount.update({

        where: { userId },

        data: { lastTestedAt: new Date(), lastTestOk: false },

      });

      const message =

        err instanceof Error ? err.message : 'Unknown Binance error';

      throw new BadRequestException(`Binance connection failed: ${message}`);

    }

  }



  async disconnect(userId: string) {

    await this.prisma.binanceAccount

      .delete({ where: { userId } })

      .catch(() => undefined);

    return { connected: false };

  }



  /** USDT balance for risk limits and dashboard. Falls back to last order snapshot. */

  async getBalance(userId: string): Promise<BalanceInfo> {

    const config = loadConfig();

    const account = await this.prisma.binanceAccount.findUnique({

      where: { userId },

    });



    if (!account) {

      const fallback = await this.lastKnownBalance(userId);

      return {

        connected: false,

        availableUsdt: fallback,

        totalUsdt: fallback,

        isMock: config.mockTrading,

      };

    }



    try {

      const client = this.clientForAccount(account);

      const accountInfo = await client.getAccount();

      const usdt = accountInfo.balances.find((b) => b.asset === 'USDT');

      const free = Number(usdt?.free ?? 0);

      const locked = Number(usdt?.locked ?? 0);

      return {

        connected: true,

        availableUsdt: free,

        totalUsdt: free + locked,

        isMock: false,

      };

    } catch {

      const fallback = await this.lastKnownBalance(userId);

      return {

        connected: true,

        availableUsdt: fallback,

        totalUsdt: fallback,

        isMock: config.mockTrading,

      };

    }

  }



  private async lastKnownBalance(userId: string): Promise<number> {

    const last = await this.prisma.order.findFirst({

      where: { userId, balanceAfterUsdt: { not: null } },

      orderBy: { createdAt: 'desc' },

      select: { balanceAfterUsdt: true },

    });

    if (last?.balanceAfterUsdt) return Number(last.balanceAfterUsdt);

    return loadConfig().mockTrading ? 10_000 : 0;

  }



  async searchSymbols(userId: string, query?: string): Promise<string[]> {

    const account = await this.prisma.binanceAccount.findUnique({
      where: { userId },
    });
    const exchange = account?.exchange ?? 'GLOBAL';
    const useTestnet =
      account?.useTestnet ?? loadConfig().binanceUseTestnet;

    return fetchSpotUsdtSymbols({ useTestnet, exchange }, query);

  }



  /** Non-zero spot wallet assets with approximate USDT value. */

  async getHoldings(userId: string): Promise<HoldingRow[]> {

    const account = await this.prisma.binanceAccount.findUnique({

      where: { userId },

    });

    if (!account) return [];



    try {

      const client = this.clientForAccount(account);

      const accountInfo = await client.getAccount();

      const config = loadConfig();

      const feedTestnet = resolvePriceFeedTestnet(
        config.mockTrading,
        account.useTestnet,
        account.exchange,
      );
      const marketOpts = {
        useTestnet: feedTestnet,
        exchange: account.exchange,
      };

      const rows: HoldingRow[] = [];



      for (const b of accountInfo.balances) {

        const free = Number(b.free);

        const locked = Number(b.locked);

        const total = free + locked;

        if (total <= 1e-12) continue;



        let valueUsdt = 0;

        let priceUsdt = 1;

        let symbol: string | null = null;



        if (b.asset === 'USDT' || b.asset === 'BUSD' || b.asset === 'FDUSD') {

          priceUsdt = 1;

          valueUsdt = total;

        } else {

          symbol = `${b.asset}USDT`;

          try {

            const price = await fetchPublicPrice(symbol, marketOpts);

            priceUsdt = price;

            valueUsdt = total * price;

          } catch {

            priceUsdt = 0;

            valueUsdt = 0;

          }

        }



        rows.push({

          asset: b.asset,

          symbol,

          free,

          locked,

          total,

          priceUsdt: Number(priceUsdt.toFixed(8)),

          valueUsdt: Number(valueUsdt.toFixed(8)),

        });

      }



      return rows.sort((a, b) => b.valueUsdt - a.valueUsdt);

    } catch {

      return [];

    }

  }



  async getPortfolioTotalUsdt(userId: string): Promise<number> {

    const holdings = await this.getHoldings(userId);

    if (holdings.length) {

      return holdings.reduce((sum, h) => sum + h.valueUsdt, 0);

    }

    const balance = await this.getBalance(userId);

    return balance.totalUsdt;

  }

}


