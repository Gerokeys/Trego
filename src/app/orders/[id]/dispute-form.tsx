"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";

export function DisputeForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1.5">
        What’s wrong with it?
        <textarea
          name="reason"
          required
          rows={4}
          minLength={10}
          maxLength={2000}
          placeholder="e.g. the screen has a crack that wasn't in the listing, and the battery health is 74% not 91%."
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
        />
        <span className="text-xs text-muted">
          The payment stays held while we review it. Keep any photos and your
          messages with the seller.
        </span>
      </label>
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full border border-danger px-5 py-2.5 font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
      >
        {pending ? "Opening…" : "Open dispute"}
      </button>
    </form>
  );
}
