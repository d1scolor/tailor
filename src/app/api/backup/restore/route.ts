import fs from "node:fs";
import path from "node:path";
import { Transform, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";
import type Database from "better-sqlite3";
import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { isSafeBackupEntry } from "@/lib/backup";
import { closeDb, getSqlite } from "@/lib/db/client";
import { assertCurrentSchema, UnsupportedDatabaseSchemaError } from "@/lib/db/schema-compat";
import { dataDir, dbDir, maxBackupMb, photosDir } from "@/lib/env";
import { restoreState } from "@/lib/restore-state";
import { dateForFile } from "@/lib/time";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { response } = requireAuthFromRequest(request);
  if (response) return response;
  let staging: string | null = null;
  try {
    if (request.headers.get("x-tailor-restore-confirm") !== "RESTORE" || !request.body) {
      return Response.json({ error: "validation" }, { status: 400 });
    }
    const maxBackupBytes = maxBackupMb * 1024 * 1024;
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBackupBytes) {
      return Response.json({ error: "file_too_large" }, { status: 400 });
    }

    staging = path.join(dataDir, "restore-staging");
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true, mode: 0o700 });
    const archivePath = path.join(staging, "restore.tar.gz");
    let uploadedBytes = 0;
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        uploadedBytes += chunk.length;
        callback(uploadedBytes > maxBackupBytes ? new ApiError("file_too_large", 400, "Backup is too large.") : null, chunk);
      }
    });
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      limiter,
      fs.createWriteStream(archivePath, { mode: 0o600 })
    );
    let invalidEntry = false;
    let extractedBytes = 0;
    let entryCount = 0;
    await tar.t({
      file: archivePath,
      onentry(entry) {
        entryCount += 1;
        extractedBytes += entry.size;
        if (!isSafeBackupEntry(entry.path, entry.type)) invalidEntry = true;
      }
    });
    if (invalidEntry || entryCount > 100_000 || extractedBytes > maxBackupBytes) {
      return Response.json({ error: "invalid_backup" }, { status: 400 });
    }
    await tar.x({
      file: archivePath,
      cwd: staging,
      strict: true,
      filter: (entryPath, entry) => isSafeBackupEntry(entryPath, "type" in entry ? entry.type : "")
    });
    const stagedDb = path.join(staging, "db", "tailor.db");
    const stagedPhotos = path.join(staging, "photos");
    if (!fs.existsSync(stagedDb) || !fs.existsSync(stagedPhotos)) {
      return Response.json({ error: "invalid_backup" }, { status: 400 });
    }
    hardenRestoredPermissions(path.join(staging, "db"), stagedPhotos);
    const Database = (await import("better-sqlite3")).default;
    const tempDb = new Database(stagedDb);
    try {
      if (!hasRequiredTables(tempDb)) {
        return Response.json({ error: "invalid_database" }, { status: 400 });
      }
      assertCurrentSchema(tempDb);
      tempDb.prepare("DELETE FROM sessions").run();
      const integrity = tempDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
      if (integrity.integrity_check !== "ok") {
        return Response.json({ error: "invalid_database" }, { status: 400 });
      }
    } catch (error) {
      if (error instanceof UnsupportedDatabaseSchemaError) {
        return Response.json({ error: "invalid_database" }, { status: 400 });
      }
      throw error;
    } finally {
      tempDb.close();
    }

    const backup = path.join(dataDir, `restore-backup-${dateForFile()}`);
    restoreState.readsBlocked = true;
    restoreState.writesBlocked = true;
    let replacementStarted = false;
    try {
      closeDb();
      fs.mkdirSync(backup, { recursive: true, mode: 0o700 });
      if (fs.existsSync(dbDir)) fs.cpSync(dbDir, path.join(backup, "db"), { recursive: true });
      if (fs.existsSync(photosDir)) fs.cpSync(photosDir, path.join(backup, "photos"), { recursive: true });
      replacementStarted = true;
      fs.rmSync(dbDir, { recursive: true, force: true });
      fs.rmSync(photosDir, { recursive: true, force: true });
      fs.cpSync(path.join(staging, "db"), dbDir, { recursive: true });
      fs.cpSync(stagedPhotos, photosDir, { recursive: true });
      closeDb();
      getSqlite();
    } catch (error) {
      closeDb();
      if (replacementStarted) {
        fs.rmSync(dbDir, { recursive: true, force: true });
        fs.rmSync(photosDir, { recursive: true, force: true });
        if (fs.existsSync(path.join(backup, "db"))) {
          fs.cpSync(path.join(backup, "db"), dbDir, { recursive: true });
        }
        if (fs.existsSync(path.join(backup, "photos"))) {
          fs.cpSync(path.join(backup, "photos"), photosDir, { recursive: true });
        }
      }
      getSqlite();
      throw error;
    } finally {
      restoreState.readsBlocked = false;
      restoreState.writesBlocked = false;
    }
    return ok({ ok: true });
  } catch (error) {
    restoreState.readsBlocked = false;
    restoreState.writesBlocked = false;
    return handleApiError(error);
  } finally {
    if (staging) fs.rmSync(staging, { recursive: true, force: true });
  }
}

function hasRequiredTables(db: Database.Database) {
  const tables = new Set(
    (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(
      (row) => row.name
    )
  );
  return ["users", "sessions", "photos", "patterns", "materials", "projects"].every((table) => tables.has(table)) &&
    (tables.has("fabrics") || tables.has("cloths"));
}

function hardenRestoredPermissions(stagedDbDir: string, stagedPhotos: string) {
  hardenTree(stagedDbDir);
  hardenTree(stagedPhotos);
}

function hardenTree(root: string) {
  fs.chmodSync(root, 0o700);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) hardenTree(entryPath);
    else if (entry.isFile()) fs.chmodSync(entryPath, 0o600);
  }
}
