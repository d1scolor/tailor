import crypto from "node:crypto";
import { ApiError } from "@/lib/api";
import { getSqlite } from "@/lib/db/client";
import { lengthToMetres } from "@/lib/format";
import { copyPhotoFilesSync, deletePhotoFilesSync } from "@/lib/images";
import { applyProjectLinks, recomputeClothRemaining, restoreProjectLinks } from "@/lib/consumption";
import { nowIso } from "@/lib/time";
import { clothUnits, convertLength, normalizeUnitSystem } from "@/lib/units";

export type Kind = "cloths" | "patterns" | "materials" | "projects" | "tools";
export type EntityType = "cloth" | "pattern" | "material" | "project" | "tool";
export type DuplicableKind = Exclude<Kind, "projects">;

const entityByKind: Record<Kind, EntityType> = {
  cloths: "cloth",
  patterns: "pattern",
  materials: "material",
  projects: "project",
  tools: "tool"
};

const clothRemainingMetresSort =
  "CASE length_unit WHEN 'cm' THEN length_remaining / 100.0 WHEN 'yd' THEN length_remaining * 0.9144 ELSE length_remaining END";
const clothAreaUnitPriceSort =
  "CASE WHEN length_total > 0 AND width > 0 AND quantity > 0 THEN price_cents / (length_total * (width / CASE length_unit WHEN 'yd' THEN 36.0 ELSE 100.0 END) * quantity) ELSE NULL END";

const sortColumns: Record<Kind, Record<string, string>> = {
  cloths: {
    name: "name",
    created: "created_at",
    purchased: "purchased_at",
    price: "price_cents",
    unitPrice: clothAreaUnitPriceSort,
    unitPriceSize: clothAreaUnitPriceSort,
    unitPriceLength: "CASE WHEN length_total > 0 AND quantity > 0 THEN price_cents / (length_total * quantity) ELSE NULL END",
    remaining: clothRemainingMetresSort,
    remainingMetres: clothRemainingMetresSort
  },
  patterns: {
    name: "name",
    created: "created_at",
    purchased: "purchased_at",
    price: "price_cents",
    unitPrice: "CASE WHEN pieces > 0 THEN price_cents / pieces ELSE price_cents END"
  },
  materials: {
    name: "name",
    created: "created_at",
    purchased: "purchased_at",
    price: "price_cents",
    unitPrice: "CASE WHEN quantity_total > 0 THEN price_cents / quantity_total ELSE NULL END",
    remaining: "quantity_remaining"
  },
  projects: {
    name: "name",
    created: "created_at",
    price: "price_cents",
    value: "value_cents",
    unitPrice: "CASE WHEN quantity > 0 THEN value_cents / quantity ELSE NULL END"
  },
  tools: {
    name: "name",
    created: "created_at",
    purchased: "purchased_at",
    price: "price_cents",
    quantity: "quantity",
    unitPrice: "CASE WHEN quantity > 0 THEN price_cents / quantity ELSE NULL END"
  }
};

