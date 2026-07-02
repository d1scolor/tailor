import type Database from "better-sqlite3";
import requirements from "./schema-requirements.json";

type Sqlite = Database.Database;

export class UnsupportedDatabaseSchemaError extends Error {
  constructor(public missing: string[]) {
    super(`Unsupported database schema; missing: ${missing.join(", ")}`);
    this.name = "UnsupportedDatabaseSchemaError";
  }
}

export function assertCurrentSchema(db: Sqlite) {
  const missing: string[] = [];
  for (const [table, requiredColumns] of Object.entries(requirements.tables)) {
    const columns = new Set(
      (db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map((column) => column.name)
    );
    if (!columns.size) {
      missing.push(table);
      continue;
    }
    for (const column of requiredColumns) {
      if (!columns.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) throw new UnsupportedDatabaseSchemaError(missing);
}

export function recordSchemaVersion(db: Sqlite) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
    INSERT INTO _schema_version (id, version)
    VALUES (1, ${requirements.version})
    ON CONFLICT(id) DO UPDATE SET version = excluded.version;
  `);
}
