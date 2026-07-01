import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const dataDir = process.env.DATA_DIR ?? "/data";
const dbDir = path.join(dataDir, "db");
const photosDir = path.join(dataDir, "photos");
const dbPath = process.env.DATABASE_URL ?? path.join(dbDir, "tailor.db");
const now = () => new Date().toISOString();
const localeConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/lib/locale-config.json"), "utf8")
);
for (const definition of Object.values(localeConfig)) {
  if (!fs.existsSync(path.join(process.cwd(), "messages", `${definition.messageLocale}.json`))) {
    throw new Error(`Missing message catalog: ${definition.messageLocale}`);
  }
}
const requestedLocale = (process.env.DEFAULT_LOCALE ?? "en-AU").trim().replaceAll("_", "-").toLowerCase();
const exactLocale = Object.entries(localeConfig).find(
  ([locale, definition]) =>
    locale.toLowerCase() === requestedLocale ||
    definition.aliases.some((alias) => alias.toLowerCase() === requestedLocale)
)?.[0];
const baseLocale = Object.keys(localeConfig).find(
  (locale) => !locale.includes("-") && locale.toLowerCase() === requestedLocale.split("-")[0]
);
const defaultLocale = exactLocale ?? baseLocale;
if (!defaultLocale) throw new Error(`Unsupported DEFAULT_LOCALE: ${process.env.DEFAULT_LOCALE}`);
const requestedUnitSystem = (process.env.DEFAULT_UNIT_SYSTEM ?? "metric").trim().toLowerCase();
if (requestedUnitSystem !== "metric" && requestedUnitSystem !== "imperial") {
  throw new Error(`Unsupported DEFAULT_UNIT_SYSTEM: ${process.env.DEFAULT_UNIT_SYSTEM}`);
}

fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
for (const dir of ["originals", "display", "thumbs"]) {
  fs.mkdirSync(path.join(photosDir, dir), { recursive: true, mode: 0o755 });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
const migrationsDir = path.join(process.cwd(), "src/lib/db/migrations");
for (const migration of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
  if (!db.prepare("SELECT name FROM _migrations WHERE name = ?").get(migration)) {
    db.transaction(() => {
      db.exec(fs.readFileSync(path.join(migrationsDir, migration), "utf8"));
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(migration, now());
    })();
    console.log(`Applied migration ${migration}`);
  }
}

const count = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
if (count === 0) {
  if (!process.env.INITIAL_USERNAME || !process.env.INITIAL_PASSWORD) {
    console.error("INITIAL_USERNAME and INITIAL_PASSWORD are required for first boot");
    process.exit(1);
  }
  const timestamp = now();
  db.prepare("INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    process.env.INITIAL_USERNAME,
    bcrypt.hashSync(process.env.INITIAL_PASSWORD, 12),
    defaultLocale,
    requestedUnitSystem,
    timestamp,
    timestamp
  );
  console.log("Created bootstrap user");
}

const currencyConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/lib/currency-config.json"), "utf8")
);
const usersMissingCurrency = db
  .prepare("SELECT locale FROM users WHERE currency_code IS NULL OR TRIM(currency_code) = '' ORDER BY id")
  .all();
if (usersMissingCurrency.length) {
  const configuredCurrency = process.env.CURRENCY_CODE?.trim().toUpperCase();
  if (configuredCurrency && !currencyConfig[configuredCurrency]) {
    throw new Error(`Unsupported CURRENCY_CODE: ${process.env.CURRENCY_CODE}`);
  }
  const legacyCurrencyBySymbol = {
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
  const currencyCode =
    configuredCurrency ||
    legacyCurrencyBySymbol[process.env.CURRENCY_SYMBOL?.trim()] ||
    (usersMissingCurrency[0].locale?.toLowerCase().startsWith("zh") ? "CNY" : "USD");
  db.prepare("UPDATE users SET currency_code = ? WHERE currency_code IS NULL OR TRIM(currency_code) = ''").run(currencyCode);
  console.log(`Initialized user currency ${currencyCode}`);
}
const invalidCurrency = db
  .prepare("SELECT currency_code AS currencyCode FROM users")
  .all()
  .find((user) => !currencyConfig[user.currencyCode]);
if (invalidCurrency) {
  throw new Error(`Unsupported persisted currency code: ${invalidCurrency.currencyCode}`);
}

db.close();
