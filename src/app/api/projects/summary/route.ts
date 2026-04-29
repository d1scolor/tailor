import type { NextRequest } from "next/server";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { ok } from "@/lib/api";
import { summary } from "@/lib/repository";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  return ok(summary("projects", user.id));
}
