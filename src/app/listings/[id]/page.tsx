import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { categoryLabel } from "@/lib/categories";
import { CONDITION_LABELS } from "@/lib/conditions";
import { INSPECTION_WINDOW_HOURS } from "@/lib/escrow";
import { IMEI_STATUS_LABELS } from "@/lib/imei";
import { getPaymentMode } from "@/lib/payments";
import { countPendingOffers, findBuyerLiveOffer } from "@/lib/offers";
import { timeAgo } from "@/lib/time";
import { addToCartAction } from "@/app/cart/actions";
import { makeOfferAction, withdrawOfferAction } from "@/app/offers/actions";
import { changeListingStatusAction } from "@/app/account/listing-actions";
import { adminRemoveListingAction, setImeiStatusAction } from "@/app/admin/actions";
import { WatchButton } from "@/components/watch-button";
import { ListingGallery } from "@/components/listing-gallery";
import { OnMount } from "@/components/on-mount";
import { ShareWhatsApp } from "@/components/share-whatsapp";
import { StarRating } from "@/components/star-rating";
import { ConfirmButton } from "@/components/confirm-button";
import { MapPinIcon, MessageIcon, ShieldCheckIcon } from "@/components/icons";
import { OfferForm } from "./offer-form";
import { ReportForm } from "./report-form";
import { recordViewAction, reportListingAction } from "./actions";

const primaryButton =
  "block w-full rounded-full bg-accent px-6 py-3 text-center font-semibold text-accent-foreground hover:opacity-90";
const secondaryButton =
  "flex w-full items-center justify-center gap-2 rounded-full border border-foreground bg-surface px-6 py-3 text-center font-semibold hover:bg-background";
const smallButton =
  "rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground";

