import type { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { deletePhotoFiles } from "@/lib/images";

const patchSchema = z.object({
  sortOrder: z.coerce.number().int().min(0).optional(),
  isCover: z.boolean().optional()
});

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = await params;
    const input = patchSchema.parse(await request.json());
    const db = getSqlite();
    db.transaction(() => {
      const photo = db.prepare("SELECT entity_type AS entityType, entity_id AS entityId FROM photos WHERE id = ? AND user_id = ?").get(id, user.id) as
        | { entityType: string; entityId: number }
        | undefined;
      if (!photo) return;
      if (input.isCover) {
        db.prepare("UPDATE photos SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND user_id = ?").run(
          photo.entityType,
          photo.entityId,
          user.id
        );
      }
      db.prepare("UPDATE photos SET sort_order = COALESCE(?, sort_order), is_cover = COALESCE(?, is_cover) WHERE id = ? AND user_id = ?").run(
        input.sortOrder ?? null,
        input.isCover === undefined ? null : input.isCover ? 1 : 0,
        id,
        user.id
      );
    })();
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  const { id } = await params;
  const db = getSqlite();
  const photo = db.prepare(
    "SELECT original_ext AS originalExt, entity_type AS entityType, entity_id AS entityId, is_cover AS isCover FROM photos WHERE id = ? AND user_id = ?"
  ).get(id, user.id) as { originalExt: string; entityType: string; entityId: number; isCover: number } | undefined;
  if (!photo) return ok({ ok: true });
  db.transaction(() => {
    db.prepare("DELETE FROM photos WHERE id = ? AND user_id = ?").run(id, user.id);
    if (photo.isCover) {
      const next = db
        .prepare("SELECT id FROM photos WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order, created_at LIMIT 1")
        .get(photo.entityType, photo.entityId) as { id: string } | undefined;
      if (next) db.prepare("UPDATE photos SET is_cover = 1 WHERE id = ?").run(next.id);
    }
  })();
  await deletePhotoFiles(id, photo.originalExt);
  return ok({ ok: true });
}
