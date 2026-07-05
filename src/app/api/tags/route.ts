import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { entityTypeSchema, tagCreateSchema } from "@/lib/schemas/items";
import { createTag, listTags } from "@/lib/repository";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const rawEntityType = request.nextUrl.searchParams.get("entityType");
    const entityType = rawEntityType ? entityTypeSchema.parse(rawEntityType) : undefined;
    return ok({ items: listTags(user.id, entityType) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = tagCreateSchema.parse(await request.json());
    return ok({ item: createTag(user.id, input) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
