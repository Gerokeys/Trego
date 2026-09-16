import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isUnreadFor } from "@/lib/messages";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Messages — Trego" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");

  const conversations = await db.conversation.findMany({
    where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
    orderBy: { lastMessageAt: "desc" },
    include: {
      listing: {
        select: { title: true, photos: { orderBy: { position: "asc" }, take: 1 } },
      },
      buyer: { select: { displayName: true } },
      seller: { select: { displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>

      {conversations.length === 0 ? (
        <p className="mt-8 text-muted">
          No messages yet. Use “Message seller” on any listing to ask a
          question before you buy.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {conversations.map((c) => {
            const isBuyer = c.buyerId === user.id;
            const other = isBuyer ? c.seller.displayName : c.buyer.displayName;
            const last = c.messages[0];
            const unread = isUnreadFor(c, user.id);
            const photo = c.listing.photos[0];
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-background">
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                    {photo ? (
                      <Image src={photo.url} alt="" fill sizes="56px" className="object-contain p-1" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>
                        {other}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{isBuyer ? "Seller" : "Buyer"}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{c.listing.title}</span>
                    {last ? (
                      <span className={`block truncate text-sm ${unread ? "text-foreground" : "text-muted"}`}>
                        {last.senderId === user.id ? "You: " : ""}
                        {last.body}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted">{timeAgo(c.lastMessageAt)}</span>
                    {unread ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-highlight">
                        <span className="sr-only">Unread</span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
