import assert from "node:assert/strict";
import test from "node:test";
import { unitPriceHundredths, usedValueHundredths } from "./pricing";

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

test("used value is apportioned by quantity and bounded by the total", () => {
  assert.equal(usedValueHundredths(1000, 4, 3), 250);
  assert.equal(usedValueHundredths(1000, 3, 2), 333);
  assert.equal(usedValueHundredths(1000, 4, 0), 1000);
  assert.equal(usedValueHundredths(1000, 4, -1), 1000);
  assert.equal(usedValueHundredths(1000, 4, 5), 0);
  assert.equal(usedValueHundredths(null, 4, 2), 0);
  assert.equal(usedValueHundredths(1000, 0, 0), 0);
});
