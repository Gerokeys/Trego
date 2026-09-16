import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { OnMount } from "@/components/on-mount";
import { AutoRefresh } from "@/components/auto-refresh";
import { MessageComposer } from "../message-composer";
import { markConversationReadAction, sendMessageAction } from "../actions";

export const metadata = { title: "Conversation — Trego" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } },
      buyer: { select: { displayName: true } },
      seller: { select: { displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 200 },
    },
  });
  if (!conversation) notFound();

  const isParticipant = conversation.buyerId === user.id || conversation.sellerId === user.id;
  // Admins can read threads when reviewing disputes, but not reply.
  if (!isParticipant && user.role !== "ADMIN") notFound();

  const isBuyer = conversation.buyerId === user.id;
  const otherName = isBuyer ? conversation.seller.displayName : conversation.buyer.displayName;
  const listing = conversation.listing;
  const photo = listing.photos[0];
  const lastMessageId = conversation.messages[0]?.id ?? "none";

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8">
      <Link href="/messages" className="text-sm text-highlight underline">
        ← All messages
      </Link>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
        <Link
          href={`/listings/${listing.id}`}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border"
        >
          {photo ? <Image src={photo.url} alt="" fill sizes="56px" className="object-contain p-1" /> : null}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            {isParticipant ? `Chat with ${otherName}` : `${conversation.buyer.displayName} (buyer) and ${conversation.seller.displayName} (seller)`}
          </p>
          <Link href={`/listings/${listing.id}`} className="block truncate font-medium hover:underline">
            {listing.title}
          </Link>
          <p className="text-sm">
            {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
            <span className="ml-2 text-xs text-muted">{LISTING_STATUS_LABELS[listing.status]}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 rounded-lg bg-highlight-soft px-3 py-2 text-xs">
        Stay safe: pay through Trego Escrow, never send a deposit by M-Pesa
        before you’ve seen the item, and meet somewhere public.
      </p>

      {/* Newest first in a reversed column, so the thread opens at the bottom. */}
      <div className="mt-4 flex min-h-64 max-h-[60vh] flex-col-reverse gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-4">
        {conversation.messages.map((message) => {
          const mine = message.senderId === user.id;
          const senderName =
            message.senderId === conversation.buyerId
              ? conversation.buyer.displayName
              : conversation.seller.displayName;
          return (
            <div
              key={message.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                mine ? "self-end bg-accent text-accent-foreground" : "self-start bg-tile"
              }`}
            >
              {!isParticipant ? <p className="text-xs font-semibold">{senderName}</p> : null}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className={`mt-1 text-[11px] ${mine ? "text-accent-foreground/60" : "text-muted"}`}>
                {timeAgo(message.createdAt)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {isParticipant ? (
          <MessageComposer action={sendMessageAction.bind(null, id)} />
        ) : (
          <p className="text-sm text-muted">You’re viewing this conversation as an admin.</p>
        )}
      </div>

      {isParticipant ? (
        <OnMount key={lastMessageId} action={markConversationReadAction.bind(null, id)} />
      ) : null}
      <AutoRefresh seconds={10} />
    </div>
  );
}
