"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { ChevronDownIcon, CloseIcon } from "@/components/icons";
import type { BrowseFacets, FacetOption } from "@/lib/listing-search";

type Current = {
  sort: string;
  category: string;
  condition: string;
  county: string;
  brands: string[];
  storage: string[];
  offers: boolean;
  delivery: boolean;
  meetUp: boolean;
  minPrice: number | null;
  maxPrice: number | null;
};

type Changes = Record<string, string | string[] | null>;

const SORT_SHORT: Record<string, string> = {
  newest: "Newest",
  price_asc: "Lowest price",
  price_desc: "Highest price",
};

const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under 20,000", min: null, max: 20000 },
  { label: "20,000 – 50,000", min: 20000, max: 50000 },
  { label: "50,000 – 100,000", min: 50000, max: 100000 },
  { label: "Over 100,000", min: 100000, max: null },
];

function shortKes(n: number) {
  return n >= 1000 ? `${Number((n / 1000).toFixed(1))}k` : String(n);
}

function priceLabel(min: number | null, max: number | null) {
  if (min && max) return `KES ${shortKes(min)}–${shortKes(max)}`;
  if (max) return `Under KES ${shortKes(max)}`;
  if (min) return `Over KES ${shortKes(min)}`;
  return "Price";
}

function pickedLabel(fallback: string, picked: string[]) {
  if (picked.length === 0) return fallback;
  return picked.length === 1 ? picked[0] : `${picked[0]} +${picked.length - 1}`;
}

/** Applies changes to the current query; null or [] removes a filter. */
function hrefWith(query: string, changes: Changes) {
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(changes)) {
    params.delete(key);
    for (const v of [value].flat()) if (v) params.append(key, v);
  }
  const s = params.toString();
  return s ? `/browse?${s}` : "/browse";
}

/**
 * Bottom sheet on phones, dropdown panel from sm up. Closes on Escape or a
 * tap outside, and moves focus in on open and back to the chip on close.
 */
function Panel({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = ref.current;
    const trigger = document.activeElement as HTMLElement | null;
    panel?.querySelector<HTMLElement>("input, button:not([data-close])")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    // The sheet covers the page on phones, so stop the page scrolling under it.
    const phone = window.matchMedia("(max-width: 639.98px)").matches;
    const previousOverflow = document.body.style.overflow;
    if (phone) document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:left-0 sm:mt-2 sm:max-h-96 sm:w-72 sm:rounded-xl sm:border sm:border-border"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
          <p className="font-semibold">{title}</p>
          <button data-close type="button" aria-label="Close" onClick={onClose} className="-mr-2 flex p-2">
            <CloseIcon />
          </button>
        </div>
        <div className="overflow-y-auto py-1 text-sm">{children}</div>
        {footer ? <div className="flex gap-2 border-t border-border p-3">{footer}</div> : null}
      </div>
    </>
  );
}

