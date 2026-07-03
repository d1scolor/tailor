import crypto from "node:crypto";
import { ApiError } from "@/lib/api";
import { getSqlite } from "@/lib/db/client";
import { copyPhotoFilesSync, deletePhotoFilesSync } from "@/lib/images";
import { applyProjectLinks, restoreProjectLinks } from "@/lib/consumption";
import { nowIso } from "@/lib/time";

export type Kind = "fabrics" | "patterns" | "materials" | "projects" | "tools";
export type EntityType = "fabric" | "pattern" | "material" | "project" | "tool";
export type DuplicableKind = Exclude<Kind, "projects">;
const measurementEpsilon = 1e-9;

const entityByKind: Record<Kind, EntityType> = {
  fabrics: "fabric",
  patterns: "pattern",
  materials: "material",
  projects: "project",
  tools: "tool"
};

const fabricUsedMetres =
  "COALESCE((SELECT SUM(pf.length_used_m) FROM project_fabrics pf WHERE pf.fabric_id = fabrics.id), 0)";
const fabricRemainingMetresSort = `MAX(length_total_m - ${fabricUsedMetres}, 0)`;
const fabricAreaUnitPriceSort =
  "CASE WHEN length_total_m > 0 AND width_m > 0 THEN price_cents / (length_total_m * width_m) ELSE NULL END";

