import "server-only";
import { db } from "./db";

/** An accepted, unexpired offer the buyer can check out with. */
export function findPayableOffer(offerId: string, buyerId: string, listingId: string) {
  return db.offer.findFirst({
    where: { id: offerId, buyerId, listingId, status: "ACCEPTED", expiresAt: { gt: new Date() } },
  });
}

/** The buyer's pending or accepted offer on a listing, if still in date. */
export function findBuyerLiveOffer(listingId: string, buyerId: string) {
  return db.offer.findFirst({
    where: {
      listingId,
      buyerId,
      status: { in: ["PENDING", "ACCEPTED"] },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function countPendingOffers(listingId: string) {
  return db.offer.count({
    where: { listingId, status: "PENDING", expiresAt: { gt: new Date() } },
  });
}

export function offerStatusLabel(offer: { status: string; expiresAt: Date }) {
  const lapsed = offer.expiresAt < new Date();
  if (offer.status === "PENDING") return lapsed ? "Expired" : "Waiting for the seller";
  if (offer.status === "ACCEPTED") return lapsed ? "Accepted · payment window closed" : "Accepted · awaiting payment";
  return offer.status === "DECLINED" ? "Declined" : "Withdrawn";
}

export function isOfferOpen(offer: { status: string; expiresAt: Date }) {
  return (offer.status === "PENDING" || offer.status === "ACCEPTED") && offer.expiresAt > new Date();
}
