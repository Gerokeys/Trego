import path from "path";
import type { NextRequest } from "next/server";
import { CONTENT_TYPES } from "@/lib/uploads";
import { getPhoto } from "@/lib/storage";

/**
 * Serves uploaded listing photos, from local disk or from a private R2 bucket
 * (see lib/storage.ts). With R2_PUBLIC_BASE_URL set, photo URLs point straight
 * at Cloudflare's CDN and this route is only used by older, relative URLs.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[...path]">) {
  const { path: segments } = await ctx.params;
  const key = segments.join("/");
  const contentType = CONTENT_TYPES[path.extname(key).slice(1).toLowerCase()];

  // Only image keys, and nothing that tries to climb out of the folder.
  if (!contentType || segments.some((segment) => segment === "..")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getPhoto(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  // Copy into a plain Uint8Array: a SharedArrayBuffer-backed view isn't a valid body.
  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType ?? contentType,
      // Filenames are random UUIDs, so a given URL never changes content.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
