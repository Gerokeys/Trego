import "server-only";
import { db } from "./db";
import { notify, notifyAdmins } from "./notifications";
import { formatMinorUnits } from "./money";
import {
  INSPECTION_WINDOW_HOURS,
  PAYMENT_WINDOW_MINUTES,
  SELLER_HANDOVER_DAYS,
} from "./escrow";

/**
 * Escrow order state machine. Every transition is a conditional update on
 * the current status, so double clicks, two tabs, or the timer sweep racing
 * a user can't apply the same step twice.
 *
 *   PENDING_PAYMENT → PAID → HANDED_OVER → COMPLETED
 *         ↓           ↓          ↓
 *     CANCELLED    REFUNDED   DISPUTED → REFUNDED | COMPLETED
 */

const HOUR_MS = 60 * 60 * 1000;
const orderHref = (id: string) => `/orders/${id}`;

async function orderWithListing(orderId: string) {
  return db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { listing: { select: { id: true, title: true } } },
  });
}

/**
 * Called when the payment partner confirms the money is held (in test mode,
 * by the simulated payment page). If someone else already bought the item,
 * the order is cancelled instead; a real integration would refund here.
 */
export async function markOrderPaid(orderId: string, paymentReference: string) {
  const now = new Date();
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { listing: true },
    });
    if (order.status !== "PENDING_PAYMENT") return "noop" as const;
    if (order.listing.status !== "ACTIVE") {
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelledAt: now } });
      return "unavailable" as const;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: now,
        paymentReference,
        handoverDeadline: new Date(now.getTime() + SELLER_HANDOVER_DAYS * 24 * HOUR_MS),
      },
    });
    await tx.listing.update({ where: { id: order.listingId }, data: { status: "RESERVED" } });
    // The item is spoken for: close other offers and the buyer's cart line.
    await tx.offer.updateMany({
      where: { listingId: order.listingId, status: "PENDING" },
      data: { status: "DECLINED", respondedAt: now },
    });
    await tx.cartItem.deleteMany({ where: { listingId: order.listingId, userId: order.buyerId } });
    return "paid" as const;
  });

  if (result !== "paid") return result;
  const order = await orderWithListing(orderId);
  await notify(order.sellerId, {
    title: `Payment secured: hand over within ${SELLER_HANDOVER_DAYS} days`,
    body: `${order.listing.title} · ${formatMinorUnits(order.amountMinorUnits, order.currency)}`,
    href: orderHref(order.id),
    sms: true,
  });
  await notify(order.buyerId, {
    title: "Payment received and held in escrow",
    body: order.listing.title,
    href: orderHref(order.id),
  });
  return result;
}

export async function markHandedOver(orderId: string, sellerId: string) {
  const now = new Date();
  const { count } = await db.order.updateMany({
    where: { id: orderId, sellerId, status: "PAID" },
    data: {
      status: "HANDED_OVER",
      handedOverAt: now,
      inspectionEndsAt: new Date(now.getTime() + INSPECTION_WINDOW_HOURS * HOUR_MS),
    },
  });
  if (count === 0) return false;

  const order = await orderWithListing(orderId);
  await notify(order.buyerId, {
    title: `Item handed over: you have ${INSPECTION_WINDOW_HOURS} hours to inspect it`,
    body: order.listing.title,
    href: orderHref(order.id),
    sms: true,
  });
  return true;
}

/** Releases the money to the seller: buyer confirmed, inspection window ran out, or an admin ruled for the seller. */
export async function completeOrder(orderId: string, reason: "confirmed" | "inspection_elapsed" | "dispute_released") {
  const now = new Date();
  const done = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: {
        id: orderId,
        status: reason === "dispute_released" ? "DISPUTED" : "HANDED_OVER",
      },
      data: { status: "COMPLETED", completedAt: now },
    });
    if (count === 0) return false;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    await tx.listing.update({ where: { id: order.listingId }, data: { status: "SOLD" } });
    if (reason === "dispute_released") {
      await tx.dispute.update({
        where: { orderId },
        data: { status: "RELEASED", resolvedAt: now },
      });
    }
    return true;
  });
  if (!done) return false;

  const order = await orderWithListing(orderId);
  await notify(order.sellerId, {
    title: "Payment released to you",
    body: `${order.listing.title} · ${formatMinorUnits(order.amountMinorUnits, order.currency)}`,
    href: orderHref(order.id),
    sms: true,
  });
  await notify(order.buyerId, {
    title:
      reason === "dispute_released"
        ? "Dispute resolved: payment released to the seller"
        : "Order complete. How did it go?",
    body: order.listing.title,
    href: orderHref(order.id),
    sms: reason === "dispute_released",
  });
  return true;
}

