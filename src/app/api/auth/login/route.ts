import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSqlite } from "@/lib/db/client";
import { seedDatabase } from "@/lib/db/seed";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleApiError } from "@/lib/api";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    seedDatabase();
    const input = loginSchema.parse(await request.json());
    const user = getSqlite()
      .prepare("SELECT id, password_hash AS passwordHash, locale FROM users WHERE username = ?")
      .get(input.username) as { id: number; passwordHash: string; locale: "en" | "zh" } | undefined;
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, createSession(user.id));
    response.cookies.set("tailor_locale", user.locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
