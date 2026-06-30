export function money(cents?: number | null) {
  if (cents == null) return "";
  return `${runtimeCurrencySymbol()}${(cents / 100).toFixed(2)}`;
}

export function moneyDecimal(cents?: number | null, fractionDigits = 4) {
  if (cents == null) return "";
  return `${runtimeCurrencySymbol()}${(cents / 100).toFixed(fractionDigits)}`;
}

export function currencySymbol() {
  return runtimeCurrencySymbol();
}

export function numberValue(value?: number | null, locale?: string) {
  if (value == null) return "";
  const resolvedLocale =
    locale ??
    (typeof document !== "undefined" ? document.documentElement.lang : undefined);
  return new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 2 }).format(value);
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
