"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { completeOrder, refundOrder } from "@/lib/orders";

/** Takes a listing off the site and tells the seller why. Never touches listings in escrow. */
async function removeListing(listingId: string, why: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  if (!listing || listing.status === "RESERVED" || listing.status === "REMOVED") return false;

  await db.listing.update({ where: { id: listingId }, data: { status: "REMOVED" } });
  await db.offer.updateMany({
    where: { listingId, status: { in: ["PENDING", "ACCEPTED"] } },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  await notify(listing.seller.userId, {
    title: "Your listing was removed",
    body: `${listing.title}: ${why}`,
    href: "/help",
    sms: true,
  });
  return true;
}

export async function resolveReportsAction(formData: FormData) {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  const decision = formData.get("decision");
  const now = new Date();

  if (decision === "remove") {
    await removeListing(listingId, "it broke our listing rules");
    await db.report.updateMany({
      where: { listingId, status: "OPEN" },
      data: { status: "ACTIONED", resolvedAt: now },
    });
  } else if (decision === "dismiss") {
    await db.report.updateMany({
      where: { listingId, status: "OPEN" },
      data: { status: "DISMISSED", resolvedAt: now },
    });
  }

  refresh();
}

export async function adminRemoveListingAction(formData: FormData) {
  await requireAdmin();
  await removeListing(String(formData.get("listingId") ?? ""), "it broke our listing rules");
  refresh();
}

export async function setImeiStatusAction(formData: FormData) {
  await requireAdmin();
  const listingId = String(formData.get("listingId") ?? "");
  const status = formData.get("status");
  if (status !== "CLEAN" && status !== "BLACKLISTED" && status !== "NOT_CHECKED") return;

  await db.listing.update({
    where: { id: listingId },
    data: { imeiStatus: status, imeiCheckedAt: status === "NOT_CHECKED" ? null : new Date() },
  });
  if (status === "BLACKLISTED") {
    await removeListing(listingId, "its IMEI is reported lost or stolen");
  }

  refresh();
}

export async function suspendUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === admin.id) return;

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "ADMIN" || target.suspendedAt) return;

  await db.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
  await db.listing.updateMany({
    where: { seller: { userId }, status: { in: ["ACTIVE", "DRAFT"] } },
    data: { status: "REMOVED" },
  });
  await db.offer.updateMany({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: [{ buyerId: userId }, { listing: { seller: { userId } } }],
    },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
  });
  await db.report.updateMany({
    where: { listing: { seller: { userId } }, status: "OPEN" },
    data: { status: "ACTIONED", resolvedAt: new Date() },
  });

  refresh();
}

export async function resolveDisputeAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const decision = formData.get("decision");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  if (decision === "refund") {
    await refundOrder(orderId, "dispute_refunded", note);
  } else if (decision === "release") {
    const released = await completeOrder(orderId, "dispute_released");
    if (released && note) {
      await db.dispute.update({ where: { orderId }, data: { resolutionNote: note } });
    }
  }

  refresh();
}
