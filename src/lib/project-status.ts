export const projectStatusOptions = ["in_progress", "completed", "cancelled"] as const;

export type ProjectStatus = (typeof projectStatusOptions)[number];
