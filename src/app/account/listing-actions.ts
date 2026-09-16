"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { ListingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { notifySavedSearchMatches } from "@/lib/saved-searches";

/** Seller-side status changes: publish a draft, mark sold, relist, delete. */
export async function changeListingStatusAction(formData: FormData) {
  const user = await requireUser("/account");
  const listingId = String(formData.get("listingId") ?? "");
  const change = String(formData.get("change") ?? "");

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: { select: { userId: true } },
      orders: {
        where: { status: { in: ["PAID", "HANDED_OVER", "DISPUTED", "COMPLETED"] } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!listing || listing.seller.userId !== user.id) return;
  const soldThroughEscrow = listing.orders.length > 0;

  let status: ListingStatus | null = null;
  if (change === "publish" && listing.status === "DRAFT") status = "ACTIVE";
  if (change === "sold" && listing.status === "ACTIVE") status = "SOLD";
  if (change === "relist" && listing.status === "SOLD" && !soldThroughEscrow) status = "ACTIVE";
  if (change === "delete" && listing.status !== "RESERVED" && listing.status !== "REMOVED") status = "REMOVED";
  if (!status) return;

  if (change === "publish" && !user.phoneVerifiedAt) {
    redirect(`/account/verify-phone?next=/account`);
  }

  const updated = await db.listing.update({
    where: { id: listingId },
    // Publishing a draft puts it at the top of "Newly listed".
    data: { status, ...(change === "publish" ? { createdAt: new Date() } : {}) },
  });

  if (status === "SOLD" || status === "REMOVED") {
    await db.offer.updateMany({
      where: { listingId, status: { in: ["PENDING", "ACCEPTED"] } },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
  }
  if (change === "publish") {
    await notify(user.id, { title: "Your listing is live", body: updated.title, href: `/listings/${listingId}` });
    await notifySavedSearchMatches(updated, user.id);
  }

  refresh();
}
