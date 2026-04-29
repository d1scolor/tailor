import fs from "node:fs";
import path from "node:path";
import * as tar from "tar";
import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { closeDb, runMigrations } from "@/lib/db/client";
import { dataDir, dbDir, photosDir } from "@/lib/env";
import { restoreState } from "@/lib/restore-state";
import { dateForFile } from "@/lib/time";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { response } = requireAuthFromRequest(request);
  if (response) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const confirm = form.get("confirm")?.toString();
    if (!(file instanceof File) || confirm !== "RESTORE") return Response.json({ error: "validation" }, { status: 400 });

    const staging = path.join(dataDir, "restore-staging");
    fs.rmSync(staging, { recursive: true, force: true });
    fs.mkdirSync(staging, { recursive: true });
    const archivePath = path.join(staging, "restore.tar.gz");
    fs.writeFileSync(archivePath, Buffer.from(await file.arrayBuffer()));
    await tar.x({ file: archivePath, cwd: staging });
    const stagedDb = path.join(staging, "db", "tailor.db");
    const stagedPhotos = path.join(staging, "photos");
    if (!fs.existsSync(stagedDb) || !fs.existsSync(stagedPhotos)) {
      return Response.json({ error: "invalid_backup" }, { status: 400 });
    }
    closeDb();
    const Database = (await import("better-sqlite3")).default;
    const tempDb = new Database(stagedDb);
    const integrity = tempDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    tempDb.close();
    if (integrity.integrity_check !== "ok") return Response.json({ error: "invalid_database" }, { status: 400 });

    restoreState.writesBlocked = true;
    const backup = path.join(dataDir, `restore-backup-${dateForFile()}`);
    fs.mkdirSync(backup, { recursive: true });
    if (fs.existsSync(dbDir)) fs.renameSync(dbDir, path.join(backup, "db"));
    if (fs.existsSync(photosDir)) fs.renameSync(photosDir, path.join(backup, "photos"));
    fs.renameSync(path.join(staging, "db"), dbDir);
    fs.renameSync(stagedPhotos, photosDir);
    closeDb();
    runMigrations();
    restoreState.writesBlocked = false;
    fs.rmSync(staging, { recursive: true, force: true });
    return ok({ ok: true, backup });
  } catch (error) {
    restoreState.writesBlocked = false;
    return handleApiError(error);
  }
}
