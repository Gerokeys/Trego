import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { toLocalPhone } from "@/lib/phone";
import { getPaymentMode } from "@/lib/payments";
import { PAYMENT_WINDOW_MINUTES } from "@/lib/escrow";
import { TestModeBanner } from "@/components/test-mode-banner";
import { simulatePaymentAction } from "../../actions";

export const metadata = { title: "Pay — Trego" };

export default async function PayPage({ params }: PageProps<"/orders/[id]/pay">) {
  const { id } = await params;
  const user = await requireUser(`/orders/${id}/pay`);

  const order = await db.order.findUnique({
    where: { id },
    include: { listing: { select: { title: true } } },
  });
  if (!order || order.buyerId !== user.id) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${id}`);

  const amount = formatMinorUnits(order.amountMinorUnits, order.currency);

  if (getPaymentMode() !== "simulated") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Payments aren’t live yet</h1>
        <p className="mt-2 text-muted">
          A licensed payment partner needs to be connected before money can
          move through Trego Escrow.
        </p>
        <Link href="/protection" className="mt-6 inline-block text-highlight underline">
          How escrow will work
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <TestModeBanner />

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">Pay to Trego Escrow</p>
        <p className="mt-2 text-3xl font-semibold">{amount}</p>
        <p className="mt-1 text-sm text-muted">{order.listing.title}</p>
        <p className="mt-6 rounded-xl bg-tile p-4 text-left text-sm">
          In real use, an M-Pesa request would pop up on{" "}
          <strong>{toLocalPhone(order.paymentPhone)}</strong> and you’d enter your PIN. The money
          would go to our payment partner and be held until you confirm the item.
        </p>

        <form action={simulatePaymentAction.bind(null, order.id)} className="mt-6 flex flex-col gap-3">
          <button
            type="submit"
            name="outcome"
            value="success"
            className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground hover:opacity-90"
          >
            Simulate successful payment
          </button>
          <button
            type="submit"
            name="outcome"
            value="fail"
            className="rounded-full border border-border bg-surface px-6 py-3 font-medium hover:border-foreground"
          >
            Simulate failed payment
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Unpaid checkouts are cancelled after {PAYMENT_WINDOW_MINUTES} minutes and the item goes back on sale.
      </p>
    </div>
  );
}
