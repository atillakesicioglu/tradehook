/** Sell quantity after keeping `holdPercent` of base asset in wallet (0–99). */
export function computeSellQuantity(
  heldQuantity: number,
  holdPercent: number,
): number {
  const hold = Math.min(99.99, Math.max(0, holdPercent));
  if (hold >= 100 || heldQuantity <= 0) return 0;
  return heldQuantity * (1 - hold / 100);
}
