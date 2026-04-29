import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { idParamSchema } from "@/lib/schemas/common";
import { clothSchema } from "@/lib/schemas/items";
import { deleteItem, getItem, updateItem } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    return ok({ item: getItem("cloths", user.id, id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    return ok({ item: updateItem("cloths", user.id, id, clothSchema.parse(await request.json())) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    return ok(deleteItem("cloths", user.id, id));
  } catch (error) {
    return handleApiError(error);
  }
}
