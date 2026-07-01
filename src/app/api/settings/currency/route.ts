import { type NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { currencyCodes } from "@/lib/currency";
import { getSqlite } from "@/lib/db/client";
import { hasMonetaryData } from "@/lib/repository";
import { nowIso } from "@/lib/time";

const schema = z.object({
  currencyCode: z.enum(currencyCodes),
  confirmReinterpret: z.boolean().default(false)
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    if (input.currencyCode !== user.currencyCode) {
      if (hasMonetaryData(user.id) && !input.confirmReinterpret) {
        throw new ApiError(
          "currency_confirmation_required",
          409,
          "Changing currency requires confirmation that existing values will not be converted."
        );
      }
      getSqlite()
        .prepare("UPDATE users SET currency_code = ?, updated_at = ? WHERE id = ?")
        .run(input.currencyCode, nowIso(), user.id);
    }
    return ok({ ok: true, currencyCode: input.currencyCode });
  } catch (error) {
    return handleApiError(error);
  }
}
