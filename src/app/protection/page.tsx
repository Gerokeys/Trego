import Link from "next/link";
import {
  ESCROW_STEPS,
  INSPECTION_WINDOW_HOURS,
  SELLER_HANDOVER_DAYS,
} from "@/lib/escrow";

export const metadata = { title: "How Trego Escrow works — Trego" };

const COMPARISON = [
  {
    situation: "When the seller gets paid",
    direct: "Before you’ve even seen the item",
    escrow: "Only after you confirm it matches the listing",
  },
  {
    situation: "Item is damaged or not as described",
    direct: "Your money is usually gone",
    escrow: "Open a dispute. The money stays held while it’s reviewed",
  },
  {
    situation: "Seller never shows up",
    direct: "No way to get your money back",
    escrow: `Full refund if it isn’t handed over within ${SELLER_HANDOVER_DAYS} days`,
  },
  {
    situation: "Phone turns out locked or blacklisted",
    direct: "You find out after you’ve paid",
    escrow: "Check it during inspection and dispute if it fails",
  },
  {
    situation: "Fake M-Pesa message (for sellers)",
    direct: "A forged SMS can trick you into handing over",
    escrow: "Hand over only once Trego confirms the money is held",
  },
];

const SCENARIOS = [
  {
    question: "The item doesn’t match the listing",
    answer:
      "Open a dispute before the inspection window ends and show us what’s wrong. The money stays held until the dispute is resolved: a refund, a partial refund, or release to the seller.",
  },
  {
    question: "The seller never hands it over",
    answer: `If the seller doesn’t hand over or ship the item within ${SELLER_HANDOVER_DAYS} days, the order is cancelled and you’re refunded in full.`,
  },
  {
    question: "I forget to confirm",
    answer: `If you don’t confirm or dispute within ${INSPECTION_WINDOW_HOURS} hours of receiving the item, the payment is released to the seller automatically, so sellers aren’t left waiting.`,
  },
  {
    question: "A buyer makes a false claim",
    answer:
      "Disputes are judged against the listing: the condition grade, defect notes, photos and the IMEI on file. Honest, detailed listings are a seller’s best protection.",
  },
];

export default function ProtectionPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <span className="inline-block rounded-full bg-highlight-soft px-3 py-1 text-xs font-medium text-highlight">
            Trego Escrow · launching soon
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            How Trego Escrow protects your money
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Escrow means neither side has to trust a stranger. You pay into
            escrow, the money is held while you inspect what you bought, and
            the seller is only paid once you’re satisfied.
          </p>

          <div className="mt-8 rounded-xl border border-highlight/30 bg-highlight-soft p-4 text-sm">
            <strong>Status today:</strong> escrow payments are not live yet,
            and no money moves through Trego. What is live is mandatory
            condition and defect disclosure on every listing, so you can make
            an informed decision before contacting a seller. This page
            describes how escrow will work at launch.
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight">
          Step by step: where your money is
        </h2>
        <ol className="mt-8">
          {ESCROW_STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
              {i < ESCROW_STEPS.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-10 bottom-0 left-4.75 w-px bg-border"
                />
              ) : null}
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <div className="flex flex-1 flex-col gap-2 pt-1.5 sm:flex-row sm:justify-between sm:gap-6">
                <div className="max-w-md">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                </div>
                <p className="h-fit shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs sm:w-52">
                  <span className="block text-muted">Your money</span>
                  <span className="font-medium">{step.money}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 text-xl font-semibold tracking-tight">
          Paying directly vs paying with escrow
        </h2>
        {/* Stacked cards on phones so the escrow column is never scrolled out of view. */}
        <ul className="mt-6 flex flex-col gap-3 sm:hidden">
          {COMPARISON.map((row) => (
            <li key={row.situation} className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="font-semibold">{row.situation}</p>
              <p className="mt-2 text-muted">
                <span className="block text-xs uppercase tracking-wide">Paying directly</span>
                {row.direct}
              </p>
              <p className="mt-2">
                <span className="block text-xs font-medium uppercase tracking-wide text-highlight">
                  With Trego Escrow
                </span>
                {row.escrow}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-6 hidden overflow-hidden rounded-xl border border-border bg-surface sm:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Situation</th>
                <th scope="col" className="px-4 py-3 font-medium">Paying the seller directly</th>
                <th scope="col" className="px-4 py-3 font-medium text-highlight">With Trego Escrow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((row) => (
                <tr key={row.situation}>
                  <th scope="row" className="px-4 py-3 font-medium">{row.situation}</th>
                  <td className="px-4 py-3 text-muted">{row.direct}</td>
                  <td className="px-4 py-3">{row.escrow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-16 text-xl font-semibold tracking-tight">What if…</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <div key={s.question} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold">{s.question}</h3>
              <p className="mt-2 text-sm text-muted">{s.answer}</p>
            </div>
          ))}
        </div>

        <section id="for-sellers" className="mt-16 scroll-mt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            For sellers: how payouts work
          </h2>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-muted">
            <li>
              <strong className="text-foreground">Payment is secured before you hand over.</strong>{" "}
              You’ll see in your account that the buyer’s money is held, so
              there’s no need to trust a forwarded M-Pesa SMS.
            </li>
            <li>
              <strong className="text-foreground">You’re paid when the buyer confirms,</strong>{" "}
              or automatically {INSPECTION_WINDOW_HOURS} hours after they receive
              the item if they don’t raise a dispute.
            </li>
            <li>
              <strong className="text-foreground">Payouts go to M-Pesa.</strong>{" "}
              Released funds are sent to the number on your account.
            </li>
            <li>
              <strong className="text-foreground">Honest listings win disputes.</strong>{" "}
              Every defect you disclose up front is one a buyer can’t dispute
              later.
            </li>
          </ul>
        </section>

        <h2 className="mt-16 text-xl font-semibold tracking-tight">What it costs</h2>
        <p className="mt-3 text-sm text-muted">
          The escrow fee hasn’t been set yet. Whatever it is, it will be shown
          on the checkout screen before you pay, never added afterwards.
        </p>

        <h2 className="mt-16 text-xl font-semibold tracking-tight">What we won’t claim</h2>
        <p className="mt-3 text-sm text-muted">
          We won’t say a transaction is “100% safe” or guarantee an outcome
          we don’t control. We’ll say plainly what’s been verified (e.g. a
          phone number) versus what hasn’t (e.g. an IMEI against a blacklist
          database), and update this page as that changes.
        </p>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/browse"
            className="rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground hover:opacity-90"
          >
            Browse listings
          </Link>
          <Link
            href="/sell/new"
            className="rounded-full border border-border bg-surface px-6 py-3 font-medium hover:border-accent"
          >
            Start selling
          </Link>
        </div>
      </div>
    </div>
  );
}
