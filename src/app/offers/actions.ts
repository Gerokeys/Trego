"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireVerifiedUser } from "@/lib/auth";
import { offerSchema } from "@/lib/validation";
import { formatMinorUnits, majorToMinorUnits } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { OFFER_VALID_HOURS } from "@/lib/escrow";
import type { FormState } from "@/lib/form-state";

const HOUR_MS = 60 * 60 * 1000;

export async function makeOfferAction(
  listingId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireVerifiedUser(`/listings/${listingId}`);
  const parsed = offerSchema.safeParse({
    amountMajorUnits: formData.get("amountMajorUnits"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid offer." };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  if (!listing || listing.status !== "ACTIVE" || !listing.acceptsOffers) {
    return { error: "This listing isn’t taking offers right now." };
  }
  if (listing.seller.userId === user.id) return { error: "You can’t make an offer on your own listing." };

  const amount = majorToMinorUnits(parsed.data.amountMajorUnits);
  if (amount >= listing.priceMinorUnits) {
    return {
      error: `Offer less than the asking price of ${formatMinorUnits(listing.priceMinorUnits, listing.currency)}, or just buy it now.`,
    };
  }

  const now = new Date();
  // One live offer per buyer: a new one replaces the old.
  await db.offer.updateMany({
    where: { listingId, buyerId: user.id, status: "PENDING" },
    data: { status: "WITHDRAWN", respondedAt: now },
  });
  await db.offer.create({
    data: {
      listingId,
      buyerId: user.id,
      amountMinorUnits: amount,
      message: parsed.data.message,
      expiresAt: new Date(now.getTime() + OFFER_VALID_HOURS * HOUR_MS),
    },
  });
  await notify(listing.seller.userId, {
    title: `New offer: ${formatMinorUnits(amount, listing.currency)}`,
    body: listing.title,
    href: "/offers",
    sms: true,
  });

  refresh();
  return { error: null, done: true };
}

/**
 * Accepting doesn't reserve the item; it gives the buyer OFFER_VALID_HOURS to
 * pay the accepted price. Whoever pays first gets it.
 */
export async function respondToOfferAction(formData: FormData) {
  const user = await requireUser("/offers");
  const offerId = String(formData.get("offerId") ?? "");
  const decision = formData.get("decision");

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: { listing: { include: { seller: { select: { userId: true } } } } },
  });
  const now = new Date();
  if (
    !offer ||
    offer.listing.seller.userId !== user.id ||
    offer.status !== "PENDING" ||
    offer.expiresAt < now
  ) {
    return;
  }

  const amount = formatMinorUnits(offer.amountMinorUnits, offer.listing.currency);
  if (decision === "accept" && offer.listing.status === "ACTIVE") {
    await db.offer.update({
      where: { id: offerId },
      data: {
        status: "ACCEPTED",
        respondedAt: now,
        expiresAt: new Date(now.getTime() + OFFER_VALID_HOURS * HOUR_MS),
      },
    });
    await notify(offer.buyerId, {
      title: `Offer accepted: pay ${amount} within ${OFFER_VALID_HOURS} hours`,
      body: offer.listing.title,
      href: `/checkout/${offer.listingId}?offer=${offer.id}`,
      sms: true,
    });
  } else if (decision === "decline") {
    await db.offer.update({ where: { id: offerId }, data: { status: "DECLINED", respondedAt: now } });
    await notify(offer.buyerId, {
      title: `Offer of ${amount} declined`,
      body: offer.listing.title,
      href: `/listings/${offer.listingId}`,
    });
  }

  refresh();
}

export async function withdrawOfferAction(formData: FormData) {
  const user = await requireUser("/offers");
  const offerId = String(formData.get("offerId") ?? "");
  await db.offer.updateMany({
    where: { id: offerId, buyerId: user.id, status: { in: ["PENDING", "ACCEPTED"] } },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
  });
  refresh();
}
