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
    assert.deepEqual(db.prepare("SELECT id, version FROM _schema_version").get(), { id: 1, version: 7 });
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

test("tag migration scopes linked tags and preserves unassigned tags in every category", () => {
  const db = new Database(":memory:");
  try {
    db.exec(fs.readFileSync("src/lib/db/migrations/0000_initial.sql", "utf8"));
    db.prepare(
      `INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at)
       VALUES ('owner', 'hash', 'en-AU', 'metric', 'now', 'now')`
    ).run();
    const insertTag = db.prepare(
      "INSERT INTO tags (user_id, name, color, created_at, updated_at) VALUES (1, ?, NULL, 'now', 'now')"
    );
    const sharedId = Number(insertTag.run("Shared").lastInsertRowid);
    const fabricId = Number(insertTag.run("Fabric only").lastInsertRowid);
    insertTag.run("Unassigned");
    db.prepare("INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?, ?, ?)").run(
      "fabric",
      1,
      sharedId
    );
    db.prepare("INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?, ?, ?)").run(
      "material",
      1,
      sharedId
    );
    db.prepare("INSERT INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?, ?, ?)").run(
      "fabric",
      2,
      fabricId
    );

    db.exec(fs.readFileSync("src/lib/db/migrations/0003_scoped_tags.sql", "utf8"));

    assert.deepEqual(
      db
        .prepare("SELECT entity_type AS entityType, name FROM tags ORDER BY name, entity_type")
        .all(),
      [
        { entityType: "fabric", name: "Fabric only" },
        { entityType: "fabric", name: "Shared" },
        { entityType: "material", name: "Shared" },
        { entityType: "fabric", name: "Unassigned" },
        { entityType: "material", name: "Unassigned" },
        { entityType: "pattern", name: "Unassigned" },
        { entityType: "project", name: "Unassigned" },
        { entityType: "tool", name: "Unassigned" }
      ]
    );
    assert.deepEqual(
      db
        .prepare(
          `SELECT entity_tags.entity_type AS linkType, tags.entity_type AS tagType, tags.name
           FROM entity_tags
           JOIN tags ON tags.id = entity_tags.tag_id
           ORDER BY tags.name, entity_tags.entity_type`
        )
        .all(),
      [
        { linkType: "fabric", tagType: "fabric", name: "Fabric only" },
        { linkType: "fabric", tagType: "fabric", name: "Shared" },
        { linkType: "material", tagType: "material", name: "Shared" }
      ]
    );
    assert.doesNotThrow(() =>
      db
        .prepare(
          "INSERT INTO tags (user_id, entity_type, name, color, created_at, updated_at) VALUES (1, 'tool', 'Shared', NULL, 'now', 'now')"
        )
        .run()
    );
    assert.throws(() =>
      db
        .prepare(
          "INSERT INTO tags (user_id, entity_type, name, color, created_at, updated_at) VALUES (1, 'fabric', 'Shared', NULL, 'now', 'now')"
        )
        .run()
    );
  } finally {
    db.close();
  }
});

test("summary display preferences default to length and hours and accept boolean values", () => {
  const db = new Database(":memory:");
  try {
    db.exec(fs.readFileSync("src/lib/db/migrations/0000_initial.sql", "utf8"));
    db.prepare(
      `INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at)
       VALUES ('owner', 'hash', 'en-AU', 'metric', 'now', 'now')`
    ).run();

    db.exec(
      fs.readFileSync(
        "src/lib/db/migrations/0004_summary_display_preferences.sql",
        "utf8"
      )
    );

    assert.deepEqual(
      db
        .prepare(
          `SELECT fabric_used_value_display AS fabricUsed,
                  fabric_remaining_value_display AS fabricRemaining,
                  project_labor_cost_display AS projectLabor
           FROM users WHERE id = 1`
        )
        .get(),
      { fabricUsed: 0, fabricRemaining: 0, projectLabor: 0 }
    );
    assert.doesNotThrow(() =>
      db
        .prepare(
          `UPDATE users
           SET fabric_used_value_display = 1,
               fabric_remaining_value_display = 1,
               project_labor_cost_display = 1
           WHERE id = 1`
        )
        .run()
    );
    assert.throws(() =>
      db
        .prepare("UPDATE users SET fabric_used_value_display = 2 WHERE id = 1")
        .run()
    );
  } finally {
    db.close();
  }
});

test("material availability migration preserves used-up records and removes manual usage state", () => {
  const db = new Database(":memory:");
  try {
    db.exec(fs.readFileSync("src/lib/db/migrations/0000_initial.sql", "utf8"));
    db.prepare(
      `INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at)
       VALUES ('owner', 'hash', 'en-AU', 'metric', 'now', 'now')`
    ).run();
    db.prepare(
      `INSERT INTO material_units (user_id, custom_name, active, sort_order, created_at)
       VALUES (1, 'piece', 1, 0, 'now')`
    ).run();
    const insertMaterial = db.prepare(
      `INSERT INTO materials
       (user_id, name, unit_id, quantity_total_canonical, usage_status, created_at, updated_at)
       VALUES (1, ?, 1, 1, ?, 'now', 'now')`
    );
    insertMaterial.run("Available", "available");
    insertMaterial.run("Partial", "partial");
    insertMaterial.run("Used up", "used");

    db.exec(
      fs.readFileSync(
        "src/lib/db/migrations/0005_material_availability.sql",
        "utf8"
      )
    );

    assert.deepEqual(
      db
        .prepare("SELECT name, is_used_up AS isUsedUp FROM materials ORDER BY id")
        .all(),
      [
        { name: "Available", isUsedUp: 0 },
        { name: "Partial", isUsedUp: 0 },
        { name: "Used up", isUsedUp: 1 }
      ]
    );
    const columns = db.prepare("PRAGMA table_info(materials)").all() as Array<{
      name: string;
    }>;
    assert.equal(columns.some((column) => column.name === "usage_status"), false);
    assert.throws(() =>
      db.prepare("UPDATE materials SET is_used_up = 2 WHERE id = 1").run()
    );
  } finally {
    db.close();
  }
});

test("inventory page size defaults to 20 and accepts supported global values", () => {
  const db = new Database(":memory:");
  try {
    db.exec(fs.readFileSync("src/lib/db/migrations/0000_initial.sql", "utf8"));
    db.prepare(
      `INSERT INTO users (username, password_hash, locale, unit_system, created_at, updated_at)
       VALUES ('owner', 'hash', 'en-AU', 'metric', 'now', 'now')`
    ).run();

    db.exec(
      fs.readFileSync("src/lib/db/migrations/0006_inventory_page_size.sql", "utf8")
    );

    assert.equal(
      db
        .prepare("SELECT inventory_page_size FROM users WHERE id = 1")
        .pluck()
        .get(),
      "20"
    );
    for (const value of ["50", "100", "all"]) {
      assert.doesNotThrow(() =>
        db
          .prepare("UPDATE users SET inventory_page_size = ? WHERE id = 1")
          .run(value)
      );
    }
    assert.throws(() =>
      db
        .prepare("UPDATE users SET inventory_page_size = '25' WHERE id = 1")
        .run()
    );
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
