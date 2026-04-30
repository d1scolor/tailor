import type { NextRequest } from "next/server";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { getSqlite } from "@/lib/db/client";
import { idParamSchema } from "@/lib/schemas/common";
import { calculateProjectCost } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    const project = getSqlite().prepare("SELECT 1 FROM projects WHERE id = ? AND user_id = ?").get(id, user.id);
    if (!project) throw new ApiError("not_found", 404, "Project not found.");
    return ok(calculateProjectCost(id));
  } catch (error) {
    return handleApiError(error);
  }
}
