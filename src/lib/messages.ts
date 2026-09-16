import "server-only";
import { db } from "./db";

type ConversationReadState = {
  buyerId: string;
  lastMessageAt: Date;
  lastMessageSenderId: string | null;
  buyerLastReadAt: Date | null;
  sellerLastReadAt: Date | null;
};

/** True when the other person sent the latest message and this user hasn't opened it since. */
export function isUnreadFor(conversation: ConversationReadState, userId: string) {
  if (!conversation.lastMessageSenderId || conversation.lastMessageSenderId === userId) return false;
  const readAt =
    conversation.buyerId === userId ? conversation.buyerLastReadAt : conversation.sellerLastReadAt;
  return !readAt || readAt < conversation.lastMessageAt;
}

export async function countUnreadConversations(userId: string) {
  const conversations = await db.conversation.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    select: {
      buyerId: true,
      lastMessageAt: true,
      lastMessageSenderId: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
    },
  });
  return conversations.filter((c) => isUnreadFor(c, userId)).length;
}
