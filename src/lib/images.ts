import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { displayDir, originalsDir, thumbsDir } from "@/lib/env";

const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};

export function extensionForMime(mime: string) {
  return mimeToExt[mime];
}

export async function writePhotoFiles(id: string, ext: string, buffer: Buffer) {
  const originalPath = path.join(originalsDir, `${id}.${ext}`);
  await fs.writeFile(originalPath, buffer, { mode: 0o600 });
  try {
    await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(displayDir, `${id}.webp`));
    await sharp(buffer).rotate().resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(thumbsDir, `${id}.webp`));
    await Promise.all([
      fs.chmod(path.join(displayDir, `${id}.webp`), 0o600),
      fs.chmod(path.join(thumbsDir, `${id}.webp`), 0o600)
    ]);
  } catch (error) {
    await deletePhotoFiles(id, ext);
    throw error;
  }
}

export async function deletePhotoFiles(id: string, ext: string) {
  await Promise.allSettled([
    fs.rm(path.join(originalsDir, `${id}.${ext}`), { force: true }),
    fs.rm(path.join(displayDir, `${id}.webp`), { force: true }),
    fs.rm(path.join(thumbsDir, `${id}.webp`), { force: true })
  ]);
}

export function deletePhotoFilesSync(id: string, ext: string) {
  fsSync.rmSync(path.join(originalsDir, `${id}.${ext}`), { force: true });
  fsSync.rmSync(path.join(displayDir, `${id}.webp`), { force: true });
  fsSync.rmSync(path.join(thumbsDir, `${id}.webp`), { force: true });
}

export function copyPhotoFilesSync(sourceId: string, targetId: string, ext: string) {
  try {
    fsSync.copyFileSync(path.join(originalsDir, `${sourceId}.${ext}`), path.join(originalsDir, `${targetId}.${ext}`));
    fsSync.copyFileSync(path.join(displayDir, `${sourceId}.webp`), path.join(displayDir, `${targetId}.webp`));
    fsSync.copyFileSync(path.join(thumbsDir, `${sourceId}.webp`), path.join(thumbsDir, `${targetId}.webp`));
  } catch (error) {
    deletePhotoFilesSync(targetId, ext);
    throw error;
  }
}

export function photoPath(id: string, ext: string, variant: string) {
  if (variant === "original") return path.join(originalsDir, `${id}.${ext}`);
  if (variant === "display") return path.join(displayDir, `${id}.webp`);
  return path.join(thumbsDir, `${id}.webp`);
}
