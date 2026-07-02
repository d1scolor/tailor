import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import * as tar from "tar";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { photosDir } from "@/lib/env";
import { dateForFile } from "@/lib/time";
import Database from "better-sqlite3";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { response } = requireAuthFromRequest(request);
  if (response) return response;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tailor-backup-"));
  let cleanupAfterStream = false;
  try {
    const dbDir = path.join(temp, "db");
    fs.mkdirSync(dbDir, { recursive: true });
    const snapshot = path.join(dbDir, "tailor.db");
    getSqlite().prepare(`VACUUM INTO ?`).run(snapshot);
    const snapshotDb = new Database(snapshot);
    try {
      snapshotDb.prepare("DELETE FROM sessions").run();
      snapshotDb.exec("VACUUM");
    } finally {
      snapshotDb.close();
    }
    fs.cpSync(photosDir, path.join(temp, "photos"), { recursive: true, force: true });
    const archive = path.join(temp, "tailor-backup.tar.gz");
    await tar.c({ cwd: temp, gzip: true, file: archive }, ["db", "photos"]);
    const stream = fs.createReadStream(archive);
    stream.once("close", () => fs.rmSync(temp, { recursive: true, force: true }));
    cleanupAfterStream = true;
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="tailor-backup-${dateForFile()}.tar.gz"`,
        "X-Content-Type-Options": "nosniff"
      }
    });
  } finally {
    if (!cleanupAfterStream) fs.rmSync(temp, { recursive: true, force: true });
  }
}
