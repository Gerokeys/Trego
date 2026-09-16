"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";
import { reportSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

/** Counts a view. Called from the browser once the page shows; never counts the seller. */
export async function recordViewAction(listingId: string) {
  const user = await getCurrentUser();
  await db.listing.updateMany({
    where: {
      id: listingId,
      status: "ACTIVE",
      ...(user ? { seller: { userId: { not: user.id } } } : {}),
    },
    data: { viewCount: { increment: 1 } },
  });
}

export async function reportListingAction(
  listingId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser(`/listings/${listingId}`);
  const parsed = reportSchema.safeParse({
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a reason." };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { title: true, seller: { select: { userId: true } } },
  });
  if (!listing) return { error: "Listing not found." };
  if (listing.seller.userId === user.id) return { error: "You can’t report your own listing." };

  const existing = await db.report.findUnique({
    where: { listingId_reporterId: { listingId, reporterId: user.id } },
  });
  if (!existing) {
    await db.report.create({
      data: { listingId, reporterId: user.id, reason: parsed.data.reason, details: parsed.data.details },
    });
    await notifyAdmins({ title: "New listing report", body: listing.title, href: "/admin/reports" });
  }
  return { error: null, done: true };
}
