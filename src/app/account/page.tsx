import Image from "next/image";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMinorUnits } from "@/lib/money";
import { toLocalPhone } from "@/lib/phone";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { changeListingStatusAction } from "./listing-actions";
import { ConfirmButton } from "@/components/confirm-button";
import { ShieldCheckIcon } from "@/components/icons";

export const metadata = { title: "Your account — Trego" };

const QUICK_LINKS = [
  { href: "/orders", label: "Orders", detail: "Purchases and sales in escrow" },
  { href: "/offers", label: "Offers", detail: "Offers you’ve made and received" },
  { href: "/messages", label: "Messages", detail: "Chats with buyers and sellers" },
  { href: "/watchlist", label: "Watchlist", detail: "Listings you’re keeping an eye on" },
  { href: "/saved-searches", label: "Saved searches", detail: "Get told about new matches" },
];

const actionClass =
  "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-foreground";

function StatusForm({ listingId, change, label, confirm }: { listingId: string; change: string; label: string; confirm?: string }) {
  return (
    <form action={changeListingStatusAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="change" value={change} />
      {confirm ? (
        <ConfirmButton message={confirm} className={actionClass}>
          {label}
        </ConfirmButton>
      ) : (
        <button type="submit" className={actionClass}>
          {label}
        </button>
      )}
    </form>
  );
}

export default async function AccountPage() {
  const user = await requireUser("/account");

  const listings = user.sellerProfile
    ? await db.listing.findMany({
        where: { sellerId: user.sellerProfile.id, status: { not: "REMOVED" } },
        orderBy: { createdAt: "desc" },
        include: {
          photos: { orderBy: { position: "asc" }, take: 1 },
          orders: {
            where: { status: { in: ["PAID", "HANDED_OVER", "DISPUTED", "COMPLETED"] } },
            select: { id: true },
            take: 1,
          },
          _count: { select: { watchers: true, offers: { where: { status: "PENDING" } } } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.displayName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {user.phoneNumber ? toLocalPhone(user.phoneNumber) : user.email}
            {user.phoneVerifiedAt ? (
              <span className="flex items-center gap-1 text-highlight">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                Verified
              </span>
            ) : null}
          </p>
        </div>
        {user.sellerProfile ? (
          <Link href={`/sellers/${user.sellerProfile.id}`} className="text-sm text-highlight underline">
            View your public seller profile
          </Link>
        ) : null}
      </div>

      {!user.phoneVerifiedAt ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Verify your phone number to sell, message sellers, make offers and buy through escrow.</p>
          <Link href="/account/verify-phone" className="rounded-full bg-accent px-4 py-2 font-medium text-accent-foreground">
            Verify now
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-border bg-surface p-4 hover:border-foreground"
          >
            <p className="font-semibold">{link.label}</p>
            <p className="mt-1 text-xs text-muted">{link.detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your listings</h2>
        <Link
          href="/sell/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
        >
          New listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <p className="mt-6 text-muted">You haven’t listed anything yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {listings.map((listing) => {
            const photo = listing.photos[0];
            const soldThroughEscrow = listing.orders.length > 0;
            return (
              <li key={listing.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link
                  href={`/listings/${listing.id}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  {photo ? (
                    <Image src={photo.url} alt="" fill sizes="64px" className="object-contain p-1" />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                      {listing.title}
                    </Link>
                    <span className="rounded-full bg-tile px-2 py-0.5 text-xs">
                      {LISTING_STATUS_LABELS[listing.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold">
                    {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
                  </p>
                  <p className="text-xs text-muted">
                    {listing.viewCount} views · {listing._count.watchers} watching ·{" "}
                    {listing._count.offers} pending offers
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.status === "DRAFT" || listing.status === "ACTIVE" ? (
                    <Link href={`/listings/${listing.id}/edit`} className={actionClass}>
                      Edit
                    </Link>
                  ) : null}
                  {listing.status === "DRAFT" ? (
                    <StatusForm listingId={listing.id} change="publish" label="Publish" />
                  ) : null}
                  {listing.status === "ACTIVE" ? (
                    <StatusForm
                      listingId={listing.id}
                      change="sold"
                      label="Mark as sold"
                      confirm="Mark this as sold elsewhere? It will be taken off sale and open offers declined."
                    />
                  ) : null}
                  {listing.status === "SOLD" && !soldThroughEscrow ? (
                    <StatusForm listingId={listing.id} change="relist" label="Relist" />
                  ) : null}
                  {listing.status === "RESERVED" ? (
                    <Link href="/orders" className={actionClass}>
                      View order
                    </Link>
                  ) : (
                    <StatusForm
                      listingId={listing.id}
                      change="delete"
                      label="Delete"
                      confirm="Delete this listing? Buyers will no longer be able to see it."
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
