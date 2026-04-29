import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { idParamSchema } from "@/lib/schemas/common";
import { tagSchema } from "@/lib/schemas/items";
import { nowIso } from "@/lib/time";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    const input = tagSchema.parse(await request.json());
    getSqlite()
      .prepare("UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .run(input.name, input.color ?? null, nowIso(), id, user.id);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    getSqlite().prepare("DELETE FROM tags WHERE id = ? AND user_id = ?").run(id, user.id);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
