import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { inventoryPageSizeValues } from "@/lib/pagination";
import { nowIso } from "@/lib/time";

const schema = z.object({
  pageSize: z.enum(inventoryPageSizeValues)
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    getSqlite()
      .prepare("UPDATE users SET inventory_page_size = ?, updated_at = ? WHERE id = ?")
      .run(input.pageSize, nowIso(), user.id);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
