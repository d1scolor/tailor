import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dbDir, dbPath, displayDir, originalsDir, photosDir, thumbsDir } from "@/lib/env";
import * as schema from "./schema";

type Sqlite = Database.Database;

let sqlite: Sqlite | undefined;
let initialized = false;

export function prepareFilesystem() {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(originalsDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(displayDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(thumbsDir, { recursive: true, mode: 0o755 });
  fs.mkdirSync(photosDir, { recursive: true, mode: 0o755 });
}

export function getSqlite() {
  if (!sqlite) {
    prepareFilesystem();
    sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
  }
  if (!initialized) {
    runMigrations(sqlite);
    initialized = true;
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export function closeDb() {
  sqlite?.close();
  sqlite = undefined;
  initialized = false;
}

export function runMigrations(db = getSqlite()) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  const migrationsDir = path.join(process.cwd(), "src/lib/db/migrations");
  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const name of migrations) {
    const applied = db.prepare("SELECT name FROM _migrations WHERE name = ?").get(name);
    if (applied) continue;
    const migration = fs.readFileSync(path.join(migrationsDir, name), "utf8");
    db.transaction(() => {
      db.exec(migration);
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(name, new Date().toISOString());
    })();
  }
  ensureAddedColumns(db);
}

function ensureAddedColumns(db: Sqlite) {
  if (!columnExists(db, "cloths", "colors")) {
    db.exec("ALTER TABLE cloths ADD COLUMN colors TEXT NOT NULL DEFAULT '[]'");
  }
  if (!columnExists(db, "materials", "colors")) {
    db.exec("ALTER TABLE materials ADD COLUMN colors TEXT NOT NULL DEFAULT '[]'");
  }
  if (!columnExists(db, "cloths", "purpose")) {
    db.exec("ALTER TABLE cloths ADD COLUMN purpose TEXT NOT NULL DEFAULT '服装'");
  }
  if (!columnExists(db, "cloths", "material_type")) {
    db.exec("ALTER TABLE cloths ADD COLUMN material_type TEXT NOT NULL DEFAULT '其他'");
  }
  if (!columnExists(db, "patterns", "pattern_type")) {
    db.exec("ALTER TABLE patterns ADD COLUMN pattern_type TEXT NOT NULL DEFAULT '纸质'");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS tools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '其他',
      quantity INTEGER NOT NULL DEFAULT 1,
      brand TEXT,
      model TEXT,
      source TEXT,
      price_cents INTEGER,
      purchased_at TEXT,
      condition TEXT NOT NULL DEFAULT '正常',
      remarks TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function columnExists(db: Sqlite, table: string, column: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => (row as { name: string }).name === column);
}
