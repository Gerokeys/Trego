import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { formatDateTime, isInFuture } from "@/lib/time";
import { sweepEscrowDeadlines } from "@/lib/orders";
import { paymentUrlFor } from "@/lib/payments";
import {
  HANDOVER_LABELS,
  INSPECTION_WINDOW_HOURS,
  MONEY_LOCATION,
  ORDER_STATUS_LABELS,
} from "@/lib/escrow";
import { TestModeBanner } from "@/components/test-mode-banner";
import { ConfirmButton } from "@/components/confirm-button";
import { StarRating } from "@/components/star-rating";
import { DisputeForm } from "./dispute-form";
import { ReviewForm } from "./review-form";
import {
  cancelOrderAction,
  confirmReceivedAction,
  leaveReviewAction,
  markHandedOverAction,
  openDisputeAction,
} from "../actions";

export const metadata = { title: "Order — Trego" };

const primaryButton =
  "rounded-full bg-accent px-6 py-3 text-center font-semibold text-accent-foreground hover:opacity-90";
const secondaryButton =
  "rounded-full border border-foreground bg-surface px-6 py-3 text-center font-semibold hover:bg-background";

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}`);
  await sweepEscrowDeadlines();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      listing: { include: { photos: { orderBy: { position: "asc" }, take: 1 } } },
      buyer: { select: { displayName: true } },
      seller: { select: { displayName: true } },
      dispute: true,
      review: true,
    },
  });
  if (!order) notFound();

  const isBuyer = order.buyerId === user.id;
  const isSeller = order.sellerId === user.id;
  if (!isBuyer && !isSeller && user.role !== "ADMIN") notFound();

  const conversation = await db.conversation.findUnique({
    where: { listingId_buyerId: { listingId: order.listingId, buyerId: order.buyerId } },
    select: { id: true },
  });
  const messageHref = conversation
    ? `/messages/${conversation.id}`
    : isBuyer
      ? `/messages/new?listing=${order.listingId}`
      : null;

  const amount = formatMinorUnits(order.amountMinorUnits, order.currency);
  const inspectionOpen = order.status === "HANDED_OVER" && isInFuture(order.inspectionEndsAt);
  const photo = order.listing.photos[0];
  const finalStep =
    order.status === "REFUNDED"
      ? { label: "Refunded to the buyer", at: order.refundedAt }
      : { label: "Payment released to the seller", at: order.completedAt };
  const steps = [
    { label: "Paid into escrow", at: order.paidAt },
    { label: order.handoverMethod === "DELIVERY" ? "Delivered" : "Handed over", at: order.handedOverAt },
    finalStep,
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/orders" className="text-sm text-highlight underline">
        ← All orders
      </Link>

      {order.paymentProvider === "simulated" ? (
        <div className="mt-4">
          <TestModeBanner />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-start gap-4">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
          {photo ? <Image src={photo.url} alt="" fill sizes="80px" className="object-contain p-1" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            {isBuyer
              ? `Bought from ${order.seller.displayName}`
              : isSeller
                ? `Sold to ${order.buyer.displayName}`
                : `${order.buyer.displayName} → ${order.seller.displayName}`}
          </p>
          <Link href={`/listings/${order.listingId}`} className="font-semibold hover:underline">
            {order.listing.title}
          </Link>
          <p className="mt-1 text-lg font-semibold">{amount}</p>
          <p className="text-xs text-muted">
            {HANDOVER_LABELS[order.handoverMethod]} · order {order.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <span className="rounded-full bg-tile px-3 py-1 text-xs font-medium">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED" ? (
        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.label}
              className={`rounded-xl border p-4 ${step.at ? "border-foreground bg-surface" : "border-dashed border-border"}`}
            >
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs text-muted">
                {step.at ? formatDateTime(step.at) : "Not yet"}
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      <div className="mt-6 rounded-xl border border-highlight/30 bg-highlight-soft p-4 text-sm">
        <p>
          <span className="text-muted">Where the money is: </span>
          <strong>{MONEY_LOCATION[order.status]}</strong>
        </p>
        {order.status === "PAID" && order.handoverDeadline ? (
          <p className="mt-1 text-muted">
            The seller must hand it over by {formatDateTime(order.handoverDeadline)}. If they don’t,
            the buyer is refunded automatically.
          </p>
        ) : null}
        {order.status === "HANDED_OVER" && order.inspectionEndsAt ? (
          <p className="mt-1 text-muted">
            Inspection ends {formatDateTime(order.inspectionEndsAt)}. Unless a dispute is opened by
            then, the payment is released to the seller automatically.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {isBuyer && order.status === "PENDING_PAYMENT" ? (
          <div className="flex flex-wrap gap-3">
            <Link href={paymentUrlFor(order.id)} className={primaryButton}>
              Pay {amount}
            </Link>
            <form action={cancelOrderAction.bind(null, order.id)}>
              <button type="submit" className={secondaryButton}>
                Cancel
              </button>
            </form>
          </div>
        ) : null}

        {isSeller && order.status === "PAID" ? (
          <form action={markHandedOverAction.bind(null, order.id)} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">Hand the item over</p>
            <p className="mt-1 text-sm text-muted">
              {order.handoverMethod === "MEET_UP"
                ? "Meet the buyer somewhere public and busy. Let them check the item, then mark it handed over."
                : "Ship it, then mark it handed over once the buyer has it."}{" "}
              The buyer then has {INSPECTION_WINDOW_HOURS} hours to inspect it.
            </p>
            <ConfirmButton
              message="Confirm the buyer now has the item? Their inspection window starts now."
              className={`${primaryButton} mt-3 inline-block`}
            >
              Mark as handed over
            </ConfirmButton>
          </form>
        ) : null}

        {isBuyer && inspectionOpen ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">Check it against the listing</p>
            <p className="mt-1 text-sm text-muted">
              Condition, defects, the IMEI (dial *#06#), and that it isn’t locked to someone’s account.
            </p>
            <form action={confirmReceivedAction.bind(null, order.id)} className="mt-3">
              <ConfirmButton
                message={`Release ${amount} to the seller? This can’t be undone.`}
                className={`${primaryButton} inline-block`}
              >
                Everything matches: release payment
              </ConfirmButton>
            </form>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-danger">
                Something’s wrong: open a dispute
              </summary>
              <DisputeForm action={openDisputeAction.bind(null, order.id)} />
            </details>
          </div>
        ) : null}

        {order.dispute ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">
              {order.dispute.status === "OPEN"
                ? "Dispute under review"
                : order.dispute.status === "REFUNDED"
                  ? "Dispute resolved: buyer refunded"
                  : "Dispute resolved: payment released to the seller"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-muted">{order.dispute.reason}</p>
            {order.dispute.resolutionNote ? (
              <p className="mt-2">
                <span className="text-muted">Resolution: </span>
                {order.dispute.resolutionNote}
              </p>
            ) : null}
            {order.dispute.status === "OPEN" ? (
              <p className="mt-2 text-muted">
                Our team is reviewing it. Keep any photos, and your messages with the{" "}
                {isBuyer ? "seller" : "buyer"}.
              </p>
            ) : null}
          </div>
        ) : null}

        {order.status === "COMPLETED" && isBuyer && !order.review ? (
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="font-semibold">How was buying from {order.seller.displayName}?</p>
            <ReviewForm action={leaveReviewAction.bind(null, order.id)} />
          </div>
        ) : null}

        {order.review ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">Review</p>
            <div className="mt-1">
              <StarRating rating={order.review.rating} />
            </div>
            {order.review.comment ? <p className="mt-1 text-muted">{order.review.comment}</p> : null}
          </div>
        ) : null}

        {messageHref ? (
          <Link href={messageHref} className={`${secondaryButton} w-fit`}>
            Message the {isBuyer ? "seller" : "buyer"}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
