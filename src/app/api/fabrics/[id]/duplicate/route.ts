import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { duplicateItem } from "@/lib/repository";
import { idParamSchema } from "@/lib/schemas/common";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const { id } = idParamSchema.parse(await params);
    return ok({ item: duplicateItem("fabrics", user.id, id) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
