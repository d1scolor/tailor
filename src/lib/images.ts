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

function photoFilePath(directory: string, filename: string) {
  return path.join(/*turbopackIgnore: true*/ directory, filename);
}

export async function writePhotoFiles(id: string, ext: string, buffer: Buffer) {
  const originalPath = photoFilePath(originalsDir, `${id}.${ext}`);
  await fs.writeFile(originalPath, buffer, { mode: 0o600 });
  try {
    await sharp(buffer).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(photoFilePath(displayDir, `${id}.webp`));
    await sharp(buffer).rotate().resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toFile(photoFilePath(thumbsDir, `${id}.webp`));
    await Promise.all([
      fs.chmod(photoFilePath(displayDir, `${id}.webp`), 0o600),
      fs.chmod(photoFilePath(thumbsDir, `${id}.webp`), 0o600)
    ]);
  } catch (error) {
    await deletePhotoFiles(id, ext);
    throw error;
  }
}

export async function deletePhotoFiles(id: string, ext: string) {
  await Promise.allSettled([
    fs.rm(photoFilePath(originalsDir, `${id}.${ext}`), { force: true }),
    fs.rm(photoFilePath(displayDir, `${id}.webp`), { force: true }),
    fs.rm(photoFilePath(thumbsDir, `${id}.webp`), { force: true })
  ]);
}

export function deletePhotoFilesSync(id: string, ext: string) {
  fsSync.rmSync(photoFilePath(originalsDir, `${id}.${ext}`), { force: true });
  fsSync.rmSync(photoFilePath(displayDir, `${id}.webp`), { force: true });
  fsSync.rmSync(photoFilePath(thumbsDir, `${id}.webp`), { force: true });
}

export function copyPhotoFilesSync(sourceId: string, targetId: string, ext: string) {
  try {
    fsSync.copyFileSync(photoFilePath(originalsDir, `${sourceId}.${ext}`), photoFilePath(originalsDir, `${targetId}.${ext}`));
    fsSync.copyFileSync(photoFilePath(displayDir, `${sourceId}.webp`), photoFilePath(displayDir, `${targetId}.webp`));
    fsSync.copyFileSync(photoFilePath(thumbsDir, `${sourceId}.webp`), photoFilePath(thumbsDir, `${targetId}.webp`));
  } catch (error) {
    deletePhotoFilesSync(targetId, ext);
    throw error;
  }
}

export function photoPath(id: string, ext: string, variant: string) {
  if (variant === "original") return photoFilePath(originalsDir, `${id}.${ext}`);
  if (variant === "display") return photoFilePath(displayDir, `${id}.webp`);
  return photoFilePath(thumbsDir, `${id}.webp`);
}
