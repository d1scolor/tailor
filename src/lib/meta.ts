export const managedCategoryKeys = [
  "thread",
  "button",
  "zipper",
  "elastic",
  "interfacing",
  "ribbon",
  "lace",
  "trim",
  "biasTape",
  "snap",
  "hookAndEye",
  "velcro",
  "other"
] as const;

export type ManagedCategoryKey = (typeof managedCategoryKeys)[number];

export function isManagedCategoryKey(value: unknown): value is ManagedCategoryKey {
  return typeof value === "string" && managedCategoryKeys.includes(value as ManagedCategoryKey);
}
