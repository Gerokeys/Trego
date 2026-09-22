"use client";

import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { SearchIcon } from "@/components/icons";

export function SearchBar({ q, category }: { q: string; category: string }) {
  return (
    <form
      action="/browse"
      method="GET"
      role="search"
      className="order-last flex w-full min-w-0 items-center gap-2 sm:order-0 sm:w-auto sm:flex-1"
    >
      <div className="flex min-w-0 flex-1 items-center rounded-full border-2 border-foreground bg-surface focus-within:border-highlight">
        <SearchIcon className="ml-4 h-4 w-4 shrink-0 text-muted" />
        <label htmlFor="site-search" className="sr-only">
          Search
        </label>
        <input
          id="site-search"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search for phones, laptops, cameras…"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
        />
        <label htmlFor="site-search-category" className="sr-only">
          Category
        </label>
        {/* Hidden on phones to leave room to type; the current category still
            applies there and can be changed from the browse filters. */}
        <select
          id="site-search-category"
          name="category"
          defaultValue={category}
          className="mr-3 hidden max-w-40 border-l border-border bg-transparent py-1 pl-3 text-xs text-muted outline-none sm:block"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        // Phones submit from the keyboard's search key, as on eBay, which
        // leaves the whole width for typing.
        className="hidden shrink-0 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 sm:block"
      >
        Search
      </button>
    </form>
  );
}

/** Keeps the current query and category in the box while browsing results. */
export function SearchBarFromUrl() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  return <SearchBar key={`${q}|${category}`} q={q} category={category} />;
}
