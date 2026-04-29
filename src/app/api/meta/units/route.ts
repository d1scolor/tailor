import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { metaSchema } from "@/lib/schemas/items";
import { listMeta, upsertMeta } from "@/lib/repository";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  return ok({ items: listMeta("material_units", user.id) });
}

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    return ok({ item: upsertMeta("material_units", user.id, metaSchema.parse(await request.json())) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
