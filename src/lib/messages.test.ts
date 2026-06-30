import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { managedCategoryKeys } from "./meta";
import { managedUnitDefinitions } from "./units";

type Messages = Record<string, unknown>;

function load(locale: "en" | "zh") {
  return JSON.parse(fs.readFileSync(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8")) as Messages;
}

function flatten(value: Messages, prefix = "", result = new Set<string>()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child as Messages, path, result);
    else result.add(path);
  }
  return result;
}

test("English and Chinese message catalogs have matching keys", () => {
  assert.deepEqual([...flatten(load("en"))].sort(), [...flatten(load("zh"))].sort());
});

test("every managed metadata definition has translations", () => {
  for (const locale of ["en", "zh"] as const) {
    const keys = flatten(load(locale));
    for (const category of managedCategoryKeys) assert.ok(keys.has(`meta.categories.${category}`), `${locale}/${category}`);
    for (const definition of Object.values(managedUnitDefinitions)) {
      if (definition.behavior === "static") {
        assert.ok(keys.has(definition.labelKey), `${locale}/${definition.key}`);
      } else {
        assert.ok(keys.has(definition.metric.labelKey), `${locale}/${definition.key}/metric`);
        assert.ok(keys.has(definition.imperial.labelKey), `${locale}/${definition.key}/imperial`);
      }
    }
  }
});
