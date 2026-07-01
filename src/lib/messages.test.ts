import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { managedCategoryKeys } from "./meta";
import { managedUnitDefinitions } from "./units";
import {
  localeDefinitions,
  messageLocales,
  type MessageLocale
} from "./i18n/locales";

type Messages = Record<string, unknown>;

function load(locale: MessageLocale) {
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

test("all message catalogs have matching keys", () => {
  const reference = [...flatten(load(messageLocales[0]))].sort();
  for (const locale of messageLocales.slice(1)) assert.deepEqual([...flatten(load(locale))].sort(), reference);
});

test("every managed metadata definition has translations", () => {
  for (const messageLocale of messageLocales) {
    const keys = flatten(load(messageLocale));
    for (const definition of Object.values(localeDefinitions)) {
      assert.ok(keys.has(definition.labelKey), `${messageLocale}/${definition.labelKey}`);
    }
    for (const category of managedCategoryKeys) {
      assert.ok(keys.has(`meta.categories.${category}`), `${messageLocale}/${category}`);
    }
    for (const definition of Object.values(managedUnitDefinitions)) {
      if (definition.behavior === "static") {
        assert.ok(keys.has(definition.labelKey), `${messageLocale}/${definition.key}`);
        assert.ok(keys.has(`meta.unitQuantities.${definition.key}`), `${messageLocale}/${definition.key}/quantity`);
      } else {
        assert.ok(keys.has(definition.metric.labelKey), `${messageLocale}/${definition.key}/metric`);
        assert.ok(keys.has(definition.imperial.labelKey), `${messageLocale}/${definition.key}/imperial`);
      }
    }
  }
});
