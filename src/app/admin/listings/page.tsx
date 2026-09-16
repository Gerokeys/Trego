import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { CATEGORIES, categoryLabel, isCategory } from "@/lib/categories";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { IMEI_STATUS_LABELS } from "@/lib/imei";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmButton } from "@/components/confirm-button";
import { adminRemoveListingAction, setImeiStatusAction } from "../actions";

export const metadata = { title: "Listings — Admin" };

const STATUSES = ["ACTIVE", "RESERVED", "SOLD", "DRAFT", "REMOVED"];
const PAGE_SIZE = 25;
const actionClass =
  "rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium hover:border-foreground";

export default async function AdminListingsPage({ searchParams }: PageProps<"/admin/listings">) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const statusParam = typeof params.status === "string" ? params.status : "";
  const status = STATUSES.includes(statusParam) ? statusParam : "";
  const categoryParam = typeof params.category === "string" ? params.category : "";
  const category = isCategory(categoryParam) ? categoryParam : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ListingWhereInput = {
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status: status as Prisma.ListingWhereInput["status"] } : {}),
    ...(category ? { category } : {}),
  };

  const [listings, total] = await Promise.all([
    db.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        photos: { orderBy: { position: "asc" }, take: 1 },
        seller: { include: { user: { select: { id: true, displayName: true, suspendedAt: true } } } },
        _count: { select: { reports: true, watchers: true, offers: true } },
      },
    }),
    db.listing.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (status) next.set("status", status);
    if (category) next.set("category", category);
    if (n > 1) next.set("page", String(n));
    const query = next.toString();
    return query ? `/admin/listings?${query}` : "/admin/listings";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Listings</h1>
      <div className="mt-4">
        <AdminNav current="/admin/listings" />
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Title, brand or model"
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Status
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
          >
            <option value="">Any status</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {LISTING_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          Category
          <select
            name="category"
            defaultValue={category}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
        >
          Apply
        </button>
        {q || status || category ? (
          <Link href="/admin/listings" className="text-sm text-highlight underline">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mt-4 text-sm text-muted">
        {total.toLocaleString("en-KE")} {total === 1 ? "listing" : "listings"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {listings.length === 0 ? (
          <li className="p-8 text-center text-muted">No listings match.</li>
        ) : (
          listings.map((listing) => {
            const photo = listing.photos[0];
            return (
              <li key={listing.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link
                  href={`/listings/${listing.id}`}
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border"
                >
                  {photo ? (
                    <Image src={photo.url} alt="" fill sizes="56px" className="object-contain p-1" />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                      {listing.title}
                    </Link>
                    <span className="rounded-full bg-tile px-2 py-0.5 text-xs">
                      {LISTING_STATUS_LABELS[listing.status]}
                    </span>
                    {listing._count.reports > 0 ? (
                      <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">
                        {listing._count.reports} reported
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm">
                    {formatMinorUnits(listing.priceMinorUnits, listing.currency)}
                    <span className="text-muted">
                      {" "}· {categoryLabel(listing.category)} · {listing.county ?? "no location"}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    <Link href={`/admin/users/${listing.seller.user.id}`} className="hover:underline">
                      {listing.seller.user.displayName}
                    </Link>
                    {listing.seller.user.suspendedAt ? " (suspended)" : ""} · {listing.viewCount} views ·{" "}
                    {listing._count.watchers} watching · {listing._count.offers} offers ·{" "}
                    {timeAgo(listing.createdAt)}
                    {listing.imei ? ` · IMEI: ${IMEI_STATUS_LABELS[listing.imeiStatus]}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {listing.imei ? (
                    <form action={setImeiStatusAction} className="flex gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button type="submit" name="status" value="CLEAN" className={actionClass}>
                        IMEI clean
                      </button>
                      <button type="submit" name="status" value="BLACKLISTED" className={actionClass}>
                        Blacklisted
                      </button>
                    </form>
                  ) : null}
                  {listing.status !== "REMOVED" && listing.status !== "RESERVED" ? (
                    <form action={adminRemoveListingAction}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <ConfirmButton
                        message="Remove this listing and notify the seller?"
                        className={actionClass}
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {pages > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-highlight underline">
              ← Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link href={pageHref(page + 1)} className="text-highlight underline">
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
