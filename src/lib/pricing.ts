export function unitPriceHundredths(totalHundredths: number | null | undefined, quantity: number) {
  if (totalHundredths == null || !Number.isFinite(quantity) || quantity <= 0) return null;
  return Math.round(totalHundredths / quantity);
}

export function usedValueHundredths(
  totalHundredths: number | null | undefined,
  totalQuantity: number,
  remainingQuantity: number
) {
  if (
    totalHundredths == null ||
    !Number.isFinite(totalQuantity) ||
    totalQuantity <= 0 ||
    !Number.isFinite(remainingQuantity)
  ) {
    return 0;
  }
  const usedFraction = Math.min(
    Math.max((totalQuantity - remainingQuantity) / totalQuantity, 0),
    1
  );
  return Math.round(totalHundredths * usedFraction);
}
