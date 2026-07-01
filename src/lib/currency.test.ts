import assert from "node:assert/strict";
import test from "node:test";
import {
  currencyCodes,
  currencyFractionDigits,
  currencySymbolFor,
  formatCurrency,
  inferInitialCurrencyCode,
  normalizeCurrencyCode
} from "./currency";

test("supported currency codes are stable and normalized", () => {
  assert.deepEqual(currencyCodes, [
    "USD",
    "AUD",
    "GBP",
    "EUR",
    "CNY",
    "JPY",
    "KRW",
    "HKD",
    "TWD",
    "CAD",
    "NZD",
    "SGD",
    "CHF",
    "PLN",
    "SEK",
    "NOK",
    "DKK",
    "BRL",
    "MXN",
    "INR",
    "ZAR"
  ]);
  assert.equal(normalizeCurrencyCode(" aud "), "AUD");
  assert.equal(normalizeCurrencyCode("cad"), "CAD");
  assert.equal(normalizeCurrencyCode("AED"), null);
});

test("legacy symbols initialize an unambiguous persisted code", () => {
  assert.equal(inferInitialCurrencyCode({ configuredCode: "TWD", legacySymbol: "¥", locale: "zh" }), "TWD");
  assert.equal(inferInitialCurrencyCode({ legacySymbol: "A$", locale: "en" }), "AUD");
  assert.equal(inferInitialCurrencyCode({ legacySymbol: "¥", locale: "zh" }), "CNY");
  assert.throws(() => inferInitialCurrencyCode({ configuredCode: "AED" }), /Unsupported currency code/);
});

test("currency formatting follows the active locale and currency exponent", () => {
  assert.equal(formatCurrency(0, "USD", "en"), "$0.00");
  assert.equal(formatCurrency(0, "AUD", "en"), "A$0.00");
  assert.equal(formatCurrency(12300, "JPY", "ja"), "￥123");
  assert.equal(formatCurrency(1234, "JPY", "ja"), "￥12");
  assert.match(formatCurrency(12345, "EUR", "fr"), /^123,45.+€$/);
  assert.equal(currencyFractionDigits("KRW"), 0);
  assert.equal(currencyFractionDigits("HKD"), 2);
  assert.equal(currencyFractionDigits("CHF"), 2);
  assert.equal(currencyFractionDigits("INR"), 2);
  assert.equal(currencySymbolFor("TWD", "en"), "NT$");
});

test("every supported currency fits the persisted hundredths model", () => {
  for (const code of currencyCodes) {
    assert.ok([0, 2].includes(currencyFractionDigits(code)), `${code} has an unsupported exponent`);
  }
});
