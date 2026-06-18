import axios from 'axios';
import { fromTrApiSymbol } from './binance-exchange';

/** MBX (symbol type 1) market data per https://www.binance.tr/apidocs/ */
export const TR_MBX_MARKET_BASE = 'https://api.binance.me';
const TR_SYMBOLS_BASE = 'https://www.binance.tr';

interface TrMarketEnvelope<T> {
  code: number;
  msg?: string;
  data: T;
}

interface TrSymbolRow {
  symbol: string;
  quoteAsset: string;
  spotTradingEnable?: number;
}

const listCache = new Map<string, { symbols: string[]; expiresAt: number }>();

function getCached(key: string): string[] | null {
  const hit = listCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.symbols;
  return null;
}

function setCached(key: string, symbols: string[]): string[] {
  listCache.set(key, { symbols, expiresAt: Date.now() + 3_600_000 });
  return symbols;
}

/** USDT spot pairs on Binance TR (MBX feed — same as api.binance.me). */
export async function fetchMbxUsdtSymbols(): Promise<string[]> {
  const cacheKey = 'mbx-usdt';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get<{
    symbols: Array<{
      symbol: string;
      status: string;
      quoteAsset: string;
      isSpotTradingAllowed: boolean;
    }>;
  }>(`${TR_MBX_MARKET_BASE}/api/v3/exchangeInfo`, { timeout: 15_000 });

  const symbols = data.symbols
    .filter(
      (s) =>
        s.status === 'TRADING' &&
        s.quoteAsset === 'USDT' &&
        s.isSpotTradingAllowed,
    )
    .map((s) => s.symbol)
    .sort();

  return setCached(cacheKey, symbols);
}

/** TRY spot pairs listed on binance.tr (e.g. BTC_TRY → BTCTRY). */
export async function fetchTrTrySymbols(): Promise<string[]> {
  const cacheKey = 'tr-try';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get<TrMarketEnvelope<{ list: TrSymbolRow[] }>>(
    `${TR_SYMBOLS_BASE}/open/v1/common/symbols`,
    { timeout: 15_000 },
  );
  if (data.code !== 0) {
    throw new Error(data.msg ?? 'Failed to load Binance TR TRY symbols');
  }

  const symbols = (data.data?.list ?? [])
    .filter((s) => s.quoteAsset === 'TRY' && s.spotTradingEnable !== 0)
    .map((s) => fromTrApiSymbol(s.symbol))
    .sort();

  return setCached(cacheKey, symbols);
}

export async function fetchTrSearchSymbols(): Promise<string[]> {
  const [usdt, tryPairs] = await Promise.all([
    fetchMbxUsdtSymbols(),
    fetchTrTrySymbols(),
  ]);
  return [...new Set([...usdt, ...tryPairs])].sort();
}

let tradableSetCache: { set: Set<string>; expiresAt: number } | null = null;

/** Set of symbols tradeable on Binance TR (USDT via MBX + TRY pairs). */
export async function fetchTrTradableSymbolSet(): Promise<Set<string>> {
  const now = Date.now();
  if (tradableSetCache && tradableSetCache.expiresAt > now) {
    return tradableSetCache.set;
  }
  const symbols = await fetchTrSearchSymbols();
  const set = new Set(symbols);
  tradableSetCache = { set, expiresAt: now + 3_600_000 };
  return set;
}

export async function isSymbolTradableOnBinanceTr(symbol: string): Promise<boolean> {
  const set = await fetchTrTradableSymbolSet();
  return set.has(symbol.toUpperCase());
}

/**
 * Latest price for MAIN (type 1) pairs.
 * Docs use api.binance.me with underscore removed: BTC_USDT → BTCUSDT.
 * Some endpoints return `{ code, data }`; ticker may be raw `{ price }`.
 */
export async function fetchTrMbxPrice(symbol: string): Promise<number> {
  const mbx = fromTrApiSymbol(symbol);

  try {
    const { data } = await axios.get<
      TrMarketEnvelope<{ price: string }> | { symbol?: string; price: string }
    >(
      `${TR_MBX_MARKET_BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(mbx)}`,
      { timeout: 10_000 },
    );

    if (data && typeof (data as TrMarketEnvelope<unknown>).code === 'number') {
      const wrapped = data as TrMarketEnvelope<{ price: string }>;
      if (wrapped.code !== 0) {
        throw new Error(wrapped.msg ?? `Binance TR market error ${wrapped.code}`);
      }
      const price = wrapped.data?.price;
      if (price) return Number(price);
    }

    const raw = data as { price?: string };
    if (raw.price) return Number(raw.price);
  } catch {
    // fall through to trades endpoint
  }

  const { data } = await axios.get<TrMarketEnvelope<Array<{ price: string }>>>(
    `${TR_MBX_MARKET_BASE}/api/v3/trades?symbol=${encodeURIComponent(mbx)}&limit=1`,
    { timeout: 10_000 },
  );
  if (data.code !== 0) {
    throw new Error(data.msg ?? `Binance TR trades error ${data.code}`);
  }
  const last = data.data?.[0];
  if (!last?.price) throw new Error(`No market price for ${symbol}`);
  return Number(last.price);
}
