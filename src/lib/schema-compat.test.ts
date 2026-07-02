import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import {
  assertCurrentSchema,
  recordSchemaVersion,
  UnsupportedDatabaseSchemaError
} from "./db/schema-compat";

test("squashed baseline satisfies the current schema contract", () => {
  const db = new Database(":memory:");
  try {
    db.exec(fs.readFileSync("src/lib/db/migrations/0000_initial.sql", "utf8"));
    assert.doesNotThrow(() => assertCurrentSchema(db));
    recordSchemaVersion(db);
    assert.deepEqual(db.prepare("SELECT id, version FROM _schema_version").get(), { id: 1, version: 1 });
  } finally {
    db.close();
  }
});

test("legacy schemas are rejected with missing current fields", () => {
  const db = new Database(":memory:");
  try {
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT)");
    assert.throws(
      () => assertCurrentSchema(db),
      (error: unknown) =>
        error instanceof UnsupportedDatabaseSchemaError &&
        error.missing.includes("users.password_hash") &&
        error.missing.includes("fabrics")
    );
  } finally {
    db.close();
  }
});
