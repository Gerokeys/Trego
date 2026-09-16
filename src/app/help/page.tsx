export const metadata = { title: "Help — Trego" };

const CONDITION_GRADES = [
  { grade: "Like new", meaning: "No visible wear, fully functional." },
  { grade: "Good", meaning: "Light signs of use, fully functional." },
  {
    grade: "Fair",
    meaning: "Visible wear and/or minor issues. The seller must describe them.",
  },
  { grade: "For parts", meaning: "Not fully functional. Sold for repair or parts." },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Help</h1>
      <p className="mt-4 text-muted">
        This is a development instance without a live support inbox yet.
        If you’re testing the product and run into something broken,
        that’s expected at this stage — flag it directly with whoever gave
        you access.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Common questions</h2>
      <div className="mt-4 flex flex-col gap-4 text-sm">
        <div>
          <p className="font-medium">Is my payment protected right now?</p>
          <p className="mt-1 text-muted">
            Not yet. Trego Escrow is launching soon — see{" "}
            <a href="/protection" className="text-highlight underline">
              how escrow works
            </a>{" "}
            for exactly what’s live today and how it will work.
          </p>
        </div>
        <div>
          <p className="font-medium">Can I sign in with Google?</p>
          <p className="mt-1 text-muted">
            Yes. Choose “Continue with Google” on the log in or sign up page.
            We only receive your name and email address from Google.
          </p>
        </div>
        <div>
          <p className="font-medium">Why do you need my IMEI to list a phone?</p>
          <p className="mt-1 text-muted">
            It’s kept on file for dispute evidence and future device checks.
            Only the last 4 digits are ever shown publicly.
          </p>
        </div>
      </div>

      <h2 id="condition-grades" className="mt-10 scroll-mt-8 text-lg font-semibold">
        Condition grades
      </h2>
      <p className="mt-2 text-sm text-muted">
        Every listing must pick one of these grades and disclose any defects.
        Escrow disputes are judged against what the listing says.
      </p>
      <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface text-sm">
        {CONDITION_GRADES.map((c) => (
          <div key={c.grade} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
            <dt className="font-medium sm:w-28 sm:shrink-0">{c.grade}</dt>
            <dd className="text-muted">{c.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
