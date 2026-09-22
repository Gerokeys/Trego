"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { listingFormValues, listingSchema } from "@/lib/validation";
import { getPhotoFiles, listingColumns, validatePhotoFiles } from "@/lib/listing-data";
import { saveListingPhoto } from "@/lib/uploads";
import { notify } from "@/lib/notifications";
import { formatMinorUnits } from "@/lib/money";
import type { ListingFormState } from "@/components/listing-form";

export async function updateListingAction(
  listingId: string,
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const user = await requireVerifiedUser(`/listings/${listingId}/edit`);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } }, photos: true },
  });
  if (!listing || listing.seller.userId !== user.id) return { error: "Listing not found." };
  // Once money is involved the listing is dispute evidence, so it's frozen.
  if (listing.status !== "DRAFT" && listing.status !== "ACTIVE") {
    return { error: "Listings that are in escrow or sold can’t be edited." };
  }

  const parsed = listingSchema.safeParse(listingFormValues(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      error: issue?.message ?? "Check the form and try again.",
      field: typeof issue?.path[0] === "string" ? issue.path[0] : undefined,
    };
  }

  const removeIds = new Set(formData.getAll("removePhoto").map(String));
  const kept = listing.photos.filter((photo) => !removeIds.has(photo.id));
  const newPhotos = getPhotoFiles(formData);
  const photoError = validatePhotoFiles(newPhotos, kept.length);
  if (photoError) return { error: photoError, field: "photos" };

  const savedUrls: string[] = [];
  try {
    for (const photo of newPhotos) savedUrls.push(await saveListingPhoto(listing.id, photo));
  } catch (err) {
    console.error("Saving listing photos failed:", err);
    return {
      error: "One of the photos couldn’t be read. Try a different JPG, PNG or WebP file.",
      field: "photos",
    };
  }

  const columns = listingColumns(parsed.data);
  const nextPosition = Math.max(-1, ...kept.map((photo) => photo.position)) + 1;
  const imeiChanged = columns.imei !== listing.imei;

  await db.$transaction([
    db.listingPhoto.deleteMany({ where: { listingId, id: { in: [...removeIds] } } }),
    ...savedUrls.map((url, i) =>
      db.listingPhoto.create({ data: { listingId, url, position: nextPosition + i } })
    ),
    db.listing.update({
      where: { id: listingId },
      data: {
        ...columns,
        ...(imeiChanged ? { imeiStatus: "NOT_CHECKED" as const, imeiCheckedAt: null } : {}),
      },
    }),
  ]);

  if (listing.status === "ACTIVE" && columns.priceMinorUnits < listing.priceMinorUnits) {
    const watchers = await db.watchlistItem.findMany({ where: { listingId }, select: { userId: true } });
    for (const { userId } of watchers) {
      await notify(userId, {
        title: `Price drop: now ${formatMinorUnits(columns.priceMinorUnits, listing.currency)}`,
        body: `${columns.title} (was ${formatMinorUnits(listing.priceMinorUnits, listing.currency)})`,
        href: `/listings/${listingId}`,
      });
    }
  }

  revalidatePath("/", "layout");
  redirect(`/listings/${listingId}`);
}
