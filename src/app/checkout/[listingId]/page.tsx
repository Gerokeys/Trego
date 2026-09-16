import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";
import { formatMinorUnits } from "@/lib/money";
import { toLocalPhone } from "@/lib/phone";
import { getPaymentMode } from "@/lib/payments";
import { findPayableOffer } from "@/lib/offers";
import { HANDOVER_LABELS, INSPECTION_WINDOW_HOURS, SELLER_HANDOVER_DAYS } from "@/lib/escrow";
import { TestModeBanner } from "@/components/test-mode-banner";
import { startCheckoutAction } from "../actions";

export const metadata = { title: "Checkout — Trego" };

const ERRORS: Record<string, string> = {
  unavailable: "This item isn’t available to buy any more.",
  handover: "Choose how you’ll get the item.",
  offer: "That accepted offer has expired. You can still buy at the listed price.",
};

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[listingId]">) {
  const { listingId } = await params;
  const { offer: offerParam, error } = await searchParams;
  const user = await requireVerifiedUser(`/checkout/${listingId}`);
  const mode = getPaymentMode();

  const listing = await db.listing.findUnique({
    where: { id: listingId },
    include: {
      photos: { orderBy: { position: "asc" }, take: 1 },
      seller: { include: { user: { select: { displayName: true } } } },
    },
  });

  if (!listing || listing.status !== "ACTIVE" || listing.seller.userId === user.id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">This item isn’t available</h1>
        <p className="mt-2 text-muted">It may have sold, or it’s your own listing.</p>
        <Link href="/browse" className="mt-6 inline-block text-highlight underline">
          Keep browsing
        </Link>
      </div>
    );
  }

  const offer =
    typeof offerParam === "string" ? await findPayableOffer(offerParam, user.id, listingId) : null;
  const amount = offer?.amountMinorUnits ?? listing.priceMinorUnits;
  const total = formatMinorUnits(amount, listing.currency);
  const methods = [listing.meetUp ? "MEET_UP" : null, listing.delivery ? "DELIVERY" : null].filter(
    (m): m is "MEET_UP" | "DELIVERY" => m !== null
  );
  const photo = listing.photos[0];
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

      {mode === "simulated" ? (
        <div className="mt-4">
          <TestModeBanner />
        </div>
      ) : null}

      <div className="mt-6 flex gap-4 rounded-xl border border-border bg-surface p-4">
        <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
          {photo ? <Image src={photo.url} alt="" fill sizes="80px" className="object-contain p-1" /> : null}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted">Seller: {listing.seller.user.displayName}</p>
          <Link href={`/listings/${listing.id}`} className="font-medium hover:underline">
            {listing.title}
          </Link>
          {offer ? <p className="mt-1 text-xs text-highlight">Your accepted offer</p> : null}
        </div>
      </div>

      {mode === "disabled" ? (
        <p className="mt-6 rounded-xl bg-tile p-4 text-sm">
          Checkout opens when Trego Escrow launches. Until then you can
          message the seller or save the item to your Watchlist.
        </p>
      ) : (
        <form action={startCheckoutAction.bind(null, listingId)} className="mt-6 flex flex-col gap-6">
          {offer ? <input type="hidden" name="offerId" value={offer.id} /> : null}

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-2 font-semibold">How will you get it?</legend>
            {methods.map((method, i) => (
              <label key={method} className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3 has-checked:border-foreground">
                <input type="radio" name="handoverMethod" value={method} required defaultChecked={i === 0} />
                {HANDOVER_LABELS[method]}
              </label>
            ))}
          </fieldset>

          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <div className="flex justify-between">
              <span>{offer ? "Accepted offer" : "Item price"}</span>
              <span>{total}</span>
            </div>
            <div className="mt-2 flex justify-between text-muted">
              <span>Escrow fee</span>
              <span>{formatMinorUnits(0, listing.currency)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{total}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              The escrow fee hasn’t been set yet. Whatever it is, it will always
              be shown here before you pay.
            </p>
          </div>

          <div className="rounded-xl bg-highlight-soft p-4 text-sm">
            <p className="font-semibold">What happens next</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-muted">
              <li>You pay by M-Pesa ({toLocalPhone(user.phoneNumber)}). The money is held in escrow.</li>
              <li>The seller has {SELLER_HANDOVER_DAYS} days to hand it over, or you’re refunded automatically.</li>
              <li>You get {INSPECTION_WINDOW_HOURS} hours to inspect it, then release the payment or open a dispute.</li>
            </ol>
          </div>

          {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}

          <button
            type="submit"
            className="rounded-full bg-accent px-6 py-3.5 font-semibold text-accent-foreground hover:opacity-90"
          >
            Pay {total} with M-Pesa
          </button>
        </form>
      )}
    </div>
  );
}
