import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dbDir, dbPath, displayDir, originalsDir, photosDir, thumbsDir } from "@/lib/env";
import * as schema from "./schema";
import { assertCurrentSchema } from "./schema-compat";

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
    initializeSchema(sqlite);
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

export function initializeSchema(db: Sqlite) {
  const tableCount = Number(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM sqlite_master
           WHERE type = 'table'
             AND name NOT LIKE 'sqlite_%'`
        )
        .get() as { count: number }
    ).count
  );
  if (tableCount === 0) {
    const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
    db.exec(fs.readFileSync(schemaPath, "utf8"));
  }
  assertCurrentSchema(db);
}
