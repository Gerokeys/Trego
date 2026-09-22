import "server-only";
import type { ConditionGrade, Prisma } from "@prisma/client";
import { db } from "./db";
import { formatMinorUnits, majorToMinorUnits } from "./money";
import { CATEGORIES, isCategory, type CategoryValue } from "./categories";
import { isCounty, type County } from "./kenya";
import { CONDITION_GRADES } from "./validation";
import { CONDITION_LABELS } from "./conditions";

/**
 * Search and filtering for /browse and the search-box suggestions, kept in one
 * place so a suggestion always leads to the results it promised.
 */

export const SORTS = {
  newest: { label: "Newly listed", orderBy: { createdAt: "desc" } },
  price_asc: { label: "Price: lowest first", orderBy: { priceMinorUnits: "asc" } },
  price_desc: { label: "Price: highest first", orderBy: { priceMinorUnits: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ListingOrderByWithRelationInput }>;

export type SortKey = keyof typeof SORTS;

export type BrowseFilters = {
  q: string;
  category: CategoryValue | "";
  county: County | "";
  condition: ConditionGrade | "";
  brands: string[];
  storage: number[];
  offers: boolean;
  delivery: boolean;
  meetUp: boolean;
  /** Whole shillings. */
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortKey;
};

type Params = Record<string, string | string[] | undefined>;

function all(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).map((v) => v.trim()).filter(Boolean);
}

function one(value: string | string[] | undefined) {
  return all(value)[0] ?? "";
}

function amount(value: string | string[] | undefined) {
  const n = Number(one(value));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function parseBrowseParams(params: Params): BrowseFilters {
  const category = one(params.category);
  const county = one(params.county);
  const condition = one(params.condition);
  const sort = one(params.sort);
  return {
    q: one(params.q).slice(0, 100),
    category: isCategory(category) ? category : "",
    county: isCounty(county) ? county : "",
    condition: (CONDITION_GRADES as readonly string[]).includes(condition) ? (condition as ConditionGrade) : "",
    brands: [...new Set(all(params.brand).map((b) => b.slice(0, 60)))].slice(0, 20),
    storage: [...new Set(all(params.storage).map(Number))]
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 20),
    offers: one(params.offers) === "1",
    delivery: one(params.delivery) === "1",
    meetUp: one(params.meetup) === "1",
    minPrice: amount(params.minPrice),
    maxPrice: amount(params.maxPrice),
    sort: Object.hasOwn(SORTS, sort) ? (sort as SortKey) : "newest",
  };
}

/** The URL query for a set of filters, in a stable order. */
export function filtersToQuery(f: BrowseFilters) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.category) params.set("category", f.category);
  if (f.condition) params.set("condition", f.condition);
  for (const brand of f.brands) params.append("brand", brand);
  for (const gb of f.storage) params.append("storage", String(gb));
  if (f.offers) params.set("offers", "1");
  if (f.delivery) params.set("delivery", "1");
  if (f.meetUp) params.set("meetup", "1");
  if (f.minPrice) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice) params.set("maxPrice", String(f.maxPrice));
  if (f.county) params.set("county", f.county);
  if (f.sort !== "newest") params.set("sort", f.sort);
  return params.toString();
}

/** The words of a search, lower-cased; every one must appear for a match. */
export function searchWords(q: string) {
  return q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
}

/**
 * Each word of the query must appear in the title, brand or model, so
 * "iphone 128gb" finds "iPhone 11, 128GB, unlocked". Saved-search alerts use
 * the same rule (lib/saved-searches.ts).
 */
export function textMatch(q: string): Prisma.ListingWhereInput {
  const words = searchWords(q);
  if (words.length === 0) return {};
  return {
    AND: words.map((word) => ({
      OR: [
        { title: { contains: word, mode: "insensitive" as const } },
        { brand: { contains: word, mode: "insensitive" as const } },
        { model: { contains: word, mode: "insensitive" as const } },
      ],
    })),
  };
}

type FacetKey = "category" | "condition" | "brand" | "storage" | "county" | "buying" | "price";

