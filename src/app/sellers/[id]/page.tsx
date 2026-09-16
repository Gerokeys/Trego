import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWatchedIds } from "@/lib/shopper";
import { ListingCard } from "@/components/listing-card";
import { StarRating } from "@/components/star-rating";
import { ShieldCheckIcon } from "@/components/icons";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Seller — Trego" };

export default async function SellerPage({ params }: PageProps<"/sellers/[id]">) {
  const { id } = await params;

  const seller = await db.sellerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, displayName: true, createdAt: true, phoneVerifiedAt: true, suspendedAt: true } },
    },
  });
  if (!seller || seller.user.suspendedAt) notFound();

  const user = await getCurrentUser();
  const [rating, completedSales, listings, reviews, watchedIds] = await Promise.all([
    db.review.aggregate({ where: { sellerId: id }, _avg: { rating: true }, _count: true }),
    db.order.count({ where: { sellerId: seller.userId, status: "COMPLETED" } }),
    db.listing.findMany({
      where: { sellerId: id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    }),
    db.review.findMany({
      where: { sellerId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        buyer: { select: { displayName: true } },
        order: { select: { listing: { select: { title: true } } } },
      },
    }),
    getWatchedIds(user?.id),
  ]);

  const averageRating = rating._avg.rating ?? 0;
  const isOwnProfile = user?.id === seller.userId;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {seller.businessName || seller.user.displayName}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        {rating._count > 0 ? (
          <span className="flex items-center gap-1.5">
            <StarRating rating={averageRating} />
            {averageRating.toFixed(1)} from {rating._count} {rating._count === 1 ? "review" : "reviews"}
          </span>
        ) : (
          <span>No reviews yet</span>
        )}
        <span>
          {completedSales} escrow {completedSales === 1 ? "sale" : "sales"}
        </span>
        {seller.user.phoneVerifiedAt ? (
          <span className="flex items-center gap-1 text-highlight">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Phone verified
          </span>
        ) : null}
        <span>
          Joined {seller.user.createdAt.toLocaleDateString("en-KE", { year: "numeric", month: "long" })}
        </span>
      </div>
      {seller.bio ? <p className="mt-4 max-w-2xl text-sm">{seller.bio}</p> : null}

      <h2 className="mt-10 text-lg font-semibold">
        {isOwnProfile ? "Your live listings" : "Listings"}
      </h2>
      {listings.length === 0 ? (
        <p className="mt-2 text-muted">Nothing on sale right now.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              watched={watchedIds.has(listing.id)}
              showWatch={!isOwnProfile}
            />
          ))}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-2 text-muted">
          No reviews yet. Only buyers who completed an escrow purchase can leave one.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <StarRating rating={review.rating} className="h-3.5 w-3.5" />
                <span className="font-medium">{review.buyer.displayName}</span>
                <span className="text-xs text-muted">{timeAgo(review.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{review.order.listing.title}</p>
              {review.comment ? <p className="mt-2 text-sm">{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