/** Returns the money to the buyer and puts the listing back on sale. */
export async function refundOrder(orderId: string, reason: "not_handed_over" | "dispute_refunded", note = "") {
  const now = new Date();
  const done = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: {
        id: orderId,
        status: reason === "dispute_refunded" ? "DISPUTED" : "PAID",
      },
      data: { status: "REFUNDED", refundedAt: now },
    });
    if (count === 0) return false;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    await tx.listing.update({ where: { id: order.listingId }, data: { status: "ACTIVE" } });
    if (reason === "dispute_refunded") {
      await tx.dispute.update({
        where: { orderId },
        data: { status: "REFUNDED", resolvedAt: now, resolutionNote: note },
      });
    }
    return true;
  });
  if (!done) return false;

  const order = await orderWithListing(orderId);
  const why =
    reason === "not_handed_over"
      ? `The seller didn’t hand it over within ${SELLER_HANDOVER_DAYS} days`
      : "Dispute resolved in your favour";
  await notify(order.buyerId, {
    title: `Refunded: ${why}`,
    body: `${order.listing.title} · ${formatMinorUnits(order.amountMinorUnits, order.currency)}`,
    href: orderHref(order.id),
    sms: true,
  });
  await notify(order.sellerId, {
    title: reason === "not_handed_over" ? "Order cancelled and refunded: not handed over in time" : "Dispute resolved: buyer refunded",
    body: order.listing.title,
    href: orderHref(order.id),
    sms: true,
  });
  return true;
}

export async function openDispute(orderId: string, buyerId: string, reason: string) {
  const now = new Date();
  const opened = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { id: orderId, buyerId, status: "HANDED_OVER", inspectionEndsAt: { gt: now } },
      data: { status: "DISPUTED" },
    });
    if (count === 0) return false;
    await tx.dispute.create({ data: { orderId, openedById: buyerId, reason } });
    return true;
  });
  if (!opened) return false;

  const order = await orderWithListing(orderId);
  await notify(order.sellerId, {
    title: "The buyer opened a dispute: the payment is on hold",
    body: order.listing.title,
    href: orderHref(order.id),
    sms: true,
  });
  await notifyAdmins({
    title: "New dispute to review",
    body: order.listing.title,
    href: "/admin/disputes",
  });
  return true;
}

export async function cancelPendingOrder(orderId: string, buyerId?: string) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT", ...(buyerId ? { buyerId } : {}) },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return count > 0;
}

/**
 * Applies escrow deadlines. Runs on order/admin page loads and from
 * /api/cron/escrow, which a scheduler should hit every few minutes in
 * production so deadlines apply even when nobody is looking.
 */
export async function sweepEscrowDeadlines() {
  const now = new Date();

  await db.order.updateMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { lt: new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60 * 1000) },
    },
    data: { status: "CANCELLED", cancelledAt: now },
  });

  const overdueHandovers = await db.order.findMany({
    where: { status: "PAID", handoverDeadline: { lt: now } },
    select: { id: true },
  });
  for (const { id } of overdueHandovers) {
    await refundOrder(id, "not_handed_over");
  }

  const finishedInspections = await db.order.findMany({
    where: { status: "HANDED_OVER", inspectionEndsAt: { lt: now } },
    select: { id: true },
  });
  for (const { id } of finishedInspections) {
    await completeOrder(id, "inspection_elapsed");
  }
}
