import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as tar from "tar";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuthFromRequest } from "@/lib/auth/session";
import { getSqlite } from "@/lib/db/client";
import { photosDir } from "@/lib/env";
import { dateForFile } from "@/lib/time";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { response } = requireAuthFromRequest(request);
  if (response) return response;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tailor-backup-"));
  const dbDir = path.join(temp, "db");
  fs.mkdirSync(dbDir, { recursive: true });
  const snapshot = path.join(dbDir, "tailor.db");
  getSqlite().prepare(`VACUUM INTO ?`).run(snapshot);
  fs.cpSync(photosDir, path.join(temp, "photos"), { recursive: true, force: true });
  const archive = path.join(temp, "tailor-backup.tar.gz");
  await tar.c({ cwd: temp, gzip: true, file: archive }, ["db", "photos"]);
  try {
    return new NextResponse(fs.readFileSync(archive), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="tailor-backup-${dateForFile()}.tar.gz"`
      }
    });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
