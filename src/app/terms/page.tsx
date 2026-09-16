import Link from "next/link";

export const metadata = { title: "Terms of use — Trego" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Terms of use</h1>
      <p className="mt-3 rounded-lg border border-border bg-surface p-3 text-xs text-muted">
        Draft. This is a plain-language summary of how Trego works
        today and has not yet been reviewed by a lawyer. A full version will
        replace it before public launch.
      </p>

      <div className="mt-8 flex flex-col gap-8 text-sm text-muted">
        <section>
          <h2 className="text-base font-semibold text-foreground">Who we are</h2>
          <p className="mt-2">
            Trego is an early-stage marketplace for buying and selling
            used phones and electronics in Kenya. It is in active development.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Your account</h2>
          <p className="mt-2">
            Give accurate details when you sign up, whether with your phone
            number or with Google, and keep your password to yourself. You’re
            responsible for what happens on your account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Listing rules</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Describe the item honestly, with the correct condition grade and every defect you know of.</li>
            <li>Use photos of the actual item you’re selling.</li>
            <li>For phones, the IMEI you enter must be the device’s real IMEI.</li>
            <li>Don’t list stolen, counterfeit or blacklisted devices. Locked devices may only be listed as “For parts” with the lock disclosed.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Buying and payments</h2>
          <p className="mt-2">
            Trego Escrow is not live yet, so no payments go through Trego
            today. Until it launches, any deal you make is directly between
            you and the other person. See{" "}
            <Link href="/protection" className="text-highlight underline">
              how escrow will work
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Removing listings and accounts</h2>
          <p className="mt-2">
            We may remove listings or suspend accounts that break these rules
            or that we reasonably believe are fraudulent.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Changes</h2>
          <p className="mt-2">
            We’ll update these terms as the product changes, especially when
            escrow launches, and show the date of the latest version here.
          </p>
        </section>
      </div>
    </div>
  );
}
