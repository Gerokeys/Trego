import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { REPORT_REASON_LABELS } from "@/lib/validation";
import { ConfirmButton } from "@/components/confirm-button";
import { resolveReportsAction, setImeiStatusAction, suspendUserAction } from "../actions";

export const metadata = { title: "Reports — Admin" };

const smallButton =
  "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-foreground";

export default async function AdminReportsPage() {
  await requireAdmin();

  const reports = await db.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { displayName: true } },
      listing: {
        include: {
          photos: { orderBy: { position: "asc" }, take: 1 },
          seller: { include: { user: { select: { id: true, displayName: true, suspendedAt: true } } } },
        },
      },
    },
  });

  // Several people often report the same listing; handle it once.
  const byListing = new Map<string, typeof reports>();
  for (const report of reports) {
    byListing.set(report.listingId, [...(byListing.get(report.listingId) ?? []), report]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-highlight underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Open reports</h1>

      {byListing.size === 0 ? (
        <p className="mt-8 text-muted">Nothing to review.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {[...byListing.values()].map((group) => {
            const listing = group[0].listing;
            const photo = listing.photos[0];
            return (
              <li key={listing.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex gap-4">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
                  >
                    {photo ? <Image src={photo.url} alt="" fill sizes="64px" className="object-contain p-1" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
                      {listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatMinorUnits(listing.priceMinorUnits, listing.currency)} ·{" "}
                      {LISTING_STATUS_LABELS[listing.status]} · seller{" "}
                      <Link href={`/sellers/${listing.sellerId}`} className="underline">
                        {listing.seller.user.displayName}
                      </Link>
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-tile px-2 py-0.5 text-xs">
                    {group.length} {group.length === 1 ? "report" : "reports"}
                  </span>
                </div>

                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {group.map((report) => (
                    <li key={report.id} className="rounded-lg bg-background p-3">
                      <p className="font-medium">{REPORT_REASON_LABELS[report.reason]}</p>
                      {report.details ? <p className="mt-0.5 text-muted">{report.details}</p> : null}
                      <p className="mt-0.5 text-xs text-muted">
                        {report.reporter.displayName} · {timeAgo(report.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={resolveReportsAction} className="flex gap-2">
                    <input type="hidden" name="listingId" value={listing.id} />
                    <ConfirmButton
                      name="decision"
                      value="remove"
                      message="Remove this listing and notify the seller?"
                      className={smallButton}
                    >
                      Remove listing
                    </ConfirmButton>
                    <button type="submit" name="decision" value="dismiss" className={smallButton}>
                      Dismiss reports
                    </button>
                  </form>

                  {listing.imei ? (
                    <form action={setImeiStatusAction} className="flex gap-2">
                      <input type="hidden" name="listingId" value={listing.id} />
                      <button type="submit" name="status" value="CLEAN" className={smallButton}>
                        IMEI clean
                      </button>
                      <button type="submit" name="status" value="BLACKLISTED" className={smallButton}>
                        IMEI blacklisted
                      </button>
                    </form>
                  ) : null}

                  {!listing.seller.user.suspendedAt ? (
                    <form action={suspendUserAction}>
                      <input type="hidden" name="userId" value={listing.seller.user.id} />
                      <ConfirmButton
                        message="Suspend this seller? They'll be logged out and all their listings removed."
                        className={smallButton}
                      >
                        Suspend seller
                      </ConfirmButton>
                    </form>
                  ) : (
                    <span className="text-xs text-muted">Seller suspended</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
