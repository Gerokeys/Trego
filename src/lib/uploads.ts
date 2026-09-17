import "server-only";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { putPhoto } from "./storage";

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
 *
 * The result goes to R2 or local disk depending on configuration (lib/storage).
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

  return putPhoto(`listings/${listingId}/${randomUUID()}.jpg`, output, "image/jpeg");
}
