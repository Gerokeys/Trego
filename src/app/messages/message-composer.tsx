"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";

export function MessageComposer({
  action,
  placeholder = "Write a message…",
  submitLabel = "Send",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="message-body" className="sr-only">
        Message
      </label>
      <textarea
        id="message-body"
        name="body"
        required
        rows={3}
        maxLength={2000}
        placeholder={placeholder}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-highlight"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-end rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
