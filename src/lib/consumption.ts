import type Database from "better-sqlite3";
import { ApiError } from "@/lib/api";
import { nowIso } from "@/lib/time";

type ProjectInput = {
  patternIds?: number[];
  cloths?: Array<{ clothId: number; lengthUsed: number }>;
  materials?: Array<{ materialId: number }>;
};

export function applyProjectLinks(db: Database.Database, projectId: number, userId: number, input: ProjectInput) {
  const clothLinks = groupLinks(input.cloths ?? [], "clothId", "lengthUsed");
  for (const link of clothLinks) {
    validateClothUse(db, link.clothId, userId, link.lengthUsed);
    db.prepare(
      "INSERT INTO project_cloths (project_id, cloth_id, length_used, created_at) VALUES (?, ?, ?, ?)"
    ).run(projectId, link.clothId, link.lengthUsed, nowIso());
  }
  recomputeClothRemaining(db, clothLinks.map((link) => link.clothId));

  for (const patternId of input.patternIds ?? []) {
    const pattern = db.prepare("SELECT id FROM patterns WHERE id = ? AND user_id = ?").get(patternId, userId);
    if (!pattern) throw new ApiError("pattern_not_found", 404, "Pattern not found.");
    db.prepare("INSERT OR IGNORE INTO project_patterns (project_id, pattern_id) VALUES (?, ?)").run(
      projectId,
      patternId
    );
  }

  for (const materialId of uniqueIds(input.materials?.map((link) => link.materialId) ?? [])) {
    const material = db.prepare("SELECT id FROM materials WHERE id = ? AND user_id = ?").get(materialId, userId);
    if (!material) throw new ApiError("material_not_found", 404, "Material not found.");
    db.prepare("INSERT OR IGNORE INTO project_materials (project_id, material_id) VALUES (?, ?)").run(projectId, materialId);
  }
}

function groupLinks<TIdKey extends string, TAmountKey extends string>(
  links: Array<Record<TIdKey | TAmountKey, number>>,
  idKey: TIdKey,
  amountKey: TAmountKey
) {
  const grouped = new Map<number, number>();
  for (const link of links) {
    const id = link[idKey];
    const amount = link[amountKey];
    if (!Number.isFinite(id) || !Number.isFinite(amount) || amount <= 0) continue;
    grouped.set(id, (grouped.get(id) ?? 0) + amount);
  }
  return [...grouped.entries()].map(([id, amount]) => ({ [idKey]: id, [amountKey]: amount }) as Record<TIdKey | TAmountKey, number>);
}

function uniqueIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

export function restoreProjectLinks(db: Database.Database, projectId: number) {
  const cloths = db.prepare("SELECT DISTINCT cloth_id AS clothId FROM project_cloths WHERE project_id = ?").all(projectId) as Array<{
    clothId: number;
  }>;

  db.prepare("DELETE FROM project_cloths WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM project_patterns WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM project_materials WHERE project_id = ?").run(projectId);
  recomputeClothRemaining(db, cloths.map((link) => link.clothId));
}

export function validateClothUse(db: Database.Database, clothId: number, userId: number, lengthUsed: number) {
  if (lengthUsed <= 0) throw new ApiError("invalid_consumption", 409, "Length used must be positive.");
  const cloth = db
    .prepare(
      `SELECT length_total AS lengthTotal,
        COALESCE((SELECT SUM(length_used) FROM project_cloths WHERE cloth_id = cloths.id), 0) AS usedLength
       FROM cloths WHERE id = ? AND user_id = ?`
    )
    .get(clothId, userId) as { lengthTotal: number; usedLength: number } | undefined;
  if (!cloth) throw new ApiError("cloth_not_found", 404, "Cloth not found.");
  if (lengthUsed > cloth.lengthTotal - cloth.usedLength) {
    throw new ApiError("insufficient_cloth", 409, "The cloth does not have enough length remaining.");
  }
}

export function recomputeClothRemaining(db: Database.Database, clothIds: number[]) {
  for (const clothId of uniqueIds(clothIds)) {
    db.prepare(
      `UPDATE cloths
       SET length_remaining = MAX(length_total - COALESCE((SELECT SUM(length_used) FROM project_cloths WHERE cloth_id = cloths.id), 0), 0),
           updated_at = ?
       WHERE id = ?`
    ).run(nowIso(), clothId);
  }
}
