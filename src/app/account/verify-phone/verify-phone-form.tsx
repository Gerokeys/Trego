"use client";

import { useActionState } from "react";
import { verifyPhoneAction, type VerifyPhoneState } from "./actions";

const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight";
const primaryClass =
  "rounded-full bg-accent px-4 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60";

export function VerifyPhoneForm({ initialPhone, next }: { initialPhone: string; next: string }) {
  const initialState: VerifyPhoneState = { step: "phone", phoneNumber: initialPhone, error: null };
  const [state, formAction, pending] = useActionState(verifyPhoneAction, initialState);

  if (state.step === "phone") {
    return (
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1.5 text-sm">
          Phone number
          <input
            name="phoneNumber"
            required
            inputMode="tel"
            autoComplete="tel"
            defaultValue={state.phoneNumber}
            placeholder="0712345678"
            className={fieldClass}
          />
        </label>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <button type="submit" name="intent" value="send" disabled={pending} className={primaryClass}>
          {pending ? "Sending…" : "Text me a code"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="phoneNumber" value={state.phoneNumber} />
      <p className="text-sm">
        We sent a 6-digit code to <strong>{state.phoneNumber}</strong>.
      </p>
      {state.devCode ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Development mode: SMS isn’t set up, so here’s your code:{" "}
          <strong className="font-mono">{state.devCode}</strong>
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm">
        Code
        <input
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          className={`${fieldClass} font-mono tracking-[0.3em]`}
        />
      </label>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" name="intent" value="verify" disabled={pending} className={primaryClass}>
        {pending ? "Checking…" : "Verify"}
      </button>
      <div className="flex gap-4 text-sm">
        <button type="submit" name="intent" value="send" formNoValidate className="text-highlight underline">
          Send a new code
        </button>
        <button type="submit" name="intent" value="change" formNoValidate className="text-highlight underline">
          Use a different number
        </button>
      </div>
    </form>
  );
}
