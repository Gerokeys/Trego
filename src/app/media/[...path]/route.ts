import { readFile } from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { CONTENT_TYPES, UPLOAD_ROOT } from "@/lib/uploads";

/** Serves uploaded listing photos from UPLOAD_ROOT (see lib/uploads.ts). */
export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const { path: segments } = await ctx.params;
  const filePath = path.resolve(UPLOAD_ROOT, ...segments);
  const contentType = CONTENT_TYPES[path.extname(filePath).slice(1).toLowerCase()];

  // Refuse anything outside the upload folder (e.g. "../") or that isn't an image.
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep) || !contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        // Filenames are random UUIDs, so a given URL never changes content.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
