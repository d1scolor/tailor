import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie, deleteSession, requireAuthFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  deleteSession(user.sessionId);
  const next = NextResponse.json({ ok: true });
  clearSessionCookie(next);
  return next;
}
