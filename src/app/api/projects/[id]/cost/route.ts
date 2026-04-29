import type { NextRequest } from "next/server";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { handleApiError, ok } from "@/lib/api";
import { idParamSchema } from "@/lib/schemas/common";
import { calculateProjectCost, getItem } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    getItem("projects", user.id, id);
    return ok(calculateProjectCost(id));
  } catch (error) {
    return handleApiError(error);
  }
}
