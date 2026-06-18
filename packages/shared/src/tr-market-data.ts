import axios from 'axios';
import { fromTrApiSymbol } from './binance-exchange';

/** MBX (symbol type 1) market data per https://www.binance.tr/apidocs/ */
export const TR_MBX_MARKET_BASE = 'https://api.binance.me';

interface TrMarketEnvelope<T> {
  code: number;
  msg?: string;
  data: T;
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
