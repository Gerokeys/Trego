import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ListingCard } from "@/components/listing-card";

export const metadata = { title: "Watchlist — Trego" };

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const items = await db.watchlistItem.findMany({
    where: { userId: user.id, listing: { status: { not: "REMOVED" } } },
    orderBy: { createdAt: "desc" },
    include: {
      listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
      <p className="mt-1 text-sm text-muted">
        {items.length} saved {items.length === 1 ? "item" : "items"}. Sellers
        can see how many people are watching, but not who.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="font-medium">Nothing on your Watchlist yet</p>
          <p className="mt-1 text-sm text-muted">
            Tap the heart on any listing to keep an eye on it.
          </p>
          <Link
            href="/browse"
            className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ listing }) => (
            <ListingCard key={listing.id} listing={listing} watched />
          ))}
        </div>
      )}
    </div>
  );
}