const sortColumns: Record<Kind, Record<string, string>> = {
  fabrics: {
    name: "name",
    created: "created_at",
    purchased: "purchased_at",
    price: "price_cents",
    unitPrice: fabricAreaUnitPriceSort,
    unitPriceSize: fabricAreaUnitPriceSort,
    unitPriceLength: "CASE WHEN length_total_m > 0 THEN price_cents / length_total_m ELSE NULL END",
    remaining: fabricRemainingMetresSort,
    remainingMetres: fabricRemainingMetresSort
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
    unitPrice: "CASE WHEN quantity_total_canonical > 0 THEN price_cents / quantity_total_canonical ELSE NULL END",
    remaining: "CASE WHEN usage_status = 'used' THEN 0 WHEN usage_status = 'partial' THEN NULL ELSE quantity_total_canonical END"
  },
  projects: {
    name: "name",
    created: "created_at",
    price: "value_cents",
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
  if (color && (kind === "fabrics" || kind === "materials")) {
    clauses.push(`${kind}.colors LIKE ?`);
    args.push(`%"${color}"%`);
  }
  if (color && kind === "projects") {
    clauses.push(
      `(EXISTS (SELECT 1 FROM project_fabrics pc JOIN fabrics c ON c.id = pc.fabric_id WHERE pc.project_id = projects.id AND c.colors LIKE ?)
        OR EXISTS (SELECT 1 FROM project_materials pm JOIN materials m ON m.id = pm.material_id WHERE pm.project_id = projects.id AND m.colors LIKE ?))`
    );
    args.push(`%"${color}"%`, `%"${color}"%`);
  }
  if (kind === "fabrics" && params.get("purpose")) {
    clauses.push("purpose = ?");
    args.push(params.get("purpose"));
  }
  if (kind === "fabrics" && params.get("materialType")) {
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
  const tagClauses: string[] = [];
  const tagArgs: unknown[] = [];
  if (tags.length) {
    const placeholders = tags.map(() => "?").join(",");
    if (params.get("tagMatch") === "all" && tags.length > 1) {
      tagClauses.push(
        `(SELECT COUNT(DISTINCT et.tag_id) FROM entity_tags et
          WHERE et.entity_type = ? AND et.entity_id = ${kind}.id AND et.tag_id IN (${placeholders})) = ?`
      );
      tagArgs.push(entityType, ...tags, tags.length);
    } else {
      tagClauses.push(
        `EXISTS (SELECT 1 FROM entity_tags et
          WHERE et.entity_type = ? AND et.entity_id = ${kind}.id AND et.tag_id IN (${placeholders}))`
      );
      tagArgs.push(entityType, ...tags);
    }
  }
  if (params.get("untagged") === "true") {
    tagClauses.push(
      `NOT EXISTS (SELECT 1 FROM entity_tags et WHERE et.entity_type = ? AND et.entity_id = ${kind}.id)`
    );
    tagArgs.push(entityType);
  }
  if (tagClauses.length) {
    clauses.push(`(${tagClauses.join(" OR ")})`);
    args.push(...tagArgs);
  }
  if (params.get("from")) {
    clauses.push(`${kind}.purchased_at >= ?`);
    args.push(params.get("from"));
  }
  if (params.get("to")) {
    clauses.push(`${kind}.purchased_at <= ?`);
    args.push(params.get("to"));
  }
  if (kind === "fabrics" && params.get("excludeUsedUp") === "true") clauses.push(`${fabricRemainingMetresSort} > 0`);
  if (kind === "fabrics" && params.get("used")) {
    clauses.push(params.get("used") === "true" ? `${fabricUsedMetres} > 0` : `${fabricUsedMetres} = 0`);
  }
  if (kind === "patterns" && params.get("used")) {
    clauses.push(
      params.get("used") === "true"
        ? "EXISTS (SELECT 1 FROM project_patterns pp WHERE pp.pattern_id = patterns.id)"
        : "NOT EXISTS (SELECT 1 FROM project_patterns pp WHERE pp.pattern_id = patterns.id)"
    );
  }
  if (kind === "materials" && params.get("used")) {
    clauses.push(params.get("used") === "true" ? "usage_status != 'available'" : "usage_status = 'available'");
  }
  if (kind === "materials" && params.get("excludeUsedUp") === "true") {
    clauses.push("usage_status != 'used' AND quantity_total_canonical > 0");
  }
  if ((kind === "fabrics" || kind === "materials") && params.has("usageStatuses")) {
    const statuses = new Set(
      (params.get("usageStatuses") ?? "")
        .split(",")
        .filter((status) => status === "unused" || status === "partial" || status === "usedUp")
    );
    const usageClauses: string[] = [];
    if (kind === "fabrics") {
      if (statuses.has("unused")) {
        usageClauses.push(`(${fabricUsedMetres} <= ${measurementEpsilon} AND ${fabricRemainingMetresSort} > ${measurementEpsilon})`);
      }
      if (statuses.has("partial")) {
        usageClauses.push(`(${fabricUsedMetres} > ${measurementEpsilon} AND ${fabricRemainingMetresSort} > ${measurementEpsilon})`);
      }
      if (statuses.has("usedUp")) usageClauses.push(`${fabricRemainingMetresSort} <= ${measurementEpsilon}`);
    } else {
      if (statuses.has("unused")) usageClauses.push("usage_status = 'available'");
      if (statuses.has("partial")) usageClauses.push("usage_status = 'partial'");
      if (statuses.has("usedUp")) usageClauses.push("usage_status = 'used'");
    }
    clauses.push(usageClauses.length ? `(${usageClauses.join(" OR ")})` : "0");
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
  if (kind === "projects" && params.get("fabricId")) {
    clauses.push("EXISTS (SELECT 1 FROM project_fabrics pc WHERE pc.project_id = projects.id AND pc.fabric_id = ?)");
    args.push(Number(params.get("fabricId")));
  }
  if (kind === "projects" && params.get("materialId")) {
    clauses.push("EXISTS (SELECT 1 FROM project_materials pm WHERE pm.project_id = projects.id AND pm.material_id = ?)");
    args.push(Number(params.get("materialId")));
  }

  const sort = sortColumns[kind][params.get("sort") ?? "created"] ?? "created_at";
  const dir = params.get("dir") === "asc" ? "ASC" : "DESC";
  const projection =
    kind === "fabrics"
      ? `fabrics.*, ${fabricRemainingMetresSort} AS length_remaining_m`
      : kind === "materials"
        ? "materials.*, CASE WHEN usage_status = 'used' THEN 0 WHEN usage_status = 'partial' THEN NULL ELSE quantity_total_canonical END AS quantity_remaining_canonical"
        : `${kind}.*`;
  const rows = db.prepare(`SELECT ${projection} FROM ${kind} WHERE ${clauses.join(" AND ")} ORDER BY ${sort} ${dir}`).all(...args) as Array<
    Record<string, unknown>
  >;
  return withExtrasForRows(rows, entityType);
}

export function getItem(kind: Kind, userId: number, id: number) {
  const db = getSqlite();
  const projection =
    kind === "fabrics"
      ? `fabrics.*, ${fabricRemainingMetresSort} AS length_remaining_m`
      : kind === "materials"
        ? "materials.*, CASE WHEN usage_status = 'used' THEN 0 WHEN usage_status = 'partial' THEN NULL ELSE quantity_total_canonical END AS quantity_remaining_canonical"
        : `${kind}.*`;
  const row = db.prepare(`SELECT ${projection} FROM ${kind} WHERE user_id = ? AND id = ?`).get(userId, id) as
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
    if (kind === "fabrics") {
      const result = db
        .prepare(
          `INSERT INTO fabrics
          (user_id, name, quantity, length_total_m, width_m, colors, purpose, material_type, source, price_cents, purchased_at, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.quantity,
          input.lengthTotalM,
          input.widthM,
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
      const usageStatus = input.usageStatus === "used" || input.usageStatus === "partial" ? input.usageStatus : "available";
      validateMetaReference(db, "material_units", userId, Number(input.unitId));
      if (input.categoryId) validateMetaReference(db, "material_categories", userId, Number(input.categoryId));
      const result = db
        .prepare(
          `INSERT INTO materials
          (user_id, name, category_id, unit_id, quantity_total_canonical, usage_status, colors, source, price_cents, purchased_at, remarks, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          input.name,
          input.categoryId,
          input.unitId,
          input.quantityTotalCanonical,
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
    if (kind === "fabrics") {
      const usedLength = (
        db.prepare("SELECT COALESCE(SUM(length_used_m), 0) AS usedLength FROM project_fabrics WHERE fabric_id = ?").get(id) as {
          usedLength: number;
        }
      ).usedLength;
      if (usedLength - Number(input.lengthTotalM) > measurementEpsilon) {
        throw new ApiError("negative_remaining", 409, "Remove project consumption before reducing the total length.");
      }
      db.prepare(
        `UPDATE fabrics SET name = ?, quantity = ?, length_total_m = ?, width_m = ?, colors = ?, purpose = ?,
         material_type = ?, source = ?, price_cents = ?, purchased_at = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.quantity,
        input.lengthTotalM,
        input.widthM,
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
      const usageStatus = input.usageStatus === "used" || input.usageStatus === "partial" ? input.usageStatus : "available";
      validateMetaReference(db, "material_units", userId, Number(input.unitId), Number(existing.unit_id));
      if (input.categoryId) validateMetaReference(db, "material_categories", userId, Number(input.categoryId), Number(existing.category_id));
      db.prepare(
        `UPDATE materials SET name = ?, category_id = ?, unit_id = ?, quantity_total_canonical = ?, usage_status = ?,
         colors = ?, source = ?, price_cents = ?, purchased_at = ?, remarks = ?, updated_at = ? WHERE id = ?`
      ).run(
        input.name,
        input.categoryId,
        input.unitId,
        input.quantityTotalCanonical,
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
      if (kind === "fabrics") {
        const result = db
          .prepare(
            `INSERT INTO fabrics
            (user_id, name, quantity, length_total_m, width_m, colors, purpose, material_type, source, price_cents, purchased_at, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.quantity,
            existing.length_total_m,
            existing.width_m,
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
            (user_id, name, category_id, unit_id, quantity_total_canonical, usage_status, colors, source, price_cents, purchased_at, remarks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            userId,
            existing.name,
            existing.category_id,
            existing.unit_id,
            existing.quantity_total_canonical,
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
    if (kind === "fabrics") {
      const count = db.prepare("SELECT COUNT(*) AS count FROM project_fabrics WHERE fabric_id = ?").get(id) as { count: number };
      if (count.count) throw new ApiError("linked", 409, "This fabric is used by a project.");
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
  if (kind === "fabrics") {
    const rows = (filteredRows ??
      db
        .prepare(
          `SELECT price_cents AS priceCents, length_total_m AS lengthTotalM,
             ${fabricRemainingMetresSort} AS lengthRemainingM
           FROM fabrics WHERE user_id = ?`
        )
        .all(userId)) as Array<{ priceCents: number | null; lengthTotalM: number; lengthRemainingM: number }>;
    const lengthUsedM = rows.reduce((sum, row) => sum + (row.lengthTotalM - row.lengthRemainingM), 0);
    const lengthRemainingM = rows.reduce((sum, row) => sum + row.lengthRemainingM, 0);
    return {
      count: rows.length,
      totalCost: rows.reduce((sum, row) => sum + (row.priceCents ?? 0), 0),
      lengthUsedM,
      lengthRemainingM
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
      used: rows.filter((row) => row.usageStatus !== "available").length,
      unused: rows.filter((row) => row.usageStatus === "available").length
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
  const fabricCost = (
    db
      .prepare(
        `SELECT pc.length_used_m AS used, c.length_total_m AS total, c.price_cents AS price
         FROM project_fabrics pc JOIN fabrics c ON c.id = pc.fabric_id WHERE pc.project_id = ?`
      )
      .all(projectId) as Array<{ used: number; total: number; price: number | null }>
  ).reduce((sum, row) => sum + (row.total > 0 ? Math.round((row.used / row.total) * (row.price ?? 0)) : 0), 0);
  return { fabricCost, totalCost: fabricCost };
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
  if (entityType === "fabric" || entityType === "material") {
    extra.colors = decodeColors(row.colors);
  }
  if (entityType === "project") {
    const inherited = db
      .prepare(
        `SELECT c.colors FROM project_fabrics pc
         JOIN fabrics c ON c.id = pc.fabric_id
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
      const category = db.prepare("SELECT definition_key AS definitionKey, custom_name AS customName FROM material_categories WHERE id = ?").get(material.category_id) as
        | { definitionKey: string | null; customName: string | null }
        | undefined;
      extra.categoryDefinitionKey = category?.definitionKey;
      extra.categoryCustomName = category?.customName;
    }
    if (material.unit_id) {
      const unit = db.prepare("SELECT definition_key AS definitionKey, custom_name AS customName FROM material_units WHERE id = ?").get(material.unit_id) as
        | { definitionKey: string | null; customName: string | null }
        | undefined;
      extra.unitDefinitionKey = unit?.definitionKey;
      extra.unitCustomName = unit?.customName;
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
    if (entityType === "fabric" || entityType === "material") {
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
    const fabricColors = db
      .prepare(
        `SELECT pc.project_id AS projectId, c.colors
         FROM project_fabrics pc
         JOIN fabrics c ON c.id = pc.fabric_id
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
      const colors = [...fabricColors, ...materialColors]
        .filter((item) => item.projectId === id)
        .flatMap((item) => decodeColors(item.colors));
      extras.set(id, { colors: [...new Set(colors)] });
    }
  }
  if (entityType === "material") {
    const categoryIds = uniqueNumericValues(rows.map((row) => row.category_id));
    const unitIds = uniqueNumericValues(rows.map((row) => row.unit_id));
    const categories = loadMetaMap(db, "material_categories", categoryIds);
    const units = loadMetaMap(db, "material_units", unitIds);
    for (const row of rows) {
      const id = Number(row.id);
      extras.set(id, {
        categoryDefinitionKey: categories.get(Number(row.category_id))?.definitionKey,
        categoryCustomName: categories.get(Number(row.category_id))?.customName,
        unitDefinitionKey: units.get(Number(row.unit_id))?.definitionKey,
        unitCustomName: units.get(Number(row.unit_id))?.customName
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

function loadMetaMap(db: ReturnType<typeof getSqlite>, table: "material_categories" | "material_units", ids: number[]) {
  if (!ids.length) return new Map<number, { definitionKey: string | null; customName: string | null }>();
  const rows = db
    .prepare(`SELECT id, definition_key AS definitionKey, custom_name AS customName FROM ${table} WHERE id IN (${ids.map(() => "?").join(",")})`)
    .all(...ids) as Array<{ id: number; definitionKey: string | null; customName: string | null }>;
  return new Map(rows.map((row) => [row.id, { definitionKey: row.definitionKey, customName: row.customName }]));
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
    fabrics: db
      .prepare("SELECT fabric_id AS fabricId, length_used_m AS lengthUsedM FROM project_fabrics WHERE project_id = ?")
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
  const sortOrder =
    input.sortOrder ??
    (
      db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS sortOrder FROM ${table} WHERE user_id = ?`).get(userId) as {
        sortOrder: number;
      }
    ).sortOrder;
  try {
    const result = db
      .prepare(`INSERT INTO ${table} (user_id, custom_name, active, sort_order, created_at) VALUES (?, ?, 1, ?, ?)`)
      .run(userId, input.name, sortOrder, now);
    return getMetaItem(table, userId, Number(result.lastInsertRowid));
  } catch (error) {
    if (isSqliteConstraint(error)) {
      throw new ApiError("duplicate_name", 409, "A value with this name already exists.");
    }
    throw error;
  }
}

export function listMeta(table: "material_categories" | "material_units", userId: number, includeInactive = false) {
  const referenceColumn = table === "material_units" ? "unit_id" : "category_id";
  return getSqlite()
    .prepare(
      `SELECT id, definition_key AS definitionKey, custom_name AS customName, active, sort_order AS sortOrder
       FROM ${table}
       WHERE user_id = ? ${
         includeInactive
           ? ""
           : `AND (active = 1 OR EXISTS (SELECT 1 FROM materials WHERE materials.${referenceColumn} = ${table}.id))`
       }
       ORDER BY active DESC, sort_order, COALESCE(custom_name, definition_key)`
    )
    .all(userId);
}

export function updateMeta(
  table: "material_categories" | "material_units",
  userId: number,
  id: number,
  input: { name?: string; active?: boolean; sortOrder?: number }
) {
  const db = getSqlite();
  const existing = getMetaItem(table, userId, id);
  if (!existing) throw new ApiError("not_found", 404, "Metadata value not found.");
  if (existing.definitionKey && input.name !== undefined) {
    throw new ApiError("managed_value", 409, "Managed values cannot be renamed.");
  }
  try {
    db.prepare(
      `UPDATE ${table}
       SET custom_name = COALESCE(?, custom_name),
           active = COALESCE(?, active),
           sort_order = COALESCE(?, sort_order)
       WHERE id = ? AND user_id = ?`
    ).run(
      input.name ?? null,
      input.active === undefined ? null : input.active ? 1 : 0,
      input.sortOrder ?? null,
      id,
      userId
    );
    return getMetaItem(table, userId, id);
  } catch (error) {
    if (isSqliteConstraint(error)) throw new ApiError("duplicate_name", 409, "A value with this name already exists.");
    throw error;
  }
}

export function archiveMeta(table: "material_categories" | "material_units", userId: number, id: number) {
  return updateMeta(table, userId, id, { active: false });
}

function getMetaItem(table: "material_categories" | "material_units", userId: number, id: number) {
  return getSqlite()
    .prepare(
      `SELECT id, definition_key AS definitionKey, custom_name AS customName, active, sort_order AS sortOrder
       FROM ${table} WHERE id = ? AND user_id = ?`
    )
    .get(id, userId) as
    | { id: number; definitionKey: string | null; customName: string | null; active: number; sortOrder: number }
    | undefined;
}

function validateMetaReference(
  db: ReturnType<typeof getSqlite>,
  table: "material_categories" | "material_units",
  userId: number,
  id: number,
  currentId?: number
) {
  const row = db.prepare(`SELECT active FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId) as { active: number } | undefined;
  if (!row) throw new ApiError("invalid_metadata", 400, "The selected value does not belong to this user.");
  if (!row.active && id !== currentId) throw new ApiError("inactive_metadata", 409, "The selected value is inactive.");
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

export function listFabricMaterialTypes(userId: number) {
  return (
    getSqlite()
      .prepare("SELECT DISTINCT material_type AS materialType FROM fabrics WHERE user_id = ? AND material_type IS NOT NULL AND TRIM(material_type) != '' ORDER BY material_type")
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

export function hasMonetaryData(userId: number) {
  const row = getSqlite()
    .prepare(
      `SELECT EXISTS (
         SELECT 1 FROM fabrics WHERE user_id = ? AND price_cents IS NOT NULL
         UNION ALL
         SELECT 1 FROM patterns WHERE user_id = ? AND price_cents IS NOT NULL
         UNION ALL
         SELECT 1 FROM materials WHERE user_id = ? AND price_cents IS NOT NULL
         UNION ALL
         SELECT 1 FROM tools WHERE user_id = ? AND price_cents IS NOT NULL
         UNION ALL
         SELECT 1 FROM projects WHERE user_id = ? AND (price_cents IS NOT NULL OR value_cents IS NOT NULL)
       ) AS hasData`
    )
    .get(userId, userId, userId, userId, userId) as { hasData: number };
  return row.hasData === 1;
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
