const windowMs = 15 * 60 * 1000;
const blockMs = 15 * 60 * 1000;
const maxFailures = 8;
const maxEntries = 1_000;

type LoginAttempt = {
  failures: number;
  windowStartedAt: number;
  blockedUntil: number;
  lastSeenAt: number;
};

const attempts = new Map<string, LoginAttempt>();

export function loginRetryAfterSeconds(username: string, now = Date.now()) {
  const attempt = attempts.get(keyFor(username));
  if (!attempt || attempt.blockedUntil <= now) return 0;
  return Math.max(1, Math.ceil((attempt.blockedUntil - now) / 1000));
}

export function recordLoginFailure(username: string, now = Date.now()) {
  pruneAttempts(now);
  const key = keyFor(username);
  const current = attempts.get(key);
  const attempt =
    !current || now - current.windowStartedAt >= windowMs
      ? { failures: 0, windowStartedAt: now, blockedUntil: 0, lastSeenAt: now }
      : current;
  attempt.failures += 1;
  attempt.lastSeenAt = now;
  if (attempt.failures >= maxFailures) attempt.blockedUntil = now + blockMs;
  attempts.set(key, attempt);
  return loginRetryAfterSeconds(username, now);
}

export function clearLoginFailures(username: string) {
  attempts.delete(keyFor(username));
}

export function resetLoginRateLimitsForTests() {
  attempts.clear();
}

function keyFor(username: string) {
  return username.trim().toLocaleLowerCase();
}

function pruneAttempts(now: number) {
  for (const [key, attempt] of attempts) {
    if (attempt.blockedUntil <= now && now - attempt.lastSeenAt >= windowMs) attempts.delete(key);
  }
  if (attempts.size < maxEntries) return;
  const oldest = [...attempts.entries()].sort((left, right) => left[1].lastSeenAt - right[1].lastSeenAt);
  for (const [key] of oldest.slice(0, attempts.size - maxEntries + 1)) attempts.delete(key);
}
