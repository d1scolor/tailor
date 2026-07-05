import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Database from "better-sqlite3";
import { initializeSchema } from "./db/client";
import {
  assertCurrentSchema,
  UnsupportedDatabaseSchemaError
} from "./db/schema-compat";

const schemaSql = fs.readFileSync("src/lib/db/schema.sql", "utf8");

test("the public baseline satisfies the current schema contract", () => {
  const db = new Database(":memory:");
  try {
    db.exec(schemaSql);
    assert.doesNotThrow(() => assertCurrentSchema(db));
  } finally {
    db.close();
  }
});

test("schema initialization creates empty databases and preserves current ones", () => {
  const db = new Database(":memory:");
  try {
    initializeSchema(db);
    db.prepare(
      `INSERT INTO users (username, password_hash, created_at, updated_at)
       VALUES ('owner', 'hash', 'now', 'now')`
    ).run();

    initializeSchema(db);

    assert.equal(db.prepare("SELECT COUNT(*) FROM users").pluck().get(), 1);
  } finally {
    db.close();
  }
});

test("the public baseline enforces current defaults and option constraints", () => {
  const db = new Database(":memory:");
  try {
    db.exec(schemaSql);
    db.prepare(
      `INSERT INTO users (username, password_hash, created_at, updated_at)
       VALUES ('owner', 'hash', 'now', 'now')`
    ).run();

    assert.deepEqual(
      db
        .prepare(
          `SELECT fabric_used_value_display AS fabricUsedValue,
                  fabric_remaining_value_display AS fabricRemainingValue,
                  project_labor_cost_display AS projectLaborCost,
                  inventory_page_size AS pageSize
           FROM users WHERE id = 1`
        )
        .get(),
      {
        fabricUsedValue: 0,
        fabricRemainingValue: 0,
        projectLaborCost: 0,
        pageSize: "20"
      }
    );

    for (const value of ["50", "100", "all"]) {
      assert.doesNotThrow(() =>
        db.prepare("UPDATE users SET inventory_page_size = ? WHERE id = 1").run(value)
      );
    }
    assert.throws(() =>
      db.prepare("UPDATE users SET inventory_page_size = '25' WHERE id = 1").run()
    );
    assert.throws(() =>
      db.prepare("UPDATE users SET project_labor_cost_display = 2 WHERE id = 1").run()
    );

    db.prepare(
      `INSERT INTO projects (user_id, name, created_at, updated_at)
       VALUES (1, 'Project', 'now', 'now')`
    ).run();
    assert.equal(
      db.prepare("SELECT status FROM projects WHERE id = 1").pluck().get(),
      "in_progress"
    );
    assert.throws(() =>
      db.prepare("UPDATE projects SET status = 'unknown' WHERE id = 1").run()
    );

    db.prepare(
      `INSERT INTO tags (user_id, entity_type, name, created_at, updated_at)
       VALUES (1, 'fabric', 'Favourite', 'now', 'now')`
    ).run();
    assert.doesNotThrow(() =>
      db
        .prepare(
          `INSERT INTO tags (user_id, entity_type, name, created_at, updated_at)
           VALUES (1, 'material', 'Favourite', 'now', 'now')`
        )
        .run()
    );
    assert.throws(() =>
      db
        .prepare(
          `INSERT INTO tags (user_id, entity_type, name, created_at, updated_at)
           VALUES (1, 'fabric', 'Favourite', 'now', 'now')`
        )
        .run()
    );
  } finally {
    db.close();
  }
});

test("incomplete databases are rejected instead of being modified", () => {
  const db = new Database(":memory:");
  try {
    db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT)");
    assert.throws(
      () => initializeSchema(db),
      (error) =>
        error instanceof UnsupportedDatabaseSchemaError &&
        error.missing.includes("users.password_hash") &&
        error.missing.includes("projects")
    );
  } finally {
    db.close();
  }
});
