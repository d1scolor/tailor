import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { nowIso } from "@/lib/time";

const schema = z.object({ locale: z.enum(["en", "zh"]) });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    getSqlite().prepare("UPDATE users SET locale = ?, updated_at = ? WHERE id = ?").run(input.locale, nowIso(), user.id);
    const next = NextResponse.json({ ok: true });
    next.cookies.set("tailor_locale", input.locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return next;
  } catch (error) {
    return handleApiError(error);
  }
}
