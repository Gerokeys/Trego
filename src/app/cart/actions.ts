"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

export async function addToCartAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  if (!listing || listing.status !== "ACTIVE" || listing.seller.userId === user.id) {
    return;
  }

  const key = { userId_listingId: { userId: user.id, listingId } };
  const existing = await db.cartItem.findUnique({ where: key });
  if (!existing) {
    await db.cartItem.create({ data: { userId: user.id, listingId } });
    await notify(listing.seller.userId, {
      title: "Someone added your listing to their cart",
      body: listing.title,
      href: `/listings/${listing.id}`,
    });
  }

  // Re-render the root layout too, so the header cart badge updates.
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const listingId = String(formData.get("listingId") ?? "");
  await db.cartItem.deleteMany({ where: { userId: user.id, listingId } });
  refresh();
}
