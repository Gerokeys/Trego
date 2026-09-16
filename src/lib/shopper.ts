import "server-only";
import { db } from "./db";

/** IDs of listings on the user's Watchlist, for rendering heart buttons. */
export async function getWatchedIds(userId: string | undefined) {
  if (!userId) return new Set<string>();
  const rows = await db.watchlistItem.findMany({
    where: { userId },
    select: { listingId: true },
  });
  return new Set(rows.map((row) => row.listingId));
}
