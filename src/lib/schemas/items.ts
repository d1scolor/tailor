import { z } from "zod";
import { baseItemSchema, nullableInt, nullableNonnegativeInt, nullableNumber, nullableString } from "./common";

export const entityTypeSchema = z.enum(["fabric", "pattern", "material", "project", "tool"]);
export type EntityType = z.infer<typeof entityTypeSchema>;

const colorSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((value) => value.toLowerCase());
const colorsSchema = z.array(colorSchema).max(5).default([]).optional();
const labelValueSchema = z.string().trim().min(1).max(80);

export const fabricSchema = baseItemSchema.extend({
  quantity: z.coerce.number().int().positive().default(1),
  lengthTotalM: z.coerce.number().positive(),
  widthM: nullableNumber,
  colors: colorsSchema,
  purpose: z.enum(["garment", "craft"]).default("garment"),
  materialType: labelValueSchema.default("other")
});

export const patternSchema = baseItemSchema.extend({
  patternType: z.enum(["paper", "digital"]).default("paper"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  patternFor: nullableString,
  size: z.string().trim().nullable().optional(),
  pieces: nullableInt
});

export const materialSchema = baseItemSchema.extend({
  categoryId: nullableInt,
  unitId: z.coerce.number().int().positive(),
  quantityTotalCanonical: z.coerce.number().positive(),
  usageStatus: z.enum(["available", "partial", "used"]).default("available"),
  colors: colorsSchema
});

export const projectLinkFabricSchema = z.object({
  fabricId: z.coerce.number().int().positive(),
  lengthUsedM: z.coerce.number().positive()
});

export const projectLinkMaterialSchema = z.object({
  materialId: z.coerce.number().int().positive()
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().positive().default(1),
  valueCents: nullableInt,
  materialCostCents: nullableNonnegativeInt,
  laborMinutes: nullableNonnegativeInt,
  laborCostCents: nullableNonnegativeInt,
  remarks: z.string().trim().nullable().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).default([]).optional(),
  patternIds: z.array(z.coerce.number().int().positive()).default([]).optional(),
  fabrics: z.array(projectLinkFabricSchema).default([]).optional(),
  materials: z.array(projectLinkMaterialSchema).default([]).optional()
});

export const toolSchema = baseItemSchema.extend({
  category: labelValueSchema.default("other"),
  quantity: z.coerce.number().int().positive().default(1),
  brand: z.string().trim().nullable().optional(),
  model: z.string().trim().nullable().optional(),
  condition: z.enum(["good", "maintenance", "broken", "retired"]).default("good")
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional()
});

export const metaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sortOrder: z.coerce.number().int().min(0).optional()
});

export const metaUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional()
});
