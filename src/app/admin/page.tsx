import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sweepEscrowDeadlines } from "@/lib/orders";
import { formatMinorUnits } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { ORDER_STATUS_LABELS } from "@/lib/escrow";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { AdminNav } from "@/components/admin-nav";

export const metadata = { title: "Admin — Trego" };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Kept out of the component: reading the clock during render isn't pure. */
function oneWeekAgo() {
  return new Date(Date.now() - WEEK_MS);
}

function Stat({
  label,
  value,
  detail,
  href,
  alert = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <>
      <p className={`text-2xl font-semibold ${alert && Number(value) > 0 ? "text-danger" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-sm font-medium">{label}</p>
      {detail ? <p className="mt-0.5 text-xs text-muted">{detail}</p> : null}
    </>
  );
  const className = "block rounded-xl border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={`${className} hover:border-foreground`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default async function AdminPage() {
  await requireAdmin();
  // Opening the admin area also applies any escrow deadlines that have passed.
  await sweepEscrowDeadlines();

  const weekAgo = oneWeekAgo();
  const [
    users,
    verifiedUsers,
    newUsers,
    suspendedUsers,
    sellers,
    listingsByStatus,
    ordersByStatus,
    escrowHeld,
    completedValue,
    openReports,
    openDisputes,
    recentUsers,
    recentListings,
    recentOrders,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { phoneVerifiedAt: { not: null } } }),
    db.user.count({ where: { createdAt: { gt: weekAgo } } }),
    db.user.count({ where: { suspendedAt: { not: null } } }),
    db.sellerProfile.count(),
    db.listing.groupBy({ by: ["status"], _count: true }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({
      where: { status: { in: ["PAID", "HANDED_OVER", "DISPUTED"] } },
      _sum: { amountMinorUnits: true },
    }),
    db.order.aggregate({ where: { status: "COMPLETED" }, _sum: { amountMinorUnits: true } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.dispute.count({ where: { status: "OPEN" } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, displayName: true, createdAt: true, phoneVerifiedAt: true },
    }),
    db.listing.findMany({
      where: { status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true, status: true, priceMinorUnits: true, currency: true },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        status: true,
        amountMinorUnits: true,
        currency: true,
        listing: { select: { title: true } },
      },
    }),
  ]);

  const listingCount = (status: string) =>
    listingsByStatus.find((row) => row.status === status)?._count ?? 0;
  const orderCount = (status: string) =>
    ordersByStatus.find((row) => row.status === status)?._count ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <div className="mt-4">
        <AdminNav current="/admin" />
      </div>

      {openReports > 0 || openDisputes > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {openReports > 0 ? (
            <Link
              href="/admin/reports"
              className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
            >
              {openReports} {openReports === 1 ? "report needs" : "reports need"} review →
            </Link>
          ) : null}
          {openDisputes > 0 ? (
            <Link
              href="/admin/disputes"
              className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
            >
              {openDisputes} {openDisputes === 1 ? "dispute is" : "disputes are"} holding money →
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Nothing needs attention: no open reports or disputes.
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold text-muted uppercase tracking-wide">People</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Accounts" value={users} detail={`${newUsers} joined this week`} href="/admin/users" />
        <Stat
          label="Phone verified"
          value={verifiedUsers}
          detail={users > 0 ? `${Math.round((verifiedUsers / users) * 100)}% of accounts` : undefined}
          href="/admin/users?filter=verified"
        />
        <Stat label="Suspended" value={suspendedUsers} href="/admin/users?filter=suspended" alert />
        <Stat
          label="Sellers"
          value={sellers}
          detail="accounts that have listed something"
          href="/admin/users?filter=sellers"
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-muted uppercase tracking-wide">Listings</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Live" value={listingCount("ACTIVE")} href="/admin/listings?status=ACTIVE" />
        <Stat label="In escrow" value={listingCount("RESERVED")} href="/admin/listings?status=RESERVED" />
        <Stat label="Sold" value={listingCount("SOLD")} href="/admin/listings?status=SOLD" />
        <Stat label="Removed" value={listingCount("REMOVED")} href="/admin/listings?status=REMOVED" />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-muted uppercase tracking-wide">Money</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Held in escrow"
          value={formatMinorUnits(escrowHeld._sum.amountMinorUnits ?? 0)}
          detail={`${orderCount("PAID") + orderCount("HANDED_OVER") + orderCount("DISPUTED")} orders`}
          href="/admin/orders?status=PAID"
        />
        <Stat
          label="Completed value"
          value={formatMinorUnits(completedValue._sum.amountMinorUnits ?? 0)}
          detail={`${orderCount("COMPLETED")} orders`}
          href="/admin/orders?status=COMPLETED"
        />
        <Stat label="Awaiting handover" value={orderCount("PAID")} href="/admin/orders?status=PAID" />
        <Stat label="Refunded" value={orderCount("REFUNDED")} href="/admin/orders?status=REFUNDED" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section>
          <h2 className="text-sm font-semibold">Newest accounts</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {recentUsers.length === 0 ? (
              <li className="p-4 text-muted">No accounts yet.</li>
            ) : (
              recentUsers.map((user) => (
                <li key={user.id}>
                  <Link href={`/admin/users/${user.id}`} className="block p-3 hover:bg-background">
                    <span className="font-medium">{user.displayName}</span>
                    <span className="block text-xs text-muted">
                      {timeAgo(user.createdAt)} · {user.phoneVerifiedAt ? "verified" : "unverified"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Newest listings</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {recentListings.length === 0 ? (
              <li className="p-4 text-muted">No listings yet.</li>
            ) : (
              recentListings.map((listing) => (
                <li key={listing.id}>
                  <Link href={`/listings/${listing.id}`} className="block p-3 hover:bg-background">
                    <span className="block truncate font-medium">{listing.title}</span>
                    <span className="block text-xs text-muted">
                      {formatMinorUnits(listing.priceMinorUnits, listing.currency)} ·{" "}
                      {LISTING_STATUS_LABELS[listing.status]} · {timeAgo(listing.createdAt)}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Newest orders</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {recentOrders.length === 0 ? (
              <li className="p-4 text-muted">No orders yet.</li>
            ) : (
              recentOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className="block p-3 hover:bg-background">
                    <span className="block truncate font-medium">{order.listing.title}</span>
                    <span className="block text-xs text-muted">
                      {formatMinorUnits(order.amountMinorUnits, order.currency)} ·{" "}
                      {ORDER_STATUS_LABELS[order.status]} · {timeAgo(order.createdAt)}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <p className="mt-8 text-xs text-muted">
        Escrow deadlines are applied whenever these pages load, and by the scheduled check at
        /api/cron/escrow.
      </p>
    </div>
  );
}