export function listItems(kind: Kind, userId: number, params: URLSearchParams) {
  const db = getSqlite();
  const entityType = entityByKind[kind];
  const clauses = [`${kind}.user_id = ?`];
  const args: unknown[] = [userId];
  const q = params.get("q")?.trim();
  if (q) {
    clauses.push(`${kind}.name LIKE ? ESCAPE '\\'`);
    args.push(`%${escapeLike(q)}%`);
  }
  const source = params.get("source")?.trim();
  if (source && kind !== "projects") {
    clauses.push(`${kind}.source LIKE ? ESCAPE '\\'`);
    args.push(`%${escapeLike(source)}%`);
  }
  const color = normalizeColor(params.get("color"));
  if (color && (kind === "cloths" || kind === "materials")) {
    clauses.push(`${kind}.colors LIKE ?`);
    args.push(`%"${color}"%`);
  }
  if (color && kind === "projects") {
    clauses.push(
      `(EXISTS (SELECT 1 FROM project_cloths pc JOIN cloths c ON c.id = pc.cloth_id WHERE pc.project_id = projects.id AND c.colors LIKE ?)
        OR EXISTS (SELECT 1 FROM project_materials pm JOIN materials m ON m.id = pm.material_id WHERE pm.project_id = projects.id AND m.colors LIKE ?))`
    );
    args.push(`%"${color}"%`, `%"${color}"%`);
  }
  if (kind === "cloths" && params.get("purpose")) {
    clauses.push("purpose = ?");
    args.push(params.get("purpose"));
  }
  if (kind === "cloths" && params.get("materialType")) {
    clauses.push("material_type = ?");
    args.push(params.get("materialType"));
  }
  if (kind === "patterns" && params.get("patternType")) {
    clauses.push("pattern_type = ?");
    args.push(params.get("patternType"));
  }
  if (kind === "patterns" && params.get("difficulty")) {
    clauses.push("difficulty = ?");
    args.push(params.get("difficulty"));
  }
  if (kind === "tools" && params.get("category")) {
    clauses.push("category = ?");
    args.push(params.get("category"));
  }
  if (kind === "tools" && params.get("condition")) {
    clauses.push("condition = ?");
    args.push(params.get("condition"));
  }
  const tags = parseIds(params.get("tags"));
  if (tags.length) {
    clauses.push(
      `EXISTS (SELECT 1 FROM entity_tags et WHERE et.entity_type = ? AND et.entity_id = ${kind}.id AND et.tag_id IN (${tags
        .map(() => "?")
        .join(",")}))`
    );
    args.push(entityType, ...tags);
  }
  if (params.get("from")) {
    clauses.push(`${kind}.purchased_at >= ?`);
    args.push(params.get("from"));
  }
  if (params.get("to")) {
    clauses.push(`${kind}.purchased_at <= ?`);
    args.push(params.get("to"));
  }
  if (kind === "cloths" && params.get("hasStockLeft") === "true") clauses.push("length_remaining > 0");
  if (kind === "cloths" && params.get("used")) {
    clauses.push(params.get("used") === "true" ? "length_remaining < length_total" : "length_remaining = length_total");
  }
  if (kind === "patterns" && params.get("used")) {
    clauses.push(
      params.get("used") === "true"
        ? "EXISTS (SELECT 1 FROM project_patterns pp WHERE pp.pattern_id = patterns.id)"
        : "NOT EXISTS (SELECT 1 FROM project_patterns pp WHERE pp.pattern_id = patterns.id)"
    );
  }
  if (kind === "materials" && params.get("used")) {
    clauses.push(params.get("used") === "true" ? "usage_status = 'used'" : "usage_status = 'available'");
  }
  if (kind === "materials" && params.get("categoryId")) {
    clauses.push("category_id = ?");
    args.push(Number(params.get("categoryId")));
  }
  if (kind === "materials" && params.get("unitId")) {
    clauses.push("unit_id = ?");
    args.push(Number(params.get("unitId")));
  }
  if (kind === "projects" && params.get("patternId")) {
    clauses.push("EXISTS (SELECT 1 FROM project_patterns pp WHERE pp.project_id = projects.id AND pp.pattern_id = ?)");
    args.push(Number(params.get("patternId")));
  }
  if (kind === "projects" && params.get("clothId")) {
    clauses.push("EXISTS (SELECT 1 FROM project_cloths pc WHERE pc.project_id = projects.id AND pc.cloth_id = ?)");
    args.push(Number(params.get("clothId")));
  }
  if (kind === "projects" && params.get("materialId")) {
    clauses.push("EXISTS (SELECT 1 FROM project_materials pm WHERE pm.project_id = projects.id AND pm.material_id = ?)");
    args.push(Number(params.get("materialId")));
  }

  const sort = sortColumns[kind][params.get("sort") ?? "created"] ?? "created_at";
  const dir = params.get("dir") === "asc" ? "ASC" : "DESC";
  const rows = db.prepare(`SELECT * FROM ${kind} WHERE ${clauses.join(" AND ")} ORDER BY ${sort} ${dir}`).all(...args) as Array<
    Record<string, unknown>
  >;
  return withExtrasForRows(rows, entityType);
}

export function getItem(kind: Kind, userId: number, id: number) {
  const db = getSqlite();
  const row = db.prepare(`SELECT * FROM ${kind} WHERE user_id = ? AND id = ?`).get(userId, id) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new ApiError("not_found", 404, "Item not found.");
  return withDetails(withExtras(row, entityByKind[kind]), kind);
}

