"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { listingFormValues, listingSchema } from "@/lib/validation";
import { getPhotoFiles, listingColumns, validatePhotoFiles } from "@/lib/listing-data";
import { notify } from "@/lib/notifications";
import { saveListingPhoto } from "@/lib/uploads";
import { notifySavedSearchMatches } from "@/lib/saved-searches";
import type { ListingFormState } from "@/components/listing-form";

export async function createListingAction(
  _prevState: ListingFormState,
  formData: FormData
): Promise<ListingFormState> {
  const user = await requireVerifiedUser("/sell/new");

  const parsed = listingSchema.safeParse(listingFormValues(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const photos = getPhotoFiles(formData);
  const photoError = validatePhotoFiles(photos, 0);
  if (photoError) return { error: photoError };

  const publish = formData.get("intent") !== "draft";
  const sellerProfile = await db.sellerProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const listing = await db.listing.create({
    data: {
      sellerId: sellerProfile.id,
      ...listingColumns(parsed.data),
      status: publish ? "ACTIVE" : "DRAFT",
    },
  });

  try {
    for (const [position, photo] of photos.entries()) {
      await db.listingPhoto.create({
        data: { listingId: listing.id, url: await saveListingPhoto(listing.id, photo), position },
      });
    }
  } catch (err) {
    console.error("Saving listing photos failed:", err);
    // Brand-new listing with no orders or messages yet, so it's safe to drop.
    await db.listing.delete({ where: { id: listing.id } });
    return { error: "One of the photos couldn’t be read. Try a different JPG, PNG or WebP file." };
  }

  if (publish) {
    await notify(user.id, {
      title: "Your listing is live",
      body: listing.title,
      href: `/listings/${listing.id}`,
    });
    await notifySavedSearchMatches(listing, user.id);
  }

  // The header (notification badge) lives in the root layout, which a
  // redirect alone doesn't re-render.
  revalidatePath("/", "layout");
  redirect(`/listings/${listing.id}`);
}
