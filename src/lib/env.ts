import path from "node:path";

export const dataDir =
  process.env.DATA_DIR ??
  (process.env.NODE_ENV === "production" ? "/data" : path.join(process.cwd(), "data"));

export const dbDir = path.join(dataDir, "db");
export const dbPath = process.env.DATABASE_URL ?? path.join(dbDir, "tailor.db");
export const photosDir = path.join(dataDir, "photos");
export const originalsDir = path.join(photosDir, "originals");
export const displayDir = path.join(photosDir, "display");
export const thumbsDir = path.join(photosDir, "thumbs");

export const defaultLocale = process.env.DEFAULT_LOCALE === "zh" ? "zh" : "en";
export const defaultUnitSystem = process.env.DEFAULT_UNIT_SYSTEM === "imperial" ? "imperial" : "metric";
export const currencySymbol = process.env.CURRENCY_SYMBOL ?? "$";
export const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 20);
