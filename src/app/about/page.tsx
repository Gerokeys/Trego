export const metadata = { title: "About — Trego" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">About Trego</h1>
      <p className="mt-4 text-muted">
        Trego exists for one thing: trusted transactions for used goods. It’s
        an early-stage marketplace for buying and selling used phones and
        electronics in Kenya, built because buying a used phone from a
        stranger is stressful — you can’t tell if it’s locked, damaged, or
        different from the listing until it’s already in your hands.
      </p>
      <p className="mt-4 text-muted">
        We’re building trust into the transaction itself: mandatory condition
        disclosure on every listing, verified phone numbers, messaging that
        keeps a record, and Trego Escrow — where your money is held until
        you’ve confirmed the item matches the listing. Escrow depends on
        partnering with a licensed payment provider rather than holding funds
        ourselves.
      </p>
      <p className="mt-4 text-muted">
        This is a working product in active development, not a finished
        company. What’s live and what isn’t is described plainly on the{" "}
        <a href="/protection" className="text-highlight underline">
          buyer protection
        </a>{" "}
        page.
      </p>
    </div>
  );
}
