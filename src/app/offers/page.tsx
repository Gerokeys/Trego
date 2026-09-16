import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { isOfferOpen, offerStatusLabel } from "@/lib/offers";
import { timeAgo } from "@/lib/time";
import { OFFER_VALID_HOURS } from "@/lib/escrow";
import { ConfirmButton } from "@/components/confirm-button";
import { respondToOfferAction, withdrawOfferAction } from "./actions";

export const metadata = { title: "Offers — Trego" };

const listingSelect = {
  id: true,
  title: true,
  priceMinorUnits: true,
  currency: true,
  status: true,
  photos: { orderBy: { position: "asc" as const }, take: 1 },
};

const smallButton =
  "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-foreground";

export default async function OffersPage() {
  const user = await requireUser("/offers");

  const [received, sent] = await Promise.all([
    db.offer.findMany({
      where: { listing: { seller: { userId: user.id } } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { buyer: { select: { displayName: true } }, listing: { select: listingSelect } },
    }),
    db.offer.findMany({
      where: { buyerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { listing: { select: listingSelect } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
      <p className="mt-1 text-sm text-muted">
        Offers last {OFFER_VALID_HOURS} hours. An accepted offer gives the
        buyer {OFFER_VALID_HOURS} hours to pay through escrow.
      </p>

      <h2 className="mt-8 text-lg font-semibold">On your listings</h2>
      {received.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No offers yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {received.map((offer) => {
            const open = offer.status === "PENDING" && isOfferOpen(offer);
            return (
              <li key={offer.id} className="flex flex-wrap items-center gap-4 p-4">
                <OfferListing listing={offer.listing} />
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <span className="font-semibold">
                      {formatMinorUnits(offer.amountMinorUnits, offer.listing.currency)}
                    </span>{" "}
                    from {offer.buyer.displayName}
                    <span className="text-muted">
                      {" "}· asking {formatMinorUnits(offer.listing.priceMinorUnits, offer.listing.currency)}
                    </span>
                  </p>
                  {offer.message ? <p className="mt-0.5 text-muted">“{offer.message}”</p> : null}
                  <p className="mt-0.5 text-xs text-muted">
                    {offerStatusLabel(offer)} · {timeAgo(offer.createdAt)}
                  </p>
                </div>
                {open ? (
                  <form action={respondToOfferAction} className="flex gap-2">
                    <input type="hidden" name="offerId" value={offer.id} />
                    <ConfirmButton
                      name="decision"
                      value="accept"
                      message={`Accept this offer? The buyer then has ${OFFER_VALID_HOURS} hours to pay.`}
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                    >
                      Accept
                    </ConfirmButton>
                    <button type="submit" name="decision" value="decline" className={smallButton}>
                      Decline
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold">Offers you’ve made</h2>
      {sent.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          You haven’t made any offers. Look for “Make an offer” on listings.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sent.map((offer) => {
            const open = isOfferOpen(offer);
            return (
              <li key={offer.id} className="flex flex-wrap items-center gap-4 p-4">
                <OfferListing listing={offer.listing} />
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <span className="font-semibold">
                      {formatMinorUnits(offer.amountMinorUnits, offer.listing.currency)}
                    </span>
                    <span className="text-muted">
                      {" "}· asking {formatMinorUnits(offer.listing.priceMinorUnits, offer.listing.currency)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {offerStatusLabel(offer)}
                    {open ? ` · expires ${timeAgo(offer.expiresAt)}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {offer.status === "ACCEPTED" && open && offer.listing.status === "ACTIVE" ? (
                    <Link
                      href={`/checkout/${offer.listing.id}?offer=${offer.id}`}
                      className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
                    >
                      Pay now
                    </Link>
                  ) : null}
                  {open ? (
                    <form action={withdrawOfferAction}>
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button type="submit" className={smallButton}>
                        Withdraw
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OfferListing({
  listing,
}: {
  listing: { id: string; title: string; photos: { url: string }[] };
}) {
  const photo = listing.photos[0];
  return (
    <Link href={`/listings/${listing.id}`} className="flex w-full items-center gap-3 sm:w-56">
      <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
        {photo ? <Image src={photo.url} alt="" fill sizes="48px" className="object-contain p-1" /> : null}
      </span>
      <span className="truncate text-sm font-medium hover:underline">{listing.title}</span>
    </Link>
  );
}
