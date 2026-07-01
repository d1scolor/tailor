import currencyConfig from "./currency-config.json";

export type CurrencyCode = keyof typeof currencyConfig;

export const currencyCodes = Object.keys(currencyConfig) as [CurrencyCode, ...CurrencyCode[]];

export function normalizeCurrencyCode(value: unknown): CurrencyCode | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return Object.hasOwn(currencyConfig, code) ? (code as CurrencyCode) : null;
}

export function currencyFractionDigits(code: CurrencyCode) {
  return currencyConfig[code].fractionDigits;
}

export function inferInitialCurrencyCode({
  configuredCode,
  legacySymbol,
  locale
}: {
  configuredCode?: string | null;
  legacySymbol?: string | null;
  locale?: string | null;
}): CurrencyCode {
  const configured = normalizeCurrencyCode(configuredCode);
  if (configured) return configured;
  if (configuredCode?.trim()) throw new Error(`Unsupported currency code: ${configuredCode}`);

  const symbol = legacySymbol?.trim();
  const legacyCodes: Record<string, CurrencyCode> = {
    "$": "USD",
    "US$": "USD",
    "A$": "AUD",
    "AU$": "AUD",
    "£": "GBP",
    "€": "EUR",
    "¥": "CNY",
    "￥": "CNY",
    "CN¥": "CNY",
    "元": "CNY",
    "JP¥": "JPY",
    "₩": "KRW",
    "HK$": "HKD",
    "NT$": "TWD"
  };
  if (symbol && legacyCodes[symbol]) return legacyCodes[symbol];
  return locale?.toLowerCase().startsWith("zh") ? "CNY" : "USD";
}

export function formatCurrency(
  storedHundredths: number,
  code: CurrencyCode,
  locale?: string,
  fractionDigits = currencyFractionDigits(code)
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    currencyDisplay: "symbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(storedHundredths / 100);
}

export function currencySymbolFor(code: CurrencyCode, locale?: string) {
  return (
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "symbol"
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? code
  );
}
