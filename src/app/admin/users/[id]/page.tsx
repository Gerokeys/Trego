import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toLocalPhone } from "@/lib/phone";
import { formatMinorUnits } from "@/lib/money";
import { formatDateTime, timeAgo } from "@/lib/time";
import { ORDER_STATUS_LABELS } from "@/lib/escrow";
import { LISTING_STATUS_LABELS } from "@/lib/listing-status";
import { REPORT_REASON_LABELS } from "@/lib/validation";
import { AdminNav } from "@/components/admin-nav";
import { ConfirmButton } from "@/components/confirm-button";
import { StarRating } from "@/components/star-rating";
import { ShieldCheckIcon } from "@/components/icons";
import { setUserRoleAction, setUserSuspensionAction } from "../../actions";

export const metadata = { title: "User — Admin" };

const actionClass =
  "rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:border-foreground";

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      sellerProfile: {
        include: {
          listings: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { photos: { orderBy: { position: "asc" }, take: 1 } },
          },
          _count: { select: { listings: true, reviews: true } },
        },
      },
      _count: { select: { purchases: true, sales: true, offers: true, reports: true } },
    },
  });
  if (!user) notFound();

  const [purchases, sales, reviewStats, reportsAgainst, savedSearches, conversations] = await Promise.all([
    db.order.findMany({
      where: { buyerId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        amountMinorUnits: true,
        currency: true,
        createdAt: true,
        listing: { select: { title: true } },
      },
    }),
    db.order.findMany({
      where: { sellerId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        amountMinorUnits: true,
        currency: true,
        createdAt: true,
        listing: { select: { title: true } },
      },
    }),
    user.sellerProfile
      ? db.review.aggregate({
          where: { sellerId: user.sellerProfile.id },
          _avg: { rating: true },
          _count: true,
        })
      : null,
    db.report.findMany({
      where: { listing: { seller: { userId: id } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { listing: { select: { id: true, title: true } }, reporter: { select: { displayName: true } } },
    }),
    db.savedSearch.count({ where: { userId: id } }),
    db.conversation.count({ where: { OR: [{ buyerId: id }, { sellerId: id }] } }),
  ]);

  const isSelf = user.id === admin.id;
  const averageRating = reviewStats?._avg.rating ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{user.displayName}</h1>
      <div className="mt-4">
        <AdminNav current="/admin/users" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Account</h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Phone</dt>
              <dd className="flex items-center gap-1.5">
                {user.phoneNumber ? toLocalPhone(user.phoneNumber) : "—"}
                {user.phoneVerifiedAt ? (
                  <span className="flex items-center gap-1 text-xs text-highlight">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    verified {timeAgo(user.phoneVerifiedAt)}
                  </span>
                ) : (
                  <span className="text-xs text-muted">not verified</span>
                )}
              </dd>
              <dt className="text-muted">Email</dt>
              <dd>{user.email ?? "—"}</dd>
              <dt className="text-muted">Sign-in</dt>
              <dd>
                {[user.passwordHash ? "password" : null, user.googleId ? "Google" : null]
                  .filter(Boolean)
                  .join(" + ") || "—"}
              </dd>
              <dt className="text-muted">Joined</dt>
              <dd>{formatDateTime(user.createdAt)}</dd>
              <dt className="text-muted">Role</dt>
              <dd>{user.role === "ADMIN" ? "Admin" : "User"}</dd>
              <dt className="text-muted">Status</dt>
              <dd className={user.suspendedAt ? "text-danger" : ""}>
                {user.suspendedAt ? `Suspended ${timeAgo(user.suspendedAt)}` : "Active"}
              </dd>
            </dl>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-semibold">
              Listings ({user.sellerProfile?._count.listings ?? 0})
            </h2>
            {!user.sellerProfile || user.sellerProfile.listings.length === 0 ? (
              <p className="mt-2 text-sm text-muted">This account has never listed anything.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {user.sellerProfile.listings.map((listing) => {
                  const photo = listing.photos[0];
                  return (
                    <li key={listing.id} className="flex items-center gap-3 p-3">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border"
                      >
                        {photo ? (
                          <Image src={photo.url} alt="" fill sizes="48px" className="object-contain p-1" />
                        ) : null}
                      </Link>
                      <div className="min-w-0 flex-1 text-sm">
                        <Link href={`/listings/${listing.id}`} className="block truncate font-medium hover:underline">
                          {listing.title}
                        </Link>
                        <span className="text-xs text-muted">
                          {formatMinorUnits(listing.priceMinorUnits, listing.currency)} ·{" "}
                          {LISTING_STATUS_LABELS[listing.status]} · {listing.viewCount} views ·{" "}
                          {timeAgo(listing.createdAt)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="text-sm font-semibold">Purchases ({user._count.purchases})</h2>
              <OrderList orders={purchases} empty="Nothing bought." />
            </section>
            <section>
              <h2 className="text-sm font-semibold">Sales ({user._count.sales})</h2>
              <OrderList orders={sales} empty="Nothing sold." />
            </section>
          </div>

          <section className="mt-6">
            <h2 className="text-sm font-semibold">Reports against their listings ({reportsAgainst.length})</h2>
            {reportsAgainst.length === 0 ? (
              <p className="mt-2 text-sm text-muted">None.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
                {reportsAgainst.map((report) => (
                  <li key={report.id} className="p-3">
                    <Link href={`/listings/${report.listing.id}`} className="font-medium hover:underline">
                      {report.listing.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {REPORT_REASON_LABELS[report.reason]} · by {report.reporter.displayName} ·{" "}
                      {report.status.toLowerCase()} · {timeAgo(report.createdAt)}
                    </p>
                    {report.details ? <p className="mt-1 text-muted">{report.details}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">At a glance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Offers made</dt>
              <dd>{user._count.offers}</dd>
              <dt className="text-muted">Conversations</dt>
              <dd>{conversations}</dd>
              <dt className="text-muted">Saved searches</dt>
              <dd>{savedSearches}</dd>
              <dt className="text-muted">Reports filed</dt>
              <dd>{user._count.reports}</dd>
              {reviewStats && reviewStats._count > 0 ? (
                <>
                  <dt className="text-muted">Seller rating</dt>
                  <dd className="flex items-center gap-1">
                    <StarRating rating={averageRating} className="h-3.5 w-3.5" />
                    {averageRating.toFixed(1)} ({reviewStats._count})
                  </dd>
                </>
              ) : null}
            </dl>
            {user.sellerProfile ? (
              <Link
                href={`/sellers/${user.sellerProfile.id}`}
                className="mt-3 inline-block text-sm text-highlight underline"
              >
                Public seller profile
              </Link>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Actions</h2>
            {isSelf ? (
              <p className="mt-2 text-sm text-muted">This is your own account.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <form action={setUserSuspensionAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="suspend" value={user.suspendedAt ? "false" : "true"} />
                  <ConfirmButton
                    message={
                      user.suspendedAt
                        ? "Restore this account? They will be able to sign in again."
                        : "Suspend this account? They'll be signed out and all their live listings removed."
                    }
                    className={actionClass}
                  >
                    {user.suspendedAt ? "Restore account" : "Suspend account"}
                  </ConfirmButton>
                </form>
                <form action={setUserRoleAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="role" value={user.role === "ADMIN" ? "USER" : "ADMIN"} />
                  <ConfirmButton
                    message={
                      user.role === "ADMIN"
                        ? "Remove admin access from this account?"
                        : "Give this account full admin access?"
                    }
                    className={actionClass}
                  >
                    {user.role === "ADMIN" ? "Remove admin" : "Make admin"}
                  </ConfirmButton>
                </form>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function OrderList({
  orders,
  empty,
}: {
  orders: {
    id: string;
    status: string;
    amountMinorUnits: number;
    currency: string;
    createdAt: Date;
    listing: { title: string };
  }[];
  empty: string;
}) {
  if (orders.length === 0) return <p className="mt-2 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/orders/${order.id}`} className="block p-3 hover:bg-background">
            <span className="block truncate font-medium">{order.listing.title}</span>
            <span className="block text-xs text-muted">
              {formatMinorUnits(order.amountMinorUnits, order.currency)} ·{" "}
              {ORDER_STATUS_LABELS[order.status]} · {timeAgo(order.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
