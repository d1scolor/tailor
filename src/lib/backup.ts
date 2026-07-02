import path from "node:path";

export function isSafeBackupEntry(entryPath: string, type: string) {
  const normalized = path.posix
    .normalize(entryPath.replaceAll("\\", "/"))
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  const allowedPath =
    normalized === "db" ||
    normalized === "db/tailor.db" ||
    normalized === "photos" ||
    normalized.startsWith("photos/originals/") ||
    normalized.startsWith("photos/display/") ||
    normalized.startsWith("photos/thumbs/") ||
    normalized === "photos/originals" ||
    normalized === "photos/display" ||
    normalized === "photos/thumbs";
  return (
    allowedPath &&
    !path.posix.isAbsolute(normalized) &&
    !normalized.startsWith("../") &&
    (type === "File" || type === "Directory")
  );
}
