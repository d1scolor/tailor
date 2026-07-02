import assert from "node:assert/strict";
import test from "node:test";
import { isSafeBackupEntry } from "./backup";

test("backup entries accept Tailor data paths with tar directory suffixes", () => {
  assert.equal(isSafeBackupEntry("db/", "Directory"), true);
  assert.equal(isSafeBackupEntry("db/tailor.db", "File"), true);
  assert.equal(isSafeBackupEntry("./photos/originals/", "Directory"), true);
  assert.equal(isSafeBackupEntry("photos/originals/photo.jpg", "File"), true);
});

test("backup entries reject traversal, links, and unrelated files", () => {
  assert.equal(isSafeBackupEntry("../db/tailor.db", "File"), false);
  assert.equal(isSafeBackupEntry("/db/tailor.db", "File"), false);
  assert.equal(isSafeBackupEntry("photos/originals/photo.jpg", "SymbolicLink"), false);
  assert.equal(isSafeBackupEntry("photos/originals/photo.jpg", "Link"), false);
  assert.equal(isSafeBackupEntry("app/secrets.env", "File"), false);
});
