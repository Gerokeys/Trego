"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { getPaymentMode, paymentUrlFor } from "@/lib/payments";
import { findPayableOffer } from "@/lib/offers";

export async function startCheckoutAction(listingId: string, formData: FormData) {
  const user = await requireVerifiedUser(`/checkout/${listingId}`);
  const mode = getPaymentMode();
  if (mode === "disabled") redirect(`/checkout/${listingId}`);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  if (!listing || listing.status !== "ACTIVE" || listing.seller.userId === user.id) {
    redirect(`/checkout/${listingId}?error=unavailable`);
  }

  const method = formData.get("handoverMethod");
  const handoverMethod =
    method === "DELIVERY" && listing.delivery
      ? "DELIVERY"
      : method === "MEET_UP" && listing.meetUp
        ? "MEET_UP"
        : null;
  if (!handoverMethod) redirect(`/checkout/${listingId}?error=handover`);

  const offerId = formData.get("offerId");
  const offer =
    typeof offerId === "string" && offerId ? await findPayableOffer(offerId, user.id, listingId) : null;
  if (offerId && !offer) redirect(`/checkout/${listingId}?error=offer`);

  // One open checkout per buyer per listing.
  await db.order.updateMany({
    where: { listingId, buyerId: user.id, status: "PENDING_PAYMENT" },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  const order = await db.order.create({
    data: {
      listingId,
      buyerId: user.id,
      sellerId: listing.seller.userId,
      offerId: offer?.id ?? null,
      amountMinorUnits: offer?.amountMinorUnits ?? listing.priceMinorUnits,
      currency: listing.currency,
      handoverMethod,
      paymentProvider: mode,
      paymentPhone: user.phoneNumber,
    },
  });

  redirect(paymentUrlFor(order.id));
}
