import { z } from "zod";
import { baseItemSchema, nullableInt, nullableNumber } from "./common";

export const entityTypeSchema = z.enum(["cloth", "pattern", "material", "project"]);
export type EntityType = z.infer<typeof entityTypeSchema>;

const colorSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((value) => value.toLowerCase());
const colorsSchema = z.array(colorSchema).max(5).default([]).optional();
const labelValueSchema = z.string().trim().min(1).max(80);

export const clothSchema = baseItemSchema.extend({
  quantity: z.coerce.number().int().positive().default(1),
  lengthTotal: z.coerce.number().positive(),
  lengthUnit: z.enum(["m", "cm", "yd"]).default("m"),
  width: nullableNumber,
  widthUnit: z.enum(["cm", "m", "in"]).nullable().optional(),
  colors: colorsSchema,
  purpose: z.enum(["服装", "手工"]).default("服装"),
  materialType: labelValueSchema.default("其他")
});

export const patternSchema = baseItemSchema.extend({
  patternType: z.enum(["纸质", "电子"]).default("纸质"),
  size: z.string().trim().nullable().optional(),
  pieces: nullableInt
});

export const materialSchema = baseItemSchema.extend({
  categoryId: nullableInt,
  unitId: nullableInt,
  quantityTotal: z.coerce.number().positive(),
  colors: colorsSchema
});

export const projectLinkClothSchema = z.object({
  clothId: z.coerce.number().int().positive(),
  lengthUsed: z.coerce.number().positive()
});

export const projectLinkMaterialSchema = z.object({
  materialId: z.coerce.number().int().positive(),
  quantityUsed: z.coerce.number().positive()
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().int().positive().default(1),
  priceCents: nullableInt,
  valueCents: nullableInt,
  remarks: z.string().trim().nullable().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).default([]).optional(),
  patternIds: z.array(z.coerce.number().int().positive()).default([]).optional(),
  cloths: z.array(projectLinkClothSchema).default([]).optional(),
  materials: z.array(projectLinkMaterialSchema).default([]).optional()
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
