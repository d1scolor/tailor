export function unitPriceHundredths(totalHundredths: number | null | undefined, quantity: number) {
  if (totalHundredths == null || !Number.isFinite(quantity) || quantity <= 0) return null;
  return Math.round(totalHundredths / quantity);
}
