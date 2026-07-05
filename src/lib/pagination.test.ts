import assert from "node:assert/strict";
import test from "node:test";
import { normalizeInventoryPageSize } from "./pagination";

test("inventory page size accepts supported values and falls back safely", () => {
  assert.equal(normalizeInventoryPageSize("20"), 20);
  assert.equal(normalizeInventoryPageSize("50"), 50);
  assert.equal(normalizeInventoryPageSize("100"), 100);
  assert.equal(normalizeInventoryPageSize("all"), "all");
  assert.equal(normalizeInventoryPageSize("25"), 20);
  assert.equal(normalizeInventoryPageSize(null), 20);
});