/**
 * Prisma filter for active listings matching `f`. `omit` leaves one filter
 * out, which is how each filter's own option counts are worked out: the Brand
 * list shows every brand you could switch to, not only the ones picked.
 */
export function listingWhere(f: BrowseFilters, omit?: FacetKey): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }, textMatch(f.q)];
  if (f.category && omit !== "category") and.push({ category: f.category });
  if (f.county && omit !== "county") and.push({ county: f.county });
  if (f.condition && omit !== "condition") and.push({ conditionGrade: f.condition });
  if (f.brands.length && omit !== "brand") {
    // Sellers type the brand, so "apple" and "Apple" are the same brand.
    and.push({ OR: f.brands.map((brand) => ({ brand: { equals: brand, mode: "insensitive" as const } })) });
  }
  if (f.storage.length && omit !== "storage") and.push({ storageGb: { in: f.storage } });
  if (omit !== "buying") {
    if (f.offers) and.push({ acceptsOffers: true });
    if (f.delivery) and.push({ delivery: true });
    if (f.meetUp) and.push({ meetUp: true });
  }
  if (omit !== "price" && (f.minPrice || f.maxPrice)) {
    and.push({
      priceMinorUnits: {
        ...(f.minPrice ? { gte: majorToMinorUnits(f.minPrice) } : {}),
        ...(f.maxPrice ? { lte: majorToMinorUnits(f.maxPrice) } : {}),
      },
    });
  }
  return { AND: and };
}

