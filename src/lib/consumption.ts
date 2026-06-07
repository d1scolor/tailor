import type Database from "better-sqlite3";
import { ApiError } from "@/lib/api";
import { nowIso } from "@/lib/time";

type ProjectInput = {
  patternIds?: number[];
  fabrics?: Array<{ fabricId: number; lengthUsed: number }>;
  materials?: Array<{ materialId: number }>;
};

export function applyProjectLinks(db: Database.Database, projectId: number, userId: number, input: ProjectInput) {
  const fabricLinks = groupLinks(input.fabrics ?? [], "fabricId", "lengthUsed");
  for (const link of fabricLinks) {
    validateFabricUse(db, link.fabricId, userId, link.lengthUsed);
    db.prepare(
      "INSERT INTO project_fabrics (project_id, fabric_id, length_used, created_at) VALUES (?, ?, ?, ?)"
    ).run(projectId, link.fabricId, link.lengthUsed, nowIso());
  }
  recomputeFabricRemaining(db, fabricLinks.map((link) => link.fabricId));

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
  const fabrics = db.prepare("SELECT DISTINCT fabric_id AS fabricId FROM project_fabrics WHERE project_id = ?").all(projectId) as Array<{
    fabricId: number;
  }>;

  db.prepare("DELETE FROM project_fabrics WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM project_patterns WHERE project_id = ?").run(projectId);
  db.prepare("DELETE FROM project_materials WHERE project_id = ?").run(projectId);
  recomputeFabricRemaining(db, fabrics.map((link) => link.fabricId));
}

export function validateFabricUse(db: Database.Database, fabricId: number, userId: number, lengthUsed: number) {
  if (lengthUsed <= 0) throw new ApiError("invalid_consumption", 409, "Length used must be positive.");
  const fabric = db
    .prepare(
      `SELECT length_total AS lengthTotal,
        COALESCE((SELECT SUM(length_used) FROM project_fabrics WHERE fabric_id = fabrics.id), 0) AS usedLength
       FROM fabrics WHERE id = ? AND user_id = ?`
    )
    .get(fabricId, userId) as { lengthTotal: number; usedLength: number } | undefined;
  if (!fabric) throw new ApiError("fabric_not_found", 404, "Fabric not found.");
  if (lengthUsed > fabric.lengthTotal - fabric.usedLength) {
    throw new ApiError("insufficient_fabric", 409, "The fabric does not have enough length remaining.");
  }
}

export function recomputeFabricRemaining(db: Database.Database, fabricIds: number[]) {
  for (const fabricId of uniqueIds(fabricIds)) {
    db.prepare(
      `UPDATE fabrics
       SET length_remaining = MAX(length_total - COALESCE((SELECT SUM(length_used) FROM project_fabrics WHERE fabric_id = fabrics.id), 0), 0),
           updated_at = ?
       WHERE id = ?`
    ).run(nowIso(), fabricId);
  }
}
