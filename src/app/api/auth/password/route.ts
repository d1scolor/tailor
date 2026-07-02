import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSqlite } from "@/lib/db/client";
import { requireAuthFromRequest, deleteOtherSessions, jsonError } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { handleApiError, ok } from "@/lib/api";
import { nowIso } from "@/lib/time";

const schema = z.object({
  current: z.string().min(1).max(1024),
  next: z
    .string()
    .min(12)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72)
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    const db = getSqlite();
    const row = db.prepare("SELECT password_hash AS passwordHash FROM users WHERE id = ?").get(user.id) as {
      passwordHash: string;
    };
    if (!(await verifyPassword(input.current, row.passwordHash))) return jsonError("unauthorized", 401);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      await hashPassword(input.next),
      nowIso(),
      user.id
    );
    deleteOtherSessions(user.id, user.sessionId);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
