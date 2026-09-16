import type { ListingInput } from "./validation";
import { majorToMinorUnits } from "./money";

export const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Maps validated listing form input to Listing columns (create and edit). */
export function listingColumns(data: ListingInput) {
  return {
    category: data.category,
    title: data.title,
    brand: data.brand,
    model: data.model,
    storageGb: data.storageGb ?? null,
    conditionGrade: data.conditionGrade,
    defectsDescription: data.defectsDescription,
    imei: data.category === "PHONES" ? (data.imei ?? null) : null,
    priceMinorUnits: majorToMinorUnits(data.priceMajorUnits),
    county: data.county,
    area: data.area ?? null,
    meetUp: data.meetUp,
    delivery: data.delivery,
    acceptsOffers: data.acceptsOffers,
  };
}

export function getPhotoFiles(formData: FormData) {
  return formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

/** Returns an error message, or null if the new photos are acceptable. */
export function validatePhotoFiles(photos: File[], existingCount: number) {
  if (photos.length + existingCount === 0) return "Add at least one photo of the item.";
  if (photos.length + existingCount > MAX_PHOTOS) return `A listing can have up to ${MAX_PHOTOS} photos.`;
  for (const photo of photos) {
    if (!ACCEPTED_IMAGE_TYPES.has(photo.type)) {
      return `Unsupported image type: ${photo.type || "unknown"}. Use JPG, PNG or WebP.`;
    }
    if (photo.size > MAX_PHOTO_BYTES) return "Each photo must be smaller than 8 MB.";
  }
  return null;
}
