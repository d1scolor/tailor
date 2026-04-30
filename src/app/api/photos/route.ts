import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { maxUploadMb } from "@/lib/env";
import { extensionForMime, writePhotoFiles } from "@/lib/images";
import { entityTypeSchema } from "@/lib/schemas/items";
import { nowIso } from "@/lib/time";

const uploadSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.coerce.number().int().positive(),
  setCover: z.string().optional()
});

export const runtime = "nodejs";

const tableByEntity = {
  cloth: "cloths",
  pattern: "patterns",
  material: "materials",
  project: "projects",
  tool: "tools"
} as const;

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "validation" }, { status: 400 });
    if (file.size > maxUploadMb * 1024 * 1024) return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    const ext = extensionForMime(file.type);
    if (!ext) return NextResponse.json({ error: "unsupported_media" }, { status: 415 });
    const input = uploadSchema.parse({
      entityType: form.get("entityType"),
      entityId: form.get("entityId"),
      setCover: form.get("setCover")?.toString()
    });
    const id = crypto.randomUUID();
    const db = getSqlite();
    const target = db
      .prepare(`SELECT id FROM ${tableByEntity[input.entityType]} WHERE id = ? AND user_id = ?`)
      .get(input.entityId, user.id);
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
      await writePhotoFiles(id, ext, Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: ext === "heic" || ext === "heif" ? "heic_unsupported" : "unsupported_media" }, { status: 415 });
    }
    db.transaction(() => {
      const count = db
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE entity_type = ? AND entity_id = ? AND user_id = ?")
        .get(input.entityType, input.entityId, user.id) as { count: number };
      const isCover = input.setCover === "true" || count.count === 0;
      if (isCover) {
        db.prepare("UPDATE photos SET is_cover = 0 WHERE entity_type = ? AND entity_id = ? AND user_id = ?").run(
          input.entityType,
          input.entityId,
          user.id
        );
      }
      db.prepare(
        "INSERT INTO photos (id, user_id, entity_type, entity_id, original_ext, is_cover, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, user.id, input.entityType, input.entityId, ext, isCover ? 1 : 0, count.count, nowIso());
    })();
    return ok({ id, url: `/api/photos/${id}/display` }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
