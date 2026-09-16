"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentMode } from "@/lib/payments";
import {
  cancelPendingOrder,
  completeOrder,
  markHandedOver,
  markOrderPaid,
  openDispute,
} from "@/lib/orders";
import { notify } from "@/lib/notifications";
import { disputeReasonSchema, reviewSchema } from "@/lib/validation";
import type { FormState } from "@/lib/form-state";

/** Test-mode stand-in for the payment partner's webhook. */
export async function simulatePaymentAction(orderId: string, formData: FormData) {
  const user = await requireUser(`/orders/${orderId}/pay`);
  if (getPaymentMode() !== "simulated") redirect(`/orders/${orderId}`);

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.buyerId !== user.id) redirect("/orders");

  if (formData.get("outcome") === "success") {
    await markOrderPaid(orderId, `TEST-${randomUUID().slice(0, 8).toUpperCase()}`);
  } else {
    await cancelPendingOrder(orderId, user.id);
  }

  revalidatePath("/", "layout");
  redirect(`/orders/${orderId}`);
}

export async function cancelOrderAction(orderId: string) {
  const user = await requireUser(`/orders/${orderId}`);
  await cancelPendingOrder(orderId, user.id);
  refresh();
}

export async function markHandedOverAction(orderId: string) {
  const user = await requireUser(`/orders/${orderId}`);
  await markHandedOver(orderId, user.id);
  refresh();
}

export async function confirmReceivedAction(orderId: string) {
  const user = await requireUser(`/orders/${orderId}`);
  const order = await db.order.findUnique({ where: { id: orderId }, select: { buyerId: true } });
  if (order?.buyerId !== user.id) return;
  await completeOrder(orderId, "confirmed");
  refresh();
}

export async function openDisputeAction(
  orderId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser(`/orders/${orderId}`);
  const reason = disputeReasonSchema.safeParse(formData.get("reason"));
  if (!reason.success) return { error: reason.error.issues[0]?.message ?? "Describe the problem." };

  const opened = await openDispute(orderId, user.id, reason.data);
  if (!opened) {
    return { error: "This order can’t be disputed: the inspection window has closed." };
  }
  refresh();
  return { error: null, done: true };
}

export async function leaveReviewAction(
  orderId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser(`/orders/${orderId}`);
  const parsed = reviewSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choose a rating." };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { listing: { select: { sellerId: true, title: true } }, review: true },
  });
  if (!order || order.buyerId !== user.id || order.status !== "COMPLETED") {
    return { error: "You can only review orders you’ve completed." };
  }
  if (order.review) return { error: "You’ve already reviewed this order." };

  await db.review.create({
    data: {
      orderId,
      sellerId: order.listing.sellerId,
      buyerId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });
  await notify(order.sellerId, {
    title: `New ${parsed.data.rating}-star review`,
    body: order.listing.title,
    href: `/sellers/${order.listing.sellerId}`,
  });

  refresh();
  return { error: null, done: true };
}
