"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribeAction, type NewsletterState } from "@/app/newsletter-action";

const initialState: NewsletterState = { status: "idle", message: null };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(
    subscribeAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-highlight"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Signing up…" : "Sign up"}
        </button>
      </div>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.status === "error" ? "text-danger" : "text-highlight"}`}
        >
          {state.message}
        </p>
      ) : (
        <p className="text-xs text-muted">
          Only used for these updates. See our{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            privacy policy
          </Link>
          .
        </p>
      )}
    </form>
  );
}
