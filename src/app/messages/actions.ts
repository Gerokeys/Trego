"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, requireVerifiedUser } from "@/lib/auth";
import { messageSchema } from "@/lib/validation";
import { notify } from "@/lib/notifications";
import type { FormState } from "@/lib/form-state";

export async function startConversationAction(
  listingId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireVerifiedUser(`/messages/new?listing=${listingId}`);
  const body = messageSchema.safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0]?.message ?? "Write a message first." };

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { userId: true } } },
  });
  if (!listing || (listing.status !== "ACTIVE" && listing.status !== "RESERVED")) {
    return { error: "This listing isn’t available any more." };
  }
  if (listing.seller.userId === user.id) return { error: "This is your own listing." };

  const existing = await db.conversation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: user.id } },
  });
  const conversation =
    existing ??
    (await db.conversation.create({
      data: { listingId, buyerId: user.id, sellerId: listing.seller.userId },
    }));

  const now = new Date();
  await db.message.create({
    data: { conversationId: conversation.id, senderId: user.id, body: body.data },
  });
  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: now, lastMessageSenderId: user.id, buyerLastReadAt: now },
  });

  // Text the seller about new conversations only; replies show in the inbox badge.
  if (!existing) {
    await notify(listing.seller.userId, {
      title: `New message from ${user.displayName}`,
      body: listing.title,
      href: `/messages/${conversation.id}`,
      sms: true,
    });
  }

  revalidatePath("/", "layout");
  redirect(`/messages/${conversation.id}`);
}

export async function sendMessageAction(
  conversationId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireVerifiedUser(`/messages/${conversationId}`);
  const body = messageSchema.safeParse(formData.get("body"));
  if (!body.success) return { error: body.error.issues[0]?.message ?? "Write a message first." };

  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || (conversation.buyerId !== user.id && conversation.sellerId !== user.id)) {
    return { error: "Conversation not found." };
  }

  const now = new Date();
  const isBuyer = conversation.buyerId === user.id;
  await db.message.create({ data: { conversationId, senderId: user.id, body: body.data } });
  await db.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: now,
      lastMessageSenderId: user.id,
      ...(isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now }),
    },
  });

  refresh();
  return { error: null, done: true };
}

/** Called from the browser once a thread is on screen. */
export async function markConversationReadAction(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const conversation = await db.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return;

  const isBuyer = conversation.buyerId === user.id;
  if (!isBuyer && conversation.sellerId !== user.id) return;
  const readAt = isBuyer ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
  if (readAt && readAt >= conversation.lastMessageAt) return;

  const now = new Date();
  await db.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now },
  });
  // Update the header's unread badge.
  refresh();
}
