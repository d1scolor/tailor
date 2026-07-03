import { z } from "zod";

const nullableString = z
  .union([z.string(), z.null()])
  .transform((value) => (value === null ? "" : value.trim()))
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

const nullableNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value === "" || value === null ? null : Number(value)))
  .pipe(z.number().finite().nullable())
  .optional();

const nullableInt = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value === "" || value === null ? null : Number(value)))
  .pipe(z.number().int().nullable())
  .optional();

const nullableNonnegativeInt = z
  .union([z.number(), z.string(), z.null()])
  .transform((value) => (value === "" || value === null ? null : Number(value)))
  .pipe(z.number().int().nonnegative().nullable())
  .optional();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const tagIdsSchema = z.array(z.coerce.number().int().positive()).default([]);

export const baseItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  source: nullableString,
  priceCents: nullableInt,
  purchasedAt: nullableString,
  remarks: nullableString,
  tagIds: tagIdsSchema.optional()
});

export const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  tags: z.string().optional(),
  sort: z.string().optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

export { nullableString, nullableNumber, nullableInt, nullableNonnegativeInt };
