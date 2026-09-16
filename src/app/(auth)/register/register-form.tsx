"use client";

import { useActionState } from "react";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };
const fieldClass =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight";

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-sm">
        Full name
        <input name="displayName" required className={fieldClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Phone number
        <input name="phoneNumber" required placeholder="0712345678" className={fieldClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Password
        <input type="password" name="password" required minLength={8} className={fieldClass} />
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-4 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
