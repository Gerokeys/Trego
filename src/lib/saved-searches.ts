import "server-only";
import type { Listing, SavedSearch } from "@prisma/client";
import { db } from "./db";
import { notify } from "./notifications";
import { formatMinorUnits } from "./money";
import { categoryLabel } from "./categories";
import { CONDITION_LABELS } from "./conditions";

export function matchesSavedSearch(search: SavedSearch, listing: Listing) {
  if (search.category && search.category !== listing.category) return false;
  if (search.conditionGrade && search.conditionGrade !== listing.conditionGrade) return false;
  if (search.county && search.county !== listing.county) return false;
  if (search.minPriceMinorUnits != null && listing.priceMinorUnits < search.minPriceMinorUnits) return false;
  if (search.maxPriceMinorUnits != null && listing.priceMinorUnits > search.maxPriceMinorUnits) return false;
  if (search.query) {
    const haystack = `${listing.title} ${listing.brand} ${listing.model}`.toLowerCase();
    if (!haystack.includes(search.query.toLowerCase())) return false;
  }
  return true;
}

/**
 * Notifies everyone whose saved search matches a newly published listing.
 * Checks every saved search in memory, which is fine at launch scale; move
 * it to a SQL query or a background job once there are thousands.
 */
export async function notifySavedSearchMatches(listing: Listing, sellerUserId: string) {
  const searches = await db.savedSearch.findMany({ where: { userId: { not: sellerUserId } } });
  const notified = new Set<string>();
  for (const search of searches) {
    if (notified.has(search.userId) || !matchesSavedSearch(search, listing)) continue;
    notified.add(search.userId);
    await notify(search.userId, {
      title: "New match for your saved search",
      body: `${listing.title} · ${formatMinorUnits(listing.priceMinorUnits, listing.currency)}`,
      href: `/listings/${listing.id}`,
    });
  }
}

export function describeSavedSearch(search: SavedSearch) {
  const parts = [
    search.query ? `“${search.query}”` : "Everything",
    search.category ? `in ${categoryLabel(search.category)}` : null,
    search.conditionGrade ? CONDITION_LABELS[search.conditionGrade] : null,
    search.county,
    search.minPriceMinorUnits != null ? `from ${formatMinorUnits(search.minPriceMinorUnits)}` : null,
    search.maxPriceMinorUnits != null ? `up to ${formatMinorUnits(search.maxPriceMinorUnits)}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function savedSearchHref(search: SavedSearch) {
  const params = new URLSearchParams();
  if (search.query) params.set("q", search.query);
  if (search.category) params.set("category", search.category);
  if (search.conditionGrade) params.set("condition", search.conditionGrade);
  if (search.county) params.set("county", search.county);
  if (search.minPriceMinorUnits != null) params.set("minPrice", String(search.minPriceMinorUnits / 100));
  if (search.maxPriceMinorUnits != null) params.set("maxPrice", String(search.maxPriceMinorUnits / 100));
  return `/browse?${params.toString()}`;
}
