type SlTpMode = 'PERCENT' | 'USDT';

export function computeStopLossPrice(
  entryPrice: number,
  mode: SlTpMode,
  value: number,
): number {
  if (mode === 'PERCENT') return entryPrice * (1 - value / 100);
  return Math.max(0, entryPrice - value);
}

export function computeTakeProfitPrice(
  entryPrice: number,
  mode: SlTpMode,
  value: number,
): number {
  if (mode === 'PERCENT') return entryPrice * (1 + value / 100);
  return entryPrice + value;
}
