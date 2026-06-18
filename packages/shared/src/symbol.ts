/** BTCUSDT → BTC */
export function baseAssetFromSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT')) return s.slice(0, -4);
  return s;
}
