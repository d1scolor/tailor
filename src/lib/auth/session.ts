import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSqlite } from "@/lib/db/client";
import { seedDatabase } from "@/lib/db/seed";
import { restoreState } from "@/lib/restore-state";
import { addDaysIso, nowIso } from "@/lib/time";
import { normalizeUnitSystem, type UnitSystem } from "@/lib/units";
import { defaultLocale } from "@/lib/env";
import { normalizeLocale, type Locale } from "@/lib/i18n/locales";
import { normalizeCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { isSessionCookieValue, sessionCookie, sessionMaxAgeSeconds } from "./cookie";

export type AuthUser = {
  id: number;
  username: string;
  locale: Locale;
  unitSystem: UnitSystem;
  currencyCode: CurrencyCode;
  sessionId: string;
};

export function createSession(userId: number) {
  seedDatabase();
  const id = crypto.randomBytes(32).toString("hex");
  const now = nowIso();
  const expires = addDaysIso(30);
  getSqlite().prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    expires,
    now
  );
  return id;
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(sessionCookie, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookie, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function getUserBySession(sessionId?: string | null): AuthUser | null {
  if (restoreState.readsBlocked) return null;
  if (!restoreState.writesBlocked) seedDatabase();
  if (!isSessionCookieValue(sessionId)) return null;
  const db = getSqlite();
  const row = db
    .prepare(
      `SELECT sessions.id AS sessionId, sessions.expires_at AS expiresAt, users.id, users.username, users.locale,
              users.unit_system AS unitSystem, users.currency_code AS currencyCode
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = ?`
    )
    .get(sessionId) as
    | {
        sessionId: string;
        expiresAt: string;
        id: number;
        username: string;
        locale: string;
        unitSystem?: string;
        currencyCode?: string | null;
      }
    | undefined;
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  if (!restoreState.writesBlocked) {
    const expires = addDaysIso(30);
    db.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").run(expires, sessionId);
    db.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?").run(row.id, nowIso());
  }
  const currencyCode = normalizeCurrencyCode(row.currencyCode);
  if (!currencyCode) throw new Error(`Unsupported persisted currency code: ${row.currencyCode ?? "<missing>"}`);
  return {
    id: row.id,
    username: row.username,
    locale: normalizeLocale(row.locale) ?? defaultLocale,
    unitSystem: normalizeUnitSystem(row.unitSystem),
    currencyCode,
    sessionId: row.sessionId
  };
}

export function requireAuthFromRequest(request: NextRequest) {
  if (restoreState.readsBlocked) {
    return { user: null, response: jsonError("restore_in_progress", 503, "Restore is in progress.") };
  }
  if (restoreState.writesBlocked && isMutatingRequest(request) && request.nextUrl.pathname !== "/api/backup/restore") {
    return { user: null, response: jsonError("restore_in_progress", 503, "Restore is in progress.") };
  }
  const user = getUserBySession(request.cookies.get(sessionCookie)?.value);
  if (!user) {
    return { user: null, response: jsonError("unauthenticated", 401) };
  }
  return { user, response: null };
}

export async function getCurrentUser() {
  const store = await cookies();
  return getUserBySession(store.get(sessionCookie)?.value);
}

export function deleteSession(sessionId: string) {
  getSqlite().prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function deleteOtherSessions(userId: number, keepSessionId: string) {
  getSqlite().prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?").run(userId, keepSessionId);
}

export function jsonError(error: string, status: number, message?: string, details?: unknown) {
  return NextResponse.json({ error, ...(message ? { message } : {}), ...(details ? { details } : {}) }, { status });
}

function isMutatingRequest(request: NextRequest) {
  return !["GET", "HEAD", "OPTIONS"].includes(request.method);
}
