"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/form-state";

const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight";

export function OfferForm({
  action,
  askingPrice,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  askingPrice: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1.5">
        Your offer (KES)
        <input name="amountMajorUnits" type="number" min={1} step={1} required className={fieldClass} />
        <span className="text-xs text-muted">Asking price: {askingPrice}</span>
      </label>
      <label className="flex flex-col gap-1.5">
        Message to the seller (optional)
        <textarea name="message" rows={2} maxLength={500} className={fieldClass} />
      </label>
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send offer"}
      </button>
    </form>
  );
}
