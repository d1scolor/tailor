import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSqlite } from "@/lib/db/client";
import { seedDatabase } from "@/lib/db/seed";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";
import { defaultLocale } from "@/lib/env";
import { normalizeLocale } from "@/lib/i18n/locales";
import {
  clearLoginFailures,
  loginRetryAfterSeconds,
  recordLoginFailure
} from "@/lib/auth/login-rate-limit";
import { isCrossOriginMutation } from "@/lib/auth/origin";
import { getBaseUrlPolicy } from "@/lib/auth/base-url";

const loginSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(1024)
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const baseUrlPolicy = getBaseUrlPolicy(request.nextUrl.origin);
  if (!baseUrlPolicy.ok) {
    return NextResponse.json(
      { error: "invalid_base_url", reason: baseUrlPolicy.reason },
      { status: 500 }
    );
  }
  if (isCrossOriginMutation(request)) {
    return NextResponse.json(
      { error: "cross_origin_request", expectedOrigin: baseUrlPolicy.origin },
      { status: 403 }
    );
  }
  try {
    seedDatabase();
    const input = loginSchema.parse(await request.json());
    const retryAfter = loginRetryAfterSeconds(input.username);
    if (retryAfter) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
    const user = getSqlite()
      .prepare("SELECT id, password_hash AS passwordHash, locale FROM users WHERE username = ?")
      .get(input.username) as { id: number; passwordHash: string; locale: string } | undefined;
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      const nextRetryAfter = recordLoginFailure(input.username);
      if (nextRetryAfter) {
        return NextResponse.json(
          { error: "rate_limited" },
          { status: 429, headers: { "Retry-After": String(nextRetryAfter) } }
        );
      }
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    clearLoginFailures(input.username);
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, createSession(user.id));
    response.cookies.set("tailor_locale", normalizeLocale(user.locale) ?? defaultLocale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
