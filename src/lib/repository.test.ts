import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tailor-repository-"));
process.env.DATA_DIR = testDataDir;

const { closeDb, getSqlite } = await import("./db/client");
const { summary } = await import("./repository");

test("project summaries total fabric length for the filtered projects", () => {
  const db = getSqlite();
  try {
    db.prepare(
      `INSERT INTO users (username, password_hash, created_at, updated_at)
       VALUES (?, 'hash', 'now', 'now')`
    ).run("owner");
    db.prepare(
      `INSERT INTO fabrics (user_id, name, length_total_m, created_at, updated_at)
       VALUES (1, ?, 10, 'now', 'now')`
    ).run("Linen");
    db.prepare(
      `INSERT INTO projects (user_id, name, status, created_at, updated_at)
       VALUES (1, ?, ?, 'now', 'now')`
    ).run("Completed shirt", "completed");
    db.prepare(
      `INSERT INTO projects (user_id, name, status, created_at, updated_at)
       VALUES (1, ?, ?, 'now', 'now')`
    ).run("Work in progress", "in_progress");
    db.prepare(
      `INSERT INTO project_fabrics (project_id, fabric_id, length_used_m, created_at)
       VALUES (?, 1, ?, 'now')`
    ).run(1, 1.25);
    db.prepare(
      `INSERT INTO project_fabrics (project_id, fabric_id, length_used_m, created_at)
       VALUES (?, 1, ?, 'now')`
    ).run(2, 2.5);

    const allProjects = summary("projects", 1) as { totalFabricUsedM: number };
    const completedProjects = summary(
      "projects",
      1,
      new URLSearchParams({ projectStatuses: "completed" })
    ) as { totalFabricUsedM: number };

    assert.equal(allProjects.totalFabricUsedM, 3.75);
    assert.equal(completedProjects.totalFabricUsedM, 1.25);
  } finally {
    closeDb();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }
});
