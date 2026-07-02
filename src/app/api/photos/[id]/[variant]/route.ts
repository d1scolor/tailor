import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { Readable } from "node:stream";
import { getSqlite } from "@/lib/db/client";
import { photoPath } from "@/lib/images";
import { requireAuthFromRequest } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variant: string }> }
) {
  const { user, response } = requireAuthFromRequest(request);
  if (response) return response;
  const { id, variant } = await params;
  if (!["original", "display", "thumb"].includes(variant)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const photo = getSqlite()
    .prepare("SELECT original_ext AS originalExt FROM photos WHERE id = ? AND user_id = ?")
    .get(id, user.id) as { originalExt: string } | undefined;
  if (!photo) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const stream = fs.createReadStream(photoPath(id, photo.originalExt, variant));
  const body = Readable.toWeb(stream) as ReadableStream;
  return new NextResponse(body, {
    headers: {
      "Content-Type": variant === "original" ? contentType(photo.originalExt) : "image/webp",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function contentType(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";
  return "image/jpeg";
}
