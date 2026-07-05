import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { summaryDisplayKeys, type SummaryDisplayKey } from "@/lib/summary-display";
import { nowIso } from "@/lib/time";

const schema = z.object({
  key: z.enum(summaryDisplayKeys),
  value: z.boolean()
});

const columnByKey: Record<SummaryDisplayKey, string> = {
  fabricUsedValue: "fabric_used_value_display",
  fabricRemainingValue: "fabric_remaining_value_display",
  projectLaborCost: "project_labor_cost_display"
};

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    getSqlite()
      .prepare(`UPDATE users SET ${columnByKey[input.key]} = ?, updated_at = ? WHERE id = ?`)
      .run(input.value ? 1 : 0, nowIso(), user.id);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
