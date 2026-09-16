import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

/**
 * Listing photos live on local disk outside public/ and are served by the
 * /media Route Handler, because `next start` only serves public/ files that
 * existed at build time. This works for a single server with a persistent
 * disk; serverless or multi-instance hosting needs object storage (S3/R2).
 */
export const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Longest edge after resizing; plenty for a full-screen gallery view. */
const MAX_DIMENSION = 1600;

/**
 * Resizes, fixes orientation and re-encodes as JPEG (a 4 MB phone photo ends
 * up around 200–400 KB). Re-encoding also drops EXIF metadata, including the
 * GPS location phones embed, so sellers don't reveal where they live.
 * JPEG rather than WebP so the files work as WhatsApp/link-preview images.
 * Throws if the file isn't a readable image.
 */
export async function saveListingPhoto(listingId: string, photo: File) {
  const output = await sharp(Buffer.from(await photo.arrayBuffer()))
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const dir = path.join(UPLOAD_ROOT, "listings", listingId);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.jpg`;
  await writeFile(path.join(dir, filename), output);

  return `/media/listings/${listingId}/${filename}`;
}
