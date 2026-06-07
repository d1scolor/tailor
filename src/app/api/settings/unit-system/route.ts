import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { recomputeFabricRemaining } from "@/lib/consumption";
import { getSqlite } from "@/lib/db/client";
import { nowIso } from "@/lib/time";
import { fabricUnits, convertLength, convertWidth } from "@/lib/units";

const schema = z.object({ unitSystem: z.enum(["metric", "us"]) });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    if (input.unitSystem === user.unitSystem) return ok({ ok: true });
    const db = getSqlite();
    const nextUnits = fabricUnits(input.unitSystem);
    db.transaction(() => {
      const fabrics = db
        .prepare("SELECT id, length_total AS lengthTotal, length_remaining AS lengthRemaining, length_unit AS lengthUnit, width, width_unit AS widthUnit FROM fabrics WHERE user_id = ?")
        .all(user.id) as Array<{ id: number; lengthTotal: number; lengthRemaining: number; lengthUnit: string; width: number | null; widthUnit: string | null }>;

      for (const fabric of fabrics) {
        const nextLengthTotal = convertLength(fabric.lengthTotal, fabric.lengthUnit, nextUnits.lengthUnit);
        const nextLengthRemaining = convertLength(fabric.lengthRemaining, fabric.lengthUnit, nextUnits.lengthUnit);
        const nextWidth = convertWidth(fabric.width, fabric.widthUnit, nextUnits.widthUnit);
        db.prepare("UPDATE fabrics SET length_total = ?, length_remaining = ?, length_unit = ?, width = ?, width_unit = ?, updated_at = ? WHERE id = ?").run(
          nextLengthTotal,
          nextLengthRemaining,
          nextUnits.lengthUnit,
          nextWidth,
          nextUnits.widthUnit,
          nowIso(),
          fabric.id
        );
        const links = db.prepare("SELECT id, length_used AS lengthUsed FROM project_fabrics WHERE fabric_id = ?").all(fabric.id) as Array<{
          id: number;
          lengthUsed: number;
        }>;
        for (const link of links) {
          db.prepare("UPDATE project_fabrics SET length_used = ? WHERE id = ?").run(
            convertLength(link.lengthUsed, fabric.lengthUnit, nextUnits.lengthUnit),
            link.id
          );
        }
        recomputeFabricRemaining(db, [fabric.id]);
      }
      db.prepare("UPDATE users SET unit_system = ?, updated_at = ? WHERE id = ?").run(input.unitSystem, nowIso(), user.id);
    })();
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