function Choice({
  selected,
  onSelect,
  children,
  count,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      // Picking an option with no listings would only lead to an empty page.
      disabled={count === 0 && !selected}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-background disabled:opacity-40 sm:py-2 ${
        selected ? "font-semibold" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-4 w-4 shrink-0 rounded-full border ${
          selected ? "border-[5px] border-accent" : "border-border"
        }`}
      />
      <span className="flex-1">{children}</span>
      {count != null ? <span className="text-muted">{count}</span> : null}
    </button>
  );
}

function Check({
  checked,
  onChange,
  children,
  count,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-3 sm:py-2 ${
        count === 0 && !checked ? "opacity-40" : "cursor-pointer hover:bg-background"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={count === 0 && !checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      <span className="flex-1">{children}</span>
      {count != null ? <span className="text-muted">{count}</span> : null}
    </label>
  );
}

function FooterButtons({ onClear, onApply }: { onClear: () => void; onApply: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onClear}
        className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:border-foreground"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
      >
        Apply
      </button>
    </>
  );
}

/** Multi-select list with its own pending picks until Apply. */
function MultiPanel({
  title,
  options,
  picked,
  onApply,
  onClose,
}: {
  title: string;
  options: FacetOption[];
  picked: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(picked);
  return (
    <Panel
      title={title}
      onClose={onClose}
      footer={<FooterButtons onClear={() => onApply([])} onApply={() => onApply(draft)} />}
    >
      {options.map((option) => (
        <Check
          key={option.value}
          checked={draft.some((v) => v.toLowerCase() === option.value.toLowerCase())}
          count={option.count}
          onChange={(on) =>
            setDraft((d) =>
              on ? [...d, option.value] : d.filter((v) => v.toLowerCase() !== option.value.toLowerCase())
            )
          }
        >
          {option.label}
        </Check>
      ))}
    </Panel>
  );
}

function PricePanel({
  min,
  max,
  range,
  onApply,
  onClose,
}: {
  min: number | null;
  max: number | null;
  range: BrowseFacets["price"];
  onApply: (min: number | null, max: number | null) => void;
  onClose: () => void;
}) {
  const [draftMin, setDraftMin] = useState(min ? String(min) : "");
  const [draftMax, setDraftMax] = useState(max ? String(max) : "");
  const toNumber = (v: string) => (Number(v) > 0 ? Math.round(Number(v)) : null);
  const box =
    "w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight";

  return (
    <Panel
      title="Price (KES)"
      onClose={onClose}
      footer={
        <FooterButtons
          onClear={() => onApply(null, null)}
          onApply={() => onApply(toNumber(draftMin), toNumber(draftMax))}
        />
      }
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <label className="flex-1">
          <span className="sr-only">Minimum price in shillings</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            placeholder={range ? `Min ${range.min.toLocaleString("en-KE")}` : "Min"}
            className={box}
          />
        </label>
        <span className="text-muted">–</span>
        <label className="flex-1">
          <span className="sr-only">Maximum price in shillings</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            placeholder={range ? `Max ${range.max.toLocaleString("en-KE")}` : "Max"}
            className={box}
          />
        </label>
      </div>
      {PRICE_PRESETS.map((preset) => (
        <Choice
          key={preset.label}
          selected={min === preset.min && max === preset.max}
          onSelect={() => onApply(preset.min, preset.max)}
        >
          {preset.label}
        </Choice>
      ))}
    </Panel>
  );
}

type PanelKey = "sort" | "category" | "price" | "condition" | "brand" | "storage" | "buying" | "county";

/**
 * eBay-style filters: one row of chips (scrolling sideways on phones), each
 * opening a small panel. Filters live in the URL, so results are shareable,
 * the back button works, and saved searches keep working.
 */
export function FilterBar({
  query,
  current,
  facets,
  children,
}: {
  /** The current filters as a URL query string. */
  query: string;
  current: Current;
  facets: BrowseFacets;
  /** The results, dimmed while new ones load. */
  children: ReactNode;
}) {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [pending, startTransition] = useTransition();
  // Stable, because each panel re-runs its focus handling when this changes.
  const close = useCallback(() => setOpenPanel(null), []);

  function apply(changes: Changes) {
    setOpenPanel(null);
    startTransition(() => router.push(hrefWith(query, changes), { scroll: false }));
  }

  const buyingPicked = [
    current.offers && "Accepts offers",
    current.delivery && "Delivery",
    current.meetUp && "Meet-up",
  ].filter((v): v is string => Boolean(v));
  const categoryLabel = facets.categories.find((c) => c.value === current.category)?.label;
  const conditionLabel = facets.conditions.find((c) => c.value === current.condition)?.label;
  const storageLabels = current.storage.map((gb) => facets.storage.find((s) => s.value === gb)?.label ?? `${gb} GB`);
  const anyFilter = Boolean(
    current.category ||
      current.condition ||
      current.county ||
      current.brands.length ||
      current.storage.length ||
      buyingPicked.length ||
      current.minPrice ||
      current.maxPrice
  );

  function chip(key: PanelKey, label: string, active: boolean, panel: ReactNode) {
    const open = openPanel === key;
    return (
      <div className="shrink-0 sm:relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpenPanel(open ? null : key)}
          className={`flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap ${
            active
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-surface hover:border-foreground"
          }`}
        >
          {label}
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>
        {open ? panel : null}
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 bg-background px-4 py-2.5">
        <div
          aria-label="Filters"
          role="group"
          className={`-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 ${
            pending ? "opacity-60" : ""
          }`}
        >
          {chip(
            "sort",
            `Sort: ${SORT_SHORT[current.sort] ?? "Newest"}`,
            current.sort !== "newest",
            <Panel title="Sort by" onClose={close}>
              {Object.entries(SORT_SHORT).map(([value, label]) => (
                <Choice
                  key={value}
                  selected={current.sort === value}
                  onSelect={() => apply({ sort: value === "newest" ? null : value })}
                >
                  {label}
                </Choice>
              ))}
            </Panel>
          )}

          {chip(
            "category",
            categoryLabel ?? "Category",
            Boolean(current.category),
            <Panel title="Category" onClose={close}>
              <Choice selected={!current.category} onSelect={() => apply({ category: null })}>
                All categories
              </Choice>
              {facets.categories.map((c) => (
                <Choice
                  key={c.value}
                  selected={current.category === c.value}
                  count={c.count}
                  onSelect={() => apply({ category: c.value })}
                >
                  {c.label}
                </Choice>
              ))}
            </Panel>
          )}

          {chip(
            "price",
            priceLabel(current.minPrice, current.maxPrice),
            Boolean(current.minPrice || current.maxPrice),
            <PricePanel
              min={current.minPrice}
              max={current.maxPrice}
              range={facets.price}
              onClose={close}
              onApply={(min, max) =>
                apply({ minPrice: min ? String(min) : null, maxPrice: max ? String(max) : null })
              }
            />
          )}

          {chip(
            "condition",
            conditionLabel ?? "Condition",
            Boolean(current.condition),
            <Panel title="Condition" onClose={close}>
              <Choice selected={!current.condition} onSelect={() => apply({ condition: null })}>
                Any condition
              </Choice>
              {facets.conditions.map((c) => (
                <Choice
                  key={c.value}
                  selected={current.condition === c.value}
                  count={c.count}
                  onSelect={() => apply({ condition: c.value })}
                >
                  {c.label}
                </Choice>
              ))}
            </Panel>
          )}

          {facets.brands.length > 0 || current.brands.length > 0
            ? chip(
                "brand",
                pickedLabel("Brand", current.brands),
                current.brands.length > 0,
                <MultiPanel
                  title="Brand"
                  options={facets.brands}
                  picked={current.brands}
                  onClose={close}
                  onApply={(values) => apply({ brand: values })}
                />
              )
            : null}

          {facets.storage.length > 0 || current.storage.length > 0
            ? chip(
                "storage",
                pickedLabel("Storage", storageLabels),
                current.storage.length > 0,
                <MultiPanel
                  title="Storage capacity"
                  options={facets.storage}
                  picked={current.storage}
                  onClose={close}
                  onApply={(values) => apply({ storage: values })}
                />
              )
            : null}

          {chip(
            "buying",
            pickedLabel("Buying options", buyingPicked),
            buyingPicked.length > 0,
            <MultiPanel
              title="Buying options"
              options={[
                { value: "offers", label: "Accepts offers", count: facets.buying.offers },
                { value: "delivery", label: "Delivery available", count: facets.buying.delivery },
                { value: "meetup", label: "Meet-up in person", count: facets.buying.meetUp },
              ]}
              picked={[
                ...(current.offers ? ["offers"] : []),
                ...(current.delivery ? ["delivery"] : []),
                ...(current.meetUp ? ["meetup"] : []),
              ]}
              onClose={close}
              onApply={(values) =>
                apply({
                  offers: values.includes("offers") ? "1" : null,
                  delivery: values.includes("delivery") ? "1" : null,
                  meetup: values.includes("meetup") ? "1" : null,
                })
              }
            />
          )}

          {facets.counties.length > 0 || current.county
            ? chip(
                "county",
                current.county || "Location",
                Boolean(current.county),
                <Panel title="Location" onClose={close}>
                  <Choice selected={!current.county} onSelect={() => apply({ county: null })}>
                    Anywhere in Kenya
                  </Choice>
                  {facets.counties.map((c) => (
                    <Choice
                      key={c.value}
                      selected={current.county === c.value}
                      count={c.count}
                      onSelect={() => apply({ county: c.value })}
                    >
                      {c.label}
                    </Choice>
                  ))}
                </Panel>
              )
            : null}

          {anyFilter ? (
            <button
              type="button"
              onClick={() =>
                apply({
                  category: null,
                  condition: null,
                  county: null,
                  brand: null,
                  storage: null,
                  offers: null,
                  delivery: null,
                  meetup: null,
                  minPrice: null,
                  maxPrice: null,
                })
              }
              className="shrink-0 px-2 py-1.5 text-sm whitespace-nowrap text-highlight underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {pending ? "Updating results" : ""}
      </p>
      <div className={`transition-opacity ${pending ? "opacity-50" : ""}`}>{children}</div>
    </>
  );
}
