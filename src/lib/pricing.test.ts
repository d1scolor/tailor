import assert from "node:assert/strict";
import test from "node:test";
import { unitPriceHundredths } from "./pricing";

test("zero-cost items still have a zero unit price", () => {
  assert.equal(unitPriceHundredths(0, 1), 0);
  assert.equal(unitPriceHundredths(0, 4), 0);
});

test("unit prices distinguish missing prices from zero", () => {
  assert.equal(unitPriceHundredths(null, 1), null);
  assert.equal(unitPriceHundredths(undefined, 1), null);
  assert.equal(unitPriceHundredths(1000, 4), 250);
  assert.equal(unitPriceHundredths(1000, 0), null);
});
