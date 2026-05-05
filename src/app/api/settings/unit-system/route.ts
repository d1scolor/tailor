import { type NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { recomputeClothRemaining } from "@/lib/consumption";
import { getSqlite } from "@/lib/db/client";
import { nowIso } from "@/lib/time";
import { clothUnits, convertLength, convertWidth } from "@/lib/units";

const schema = z.object({ unitSystem: z.enum(["metric", "us"]) });

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const input = schema.parse(await request.json());
    if (input.unitSystem === user.unitSystem) return ok({ ok: true });
    const db = getSqlite();
    const nextUnits = clothUnits(input.unitSystem);
    db.transaction(() => {
      const cloths = db
        .prepare("SELECT id, length_total AS lengthTotal, length_remaining AS lengthRemaining, length_unit AS lengthUnit, width, width_unit AS widthUnit FROM cloths WHERE user_id = ?")
        .all(user.id) as Array<{ id: number; lengthTotal: number; lengthRemaining: number; lengthUnit: string; width: number | null; widthUnit: string | null }>;

      for (const cloth of cloths) {
        const nextLengthTotal = convertLength(cloth.lengthTotal, cloth.lengthUnit, nextUnits.lengthUnit);
        const nextLengthRemaining = convertLength(cloth.lengthRemaining, cloth.lengthUnit, nextUnits.lengthUnit);
        const nextWidth = convertWidth(cloth.width, cloth.widthUnit, nextUnits.widthUnit);
        db.prepare("UPDATE cloths SET length_total = ?, length_remaining = ?, length_unit = ?, width = ?, width_unit = ?, updated_at = ? WHERE id = ?").run(
          nextLengthTotal,
          nextLengthRemaining,
          nextUnits.lengthUnit,
          nextWidth,
          nextUnits.widthUnit,
          nowIso(),
          cloth.id
        );
        const links = db.prepare("SELECT id, length_used AS lengthUsed FROM project_cloths WHERE cloth_id = ?").all(cloth.id) as Array<{
          id: number;
          lengthUsed: number;
        }>;
        for (const link of links) {
          db.prepare("UPDATE project_cloths SET length_used = ? WHERE id = ?").run(
            convertLength(link.lengthUsed, cloth.lengthUnit, nextUnits.lengthUnit),
            link.id
          );
        }
        recomputeClothRemaining(db, [cloth.id]);
      }
      db.prepare("UPDATE users SET unit_system = ?, updated_at = ? WHERE id = ?").run(input.unitSystem, nowIso(), user.id);
    })();
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
