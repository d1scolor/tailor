import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { managedCategoryKeys } from "./meta";
import { managedUnitDefinitions } from "./units";
import {
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

function flattenValues(value: Messages, prefix = "", result = new Map<string, string>()) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenValues(child as Messages, path, result);
    } else {
      assert.equal(typeof child, "string", `${path} must be a string`);
      assert.notEqual((child as string).trim(), "", `${path} must not be empty`);
      result.set(path, child as string);
    }
  }
  return result;
}

function argumentsIn(message: string) {
  return [...message.matchAll(/{([A-Za-z][A-Za-z0-9_]*)\s*(?:,|})/g)]
    .map((match) => match[1])
    .filter((argument, index, arguments_) => arguments_.indexOf(argument) === index)
    .sort();
}

test("all message catalogs have matching keys", () => {
  const reference = [...flatten(load(messageLocales[0]))].sort();
  for (const locale of messageLocales.slice(1)) assert.deepEqual([...flatten(load(locale))].sort(), reference);
});

test("all translations preserve interpolation arguments", () => {
  const reference = flattenValues(load(messageLocales[0]));
  for (const locale of messageLocales.slice(1)) {
    const translated = flattenValues(load(locale));
    for (const [key, message] of reference) {
      assert.deepEqual(argumentsIn(translated.get(key)!), argumentsIn(message), `${locale}/${key}`);
    }
  }
});

test("all messages compile and format through next-intl", () => {
  for (const locale of messageLocales) {
    const messages = load(locale);
    const translate = createTranslator({
      locale,
      messages,
      onError(error) {
        throw error;
      }
    }) as (key: string, values?: Record<string, unknown>) => string;
    for (const key of flattenValues(messages).keys()) {
      translate(key, { count: 2, unit: "m", from: "USD", to: "AUD", currency: "JPY" });
    }
  }
});

test("every managed metadata definition has translations", () => {
  for (const messageLocale of messageLocales) {
    const keys = flatten(load(messageLocale));
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
