import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'node:crypto';

const MAINNET_BASE = 'https://api.binance.com';
const TESTNET_BASE = 'https://testnet.binance.vision';

export interface BinanceAccountInfo {
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  permissions?: string[];
  balances: Array<{ asset: string; free: string; locked: string }>;
}

/** Actual API-key restrictions from GET /sapi/v1/account/apiRestrictions */
export interface BinanceApiRestrictions {
  enableWithdrawals: boolean;
  enableSpotAndMarginTrading?: boolean;
  enableReading?: boolean;
}

export interface BinanceOrderResult {
  orderId: number;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  fills?: Array<{ price: string; qty: string }>;
}

export interface BinanceMarketOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  /** Spend this much quote currency (e.g. USDT) on a MARKET BUY. */
  quoteOrderQty?: number;
  /** Sell this much base asset on a MARKET SELL. */
  quantity?: number;
}

/**
 * Minimal Binance Spot REST client. Framework-agnostic so both the API (test
 * connection) and the worker (order execution) can reuse it. Only the endpoints
 * needed for the MVP are implemented. Withdrawals are never used.
 */
export class BinanceRestClient {
  private readonly http: AxiosInstance;

  constructor(
    private readonly apiKey: string,
    private readonly secretKey: string,
    useTestnet: boolean,
  ) {
    this.http = axios.create({
      baseURL: useTestnet ? TESTNET_BASE : MAINNET_BASE,
      headers: { 'X-MBX-APIKEY': apiKey },
      timeout: 10_000,
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

  async getAccount(): Promise<BinanceAccountInfo> {
    const { data } = await this.http.get<BinanceAccountInfo>(
      `/api/v3/account?${this.signedQuery({})}`,
    );
    return data;
  }

  /**
   * Returns true API-key withdrawal permission (mainnet). Testnet may not
   * support this endpoint — callers should treat failures as "skip check".
   */
  async getApiRestrictions(): Promise<BinanceApiRestrictions | null> {
    try {
      const { data } = await this.http.get<BinanceApiRestrictions>(
        `/sapi/v1/account/apiRestrictions?${this.signedQuery({})}`,
      );
      return data;
    } catch {
      return null;
    }
  }

  async getPrice(symbol: string): Promise<number> {
    const { data } = await this.http.get<{ price: string }>(
      `/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    );
    return Number(data.price);
  }

  /** Sum of free + locked USDT in the spot wallet. */
  async getUsdtBalance(): Promise<number> {
    const account = await this.getAccount();
    const usdt = account.balances.find((b) => b.asset === 'USDT');
    if (!usdt) return 0;
    return Number(usdt.free) + Number(usdt.locked);
  }

  async createMarketOrder(
    params: BinanceMarketOrderParams,
  ): Promise<BinanceOrderResult> {
    const orderParams: Record<string, string | number> = {
      symbol: params.symbol,
      side: params.side,
      type: 'MARKET',
    };
    if (params.quoteOrderQty != null) {
      orderParams.quoteOrderQty = params.quoteOrderQty;
    }
    if (params.quantity != null) {
      orderParams.quantity = params.quantity;
    }
    const { data } = await this.http.post<BinanceOrderResult>(
      `/api/v3/order?${this.signedQuery(orderParams)}`,
    );
    return data;
  }
}

interface ExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed: boolean;
}

interface ExchangeInfoResponse {
  symbols: ExchangeInfoSymbol[];
}

const symbolCache = new Map<string, { symbols: string[]; expiresAt: number }>();

/** Public spot USDT pairs from exchangeInfo (cached 1h per network). */
/** Mock mode uses mainnet prices so SL/TP tracking matches TradingView charts. */
export function resolvePriceFeedTestnet(
  mockTrading: boolean,
  tradingUseTestnet: boolean,
): boolean {
  if (mockTrading) return false;
  return tradingUseTestnet;
}

/** Public ticker price — no API key required. */
export async function fetchPublicPrice(
  symbol: string,
  useTestnet: boolean,
): Promise<number> {
  const base = useTestnet ? TESTNET_BASE : MAINNET_BASE;
  const { data } = await axios.get<{ price: string }>(
    `${base}/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`,
    { timeout: 10_000 },
  );
  return Number(data.price);
}

export async function fetchSpotUsdtSymbols(
  useTestnet: boolean,
  query?: string,
): Promise<string[]> {
  const cacheKey = useTestnet ? 'testnet' : 'mainnet';
  const now = Date.now();
  const cached = symbolCache.get(cacheKey);
  let symbols: string[];

  if (cached && cached.expiresAt > now) {
    symbols = cached.symbols;
  } else {
    const base = useTestnet ? TESTNET_BASE : MAINNET_BASE;
    const { data } = await axios.get<ExchangeInfoResponse>(
      `${base}/api/v3/exchangeInfo`,
      { timeout: 15_000 },
    );
    symbols = data.symbols
      .filter(
        (s) =>
          s.status === 'TRADING' &&
          s.quoteAsset === 'USDT' &&
          s.isSpotTradingAllowed,
      )
      .map((s) => s.symbol)
      .sort();
    symbolCache.set(cacheKey, { symbols, expiresAt: now + 3_600_000 });
  }

  const q = query?.trim().toUpperCase();
  if (!q) return symbols.slice(0, 100);
  return symbols.filter((s) => s.includes(q)).slice(0, 50);
}
