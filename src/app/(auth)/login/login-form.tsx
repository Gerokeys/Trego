"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-sm">
        Phone number
        <input
          name="phoneNumber"
          required
          placeholder="0712345678"
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        Password
        <input
          type="password"
          name="password"
          required
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-highlight"
        />
      </label>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-accent px-4 py-2.5 font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
