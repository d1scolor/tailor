import assert from "node:assert/strict";
import test from "node:test";
import {
  localeDirection,
  locales,
  messageLocaleFor,
  messageLocales,
  normalizeLocale
} from "./i18n/locales";

test("locale aliases normalize without conflating Traditional Chinese", () => {
  assert.deepEqual(locales, ["en-AU", "en-GB", "en-US", "zh-CN"]);
  assert.equal(normalizeLocale("en"), "en-AU");
  assert.equal(normalizeLocale("en_GB"), "en-GB");
  assert.equal(normalizeLocale("en-US"), "en-US");
  assert.equal(normalizeLocale("zh_Hans_CN"), "zh-CN");
  assert.equal(normalizeLocale("zh-TW"), null);
  assert.equal(normalizeLocale("fr"), null);
});

test("regional English locales share the Australian English message catalog", () => {
  assert.deepEqual(messageLocales, ["en", "zh"]);
  assert.equal(messageLocaleFor("en-AU"), "en");
  assert.equal(messageLocaleFor("en-GB"), "en");
  assert.equal(messageLocaleFor("en-US"), "en");
  assert.equal(messageLocaleFor("zh-CN"), "zh");
});

test("supported locales declare text direction", () => {
  for (const locale of locales) assert.match(localeDirection(locale), /^(ltr|rtl)$/);
});
