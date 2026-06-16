export type SlTpMode = 'PERCENT' | 'USDT';

export interface SlTpConfig {
  enabled: boolean;
  mode: SlTpMode | null;
  value: number | null;
}

/** Stop-loss trigger price for a spot BUY (sell when price falls to this level). */
export function computeStopLossPrice(
  entryPrice: number,
  mode: SlTpMode,
  value: number,
): number {
  if (mode === 'PERCENT') {
    return entryPrice * (1 - value / 100);
  }
  return Math.max(0, entryPrice - value);
}

/** Take-profit trigger price for a spot BUY (sell when price rises to this level). */
export function computeTakeProfitPrice(
  entryPrice: number,
  mode: SlTpMode,
  value: number,
): number {
  if (mode === 'PERCENT') {
    return entryPrice * (1 + value / 100);
  }
  return entryPrice + value;
}

export function formatSlTpPreview(
  entryPrice: number,
  config: SlTpConfig,
  kind: 'stopLoss' | 'takeProfit',
): string | null {
  if (!config.enabled || !config.mode || config.value == null) return null;
  const price =
    kind === 'stopLoss'
      ? computeStopLossPrice(entryPrice, config.mode, config.value)
      : computeTakeProfitPrice(entryPrice, config.mode, config.value);
  return price.toFixed(8);
}
