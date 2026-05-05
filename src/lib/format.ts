export function money(cents?: number | null) {
  if (cents == null) return "";
  return `${runtimeCurrencySymbol()}${(cents / 100).toFixed(2)}`;
}

export function moneyDecimal(cents?: number | null, fractionDigits = 4) {
  if (cents == null) return "";
  return `${runtimeCurrencySymbol()}${(cents / 100).toFixed(fractionDigits)}`;
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

function runtimeCurrencySymbol() {
  if (typeof window !== "undefined") return window.__TAILOR_CURRENCY_SYMBOL__ ?? process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "$";
  return process.env.CURRENCY_SYMBOL ?? process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? "$";
}

declare global {
  interface Window {
    __TAILOR_CURRENCY_SYMBOL__?: string;
  }
}
