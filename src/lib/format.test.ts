import assert from "node:assert/strict";
import test from "node:test";
import { dateValue } from "./format";

test("stored date-only values format without timezone drift", () => {
  assert.equal(dateValue("2026-06-30", "en-AU"), "30 June 2026");
  assert.equal(dateValue("2026-06-30", "en-US"), "Jun 30, 2026");
  assert.equal(dateValue("not-a-date", "en"), "not-a-date");
});
