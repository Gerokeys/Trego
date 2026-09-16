import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { CONDITION_LABELS } from "@/lib/conditions";
import { INSPECTION_WINDOW_HOURS } from "@/lib/escrow";
import { getPaymentMode } from "@/lib/payments";
import { removeFromCartAction } from "./actions";

export const metadata = { title: "Cart — Trego" };

export default async function CartPage() {
  const user = await requireUser("/cart");
  const paymentsOn = getPaymentMode() !== "disabled";

  const items = await db.cartItem.findMany({
    where: { userId: user.id, listing: { status: { not: "REMOVED" } } },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          photos: { orderBy: { position: "asc" }, take: 1 },
          seller: { include: { user: { select: { displayName: true } } } },
        },
      },
    },
  });

  const available = items.filter((item) => item.listing.status === "ACTIVE");
  const subtotal = available.reduce((sum, item) => sum + item.listing.priceMinorUnits, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Shopping cart</h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="font-medium">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Find something you like and add it here.</p>
          <Link
            href="/browse"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <ul className="flex flex-col gap-4">
            {items.map(({ listing }) => {
              const photo = listing.photos[0];
              const isAvailable = listing.status === "ACTIVE";
              return (
                <li key={listing.id} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border"
                  >
                    {photo ? (
                      <Image src={photo.url} alt={listing.title} fill sizes="96px" className="object-contain p-1" />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-xs text-muted">Seller: {listing.seller.user.displayName}</p>
                    <Link href={`/listings/${listing.id}`} className="font-medium leading-snug hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {CONDITION_LABELS[listing.conditionGrade] ?? listing.conditionGrade}
                      {listing.county ? ` · ${listing.county}` : ""}
                    </p>
                    {!isAvailable ? (
                      <p className="text-sm font-medium text-danger">
                        {listing.status === "RESERVED" ? "Sale in progress" : "No longer available"}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end justify-between gap-2">
                    <p className="font-semibold whitespace-nowrap">
                      {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
                    </p>
                    {isAvailable && paymentsOn ? (
                      <Link
                        href={`/checkout/${listing.id}`}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
                      >
                        Buy now
                      </Link>
                    ) : null}
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button type="submit" className="text-sm text-highlight underline">
                        Remove
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-6">
            <div className="flex justify-between text-sm">
              <span>Items ({available.length})</span>
              <span>{formatMinorUnits(subtotal, "KES")}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-semibold">
              <span>Subtotal</span>
              <span>{formatMinorUnits(subtotal, "KES")}</span>
            </div>
            <p className="mt-4 rounded-lg bg-highlight-soft p-3 text-xs">
              {paymentsOn ? (
                <>
                  Used items come from different sellers, so each one is bought
                  on its own through escrow. Your payment is held until you’ve
                  had {INSPECTION_WINDOW_HOURS} hours to inspect the item.
                </>
              ) : (
                <>Checkout opens when Trego Escrow launches.</>
              )}{" "}
              <Link href="/protection" className="text-highlight underline">
                How escrow works
              </Link>
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