export function storageLabel(gb: number) {
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} TB` : `${gb} GB`;
}

export type FacetOption = { value: string; label: string; count: number };

export type BrowseFacets = {
  categories: FacetOption[];
  conditions: FacetOption[];
  brands: FacetOption[];
  storage: FacetOption[];
  counties: FacetOption[];
  buying: { offers: number; delivery: number; meetUp: number };
  /** Whole shillings, for the price boxes' placeholders. */
  price: { min: number; max: number } | null;
};

/** Option counts for every filter, each computed without its own filter. */
export async function getBrowseFacets(f: BrowseFilters): Promise<BrowseFacets> {
  const buyingWhere = listingWhere(f, "buying");
  const [categories, conditions, brands, storage, counties, offers, delivery, meetUp, price] =
    await Promise.all([
      db.listing.groupBy({ by: ["category"], where: listingWhere(f, "category"), _count: { _all: true } }),
      db.listing.groupBy({ by: ["conditionGrade"], where: listingWhere(f, "condition"), _count: { _all: true } }),
      db.listing.groupBy({ by: ["brand"], where: listingWhere(f, "brand"), _count: { _all: true } }),
      db.listing.groupBy({
        by: ["storageGb"],
        where: { AND: [listingWhere(f, "storage"), { storageGb: { not: null } }] },
        _count: { _all: true },
      }),
      db.listing.groupBy({
        by: ["county"],
        where: { AND: [listingWhere(f, "county"), { county: { not: null } }] },
        _count: { _all: true },
      }),
      db.listing.count({ where: { AND: [buyingWhere, { acceptsOffers: true }] } }),
      db.listing.count({ where: { AND: [buyingWhere, { delivery: true }] } }),
      db.listing.count({ where: { AND: [buyingWhere, { meetUp: true }] } }),
      db.listing.aggregate({ where: listingWhere(f, "price"), _min: { priceMinorUnits: true }, _max: { priceMinorUnits: true } }),
    ]);

  // Merge brands that differ only in capitalisation, keeping the commonest spelling.
  const brandGroups = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const row of brands) {
    const name = row.brand.trim();
    if (!name) continue;
    const group = brandGroups.get(name.toLowerCase()) ?? { spellings: new Map(), count: 0 };
    group.spellings.set(name, (group.spellings.get(name) ?? 0) + row._count._all);
    group.count += row._count._all;
    brandGroups.set(name.toLowerCase(), group);
  }

  const byCount = (a: FacetOption, b: FacetOption) => b.count - a.count || a.label.localeCompare(b.label);

  return {
    categories: CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      count: categories.find((row) => row.category === c.value)?._count._all ?? 0,
    })).filter((option) => option.count > 0 || option.value === f.category),
    conditions: (CONDITION_GRADES as readonly ConditionGrade[]).map((grade) => ({
      value: grade,
      label: CONDITION_LABELS[grade],
      count: conditions.find((row) => row.conditionGrade === grade)?._count._all ?? 0,
    })),
    brands: [...brandGroups.values()]
      .map((group) => {
        const label = [...group.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { value: label, label, count: group.count };
      })
      .sort(byCount),
    storage: storage
      .filter((row) => row.storageGb != null)
      .sort((a, b) => (a.storageGb ?? 0) - (b.storageGb ?? 0))
      .map((row) => ({
        value: String(row.storageGb),
        label: storageLabel(row.storageGb!),
        count: row._count._all,
      })),
    counties: counties
      .filter((row) => row.county)
      .map((row) => ({ value: row.county!, label: row.county!, count: row._count._all }))
      .sort(byCount),
    buying: { offers, delivery, meetUp },
    price:
      price._min.priceMinorUnits != null && price._max.priceMinorUnits != null
        ? { min: Math.floor(price._min.priceMinorUnits / 100), max: Math.ceil(price._max.priceMinorUnits / 100) }
        : null,
  };
}

export type ListingSuggestion = {
  id: string;
  title: string;
  price: string;
  condition: string;
  photo: string | null;
};

export type SearchSuggestions = { queries: string[]; listings: ListingSuggestion[] };

function tidy(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * What to suggest while someone types: search terms drawn from real listings
 * ("iph" → "iPhone 11") and a few of the listings themselves.
 */
export async function getSearchSuggestions(input: string): Promise<SearchSuggestions> {
  const q = tidy(input);
  if (q.length < 2) return { queries: [], listings: [] };

  const rows = await db.listing.findMany({
    where: { AND: [{ status: "ACTIVE" }, textMatch(q)] },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      brand: true,
      model: true,
      priceMinorUnits: true,
      currency: true,
      conditionGrade: true,
      photos: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    },
  });

  // Prefer the model ("iPhone 11"), then brand + model ("Samsung Galaxy S25"),
  // then the start of the title: the shortest phrase containing every word typed.
  const words = searchWords(q);
  const needle = q.toLowerCase();
  const tally = new Map<string, { spellings: Map<string, number>; count: number }>();
  for (const row of rows) {
    const candidate = [tidy(row.model), tidy(`${row.brand} ${row.model}`), tidy(row.title.split(",")[0])].find(
      (text) => text && words.every((word) => text.toLowerCase().includes(word))
    );
    if (!candidate) continue;
    // Sellers capitalise the model field loosely ("Iphone 11"); where the title
    // contains the same phrase, take its spelling instead.
    const at = row.title.toLowerCase().indexOf(candidate.toLowerCase());
    const spelling = at === -1 ? candidate : row.title.slice(at, at + candidate.length);
    const key = candidate.toLowerCase();
    const entry = tally.get(key) ?? { spellings: new Map<string, number>(), count: 0 };
    entry.spellings.set(spelling, (entry.spellings.get(spelling) ?? 0) + 1);
    entry.count += 1;
    tally.set(key, entry);
  }

  // Commonest spelling wins; ties go to the newest listing (rows are newest first).
  const queries = [...tally.values()]
    .map((entry) => ({
      text: [...entry.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count: entry.count,
    }))
    .sort(
      (a, b) =>
        Number(b.text.toLowerCase().startsWith(needle)) - Number(a.text.toLowerCase().startsWith(needle)) ||
        b.count - a.count ||
        a.text.length - b.text.length
    )
    .slice(0, 6)
    .map((entry) => entry.text);

  const listings = rows.slice(0, 4).map((row) => ({
    id: row.id,
    title: row.title,
    price: formatMinorUnits(row.priceMinorUnits, row.currency),
    condition: CONDITION_LABELS[row.conditionGrade],
    photo: row.photos[0]?.url ?? null,
  }));

  return { queries, listings };
}
