"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";
import { REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/validation";

export function ReportForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  if (state.done) {
    return (
      <p className="mt-3 text-sm text-muted">
        Thanks. Our team will review this listing.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 text-sm">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 font-medium">What’s wrong?</legend>
        {REPORT_REASONS.map((reason) => (
          <label key={reason} className="flex items-center gap-2">
            <input type="radio" name="reason" value={reason} required />
            {REPORT_REASON_LABELS[reason]}
          </label>
        ))}
      </fieldset>
      <textarea
        name="details"
        rows={2}
        maxLength={1000}
        placeholder="Anything that helps us check (optional)"
        className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
      />
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full border border-foreground px-4 py-2 font-medium hover:bg-background disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send report"}
      </button>
    </form>
  );
}
