import assert from "node:assert/strict";
import test from "node:test";
import {
  clearLoginFailures,
  loginRetryAfterSeconds,
  recordLoginFailure,
  resetLoginRateLimitsForTests
} from "./auth/login-rate-limit";

test("login failures are bounded and expire", () => {
  resetLoginRateLimitsForTests();
  const startedAt = 1_000_000;
  for (let index = 0; index < 7; index += 1) {
    assert.equal(recordLoginFailure("Owner", startedAt + index), 0);
  }
  assert.equal(recordLoginFailure("owner", startedAt + 7), 900);
  assert.equal(loginRetryAfterSeconds(" OWNER ", startedAt + 8), 900);
  assert.equal(loginRetryAfterSeconds("owner", startedAt + 15 * 60 * 1000 + 8), 0);
});

test("successful login clears prior failures", () => {
  resetLoginRateLimitsForTests();
  recordLoginFailure("owner", 100);
  clearLoginFailures("OWNER");
  assert.equal(loginRetryAfterSeconds("owner", 101), 0);
});
