import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/lib/escrow";
import { sweepEscrowDeadlines } from "@/lib/orders";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Orders — Trego" };

type OrderRowData = {
  id: string;
  amountMinorUnits: number;
  currency: string;
  status: string;
  createdAt: Date;
  listing: { title: string; photos: { url: string }[] };
};

function OrderRow({ order, counterparty }: { order: OrderRowData; counterparty: string }) {
  const photo = order.listing.photos[0];
  return (
    <li>
      <Link href={`/orders/${order.id}`} className="flex items-center gap-4 p-4 hover:bg-background">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
          {photo ? <Image src={photo.url} alt="" fill sizes="56px" className="object-contain p-1" /> : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{order.listing.title}</span>
          <span className="block text-xs text-muted">
            {counterparty} · {timeAgo(order.createdAt)}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-semibold">{formatMinorUnits(order.amountMinorUnits, order.currency)}</span>
          <span className="rounded-full bg-tile px-2 py-0.5 text-xs">{ORDER_STATUS_LABELS[order.status]}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  await sweepEscrowDeadlines();

  const [purchases, sales] = await Promise.all([
    db.order.findMany({
      where: { buyerId: user.id, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
        seller: { select: { displayName: true } },
      },
    }),
    db.order.findMany({
      where: { sellerId: user.id, status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
      orderBy: { createdAt: "desc" },
      include: {
        listing: { select: { title: true, photos: { orderBy: { position: "asc" }, take: 1 } } },
        buyer: { select: { displayName: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <h2 className="mt-8 text-lg font-semibold">Your purchases</h2>
      {purchases.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nothing bought yet.{" "}
          <Link href="/browse" className="text-highlight underline">
            Browse listings
          </Link>
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {purchases.map((order) => (
            <OrderRow key={order.id} order={order} counterparty={`from ${order.seller.displayName}`} />
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-lg font-semibold">Your sales</h2>
      {sales.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No sales yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sales.map((order) => (
            <OrderRow key={order.id} order={order} counterparty={`to ${order.buyer.displayName}`} />
          ))}
        </ul>
      )}
    </div>
  );
}
