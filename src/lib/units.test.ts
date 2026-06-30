import assert from "node:assert/strict";
import test from "node:test";
import {
  areaToDisplay,
  defaultManagedUnitKeys,
  displayUnit,
  managedUnitDefinitions,
  normalizeUnitSystem,
  toCanonicalValue,
  toDisplayValue,
  type ConvertibleUnitKey,
  type UnitSystem
} from "./units";

const convertibleKeys: ConvertibleUnitKey[] = ["lengthLong", "lengthShort", "massLarge", "massSmall"];
const systems: UnitSystem[] = ["metric", "imperial"];

test("convertible unit profiles round-trip through their canonical value", () => {
  for (const key of convertibleKeys) {
    for (const system of systems) {
      const input = 12.345;
      const canonical = toCanonicalValue(input, key, system);
      assert.ok(Math.abs(toDisplayValue(canonical, key, system) - input) < 1e-10, `${key}/${system}`);
    }
  }
});

test("managed definitions use exact standard conversion factors", () => {
  assert.equal(toCanonicalValue(1, "lengthLong", "imperial"), 0.9144);
  assert.equal(toCanonicalValue(1, "lengthShort", "imperial"), 0.0254);
  assert.equal(toCanonicalValue(1, "massLarge", "imperial"), 0.45359237);
  assert.equal(toCanonicalValue(1, "massSmall", "imperial"), 0.028349523125);
  assert.equal(displayUnit("lengthLong", "metric").symbol, "m");
  assert.equal(displayUnit("massSmall", "imperial").symbol, "oz");
});

test("legacy US preference normalizes to imperial", () => {
  assert.equal(normalizeUnitSystem("us"), "imperial");
  assert.equal(normalizeUnitSystem("imperial"), "imperial");
  assert.equal(normalizeUnitSystem("metric"), "metric");
  assert.equal(normalizeUnitSystem("unknown"), "metric");
});

test("area conversion uses square-yard scaling", () => {
  assert.equal(areaToDisplay(0.83612736, "imperial"), 1);
  assert.equal(areaToDisplay(2, "metric"), 2);
});

test("default managed keys are unique, valid, and exclude unspecified", () => {
  assert.equal(new Set(defaultManagedUnitKeys).size, defaultManagedUnitKeys.length);
  assert.equal(defaultManagedUnitKeys.includes("unspecified"), false);
  for (const key of defaultManagedUnitKeys) assert.ok(managedUnitDefinitions[key]);
});
