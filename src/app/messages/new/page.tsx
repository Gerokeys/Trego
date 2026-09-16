import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { MessageComposer } from "../message-composer";
import { startConversationAction } from "../actions";

export const metadata = { title: "Message the seller — Trego" };

export default async function NewMessagePage({ searchParams }: PageProps<"/messages/new">) {
  const { listing: listingParam } = await searchParams;
  const listingId = typeof listingParam === "string" ? listingParam : "";
  const user = await requireVerifiedUser(`/messages/new?listing=${listingId}`);

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      seller: { include: { user: { select: { displayName: true } } } },
    },
  });
  if (!listing || (listing.status !== "ACTIVE" && listing.status !== "RESERVED")) notFound();
  if (listing.seller.userId === user.id) redirect(`/listings/${listingId}`);

  const existing = await db.conversation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: user.id } },
    select: { id: true },
  });
  if (existing) redirect(`/messages/${existing.id}`);

  const photo = listing.photos[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Message {listing.seller.user.displayName}
      </h1>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
          {photo ? <Image src={photo.url} alt="" fill sizes="56px" className="object-contain p-1" /> : null}
        </span>
        <div className="min-w-0">
          <Link href={`/listings/${listing.id}`} className="block truncate font-medium hover:underline">
            {listing.title}
          </Link>
          <p className="text-sm">{formatMinorUnits(listing.priceMinorUnits, listing.currency)}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        Ask about anything the listing doesn’t cover: battery health, what’s
        in the box, where to meet. The seller gets a text about your first
        message.
      </p>

      <div className="mt-4">
        <MessageComposer
          action={startConversationAction.bind(null, listing.id)}
          placeholder="Hi, is this still available?"
          submitLabel="Send message"
        />
      </div>
    </div>
  );
}
