import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { nowIso } from "@/lib/time";
import { normalizeUnitSystem } from "@/lib/units";

const schema = z.object({ unitSystem: z.enum(["metric", "imperial", "us"]) });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    const unitSystem = normalizeUnitSystem(input.unitSystem);
    if (unitSystem !== user.unitSystem) {
      getSqlite().prepare("UPDATE users SET unit_system = ?, updated_at = ? WHERE id = ?").run(unitSystem, nowIso(), user.id);
    }
    return ok({ ok: true, unitSystem });
  } catch (error) {
    return handleApiError(error);
  }
}
