export const summaryDisplayKeys = [
  "fabricUsedValue",
  "fabricRemainingValue",
  "projectLaborCost"
] as const;

export type SummaryDisplayKey = (typeof summaryDisplayKeys)[number];
export type SummaryDisplayModes = Record<SummaryDisplayKey, boolean>;
