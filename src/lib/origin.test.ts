import assert from "node:assert/strict";
import test from "node:test";
import { isCrossOriginMutation } from "./auth/origin";

function request(method: string, origin?: string, fetchSite?: string) {
  return {
    method,
    headers: new Headers({
      ...(origin ? { origin } : {}),
      ...(fetchSite ? { "sec-fetch-site": fetchSite } : {})
    }),
    nextUrl: { origin: "https://tailor.example.com" }
  };
}

test("cross-origin mutation checks allow same-origin and non-mutating requests", () => {
  assert.equal(isCrossOriginMutation(request("POST", "https://tailor.example.com", "same-origin")), false);
  assert.equal(isCrossOriginMutation(request("GET", "https://attacker.example", "cross-site")), false);
  assert.equal(isCrossOriginMutation(request("POST")), false);
});

test("cross-origin mutation checks reject foreign and malformed origins", () => {
  assert.equal(isCrossOriginMutation(request("POST", "https://attacker.example", "cross-site")), true);
  assert.equal(isCrossOriginMutation(request("POST", "https://attacker.example")), true);
  assert.equal(isCrossOriginMutation(request("POST", "null")), true);
});

test("configured public origin takes precedence over a forwarded request origin", () => {
  const previous = process.env.BASE_URL;
  process.env.BASE_URL = "https://inventory.example";
  try {
    assert.equal(isCrossOriginMutation(request("POST", "https://inventory.example")), false);
    assert.equal(isCrossOriginMutation(request("POST", "https://tailor.example.com")), true);
  } finally {
    if (previous === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = previous;
  }
});

test("configured private HTTP origins allow matching mutations", () => {
  const previous = process.env.BASE_URL;
  process.env.BASE_URL = "http://192.168.1.20:3000";
  try {
    const privateRequest = {
      method: "POST",
      headers: new Headers({ origin: "http://192.168.1.20:3000" }),
      nextUrl: { origin: "http://192.168.1.20:3000" }
    };
    assert.equal(isCrossOriginMutation(privateRequest), false);
  } finally {
    if (previous === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = previous;
  }
});

test("configured public HTTP origins reject mutations", () => {
  const previous = process.env.BASE_URL;
  process.env.BASE_URL = "http://tailor.example.com";
  try {
    const publicRequest = {
      method: "POST",
      headers: new Headers({ origin: "http://tailor.example.com" }),
      nextUrl: { origin: "http://tailor.example.com" }
    };
    assert.equal(isCrossOriginMutation(publicRequest), true);
  } finally {
    if (previous === undefined) delete process.env.BASE_URL;
    else process.env.BASE_URL = previous;
  }
});
