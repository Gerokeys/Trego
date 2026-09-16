export const metadata = { title: "Privacy policy — Trego" };

const DATA_WE_COLLECT = [
  {
    what: "Account details",
    detail:
      "Your name and phone number. Your password is never stored, only a one-way (bcrypt) hash of it.",
  },
  {
    what: "Google sign-in",
    detail:
      "If you use Google, we receive your name, email address and Google account ID. Nothing else from your Google account.",
  },
  {
    what: "Listings",
    detail:
      "What you list, its photos, and for phones the IMEI. The full IMEI is kept for dispute evidence; only the last 4 digits are ever shown publicly.",
  },
  {
    what: "Phone verification",
    detail:
      "We text you a 6-digit code and store only a hash of it, plus the date your number was verified.",
  },
  {
    what: "Location",
    detail: "The county and area you put on a listing. Photos are stripped of GPS data when uploaded.",
  },
  {
    what: "Messages and offers",
    detail:
      "Conversations between buyers and sellers, and the offers you make. Admins can read a conversation when reviewing a dispute about that order.",
  },
  {
    what: "Orders and reviews",
    detail:
      "What you bought or sold, the escrow status, and reviews you leave. These are financial records, so we keep them even if a listing is deleted.",
  },
  {
    what: "Newsletter",
    detail: "Your email address, if you sign up in the footer.",
  },
  {
    what: "A session cookie",
    detail: "Keeps you logged in. We don’t use advertising or tracking cookies.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="mt-3 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
        Draft. This describes what the product actually collects today and
        has not yet been reviewed by a lawyer. A full policy under Kenya’s
        Data Protection Act, 2019 will replace it before public launch.
      </p>

      <h2 className="mt-8 text-base font-semibold">What we collect</h2>
      <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
        {DATA_WE_COLLECT.map((item) => (
          <div key={item.what} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-36 sm:shrink-0">{item.what}</dt>
            <dd className="text-muted">{item.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-8 text-sm text-muted">
        <section>
          <h2 className="text-base font-semibold text-foreground">How we use it</h2>
          <p className="mt-2">
            To run your account, show your listings, resolve disputes, and
            (if you signed up) send you the newsletter. We don’t sell your
            data or share it with advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Your rights</h2>
          <p className="mt-2">
            Under Kenya’s Data Protection Act, 2019 you can ask to see,
            correct or delete the personal data we hold about you. A contact
            for these requests will be published here before public launch.
          </p>
        </section>
      </div>
    </div>
  );
}
