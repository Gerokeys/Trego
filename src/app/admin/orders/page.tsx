import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sweepEscrowDeadlines } from "@/lib/orders";
import { formatMinorUnits } from "@/lib/money";
import { formatDateTime, timeAgo } from "@/lib/time";
import { HANDOVER_LABELS, MONEY_LOCATION, ORDER_STATUS_LABELS } from "@/lib/escrow";
import { AdminNav } from "@/components/admin-nav";

export const metadata = { title: "Orders — Admin" };

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "HANDED_OVER",
  "COMPLETED",
  "DISPUTED",
  "REFUNDED",
  "CANCELLED",
];
const PAGE_SIZE = 25;

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  await sweepEscrowDeadlines();

  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "";
  const status = STATUSES.includes(statusParam) ? statusParam : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.OrderWhereInput = status
    ? { status: status as Prisma.OrderWhereInput["status"] }
    : {};

  const [orders, total, totals] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { id: true, displayName: true } },
        seller: { select: { id: true, displayName: true } },
        dispute: { select: { status: true } },
      },
    }),
    db.order.count({ where }),
    db.order.aggregate({ where, _sum: { amountMinorUnits: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (n > 1) next.set("page", String(n));
    const query = next.toString();
    return query ? `/admin/orders?${query}` : "/admin/orders";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <div className="mt-4">
        <AdminNav current="/admin/orders" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/orders"
          className={`rounded-full border px-3 py-1.5 ${status === "" ? "border-foreground font-medium" : "border-border text-muted hover:border-foreground"}`}
        >
          All
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/orders?status=${value}`}
            className={`rounded-full border px-3 py-1.5 ${status === value ? "border-foreground font-medium" : "border-border text-muted hover:border-foreground"}`}
          >
            {ORDER_STATUS_LABELS[value]}
          </Link>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">
        {total.toLocaleString("en-KE")} {total === 1 ? "order" : "orders"} ·{" "}
        {formatMinorUnits(totals._sum.amountMinorUnits ?? 0)} total
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-200 text-left text-sm">
          <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Item</th>
              <th scope="col" className="px-4 py-3 font-medium">Buyer → Seller</th>
              <th scope="col" className="px-4 py-3 font-medium">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Money</th>
              <th scope="col" className="px-4 py-3 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No orders match.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const deadline =
                  order.status === "PAID"
                    ? order.handoverDeadline
                    : order.status === "HANDED_OVER"
                      ? order.inspectionEndsAt
                      : null;
                return (
                  <tr key={order.id}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/orders/${order.id}`} className="hover:underline">
                        {order.listing.title}
                      </Link>
                      <span className="block text-xs font-normal text-muted">
                        {HANDOVER_LABELS[order.handoverMethod]} · {timeAgo(order.createdAt)}
                      </span>
                    </th>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/admin/users/${order.buyer.id}`} className="hover:underline">
                        {order.buyer.displayName}
                      </Link>
                      {" → "}
                      <Link href={`/admin/users/${order.seller.id}`} className="hover:underline">
                        {order.seller.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatMinorUnits(order.amountMinorUnits, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          order.dispute?.status === "OPEN" ? "bg-danger/10 text-danger" : "bg-tile"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{MONEY_LOCATION[order.status]}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {deadline ? formatDateTime(deadline) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
