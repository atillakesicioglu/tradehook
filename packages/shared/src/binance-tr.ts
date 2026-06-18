import axios, { AxiosError, AxiosInstance } from 'axios';
import { createHmac } from 'node:crypto';
import {
  BinanceAccountInfo,
  BinanceApiRestrictions,
  BinanceMarketOrderParams,
  BinanceOrderResult,
} from './binance';
import { toTrApiSymbol } from './binance-exchange';
import { fetchTrMbxPrice } from './tr-market-data';

const TR_BASE = 'https://www.binance.tr';

/** Order status 2 = FILLED per Binance TR apidocs */
const ORDER_STATUS_FILLED = 2;

interface TrEnvelope<T> {
  code: number;
  msg?: string;
  message?: string;
  data: T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTrHttpError(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as
      | { code?: number; msg?: string; message?: string }
      | undefined;
    const apiMsg = body?.msg ?? body?.message;
    if (apiMsg) return apiMsg;
    if (err.response?.status === 401) {
      return 'Invalid API key or signature — use Binance TR keys with exchange set to Binance TR';
    }
    return err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Binance TR (binance.tr) spot client.
 * @see https://www.binance.tr/apidocs/#api-document-description
 */
export class BinanceTrRestClient {
  private readonly http: AxiosInstance;

  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string,
  ) {
    this.http = axios.create({
      baseURL: TR_BASE,
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 15_000,
    });
  }

  private sign(query: string): string {
    return createHmac('sha256', this.secretKey).update(query).digest('hex');
  }

  private signedQuery(params: Record<string, string | number>): string {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) search.append(k, String(v));
    search.append('timestamp', String(Date.now()));
    search.append('recvWindow', '5000');
    const query = search.toString();
    return `${query}&signature=${this.sign(query)}`;
  }

  private async signedGet<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T> {
    try {
      const { data } = await this.http.get<TrEnvelope<T>>(
        `${path}?${this.signedQuery(params)}`,
      );
      if (data.code !== 0) {
        throw new Error(data.msg ?? data.message ?? `Binance TR error ${data.code}`);
      }
      return data.data;
    } catch (err) {
      throw new Error(formatTrHttpError(err));
    }
  }

  private async signedPost<T>(
    path: string,
    params: Record<string, string | number>,
  ): Promise<T> {
    try {
      const body = this.signedQuery(params);
      const { data } = await this.http.post<TrEnvelope<T>>(path, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (data.code !== 0) {
        throw new Error(data.msg ?? data.message ?? `Binance TR error ${data.code}`);
      }
      return data.data;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Binance TR')) throw err;
      throw new Error(formatTrHttpError(err));
    }
  }

  async getAccount(): Promise<BinanceAccountInfo> {
    const data = await this.signedGet<{
      canTrade: number;
      canWithdraw: number;
      canDeposit: number;
      accountAssets: Array<{ asset: string; free: string; locked: string }>;
    }>('/open/v1/account/spot');

    return {
      canTrade: Boolean(data.canTrade),
      canWithdraw: Boolean(data.canWithdraw),
      canDeposit: Boolean(data.canDeposit),
      balances: data.accountAssets.map((b) => ({
        asset: b.asset,
        free: b.free,
        locked: b.locked,
      })),
    };
  }

  async getApiRestrictions(): Promise<BinanceApiRestrictions | null> {
    const info = await this.getAccount();
    return { enableWithdrawals: info.canWithdraw, enableReading: true };
  }

  async getPrice(symbol: string): Promise<number> {
    return fetchTrMbxPrice(symbol);
  }

  async getUsdtBalance(): Promise<number> {
    const account = await this.getAccount();
    const usdt = account.balances.find((b) => b.asset === 'USDT');
    if (!usdt) return 0;
    return Number(usdt.free) + Number(usdt.locked);
  }

  private async waitForOrderFill(orderId: string | number): Promise<{
    executedQty: number;
    executedQuoteQty: number;
    executedPrice: number;
    status: number;
  }> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const detail = await this.signedGet<{
        executedQty: number;
        executedQuoteQty: number;
        executedPrice: number;
        status: number;
      }>('/open/v1/orders/detail', { orderId });

      const executedQty = Number(detail.executedQty) || 0;
      if (detail.status === ORDER_STATUS_FILLED || executedQty > 0) {
        return detail;
      }
      await sleep(250);
    }
    throw new Error('Market order not filled in time — check Binance TR order history');
  }

  async createMarketOrder(params: BinanceMarketOrderParams): Promise<BinanceOrderResult> {
    const trSymbol = toTrApiSymbol(params.symbol);
    const side = params.side === 'BUY' ? 0 : 1;
    const orderParams: Record<string, string | number> = {
      symbol: trSymbol,
      side,
      type: 2, // MARKET per apidocs ENUM
    };

    if (params.side === 'BUY') {
      if (params.quoteOrderQty == null) {
        throw new Error('MARKET BUY requires quoteOrderQty');
      }
      orderParams.quoteOrderQty = params.quoteOrderQty;
    } else {
      if (params.quantity == null) {
        throw new Error('MARKET SELL requires quantity');
      }
      orderParams.quantity = params.quantity;
    }

    const placed = await this.signedPost<{ orderId: string | number }>(
      '/open/v1/orders',
      orderParams,
    );

    const detail = await this.waitForOrderFill(placed.orderId);

    const executedQty = Number(detail.executedQty) || 0;
    const quoteQty = Number(detail.executedQuoteQty) || 0;
    const avgPrice =
      executedQty > 0
        ? Number(detail.executedPrice) || quoteQty / executedQty
        : await this.getPrice(params.symbol);

    return {
      orderId: Number(placed.orderId),
      status: 'FILLED',
      executedQty: String(executedQty),
      cummulativeQuoteQty: String(quoteQty),
      fills: [{ price: String(avgPrice), qty: String(executedQty) }],
    };
  }
}
