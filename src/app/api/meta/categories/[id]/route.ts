import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { idParamSchema } from "@/lib/schemas/common";
import { metaUpdateSchema } from "@/lib/schemas/items";
import { archiveMeta, updateMeta } from "@/lib/repository";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    const input = metaUpdateSchema.parse(await request.json());
    return ok({ item: updateMeta("material_categories", user.id, id, input) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    return ok({ item: archiveMeta("material_categories", user.id, id) });
  } catch (error) {
    return handleApiError(error);
  }
}
