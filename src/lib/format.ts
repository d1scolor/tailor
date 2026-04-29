export function money(cents?: number | null) {
  if (cents == null) return "";
  return `${process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "$"}${(cents / 100).toFixed(2)}`;
}

export function numberValue(value?: number | null) {
  if (value == null) return "";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

export function lengthToMetres(value: number, unit: string) {
  if (unit === "cm") return value / 100;
  if (unit === "yd") return value * 0.9144;
  return value;
}
