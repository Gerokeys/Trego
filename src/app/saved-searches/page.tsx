import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { describeSavedSearch, savedSearchHref } from "@/lib/saved-searches";
import { deleteSavedSearchAction } from "./actions";

export const metadata = { title: "Saved searches — Trego" };

export default async function SavedSearchesPage() {
  const user = await requireUser("/saved-searches");
  const searches = await db.savedSearch.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Saved searches</h1>
      <p className="mt-1 text-sm text-muted">
        We’ll notify you when a new listing matches one of these.
      </p>

      {searches.length === 0 ? (
        <p className="mt-8 text-muted">
          Nothing saved yet. Set up filters on{" "}
          <Link href="/browse" className="text-highlight underline">
            Browse
          </Link>{" "}
          and tap “Save this search”.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {searches.map((search) => (
            <li key={search.id} className="flex flex-wrap items-center gap-3 p-4">
              <p className="min-w-0 flex-1 text-sm">{describeSavedSearch(search)}</p>
              <Link href={savedSearchHref(search)} className="text-sm text-highlight underline">
                View results
              </Link>
              <form action={deleteSavedSearchAction}>
                <input type="hidden" name="id" value={search.id} />
                <button type="submit" className="text-sm text-muted underline hover:text-foreground">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
