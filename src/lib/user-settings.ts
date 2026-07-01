import type Database from "better-sqlite3";
import { getSqlite } from "@/lib/db/client";
import { configuredInitialCurrencyCode } from "@/lib/env";

export function initializeUserCurrencies(db: Database.Database = getSqlite()) {
  const missing = db
    .prepare("SELECT locale FROM users WHERE currency_code IS NULL OR TRIM(currency_code) = '' ORDER BY id LIMIT 1")
    .get() as { locale: string } | undefined;
  if (!missing) return;
  const currencyCode = configuredInitialCurrencyCode(missing.locale);
  db.prepare("UPDATE users SET currency_code = ? WHERE currency_code IS NULL OR TRIM(currency_code) = ''").run(currencyCode);
}
