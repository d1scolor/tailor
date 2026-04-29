import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { tagSchema } from "@/lib/schemas/items";
import { listTags } from "@/lib/repository";
import { nowIso } from "@/lib/time";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  return ok({ items: listTags(user.id) });
}

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = tagSchema.parse(await request.json());
    const now = nowIso();
    const result = getSqlite()
      .prepare("INSERT INTO tags (user_id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(user.id, input.name, input.color ?? null, now, now);
    return ok({ item: { id: result.lastInsertRowid, ...input } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
