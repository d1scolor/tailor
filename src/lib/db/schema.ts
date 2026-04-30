import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  locale: text("locale").notNull().default("en"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull()
});

export const photos = sqliteTable("photos", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  originalExt: text("original_ext").notNull(),
  isCover: integer("is_cover").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull()
});

export const cloths = sqliteTable("cloths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  lengthTotal: real("length_total").notNull(),
  lengthRemaining: real("length_remaining").notNull(),
  lengthUnit: text("length_unit").notNull().default("m"),
  width: real("width"),
  widthUnit: text("width_unit"),
  colors: text("colors").notNull().default("[]"),
  purpose: text("purpose").notNull().default("服装"),
  materialType: text("material_type").notNull().default("其他"),
  source: text("source"),
  priceCents: integer("price_cents"),
  purchasedAt: text("purchased_at"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const patterns = sqliteTable("patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  size: text("size"),
  pieces: integer("pieces"),
  source: text("source"),
  priceCents: integer("price_cents"),
  purchasedAt: text("purchased_at"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const materialCategories = sqliteTable(
  "material_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull()
  },
  (table) => ({ uniqueName: uniqueIndex("material_categories_user_name").on(table.userId, table.name) })
);

export const materialUnits = sqliteTable(
  "material_units",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull()
  },
  (table) => ({ uniqueName: uniqueIndex("material_units_user_name").on(table.userId, table.name) })
);

export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => materialCategories.id, { onDelete: "set null" }),
  unitId: integer("unit_id").references(() => materialUnits.id, { onDelete: "set null" }),
  quantityTotal: real("quantity_total").notNull(),
  quantityRemaining: real("quantity_remaining").notNull(),
  colors: text("colors").notNull().default("[]"),
  source: text("source"),
  priceCents: integer("price_cents"),
  purchasedAt: text("purchased_at"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  priceCents: integer("price_cents"),
  valueCents: integer("value_cents"),
  remarks: text("remarks"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const projectCloths = sqliteTable("project_cloths", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clothId: integer("cloth_id").notNull().references(() => cloths.id, { onDelete: "restrict" }),
  lengthUsed: real("length_used").notNull(),
  createdAt: text("created_at").notNull()
});

export const projectPatterns = sqliteTable(
  "project_patterns",
  {
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    patternId: integer("pattern_id").notNull().references(() => patterns.id, { onDelete: "restrict" })
  },
  (table) => ({ pk: primaryKey({ columns: [table.projectId, table.patternId] }) })
);

export const projectMaterials = sqliteTable("project_materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  materialId: integer("material_id").notNull().references(() => materials.id, { onDelete: "restrict" }),
  quantityUsed: real("quantity_used").notNull()
});

export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => ({ uniqueName: uniqueIndex("tags_user_name").on(table.userId, table.name) })
);

export const entityTags = sqliteTable(
  "entity_tags",
  {
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => ({ pk: primaryKey({ columns: [table.entityType, table.entityId, table.tagId] }) })
);
