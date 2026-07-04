import assert from "node:assert/strict";
import test from "node:test";
import { getBaseUrlPolicy, isPrivateNetworkHostname } from "./auth/base-url";

test("HTTPS origins use Secure session cookies", () => {
  withBaseUrl("https://tailor.example.com", () => {
    assert.deepEqual(getBaseUrlPolicy(), {
      ok: true,
      origin: "https://tailor.example.com",
      secureCookies: true,
      privateHttp: false
    });
  });
});

test("HTTP is accepted for local, private, and VPN addresses", () => {
  for (const hostname of [
    "localhost",
    "127.0.0.1",
    "10.0.0.4",
    "100.64.0.1",
    "100.127.255.254",
    "169.254.10.2",
    "172.16.0.1",
    "172.31.255.254",
    "192.168.1.10",
    "::1",
    "fd7a:115c:a1e0::1",
    "fe80::1"
  ]) {
    assert.equal(isPrivateNetworkHostname(hostname), true, hostname);
  }

  withBaseUrl("http://192.168.1.10:3000", () => {
    assert.deepEqual(getBaseUrlPolicy(), {
      ok: true,
      origin: "http://192.168.1.10:3000",
      secureCookies: false,
      privateHttp: true
    });
  });
});

test("public HTTP addresses and private-looking hostnames are rejected", () => {
  for (const baseUrl of [
    "http://example.com",
    "http://tailor.local",
    "http://8.8.8.8",
    "http://100.128.0.1"
  ]) {
    withBaseUrl(baseUrl, () => {
      assert.deepEqual(getBaseUrlPolicy(), { ok: false, reason: "public_http" });
    });
  }
});

test("BASE_URL must be an HTTP or HTTPS origin without credentials or paths", () => {
  const cases = [
    ["not a URL", "invalid"],
    ["ftp://192.168.1.10", "unsupported_protocol"],
    ["https://user:password@example.com", "invalid"],
    ["https://example.com/tailor", "invalid"],
    ["https://example.com?query=1", "invalid"]
  ] as const;
  for (const [baseUrl, reason] of cases) {
    withBaseUrl(baseUrl, () => {
      assert.deepEqual(getBaseUrlPolicy(), { ok: false, reason });
    });
  }
});

function withBaseUrl(value: string, callback: () => void) {
  const previous = process.env.BASE_URL;
  process.env.BASE_URL = value;
  try {
    callback();
  } finally {
    if (previous === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = previous;
  }
}
