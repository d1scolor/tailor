import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { projectSchema } from "@/lib/schemas/items";
import { createItem, listItems } from "@/lib/repository";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  return ok({ items: listItems("projects", user.id, request.nextUrl.searchParams) });
}

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    return ok({ item: createItem("projects", user.id, projectSchema.parse(await request.json())) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
