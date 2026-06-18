export { BinanceExchange } from './enums';
export type { BinanceExchange as BinanceExchangeType } from './enums';

/** BTCUSDT → BTC_USDT (Binance TR API) */
export function toTrApiSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.includes('_')) return s;
  if (s.endsWith('USDT')) return `${s.slice(0, -4)}_USDT`;
  return s;
}

/** BTC_USDT → BTCUSDT (internal / Global API) */
export function fromTrApiSymbol(symbol: string): string {
  return symbol.toUpperCase().replace('_', '');
}
