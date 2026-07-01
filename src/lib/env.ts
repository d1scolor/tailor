import path from "node:path";
import { inferInitialCurrencyCode } from "@/lib/currency";
import { normalizeLocale } from "@/lib/i18n/locales";

export const dataDir =
  process.env.DATA_DIR ??
  (process.env.NODE_ENV === "production" ? "/data" : path.join(process.cwd(), "data"));

export const dbDir = path.join(dataDir, "db");
export const dbPath = process.env.DATABASE_URL ?? path.join(dbDir, "tailor.db");
export const photosDir = path.join(dataDir, "photos");
export const originalsDir = path.join(photosDir, "originals");
export const displayDir = path.join(photosDir, "display");
export const thumbsDir = path.join(photosDir, "thumbs");

const configuredLocale = process.env.DEFAULT_LOCALE?.trim();
const normalizedDefaultLocale = configuredLocale ? normalizeLocale(configuredLocale) : "en-AU";
if (!normalizedDefaultLocale) throw new Error(`Unsupported DEFAULT_LOCALE: ${process.env.DEFAULT_LOCALE}`);
export const defaultLocale = normalizedDefaultLocale;
const configuredUnitSystem = process.env.DEFAULT_UNIT_SYSTEM?.trim().toLowerCase();
if (configuredUnitSystem && configuredUnitSystem !== "metric" && configuredUnitSystem !== "imperial") {
  throw new Error(`Unsupported DEFAULT_UNIT_SYSTEM: ${process.env.DEFAULT_UNIT_SYSTEM}`);
}
export const defaultUnitSystem = configuredUnitSystem === "imperial" ? "imperial" : "metric";
export function configuredInitialCurrencyCode(locale: string = defaultLocale) {
  return inferInitialCurrencyCode({
    configuredCode: process.env.CURRENCY_CODE,
    legacySymbol: process.env.CURRENCY_SYMBOL,
    locale
  });
}
export const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 20);