export function createItem(kind: Kind, userId: number, input: Record<string, unknown>) {
  const db = getSqlite();
  const now = nowIso();
  return db.transaction(() => {
    let id: number;
    if (kind === "cloths") {
      const result = db
        .prepare(
          `INSERT INTO cloths
          (user_id, name, quantity, length_total, length_remaining, length_unit, width, width_unit, colors, purpose, material_type, source, price_cents, purchased_at, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.quantity,
          input.lengthTotal,
          input.lengthTotal,
          input.lengthUnit,
          input.width,
          input.widthUnit,
          encodeColors(input.colors),
          input.purpose,
          input.materialType,
          input.source,
          input.priceCents,
          input.purchasedAt,
          input.remarks,
          now,
          now
        );
      id = Number(result.lastInsertRowid);
    } else if (kind === "patterns") {
      const result = db
        .prepare(
          `INSERT INTO patterns
          (user_id, name, pattern_type, difficulty, pattern_for, size, pieces, source, price_cents, purchased_at, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.patternType,
          input.difficulty,
          input.patternFor,
          input.size,
          input.pieces,
          input.source,
          input.priceCents,
          input.purchasedAt,
          input.remarks,
          now,
          now
        );
      id = Number(result.lastInsertRowid);
    } else if (kind === "materials") {
      const usageStatus = input.usageStatus === "used" ? "used" : "available";
      const result = db
        .prepare(
          `INSERT INTO materials
          (user_id, name, category_id, unit_id, quantity_total, quantity_remaining, usage_status, colors, source, price_cents, purchased_at, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.categoryId,
          input.unitId,
          input.quantityTotal,
          usageStatus === "used" ? 0 : input.quantityTotal,
          usageStatus,
          encodeColors(input.colors),
          input.source,
          input.priceCents,
          input.purchasedAt,
          input.remarks,
          now,
          now
        );
      id = Number(result.lastInsertRowid);
    } else if (kind === "tools") {
      const result = db
        .prepare(
          `INSERT INTO tools
          (user_id, name, category, quantity, brand, model, source, price_cents, purchased_at, condition, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.category,
          input.quantity,
          input.brand,
          input.model,
          input.source,
          input.priceCents,
          input.purchasedAt,
          input.condition,
          input.remarks,
          now,
          now
        );
      id = Number(result.lastInsertRowid);
    } else {
      const result = db
        .prepare(
          `INSERT INTO projects
          (user_id, name, quantity, value_cents, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(userId, input.name, input.quantity, input.valueCents, input.remarks, now, now);
      id = Number(result.lastInsertRowid);
      applyProjectLinks(db, id, userId, input as Parameters<typeof applyProjectLinks>[3]);
    }
    setTags(entityByKind[kind], id, input.tagIds as number[] | undefined);
    return getItem(kind, userId, id);
  })();
}

export function updateItem(kind: Kind, userId: number, id: number, input: Record<string, unknown>) {
  const db = getSqlite();
  const now = nowIso();
  return db.transaction(() => {
    const existing = db.prepare(`SELECT * FROM ${kind} WHERE user_id = ? AND id = ?`).get(userId, id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) throw new ApiError("not_found", 404, "Item not found.");
    if (kind === "cloths") {
      const usedLength = (
        db.prepare("SELECT COALESCE(SUM(length_used), 0) AS usedLength FROM project_cloths WHERE cloth_id = ?").get(id) as {
          usedLength: number;
        }
      ).usedLength;
      if (Number(input.lengthTotal) < usedLength) {
        throw new ApiError("negative_remaining", 409, "Remove project consumption before reducing the total length.");
      }
      const nextRemaining = Number(input.lengthTotal) - usedLength;
      db.prepare(
        `UPDATE cloths SET name = ?, quantity = ?, length_total = ?, length_remaining = ?, length_unit = ?,
         width = ?, width_unit = ?, colors = ?, purpose = ?, material_type = ?, source = ?, price_cents = ?, purchased_at = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.quantity,
        input.lengthTotal,
        nextRemaining,
        input.lengthUnit,
        input.width,
        input.widthUnit,
        encodeColors(input.colors),
        input.purpose,
        input.materialType,
        input.source,
        input.priceCents,
        input.purchasedAt,
        input.remarks,
        now,
        id
      );
      recomputeClothRemaining(db, [id]);
    } else if (kind === "patterns") {
      db.prepare(
        `UPDATE patterns SET name = ?, pattern_type = ?, difficulty = ?, pattern_for = ?, size = ?, pieces = ?, source = ?, price_cents = ?,
         purchased_at = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.patternType,
        input.difficulty,
        input.patternFor,
        input.size,
        input.pieces,
        input.source,
        input.priceCents,
        input.purchasedAt,
        input.remarks,
        now,
        id
      );
    } else if (kind === "materials") {
      const usageStatus = input.usageStatus === "used" ? "used" : "available";
      const nextRemaining = usageStatus === "used" ? 0 : Number(input.quantityTotal);
      db.prepare(
        `UPDATE materials SET name = ?, category_id = ?, unit_id = ?, quantity_total = ?, quantity_remaining = ?, usage_status = ?,
         colors = ?, source = ?, price_cents = ?, purchased_at = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.categoryId,
        input.unitId,
        input.quantityTotal,
        nextRemaining,
        usageStatus,
        encodeColors(input.colors),
        input.source,
        input.priceCents,
        input.purchasedAt,
        input.remarks,
        now,
        id
      );
    } else if (kind === "tools") {
      db.prepare(
        `UPDATE tools SET name = ?, category = ?, quantity = ?, brand = ?, model = ?, source = ?, price_cents = ?,
         purchased_at = ?, condition = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.category,
        input.quantity,
        input.brand,
        input.model,
        input.source,
        input.priceCents,
        input.purchasedAt,
        input.condition,
        input.remarks,
        now,
        id
      );
    } else {
      restoreProjectLinks(db, id);
      db.prepare(
        `UPDATE projects SET name = ?, quantity = ?, value_cents = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(input.name, input.quantity, input.valueCents, input.remarks, now, id);
      applyProjectLinks(db, id, userId, input as Parameters<typeof applyProjectLinks>[3]);
    }
    setTags(entityByKind[kind], id, input.tagIds as number[] | undefined);
    return getItem(kind, userId, id);
  })();
}

export function duplicateItem(kind: DuplicableKind, userId: number, id: number) {
  const db = getSqlite();
  const now = nowIso();
  const copiedPhotos: Array<{ id: string; ext: string }> = [];
  try {
    return db.transaction(() => {
      const existing = db.prepare(`SELECT * FROM ${kind} WHERE user_id = ? AND id = ?`).get(userId, id) as
        | Record<string, unknown>
        | undefined;
      if (!existing) throw new ApiError("not_found", 404, "Item not found.");

      let nextId: number;
      if (kind === "cloths") {
        const result = db
          .prepare(
            `INSERT INTO cloths
            (user_id, name, quantity, length_total, length_remaining, length_unit, width, width_unit, colors, purpose, material_type, source, price_cents, purchased_at, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.quantity,
            existing.length_total,
            existing.length_total,
            existing.length_unit,
            existing.width,
            existing.width_unit,
            existing.colors,
            existing.purpose,
            existing.material_type,
            existing.source,
            existing.price_cents,
            existing.purchased_at,
            existing.remarks,
            now,
            now
          );
        nextId = Number(result.lastInsertRowid);
      } else if (kind === "patterns") {
        const result = db
          .prepare(
            `INSERT INTO patterns
            (user_id, name, pattern_type, difficulty, pattern_for, size, pieces, source, price_cents, purchased_at, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.pattern_type,
            existing.difficulty,
            existing.pattern_for,
            existing.size,
            existing.pieces,
            existing.source,
            existing.price_cents,
            existing.purchased_at,
            existing.remarks,
            now,
            now
          );
        nextId = Number(result.lastInsertRowid);
      } else if (kind === "materials") {
        const result = db
          .prepare(
            `INSERT INTO materials
            (user_id, name, category_id, unit_id, quantity_total, quantity_remaining, usage_status, colors, source, price_cents, purchased_at, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.category_id,
            existing.unit_id,
            existing.quantity_total,
            existing.quantity_remaining,
            existing.usage_status,
            existing.colors,
            existing.source,
            existing.price_cents,
            existing.purchased_at,
            existing.remarks,
            now,
            now
          );
        nextId = Number(result.lastInsertRowid);
      } else {
        const result = db
          .prepare(
            `INSERT INTO tools
            (user_id, name, category, quantity, brand, model, source, price_cents, purchased_at, condition, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.category,
            existing.quantity,
            existing.brand,
            existing.model,
            existing.source,
            existing.price_cents,
            existing.purchased_at,
            existing.condition,
            existing.remarks,
            now,
            now
          );
        nextId = Number(result.lastInsertRowid);
      }

      const entityType = entityByKind[kind];
      const tagIds = (
        db.prepare("SELECT tag_id AS tagId FROM entity_tags WHERE entity_type = ? AND entity_id = ?").all(entityType, id) as Array<{
          tagId: number;
        }>
      ).map((tag) => tag.tagId);
      setTags(entityType, nextId, tagIds);

      const photos = db
        .prepare(
          `SELECT id, original_ext AS originalExt, is_cover AS isCover, sort_order AS sortOrder
           FROM photos WHERE entity_type = ? AND entity_id = ? AND user_id = ?
           ORDER BY sort_order ASC, created_at ASC`
        )
        .all(entityType, id, userId) as Array<{ id: string; originalExt: string; isCover: number; sortOrder: number }>;
      for (const photo of photos) {
        const nextPhotoId = crypto.randomUUID();
        copyPhotoFilesSync(photo.id, nextPhotoId, photo.originalExt);
        copiedPhotos.push({ id: nextPhotoId, ext: photo.originalExt });
        db.prepare(
          "INSERT INTO photos (id, user_id, entity_type, entity_id, original_ext, is_cover, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).run(nextPhotoId, userId, entityType, nextId, photo.originalExt, photo.isCover, photo.sortOrder, now);
      }

      return getItem(kind, userId, nextId);
    })();
  } catch (error) {
    for (const photo of copiedPhotos) deletePhotoFilesSync(photo.id, photo.ext);
    throw error;
  }
}

export function deleteItem(kind: Kind, userId: number, id: number) {
  const db = getSqlite();
  const deletedPhotos = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM ${kind} WHERE user_id = ? AND id = ?`).get(userId, id);
    if (!existing) throw new ApiError("not_found", 404, "Item not found.");
    if (kind === "cloths") {
      const count = db.prepare("SELECT COUNT(*) AS count FROM project_cloths WHERE cloth_id = ?").get(id) as { count: number };
      if (count.count) throw new ApiError("linked", 409, "This cloth is used by a project.");
    }
    if (kind === "patterns") {
      const count = db.prepare("SELECT COUNT(*) AS count FROM project_patterns WHERE pattern_id = ?").get(id) as { count: number };
      if (count.count) throw new ApiError("linked", 409, "This pattern is used by a project.");
    }
    if (kind === "materials") {
      const count = db.prepare("SELECT COUNT(*) AS count FROM project_materials WHERE material_id = ?").get(id) as {
        count: number;
      };
      if (count.count) throw new ApiError("linked", 409, "This material is used by a project.");
    }
    if (kind === "projects") restoreProjectLinks(db, id);
    const photosToDelete = db
      .prepare("SELECT id, original_ext AS originalExt FROM photos WHERE entity_type = ? AND entity_id = ? AND user_id = ?")
      .all(entityByKind[kind], id, userId) as Array<{ id: string; originalExt: string }>;
    db.prepare("DELETE FROM entity_tags WHERE entity_type = ? AND entity_id = ?").run(entityByKind[kind], id);
    db.prepare("DELETE FROM photos WHERE entity_type = ? AND entity_id = ? AND user_id = ?").run(entityByKind[kind], id, userId);
    db.prepare(`DELETE FROM ${kind} WHERE id = ? AND user_id = ?`).run(id, userId);
    return photosToDelete;
  })();
  for (const photo of deletedPhotos) deletePhotoFilesSync(photo.id, photo.originalExt);
  return { ok: true };
}

export function summary(kind: Kind, userId: number, params = new URLSearchParams()) {
  const db = getSqlite();
  const filteredRows = params.toString() ? listItems(kind, userId, params) : null;
  if (kind === "cloths") {
    const user = db.prepare("SELECT unit_system AS unitSystem FROM users WHERE id = ?").get(userId) as { unitSystem?: string } | undefined;
    const units = clothUnits(normalizeUnitSystem(user?.unitSystem));
    const rows = (filteredRows ??
      db
        .prepare("SELECT price_cents AS priceCents, length_total AS lengthTotal, length_remaining AS lengthRemaining, length_unit AS lengthUnit FROM cloths WHERE user_id = ?")
        .all(userId)) as Array<{ priceCents: number | null; lengthTotal: number; lengthRemaining: number; lengthUnit: string }>;
    const usedMetres = rows.reduce(
      (sum, row) => sum + lengthToMetres(row.lengthTotal - row.lengthRemaining, row.lengthUnit),
      0
    );
    const remainingMetres = rows.reduce((sum, row) => sum + lengthToMetres(row.lengthRemaining, row.lengthUnit), 0);
    return {
      count: rows.length,
      totalCost: rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0),
      lengthUsed: convertLength(usedMetres, "m", units.lengthUnit),
      lengthRemaining: convertLength(remainingMetres, "m", units.lengthUnit),
      lengthUnit: units.lengthUnit,
      lengthUsedMetres: usedMetres,
      lengthRemainingMetres: remainingMetres
    };
  }
  if (kind === "patterns") {
    const rows = (filteredRows ??
      db
        .prepare(
          `SELECT price_cents AS priceCents, EXISTS(SELECT 1 FROM project_patterns pp WHERE pp.pattern_id = patterns.id) AS used
           FROM patterns WHERE user_id = ?`
        )
        .all(userId)) as Array<{ id: number; priceCents: number | null; used?: number }>;
    return {
      count: rows.length,
      totalCost: rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0),
      used: rows.filter((row) => row.used ?? isPatternUsed(row.id)).length,
      unused: rows.filter((row) => !(row.used ?? isPatternUsed(row.id))).length
    };
  }
  if (kind === "materials") {
    const rows = (filteredRows ??
      db
        .prepare("SELECT price_cents AS priceCents, usage_status AS usageStatus FROM materials WHERE user_id = ?")
        .all(userId)) as Array<{ priceCents: number | null; usageStatus: string }>;
    return {
      count: rows.length,
      totalCost: rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0),
      used: rows.filter((row) => row.usageStatus === "used").length,
      unused: rows.filter((row) => row.usageStatus !== "used").length
    };
  }
  if (kind === "tools") {
    const rows = (filteredRows ??
      db
        .prepare("SELECT quantity, price_cents AS priceCents, condition FROM tools WHERE user_id = ?")
        .all(userId)) as Array<{ quantity: number; priceCents: number | null; condition: string }>;
    return {
      count: rows.length,
      totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      totalCost: rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0),
      needsAttention: rows.filter((row) => row.condition === "maintenance" || row.condition === "broken").length
    };
  }
  const rows = (filteredRows ??
    db.prepare("SELECT id, quantity, value_cents AS valueCents FROM projects WHERE user_id = ?").all(userId)) as Array<{
    id: number;
    quantity: number;
    valueCents: number | null;
  }>;
  return {
    count: rows.length,
    totalValue: rows.reduce((sum, row) => sum + (row.valueCents ?? 0), 0),
    totalProduced: rows.reduce((sum, row) => sum + row.quantity, 0)
  };
}

function isPatternUsed(patternId: number) {
  const row = getSqlite().prepare("SELECT 1 FROM project_patterns WHERE pattern_id = ? LIMIT 1").get(patternId);
  return Boolean(row);
}

export function calculateProjectCost(projectId: number) {
  const db = getSqlite();
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!project) throw new ApiError("not_found", 404, "Project not found.");
  const clothCost = (
    db
      .prepare(
        `SELECT pc.length_used AS used, c.length_total AS total, c.price_cents AS price
         FROM project_cloths pc JOIN cloths c ON c.id = pc.cloth_id WHERE pc.project_id = ?`
      )
      .all(projectId) as Array<{ used: number; total: number; price: number | null }>
  ).reduce((sum, row) => sum + (row.total > 0 ? Math.round((row.used / row.total) * (row.price ?? 0)) : 0), 0);
  return { clothCost, totalCost: clothCost };
}

export function setTags(entityType: EntityType, entityId: number, tagIds?: number[]) {
  const db = getSqlite();
  db.prepare("DELETE FROM entity_tags WHERE entity_type = ? AND entity_id = ?").run(entityType, entityId);
  for (const tagId of tagIds ?? []) {
    db.prepare("INSERT OR IGNORE INTO entity_tags (entity_type, entity_id, tag_id) VALUES (?, ?, ?)").run(
      entityType,
      entityId,
      tagId
    );
  }
}

function withExtras(row: Record<string, unknown>, entityType: EntityType) {
  const db = getSqlite();
  const id = Number(row.id);
  const photos = db
    .prepare(
      "SELECT id, is_cover AS isCover, sort_order AS sortOrder FROM photos WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC, created_at ASC"
    )
    .all(entityType, id);
  const tags = db
    .prepare(
      `SELECT tags.id, tags.name, tags.color FROM tags
       JOIN entity_tags et ON et.tag_id = tags.id
       WHERE et.entity_type = ? AND et.entity_id = ? ORDER BY tags.name`
    )
    .all(entityType, id);
  const extra: Record<string, unknown> = {};
  if (entityType === "cloth" || entityType === "material") {
    extra.colors = decodeColors(row.colors);
  }
  if (entityType === "project") {
    const inherited = db
      .prepare(
        `SELECT c.colors FROM project_cloths pc
         JOIN cloths c ON c.id = pc.cloth_id
         WHERE pc.project_id = ?`
      )
      .all(id) as Array<{ colors: string | null }>;
    const materialColors = db
      .prepare(
        `SELECT m.colors FROM project_materials pm
         JOIN materials m ON m.id = pm.material_id
         WHERE pm.project_id = ?`
      )
      .all(id) as Array<{ colors: string | null }>;
    extra.colors = [...new Set([...inherited, ...materialColors].flatMap((item) => decodeColors(item.colors)))];
  }
  if (entityType === "material") {
    const material = row as Record<string, unknown>;
    if (material.category_id) {
      const category = db.prepare("SELECT name FROM material_categories WHERE id = ?").get(material.category_id) as
        | { name: string }
        | undefined;
      extra.categoryName = category?.name;
    }
    if (material.unit_id) {
      const unit = db.prepare("SELECT name FROM material_units WHERE id = ?").get(material.unit_id) as
        | { name: string }
        | undefined;
      extra.unitName = unit?.name;
    }
  }
  return { ...camelize(row), ...extra, photos, tags };
}

function withExtrasForRows(rows: Array<Record<string, unknown>>, entityType: EntityType) {
  if (!rows.length) return [];
  const db = getSqlite();
  const ids = rows.map((row) => Number(row.id));
  const placeholders = ids.map(() => "?").join(",");
  const photos = db
    .prepare(
      `SELECT entity_id AS entityId, id, is_cover AS isCover, sort_order AS sortOrder
       FROM photos
       WHERE entity_type = ? AND entity_id IN (${placeholders})
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(entityType, ...ids) as Array<{ entityId: number; id: string; isCover: number; sortOrder: number }>;
  const tags = db
    .prepare(
      `SELECT et.entity_id AS entityId, tags.id, tags.name, tags.color
       FROM tags
       JOIN entity_tags et ON et.tag_id = tags.id
       WHERE et.entity_type = ? AND et.entity_id IN (${placeholders})
       ORDER BY tags.name`
    )
    .all(entityType, ...ids) as Array<{ entityId: number; id: number; name: string; color: string | null }>;
  const photosByEntity = groupBy(photos, (photo) => photo.entityId);
  const tagsByEntity = groupBy(tags, (tag) => tag.entityId);
  const extrasByEntity = extrasForRows(db, rows, entityType, ids, placeholders);

  return rows.map((row) => {
    const id = Number(row.id);
    const extra: Record<string, unknown> = { ...(extrasByEntity.get(id) ?? {}) };
    if (entityType === "cloth" || entityType === "material") {
      extra.colors = decodeColors(row.colors);
    }
    return {
      ...camelize(row),
      ...extra,
      photos: (photosByEntity.get(id) ?? []).map((photo) => ({ id: photo.id, isCover: photo.isCover, sortOrder: photo.sortOrder })),
      tags: (tagsByEntity.get(id) ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }))
    };
  });
}

function extrasForRows(
  db: ReturnType<typeof getSqlite>,
  rows: Array<Record<string, unknown>>,
  entityType: EntityType,
  ids: number[],
  placeholders: string
) {
  const extras = new Map<number, Record<string, unknown>>();
  if (entityType === "project") {
    const clothColors = db
      .prepare(
        `SELECT pc.project_id AS projectId, c.colors
         FROM project_cloths pc
         JOIN cloths c ON c.id = pc.cloth_id
         WHERE pc.project_id IN (${placeholders})`
      )
      .all(...ids) as Array<{ projectId: number; colors: string | null }>;
    const materialColors = db
      .prepare(
        `SELECT pm.project_id AS projectId, m.colors
         FROM project_materials pm
         JOIN materials m ON m.id = pm.material_id
         WHERE pm.project_id IN (${placeholders})`
      )
      .all(...ids) as Array<{ projectId: number; colors: string | null }>;
    for (const id of ids) {
      const colors = [...clothColors, ...materialColors]
        .filter((item) => item.projectId === id)
        .flatMap((item) => decodeColors(item.colors));
      extras.set(id, { colors: [...new Set(colors)] });
    }
  }
  if (entityType === "material") {
    const categoryIds = uniqueNumericValues(rows.map((row) => row.category_id));
    const unitIds = uniqueNumericValues(rows.map((row) => row.unit_id));
    const categories = loadNameMap(db, "material_categories", categoryIds);
    const units = loadNameMap(db, "material_units", unitIds);
    for (const row of rows) {
      const id = Number(row.id);
      extras.set(id, {
        categoryName: categories.get(Number(row.category_id)),
        unitName: units.get(Number(row.unit_id))
      });
    }
  }
  return extras;
}

function groupBy<T>(items: T[], keyFor: (item: T) => number) {
  const grouped = new Map<number, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function uniqueNumericValues(values: unknown[]) {
  return [...new Set(values.map(Number).filter((value) => Number.isFinite(value) && value > 0))];
}

function loadNameMap(db: ReturnType<typeof getSqlite>, table: "material_categories" | "material_units", ids: number[]) {
  if (!ids.length) return new Map<number, string>();
  const rows = db
    .prepare(`SELECT id, name FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids) as Array<{ id: number; name: string }>;
  return new Map(rows.map((row) => [row.id, row.name]));
}

function normalizeColor(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return text && text.length <= 30 ? text : null;
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function encodeColors(value: unknown) {
  const colors = Array.isArray(value) ? value.map(normalizeColor).filter((item): item is string => Boolean(item)) : [];
  return JSON.stringify([...new Set(colors)].slice(0, 5));
}

function decodeColors(value: unknown) {
  if (Array.isArray(value)) return value.map(normalizeColor).filter((item): item is string => Boolean(item)).slice(0, 5);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeColor).filter((item): item is string => Boolean(item)).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function withDetails(row: Record<string, unknown>, kind: Kind) {
  const db = getSqlite();
  if (kind !== "projects") return row;
  const id = Number(row.id);
  return {
    ...row,
    patternIds: (db.prepare("SELECT pattern_id AS patternId FROM project_patterns WHERE project_id = ?").all(id) as Array<{
      patternId: number;
    }>).map((item) => item.patternId),
    cloths: db
      .prepare("SELECT cloth_id AS clothId, length_used AS lengthUsed FROM project_cloths WHERE project_id = ?")
      .all(id),
    materials: db
      .prepare("SELECT material_id AS materialId FROM project_materials WHERE project_id = ?")
      .all(id),
    cost: calculateProjectCost(id)
  };
}

export function listTags(userId: number) {
  return getSqlite().prepare("SELECT id, name, color FROM tags WHERE user_id = ? ORDER BY name").all(userId);
}

export function upsertMeta(table: "material_categories" | "material_units", userId: number, input: Record<string, unknown>) {
  const db = getSqlite();
  const now = nowIso();
  try {
    const result = db
      .prepare(`INSERT INTO ${table} (user_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)`)
      .run(userId, input.name, input.sortOrder ?? 0, now);
    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
  } catch (error) {
    if (isSqliteConstraint(error)) {
      throw new ApiError("duplicate_name", 409, "A value with this name already exists.");
    }
    throw error;
  }
}

export function listMeta(table: "material_categories" | "material_units", userId: number) {
  return getSqlite().prepare(`SELECT id, name, sort_order AS sortOrder FROM ${table} WHERE user_id = ? ORDER BY sort_order, name`).all(userId);
}

export function listSources(kind: Exclude<Kind, "projects">, userId: number) {
  return (
    getSqlite()
      .prepare(`SELECT DISTINCT source FROM ${kind} WHERE user_id = ? AND source IS NOT NULL AND TRIM(source) != '' ORDER BY source`)
      .all(userId) as Array<{ source: string }>
  ).map((row) => row.source);
}

export function listToolCategories(userId: number) {
  return (
    getSqlite()
      .prepare("SELECT DISTINCT category FROM tools WHERE user_id = ? AND category IS NOT NULL AND TRIM(category) != '' ORDER BY category")
      .all(userId) as Array<{ category: string }>
  ).map((row) => row.category);
}

export function listClothMaterialTypes(userId: number) {
  return (
    getSqlite()
      .prepare("SELECT DISTINCT material_type AS materialType FROM cloths WHERE user_id = ? AND material_type IS NOT NULL AND TRIM(material_type) != '' ORDER BY material_type")
      .all(userId) as Array<{ materialType: string }>
  ).map((row) => row.materialType);
}

export function listPatternTypes(userId: number) {
  return (
    getSqlite()
      .prepare("SELECT DISTINCT pattern_type AS patternType FROM patterns WHERE user_id = ? AND pattern_type IS NOT NULL AND TRIM(pattern_type) != '' ORDER BY pattern_type")
      .all(userId) as Array<{ patternType: string }>
  ).map((row) => row.patternType);
}

export function parseIds(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

function camelize(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
  }
  return out;
}

function isSqliteConstraint(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && String((error as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT");
}
