import {
  currencyFractionDigits,
  currencySymbolFor,
  formatCurrency,
  type CurrencyCode
} from "@/lib/currency";

export function money(storedHundredths: number | null | undefined, locale: string | undefined, code: CurrencyCode) {
  if (storedHundredths == null) return "";
  return formatCurrency(storedHundredths, code, resolvedLocale(locale));
}

export function currencySymbol(locale: string | undefined, code: CurrencyCode) {
  return currencySymbolFor(code, resolvedLocale(locale));
}

export function currencyInputStep(code: CurrencyCode) {
  return currencyFractionDigits(code) === 0 ? "1" : "0.01";
}

export function storedAmountForInput(storedHundredths: number | null | undefined, code: CurrencyCode) {
  if (storedHundredths == null) return "";
  return (storedHundredths / 100).toFixed(currencyFractionDigits(code));
}

export function numberValue(value?: number | null, locale?: string) {
  if (value == null) return "";
  const resolvedLocale =
    locale ??
    (typeof document !== "undefined" ? document.documentElement.lang : undefined);
  return new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 2 }).format(value);
}

export function dateValue(value?: string | null, locale?: string) {
  if (!value) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(resolvedLocale(locale), {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(date);
}

function resolvedLocale(locale?: string) {
  return locale ?? (typeof document !== "undefined" ? document.documentElement.lang : undefined);
}
