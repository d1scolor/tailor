import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import {
  assertCurrentSchema,
  recordSchemaVersion,
  UnsupportedDatabaseSchemaError
} from "./db/schema-compat";

test("migration set satisfies the current schema contract", () => {
  const db = new Database(":memory:");
  try {
    for (const migration of fs.readdirSync("src/lib/db/migrations").filter((name) => name.endsWith(".sql")).sort()) {
      db.exec(fs.readFileSync(`src/lib/db/migrations/${migration}`, "utf8"));
    }
    assert.doesNotThrow(() => assertCurrentSchema(db));
    recordSchemaVersion(db);
    assert.deepEqual(db.prepare("SELECT id, version FROM _schema_version").get(), { id: 1, version: 3 });
  } finally {
    db.close();
  }
});

test("project status migration completes existing projects and defaults new projects to in progress", () => {
  const db = new Database(":memory:");
  try {
    for (const migration of ["0000_initial.sql", "0001_project_costs_and_labor.sql"]) {
      db.exec(fs.readFileSync(`src/lib/db/migrations/${migration}`, "utf8"));
    }
    db.prepare(
      `INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at)
       VALUES ('owner', 'hash', 'en-AU', 'metric', 'now', 'now')`
    ).run();
    db.prepare(
      `INSERT INTO projects (user_id, name, quantity, created_at, updated_at)
       VALUES (1, 'Existing project', 1, 'now', 'now')`
    ).run();

    db.exec(fs.readFileSync("src/lib/db/migrations/0002_project_status.sql", "utf8"));

    assert.equal(db.prepare("SELECT status FROM projects WHERE name = 'Existing project'").pluck().get(), "completed");
    db.prepare(
      `INSERT INTO projects (user_id, name, quantity, created_at, updated_at)
       VALUES (1, 'New project', 1, 'now', 'now')`
    ).run();
    assert.equal(db.prepare("SELECT status FROM projects WHERE name = 'New project'").pluck().get(), "in_progress");
    assert.throws(() => db.prepare("UPDATE projects SET status = 'unknown' WHERE name = 'New project'").run());
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