function maskImei(imei: string) {
  return `•••• •••• ••• ${imei.slice(-4)}`;
}

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    select: {
      title: true,
      priceMinorUnits: true,
      currency: true,
      conditionGrade: true,
      county: true,
      status: true,
      defectsDescription: true,
    },
  });
  if (!listing || listing.status === "REMOVED" || listing.status === "DRAFT") {
    return { title: "Listing — Trego" };
  }

  const price = formatMinorUnits(listing.priceMinorUnits, listing.currency);
  const summary = [price, CONDITION_LABELS[listing.conditionGrade], listing.county]
    .filter(Boolean)
    .join(" · ");
  const description = listing.defectsDescription
    ? `${summary}. ${listing.defectsDescription.slice(0, 140)}`
    : `${summary}. Condition disclosed up front on Trego.`;

  // The preview image comes from ./opengraph-image.tsx.
  return {
    title: `${listing.title} — ${price} | Trego`,
    description,
    openGraph: { title: `${listing.title} — ${price}`, description, siteName: "Trego", type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ListingDetailPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;

  const [listing, user] = await Promise.all([
    db.listing.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: "asc" } },
        seller: {
          include: {
            user: { select: { displayName: true, createdAt: true, phoneVerifiedAt: true } },
          },
        },
        _count: { select: { watchers: true } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!listing) notFound();

  const isOwn = user?.id === listing.seller.userId;
  const isAdmin = user?.role === "ADMIN";
  if ((listing.status === "REMOVED" && !isAdmin) || (listing.status === "DRAFT" && !isOwn && !isAdmin)) {
    notFound();
  }

  const buyer = user && !isOwn ? user : null;
  const key = buyer ? { userId_listingId: { userId: buyer.id, listingId: listing.id } } : null;
  const [rating, completedSales, watched, inCart, myOffer, conversation, pendingOffers] = await Promise.all([
    db.review.aggregate({ where: { sellerId: listing.sellerId }, _avg: { rating: true }, _count: true }),
    db.order.count({ where: { sellerId: listing.seller.userId, status: "COMPLETED" } }),
    key ? db.watchlistItem.findUnique({ where: key }).then(Boolean) : false,
    key ? db.cartItem.findUnique({ where: key }).then(Boolean) : false,
    buyer ? findBuyerLiveOffer(listing.id, buyer.id) : null,
    buyer
      ? db.conversation.findUnique({
          where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
          select: { id: true },
        })
      : null,
    isOwn ? countPendingOffers(listing.id) : 0,
  ]);

  const paymentMode = getPaymentMode();
  const price = formatMinorUnits(listing.priceMinorUnits, listing.currency);
  const isLive = listing.status === "ACTIVE";
  const location = listing.county ? [listing.area, listing.county].filter(Boolean).join(", ") : null;
  const handover = [listing.meetUp ? "Meet up" : null, listing.delivery ? "Delivery" : null]
    .filter(Boolean)
    .join(" · ");
  const messageHref = conversation ? `/messages/${conversation.id}` : `/messages/new?listing=${listing.id}`;
  const averageRating = rating._avg.rating ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {!isOwn && isLive ? <OnMount action={recordViewAction.bind(null, listing.id)} /> : null}

      <div className="grid gap-10 lg:grid-cols-2">
        <ListingGallery
          photos={listing.photos.map((p) => ({ id: p.id, url: p.url }))}
          title={listing.title}
        />

        <div>
          {listing.status === "DRAFT" ? (
            <p className="mb-4 rounded-lg bg-tile px-3 py-2 text-sm">
              Draft: only you can see this listing until you publish it.
            </p>
          ) : null}
          {listing.status === "RESERVED" ? (
            <p className="mb-4 rounded-lg bg-highlight-soft px-3 py-2 text-sm text-highlight">
              Sale in progress: the buyer’s payment is held in escrow.
            </p>
          ) : null}
          {listing.status === "SOLD" ? (
            <p className="mb-4 rounded-lg bg-tile px-3 py-2 text-sm font-medium">This item has sold.</p>
          ) : null}
          {listing.status === "REMOVED" ? (
            <p className="mb-4 rounded-lg bg-tile px-3 py-2 text-sm">Removed: visible to admins only.</p>
          ) : null}

          <span className="text-xs font-medium uppercase tracking-wide text-highlight">
            <Link href={`/browse?category=${listing.category}`} className="hover:underline">
              {categoryLabel(listing.category)}
            </Link>
            {" · "}
            {CONDITION_LABELS[listing.conditionGrade] ?? listing.conditionGrade}
          </span>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{listing.title}</h1>
          <p className="mt-1 text-muted">
            {listing.brand} · {listing.model}
            {listing.storageGb ? ` · ${listing.storageGb}GB` : ""}
            {listing.ramGb ? ` · ${listing.ramGb}GB RAM` : ""}
          </p>
          <p className="mt-4 text-3xl font-semibold">
            {price}
            {listing.acceptsOffers && isLive ? (
              <span className="ml-2 text-sm font-normal text-muted">or Best Offer</span>
            ) : null}
          </p>
          {location || handover ? (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <MapPinIcon />
              {location ?? "Location not set"}
              {handover ? <span>· {handover}</span> : null}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            {isOwn ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm font-semibold">Your listing</p>
                <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-muted">
                  <span>{listing.viewCount} views</span>
                  <span>{listing._count.watchers} watching</span>
                  <span>{pendingOffers} pending offers</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.status === "DRAFT" || isLive ? (
                    <Link href={`/listings/${listing.id}/edit`} className={smallButton}>
                      Edit listing
                    </Link>
                  ) : null}
                  {listing.status === "DRAFT" ? (
                    <form action={changeListingStatusAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="change" value="publish" />
                      <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                        Publish
                      </button>
                    </form>
                  ) : null}
                  {isLive ? (
                    <form action={changeListingStatusAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <input type="hidden" name="change" value="sold" />
                      <ConfirmButton
                        message="Mark this as sold elsewhere? It will be taken off sale and open offers declined."
                        className={smallButton}
                      >
                        Mark as sold
                      </ConfirmButton>
                    </form>
                  ) : null}
                  {pendingOffers > 0 ? (
                    <Link href="/offers" className={smallButton}>
                      Review offers
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : isLive ? (
              <>
                {myOffer?.status === "ACCEPTED" ? (
                  <div className="rounded-xl border border-highlight/30 bg-highlight-soft p-4 text-sm">
                    <p className="font-semibold">
                      Your offer of {formatMinorUnits(myOffer.amountMinorUnits, listing.currency)} was accepted
                    </p>
                    <p className="mt-1 text-muted">Pay {timeAgo(myOffer.expiresAt)} to get it at that price.</p>
                    <Link href={`/checkout/${listing.id}?offer=${myOffer.id}`} className={`${primaryButton} mt-3`}>
                      Buy for {formatMinorUnits(myOffer.amountMinorUnits, listing.currency)}
                    </Link>
                  </div>
                ) : null}

                {paymentMode !== "disabled" ? (
                  <Link href={`/checkout/${listing.id}`} className={primaryButton}>
                    Buy it now
                  </Link>
                ) : (
                  <p className="rounded-xl bg-tile p-3 text-center text-sm text-muted">
                    Checkout opens when Trego Escrow launches.
                  </p>
                )}

                {inCart ? (
                  <Link href="/cart" className={secondaryButton}>
                    In your cart · View cart
                  </Link>
                ) : (
                  <form action={addToCartAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <button type="submit" className={secondaryButton}>
                      Add to cart
                    </button>
                  </form>
                )}

                {listing.acceptsOffers ? (
                  myOffer?.status === "PENDING" ? (
                    <div className="rounded-xl border border-border bg-surface p-4 text-sm">
                      <p>
                        Your offer of{" "}
                        <strong>{formatMinorUnits(myOffer.amountMinorUnits, listing.currency)}</strong> is
                        waiting for the seller (expires {timeAgo(myOffer.expiresAt)}).
                      </p>
                      <form action={withdrawOfferAction} className="mt-2">
                        <input type="hidden" name="offerId" value={myOffer.id} />
                        <button type="submit" className="text-highlight underline">
                          Withdraw offer
                        </button>
                      </form>
                    </div>
                  ) : myOffer?.status !== "ACCEPTED" ? (
                    <details className="rounded-xl border border-foreground bg-surface">
                      <summary className="cursor-pointer list-none px-6 py-3 text-center font-semibold [&::-webkit-details-marker]:hidden">
                        Make an offer
                      </summary>
                      <div className="px-4 pb-4">
                        <OfferForm action={makeOfferAction.bind(null, listing.id)} askingPrice={price} />
                      </div>
                    </details>
                  ) : null
                ) : null}

                <WatchButton listingId={listing.id} watched={watched} variant="full" />

                <Link href={messageHref} className={secondaryButton}>
                  <MessageIcon className="h-4.5 w-4.5" />
                  Message seller
                </Link>
              </>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {listing._count.watchers > 0 ? (
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">{listing._count.watchers}</span>{" "}
                  {listing._count.watchers === 1 ? "person is" : "people are"} watching this
                </p>
              ) : (
                <span />
              )}
              {listing.status !== "DRAFT" && listing.status !== "REMOVED" ? (
                <ShareWhatsApp path={`/listings/${listing.id}`} text={`${listing.title}, ${price} on Trego:`} />
              ) : null}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Condition &amp; disclosures</h2>
            <p className="mt-1 text-sm text-muted">
              {listing.defectsDescription || "Seller reports no defects."}
            </p>
          </div>

          {listing.imei ? (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">IMEI</h2>
              <p className="mt-1 font-mono text-sm text-muted">{maskImei(listing.imei)}</p>
              <p
                className={`mt-1 flex items-center gap-1.5 text-xs ${
                  listing.imeiStatus === "CLEAN"
                    ? "text-highlight"
                    : listing.imeiStatus === "BLACKLISTED"
                      ? "text-danger"
                      : "text-muted"
                }`}
              >
                {listing.imeiStatus === "CLEAN" ? <ShieldCheckIcon className="h-3.5 w-3.5" /> : null}
                {IMEI_STATUS_LABELS[listing.imeiStatus]}
              </p>
              <p className="mt-1 text-xs text-muted">
                Valid IMEI format. The full IMEI is kept for disputes and never shown publicly.
              </p>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Seller</h2>
            <Link href={`/sellers/${listing.sellerId}`} className="mt-1 inline-block text-sm font-medium hover:underline">
              {listing.seller.user.displayName}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {rating._count > 0 ? (
                <span className="flex items-center gap-1">
                  <StarRating rating={averageRating} className="h-3.5 w-3.5" />
                  {averageRating.toFixed(1)} ({rating._count})
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
              <span>
                {completedSales} escrow {completedSales === 1 ? "sale" : "sales"}
              </span>
              {listing.seller.user.phoneVerifiedAt ? (
                <span className="flex items-center gap-1 text-highlight">
                  <ShieldCheckIcon className="h-3.5 w-3.5" />
                  Phone verified
                </span>
              ) : null}
              <span>
                Joined{" "}
                {listing.seller.user.createdAt.toLocaleDateString("en-KE", { year: "numeric", month: "long" })}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-highlight/30 bg-highlight-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Protected by Trego Escrow</h2>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-highlight">
                {paymentMode === "simulated" ? "Test mode" : "Coming soon"}
              </span>
            </div>
            <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <li>
                <span className="font-semibold text-highlight">1.</span> You pay into escrow
              </li>
              <li>
                <span className="font-semibold text-highlight">2.</span> Seller hands it over
              </li>
              <li>
                <span className="font-semibold text-highlight">3.</span> You inspect for{" "}
                {INSPECTION_WINDOW_HOURS}h, then release
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted">
              {paymentMode === "simulated"
                ? "Checkout runs in test mode: payments are simulated and no real money moves. "
                : "Checkout isn’t live yet. When it is, you’ll pay into escrow right here. "}
              <Link href="/protection" className="text-highlight underline">
                How escrow works
              </Link>
            </p>
          </div>

          {!isOwn && listing.status !== "REMOVED" ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted underline">Report this listing</summary>
              <ReportForm action={reportListingAction.bind(null, listing.id)} />
            </details>
          ) : null}

          {isAdmin ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm">
              <p className="font-semibold">Admin</p>
              {listing.imei ? (
                <form action={setImeiStatusAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <span className="text-muted">IMEI check:</span>
                  <button type="submit" name="status" value="CLEAN" className={smallButton}>
                    Mark clean
                  </button>
                  <button type="submit" name="status" value="BLACKLISTED" className={smallButton}>
                    Mark blacklisted
                  </button>
                  <button type="submit" name="status" value="NOT_CHECKED" className={smallButton}>
                    Reset
                  </button>
                </form>
              ) : null}
              {listing.status !== "REMOVED" && listing.status !== "RESERVED" ? (
                <form action={adminRemoveListingAction} className="mt-2">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <ConfirmButton message="Remove this listing and notify the seller?" className={smallButton}>
                    Remove listing
                  </ConfirmButton>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
