export const inventoryPageSizeValues = ["20", "50", "100", "all"] as const;

export type InventoryPageSize = 20 | 50 | 100 | "all";

export function normalizeInventoryPageSize(value: unknown): InventoryPageSize {
  if (value === "all") return "all";
  const parsed = Number(value);
  if (parsed === 50 || parsed === 100) return parsed;
  return 20;
}
