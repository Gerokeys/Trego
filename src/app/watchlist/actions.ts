"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

export async function toggleWatchAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  // Sellers can't watch their own listings.
  if (!listing || listing.status === "REMOVED" || listing.seller.userId === user.id) {
    return;
  }

  const key = { userId_listingId: { userId: user.id, listingId } };
  const existing = await db.watchlistItem.findUnique({ where: key });

  if (existing) {
    await db.watchlistItem.delete({ where: key });
  } else {
    await db.watchlistItem.create({ data: { userId: user.id, listingId } });
    await notify(listing.seller.userId, {
      title: "Someone is watching your listing",
      body: listing.title,
      href: `/listings/${listing.id}`,
    });
  }

  refresh();
}
