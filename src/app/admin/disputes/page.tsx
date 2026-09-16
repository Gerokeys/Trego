import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { sweepEscrowDeadlines } from "@/lib/orders";
import { ConfirmButton } from "@/components/confirm-button";
import { resolveDisputeAction } from "../actions";

export const metadata = { title: "Disputes — Admin" };

export default async function AdminDisputesPage() {
  await requireAdmin();
  await sweepEscrowDeadlines();

  const disputes = await db.dispute.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        include: {
          listing: { select: { id: true, title: true, defectsDescription: true, conditionGrade: true } },
          buyer: { select: { displayName: true } },
          seller: { select: { displayName: true } },
        },
      },
    },
  });

  const conversations = await db.conversation.findMany({
    where: {
      OR: disputes.map((d) => ({ listingId: d.order.listingId, buyerId: d.order.buyerId })),
    },
    select: { id: true, listingId: true, buyerId: true },
  });
  const threadFor = (listingId: string, buyerId: string) =>
    conversations.find((c) => c.listingId === listingId && c.buyerId === buyerId)?.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin" className="text-sm text-highlight underline">
        ← Admin
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Open disputes</h1>
      <p className="mt-1 text-sm text-muted">
        Judge against the listing: its condition grade, defect notes, photos and IMEI.
      </p>

      {disputes.length === 0 ? (
        <p className="mt-8 text-muted">No disputes to review.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {disputes.map((dispute) => {
            const order = dispute.order;
            const threadId = threadFor(order.listingId, order.buyerId);
            return (
              <li key={dispute.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/listings/${order.listingId}`} className="font-medium hover:underline">
                      {order.listing.title}
                    </Link>
                    <p className="text-sm text-muted">
                      {formatMinorUnits(order.amountMinorUnits, order.currency)} ·{" "}
                      {order.buyer.displayName} bought from {order.seller.displayName}
                    </p>
                    <p className="text-xs text-muted">Opened {formatDateTime(dispute.createdAt)}</p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <Link href={`/orders/${order.id}`} className="text-highlight underline">
                      Order
                    </Link>
                    {threadId ? (
                      <Link href={`/messages/${threadId}`} className="text-highlight underline">
                        Messages
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-background p-3 text-sm">
                  <p className="font-medium">Buyer says</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{dispute.reason}</p>
                </div>
                <div className="mt-2 rounded-lg bg-background p-3 text-sm">
                  <p className="font-medium">Listing said</p>
                  <p className="mt-1 text-muted">
                    {order.listing.conditionGrade} ·{" "}
                    {order.listing.defectsDescription || "No defects disclosed."}
                  </p>
                </div>

                <form action={resolveDisputeAction} className="mt-3 flex flex-col gap-2">
                  <input type="hidden" name="orderId" value={order.id} />
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={1000}
                    placeholder="Note shown to both sides (optional)"
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-highlight"
                  />
                  <div className="flex flex-wrap gap-2">
                    <ConfirmButton
                      name="decision"
                      value="refund"
                      message="Refund the buyer in full?"
                      className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                    >
                      Refund buyer
                    </ConfirmButton>
                    <ConfirmButton
                      name="decision"
                      value="release"
                      message="Release the payment to the seller?"
                      className="rounded-full border border-foreground px-4 py-2 text-sm font-semibold"
                    >
                      Release to seller
                    </ConfirmButton>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
