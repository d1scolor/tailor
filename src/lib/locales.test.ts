import assert from "node:assert/strict";
import test from "node:test";
import {
  localeDirection,
  localeLabel,
  locales,
  messageLocaleFor,
  messageLocales,
  normalizeLocale,
  resolveRequestLocale
} from "./i18n/locales";

test("locale aliases and regional browser locales normalize predictably", () => {
  assert.deepEqual(locales, [
    "en-AU",
    "en-GB",
    "en-US",
    "zh-CN",
    "zh-TW",
    "zh-HK",
    "fr",
    "de",
    "ja",
    "ko",
    "it",
    "es",
    "pt-BR",
    "nl",
    "pl"
  ]);
  assert.equal(normalizeLocale("en"), "en-AU");
  assert.equal(normalizeLocale("en_GB"), "en-GB");
  assert.equal(normalizeLocale("en-US"), "en-US");
  assert.equal(normalizeLocale("zh_Hans_CN"), "zh-CN");
  assert.equal(normalizeLocale("zh_Hant_TW"), "zh-TW");
  assert.equal(normalizeLocale("zh-Hant-HK"), "zh-HK");
  assert.equal(normalizeLocale("fr-CA"), "fr");
  assert.equal(normalizeLocale("de-AT"), "de");
  assert.equal(normalizeLocale("ja-JP"), "ja");
  assert.equal(normalizeLocale("es-MX"), "es");
  assert.equal(normalizeLocale("pt"), "pt-BR");
  assert.equal(normalizeLocale("pt-PT"), null);
  assert.equal(normalizeLocale("zh-Hant"), null);
});

test("regional English shares a catalog while Chinese variants remain distinct", () => {
  assert.deepEqual(messageLocales, [
    "en",
    "zh",
    "zh-TW",
    "zh-HK",
    "fr",
    "de",
    "ja",
    "ko",
    "it",
    "es",
    "pt-BR",
    "nl",
    "pl"
  ]);
  assert.equal(messageLocaleFor("en-AU"), "en");
  assert.equal(messageLocaleFor("en-GB"), "en");
  assert.equal(messageLocaleFor("en-US"), "en");
  assert.equal(messageLocaleFor("zh-CN"), "zh");
  assert.equal(messageLocaleFor("zh-TW"), "zh-TW");
  assert.equal(messageLocaleFor("zh-HK"), "zh-HK");
});

test("persisted user locale overrides stale client and browser preferences", () => {
  assert.equal(
    resolveRequestLocale({
      persistedLocale: "fr",
      cookieLocale: "ja",
      acceptLanguage: "de-DE,de;q=0.9",
      fallbackLocale: "en-AU"
    }),
    "fr"
  );
  assert.equal(
    resolveRequestLocale({
      cookieLocale: "ja",
      acceptLanguage: "de-DE,de;q=0.9",
      fallbackLocale: "en-AU"
    }),
    "ja"
  );
  assert.equal(
    resolveRequestLocale({
      acceptLanguage: "de-DE,de;q=0.9",
      fallbackLocale: "en-AU"
    }),
    "de"
  );
});

test("supported locales declare text direction", () => {
  for (const locale of locales) {
    assert.match(localeDirection(locale), /^(ltr|rtl)$/);
    assert.ok(localeLabel(locale));
  }
});
