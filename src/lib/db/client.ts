import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dbDir, dbPath, displayDir, originalsDir, photosDir, thumbsDir } from "@/lib/env";
import * as schema from "./schema";
import { assertCurrentSchema, recordSchemaVersion } from "./schema-compat";

type Sqlite = Database.Database;

let sqlite: Sqlite | undefined;
let initialized = false;

export function prepareFilesystem() {
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(originalsDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(displayDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(thumbsDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(photosDir, { recursive: true, mode: 0o700 });
}

export function getSqlite() {
  if (!sqlite) {
    prepareFilesystem();
    sqlite = new Database(dbPath);
    fs.chmodSync(dbPath, 0o600);
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

export function runMigrations(db: Sqlite) {
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
  assertCurrentSchema(db);
  recordSchemaVersion(db);
}
