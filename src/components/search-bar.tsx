"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CATEGORIES } from "@/lib/categories";
import { SearchIcon } from "@/components/icons";
import type { ListingSuggestion, SearchSuggestions } from "@/lib/listing-search";

type Option = { kind: "query"; text: string } | { kind: "listing"; listing: ListingSuggestion };

const NONE: SearchSuggestions = { queries: [], listings: [] };

/** Bolds the part of a suggestion the shopper hasn't typed yet, as eBay does. */
function Completion({ text, typed }: { text: string; typed: string }) {
  const at = typed ? text.toLowerCase().indexOf(typed.toLowerCase()) : -1;
  if (at === -1) return <span className="font-semibold">{text}</span>;
  return (
    <>
      <span className="font-semibold">{text.slice(0, at)}</span>
      {text.slice(at, at + typed.length)}
      <span className="font-semibold">{text.slice(at + typed.length)}</span>
    </>
  );
}

export function SearchBar({ q, category }: { q: string; category: string }) {
  const router = useRouter();
  const listId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const [value, setValue] = useState(q);
  const [suggestions, setSuggestions] = useState<SearchSuggestions>(NONE);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = value.trim();

  // Fetch as they type, 150ms after the last keystroke; a newer keystroke
  // cancels the older request so answers can't arrive out of order.
  useEffect(() => {
    if (typed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(typed)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          setSuggestions(await res.json());
          setActive(-1);
        }
      } catch {
        // Aborted or offline: keep whatever is showing.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [typed]);

  // Close when tapping anywhere outside the search box.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const options: Option[] = [
    ...suggestions.queries.map((text) => ({ kind: "query" as const, text })),
    ...suggestions.listings.map((listing) => ({ kind: "listing" as const, listing })),
  ];
  const visible = open && typed.length >= 2 && options.length > 0;

  function choose(option: Option) {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    if (option.kind === "listing") {
      router.push(`/listings/${option.listing.id}`);
      return;
    }
    setValue(option.text);
    const params = new URLSearchParams({ q: option.text });
    if (categoryRef.current?.value) params.set("category", categoryRef.current.value);
    router.push(`/browse?${params}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!visible) {
      if (event.key === "ArrowDown" && options.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(options[active]);
    }
  }

  const optionId = (i: number) => `${listId}-option-${i}`;
  const optionClass = (i: number) =>
    `flex cursor-pointer items-center gap-3 px-4 ${active === i ? "bg-background" : "hover:bg-background"}`;

  return (
    <form
      ref={formRef}
      action="/browse"
      method="GET"
      role="search"
      onSubmit={() => setOpen(false)}
      className="relative order-last flex w-full min-w-0 items-center gap-2 sm:order-0 sm:w-auto sm:flex-1"
    >
      <div className="flex min-w-0 flex-1 items-center rounded-full border-2 border-foreground bg-surface focus-within:border-highlight">
        <SearchIcon className="ml-4 h-4 w-4 shrink-0 text-muted" />
        <label htmlFor="site-search" className="sr-only">
          Search
        </label>
        <input
          ref={inputRef}
          id="site-search"
          type="search"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={listId}
          aria-activedescendant={visible && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
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
          ref={categoryRef}
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

      {visible ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          // Keep focus in the box so the keyboard stays open on phones.
          onPointerDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface py-2 text-sm shadow-lg"
        >
          {suggestions.queries.length > 0 ? (
            <div role="group" aria-label="Searches">
              {suggestions.queries.map((text, i) => (
                <div
                  key={text}
                  id={optionId(i)}
                  role="option"
                  aria-selected={active === i}
                  onClick={() => choose(options[i])}
                  className={`${optionClass(i)} py-2.5`}
                >
                  <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="truncate">
                    <Completion text={text} typed={typed} />
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {suggestions.listings.length > 0 ? (
            <div role="group" aria-label="Listings" className={suggestions.queries.length ? "mt-1 border-t border-border pt-1" : ""}>
              <p aria-hidden="true" className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                Listings
              </p>
              {suggestions.listings.map((listing, j) => {
                const i = suggestions.queries.length + j;
                return (
                  <div
                    key={listing.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={active === i}
                    onClick={() => choose(options[i])}
                    className={`${optionClass(i)} py-2`}
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-tile">
                      {listing.photo ? (
                        <Image
                          src={listing.photo}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-contain p-0.5 mix-blend-multiply"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{listing.title}</span>
                      <span className="block text-xs text-muted">
                        {listing.price} · {listing.condition}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
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
