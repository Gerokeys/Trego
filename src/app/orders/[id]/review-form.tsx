"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";

const RATINGS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Okay" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Bad" },
];

export function ReviewForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 text-sm">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1">Rating</legend>
        {RATINGS.map((rating) => (
          <label key={rating.value} className="flex items-center gap-2">
            <input type="radio" name="rating" value={rating.value} required />
            <span className="text-amber-500">{"★".repeat(rating.value)}</span>
            <span className="text-muted">{rating.label}</span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5">
        Comment (optional)
        <textarea
          name="comment"
          rows={3}
          maxLength={1000}
          placeholder="Was the item as described? How was the handover?"
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
        />
      </label>
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post review"}
      </button>
    </form>
  );
}
