import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWatchedIds } from "@/lib/shopper";
import { ListingCard } from "@/components/listing-card";
import { FilterBar } from "@/components/filter-bar";
import { BellIcon } from "@/components/icons";
import { categoryLabel } from "@/lib/categories";
import {
  SORTS,
  filtersToQuery,
  getBrowseFacets,
  listingWhere,
  parseBrowseParams,
} from "@/lib/listing-search";
import { saveSearchAction } from "@/app/saved-searches/actions";

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const filters = parseBrowseParams(await searchParams);
  const where = listingWhere(filters);

  const user = await getCurrentUser();
  const [listings, total, facets, watchedIds] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: SORTS[filters.sort].orderBy,
      take: 60,
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        seller: { select: { userId: true } },
      },
    }),
    db.listing.count({ where }),
    getBrowseFacets(filters),
    getWatchedIds(user?.id),
  ]);

  const heading = filters.q
    ? `Results for "${filters.q}"`
    : filters.category
      ? categoryLabel(filters.category)
      : "All listings";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-10 sm:pt-6">
      <h1 className="text-lg font-semibold tracking-tight sm:text-2xl">{heading}</h1>

      <FilterBar
        query={filtersToQuery(filters)}
        facets={facets}
        current={{
          sort: filters.sort,
          category: filters.category,
          condition: filters.condition,
          county: filters.county,
          brands: filters.brands,
          storage: filters.storage.map(String),
          offers: filters.offers,
          delivery: filters.delivery,
          meetUp: filters.meetUp,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 text-sm">
          <p className="text-muted">
            {total.toLocaleString("en-KE")} {total === 1 ? "result" : "results"}
          </p>
          {/* Saved searches keep the query, category, condition, county and
              price; alerts don't yet narrow by brand, storage or buying option. */}
          <form action={saveSearchAction}>
            <input type="hidden" name="q" value={filters.q} />
            <input type="hidden" name="category" value={filters.category} />
            <input type="hidden" name="county" value={filters.county} />
            <input type="hidden" name="condition" value={filters.condition} />
            <input type="hidden" name="minPrice" value={filters.minPrice ?? ""} />
            <input type="hidden" name="maxPrice" value={filters.maxPrice ?? ""} />
            <button type="submit" className="flex items-center gap-1.5 text-highlight hover:underline">
              <BellIcon className="h-4 w-4" />
              Save search
            </button>
          </form>
        </div>

        {listings.length === 0 ? (
          <p className="mt-16 text-center text-muted">
            No listings match yet. Try removing a filter, or{" "}
            <Link href="/sell/new" className="text-highlight underline">
              be the first to list one
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                watched={watchedIds.has(listing.id)}
                showWatch={listing.seller.userId !== user?.id}
              />
            ))}
          </div>
        )}
      </FilterBar>
    </div>
  );
}
