export { BinanceExchange } from './enums';
export type { BinanceExchange as BinanceExchangeType } from './enums';

/** BTCUSDT → BTC_USDT, BTCTRY → BTC_TRY (Binance TR API) */
export function toTrApiSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes('_')) return s;
  if (s.endsWith('USDT')) return `${s.slice(0, -4)}_USDT`;
  if (s.endsWith('TRY')) return `${s.slice(0, -3)}_TRY`;
  return s;
}

/** BTC_USDT → BTCUSDT, BTC_TRY → BTCTRY */
export function fromTrApiSymbol(symbol: string): string {
  return symbol.toUpperCase().replaceAll('_', '');
}
