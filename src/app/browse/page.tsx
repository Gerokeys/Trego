import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWatchedIds } from "@/lib/shopper";
import { ListingCard } from "@/components/listing-card";
import { SortSelect } from "@/components/sort-select";
import { BellIcon } from "@/components/icons";
import { majorToMinorUnits } from "@/lib/money";
import { CATEGORIES, categoryLabel, isCategory } from "@/lib/categories";
import { COUNTIES, isCounty } from "@/lib/kenya";
import { saveSearchAction } from "@/app/saved-searches/actions";

const CONDITION_FILTERS = [
  { value: "", label: "Any condition" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "FOR_PARTS", label: "For parts" },
];

const SORTS = {
  newest: { label: "Newly listed", orderBy: { createdAt: "desc" } },
  price_asc: { label: "Price: lowest first", orderBy: { priceMinorUnits: "asc" } },
  price_desc: { label: "Price: highest first", orderBy: { priceMinorUnits: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.ListingOrderByWithRelationInput }>;

type SortKey = keyof typeof SORTS;

const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-highlight";

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const categoryParam = typeof params.category === "string" ? params.category : "";
  const category = isCategory(categoryParam) ? categoryParam : "";
  const countyParam = typeof params.county === "string" ? params.county : "";
  const county = isCounty(countyParam) ? countyParam : "";
  const condition = typeof params.condition === "string" ? params.condition : "";
  const deliveryOnly = params.delivery === "1";
  const minPrice = typeof params.minPrice === "string" ? Number(params.minPrice) : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? Number(params.maxPrice) : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : "";
  const sort: SortKey = sortParam in SORTS ? (sortParam as SortKey) : "newest";

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
    ...(county ? { county } : {}),
    ...(deliveryOnly ? { delivery: true } : {}),
    ...(condition ? { conditionGrade: condition as never } : {}),
    ...(minPrice || maxPrice
      ? {
          priceMinorUnits: {
            ...(minPrice ? { gte: majorToMinorUnits(minPrice) } : {}),
            ...(maxPrice ? { lte: majorToMinorUnits(maxPrice) } : {}),
          },
        }
      : {}),
  };

  const user = await getCurrentUser();
  const [listings, total, watchedIds] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      take: 60,
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        seller: { select: { userId: true } },
      },
    }),
    db.listing.count({ where }),
    getWatchedIds(user?.id),
  ]);

  const heading = q
    ? `Results for "${q}"${category ? ` in ${categoryLabel(category)}` : ""}`
    : category
      ? categoryLabel(category)
      : "All listings";
  const hasFilters = Boolean(
    category || condition || county || deliveryOnly || params.minPrice || params.maxPrice
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {heading}
        {county ? <span className="text-muted"> · {county}</span> : null}
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <aside>
          <form
            id="browse-filters"
            className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-4 text-sm lg:grid-cols-1 lg:border-0 lg:bg-transparent lg:p-0"
          >
            <input type="hidden" name="q" value={q} />
            <label className="col-span-2 flex flex-col gap-1.5 font-medium lg:col-span-1">
              Category
              <select name="category" defaultValue={category} className={fieldClass}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 font-medium lg:col-span-1">
              County
              <select name="county" defaultValue={county} className={fieldClass}>
                <option value="">Anywhere in Kenya</option>
                {COUNTIES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 font-medium lg:col-span-1">
              Condition
              <select name="condition" defaultValue={condition} className={fieldClass}>
                {CONDITION_FILTERS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 font-medium">
              Min price (KES)
              <input
                name="minPrice"
                type="number"
                min={0}
                defaultValue={params.minPrice as string | undefined}
                className={`w-full ${fieldClass}`}
              />
            </label>
            <label className="flex flex-col gap-1.5 font-medium">
              Max price (KES)
              <input
                name="maxPrice"
                type="number"
                min={0}
                defaultValue={params.maxPrice as string | undefined}
                className={`w-full ${fieldClass}`}
              />
            </label>
            <label className="col-span-2 flex items-center gap-2 lg:col-span-1">
              <input type="checkbox" name="delivery" value="1" defaultChecked={deliveryOnly} />
              Delivery available
            </label>
            <button
              type="submit"
              className="col-span-2 rounded-full bg-accent px-4 py-2.5 font-semibold text-accent-foreground hover:opacity-90 lg:col-span-1"
            >
              Apply filters
            </button>
            {hasFilters ? (
              <Link
                href={q ? `/browse?q=${encodeURIComponent(q)}` : "/browse"}
                className="col-span-2 text-center text-highlight underline lg:col-span-1"
              >
                Clear filters
              </Link>
            ) : null}
          </form>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 text-sm">
            <p className="text-muted">
              {total.toLocaleString("en-KE")} {total === 1 ? "result" : "results"}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <form action={saveSearchAction}>
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="county" value={county} />
                <input type="hidden" name="condition" value={condition} />
                <input type="hidden" name="minPrice" value={(params.minPrice as string) ?? ""} />
                <input type="hidden" name="maxPrice" value={(params.maxPrice as string) ?? ""} />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 hover:border-foreground"
                >
                  <BellIcon className="h-4 w-4" />
                  Save this search
                </button>
              </form>
              <label className="flex items-center gap-2 text-muted">
                Sort
                <SortSelect
                  defaultValue={sort}
                  options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))}
                />
              </label>
            </div>
          </div>

          {listings.length === 0 ? (
            <p className="mt-16 text-center text-muted">
              No listings match yet. Try clearing filters, or{" "}
              <Link href="/sell/new" className="text-highlight underline">
                be the first to list one
              </Link>
              .
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        </div>
      </div>
    </div>
  );
}
